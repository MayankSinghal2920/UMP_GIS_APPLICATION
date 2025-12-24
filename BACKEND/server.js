require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const { Pool } = require('pg');

const app = express();

// -------------------- MIDDLEWARE --------------------
app.disable('x-powered-by');
app.use(cors());
app.use(express.json());
// Gzip responses -> faster over network
app.use(compression());

// ✅ Database connection (tuned pool)
const pool = new Pool({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT || 5432),
  max: 20,                 // max concurrent clients
  idleTimeoutMillis: 30000 // close idle clients faster
});

// Optional: log pool errors
pool.on('error', (err) => {
  console.error('Unexpected PG pool error', err);
});

// 🩺 Health route
app.get('/__health', (req, res) => {
  res.json({ ok: true, port: Number(process.env.PORT || 4000) });
});

// Small helper to parse bbox
function parseBbox(bbox) {
  if (!bbox) return { where: 'shape IS NOT NULL', params: [] };
  const parts = String(bbox).split(',').map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) {
    throw new Error('Invalid bbox. Use minX,minY,maxX,maxY (EPSG:4326).');
  }
  return {
    where: 'shape IS NOT NULL AND ST_Intersects(shape, ST_MakeEnvelope($1,$2,$3,$4,4326))',
    params: parts,
  };
}

/* -----------------------------------------------------------
   1️⃣  STATIONS
----------------------------------------------------------- */
/* -----------------------------------------------------------
   STATIONS (GeoJSON for Leaflet layer)
   Frontend uses: GET /api/stations?bbox=minx,miny,maxx,maxy
----------------------------------------------------------- */
app.get('/api/stations', async (req, res) => {
  try {
    const { where, params } = parseBbox(req.query.bbox);
    const sql = `
      SELECT jsonb_build_object(
        'type','FeatureCollection',
        'features', COALESCE(jsonb_agg(
          jsonb_build_object(
            'type','Feature',
            'id', objectid,
            'properties', to_jsonb(t) - 'shape',
            'geometry', ST_AsGeoJSON(shape)::jsonb
          )
        ), '[]'::jsonb)
      ) AS geojson
      FROM (
        SELECT
          objectid,
          sttncode,
          sttnname,
          sttntype,
          division,
          railway,
          category,
          state,
          district,
          shape
        FROM sde.station_test
        WHERE ${where}
        ORDER BY objectid
        LIMIT 20000
      ) t;
    `;
    const { rows } = await pool.query(sql, params);
    res.json(rows[0]?.geojson || { type: 'FeatureCollection', features: [] });
  } catch (e) {
    console.error('❌ /api/stations error:', e);
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

// GET /api/edit/stations?bbox=minx,miny,maxx,maxy&page=1&pageSize=10&q=ndls
app.get('/api/edit/stations', async (req, res) => {
  try {
    const { bbox, page = 1, pageSize = 10, q = '' } = req.query;

    // bbox WHERE
    let where = 'shape IS NOT NULL';
    const params = [];
    if (bbox) {
      const parts = String(bbox).split(',').map(Number);
      if (parts.length !== 4 || parts.some(Number.isNaN)) {
        return res.status(400).json({ error: 'Invalid bbox. Use minX,minY,maxX,maxY (EPSG:4326).' });
      }
      where += ` AND ST_Intersects(shape, ST_MakeEnvelope($1,$2,$3,$4,4326))`;
      params.push(...parts);
    }

    // search WHERE
    let searchSql = '';
    if (q && String(q).trim()) {
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
      searchSql = ` AND (LOWER(sttncode) LIKE LOWER($${params.length - 2}) 
                    OR LOWER(state) LIKE LOWER($${params.length - 1})
                    OR LOWER(district) LIKE LOWER($${params.length}))`;
    }

    // total
    const totalSql = `SELECT COUNT(*)::int AS n FROM sde.station_test WHERE ${where}${searchSql};`;
    const { rows: trows } = await pool.query(totalSql, params);
    const total = trows[0]?.n || 0;

    // page slice
    const p = Math.max(1, parseInt(page));
    const ps = Math.max(1, Math.min(200, parseInt(pageSize)));
    const offset = (p - 1) * ps;

    const listSql = `
      SELECT objectid, sttncode, distkm, distm, state, district
      FROM sde.station_test
      WHERE ${where}${searchSql}
      ORDER BY objectid
      LIMIT ${ps} OFFSET ${offset};
    `;
    const { rows } = await pool.query(listSql, params);

    res.json({ rows, total });
  } catch (e) {
    console.error('❌ /api/edit/stations error:', e);
    res.status(500).json({ error: e.message || 'Server error' });
  }
});








// GET single row (send lat/lon too)
app.get('/api/edit/stations/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { rows } = await pool.query(
      `
      SELECT
        objectid,
        sttncode,
        sttnname,
        sttntype,
        category,
        distkm,
        distm,
        state,
        district,
        constituncy,
        railway,
        division,
        /* lat/lon extracted from shape if present */
        CASE WHEN shape IS NOT NULL THEN ST_Y(shape::geometry) ELSE NULL END AS lat,
        CASE WHEN shape IS NOT NULL THEN ST_X(shape::geometry) ELSE NULL END AS lon
      FROM sde.station_test
      WHERE objectid = $1
      `,
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    console.error('❌ GET station by id error:', e);
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

// Helper for GUID
function generateGUID() {
  return '{xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx}'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16).toUpperCase();
  });
}

// CREATE
app.post('/api/edit/stations', async (req, res) => {
  try {
    let {
      sttncode,
      sttnname,
      sttntype,
      distkm,
      distm,
      state,
      district,
      constituncy,
      latitude,
      longitude,
      xcoord,
      ycoord,
      railway,
      division,
      category
    } = req.body || {};

    // Normalize values...
    distkm      = distkm === '' || distkm == null ? null : String(distkm);
    distm       = distm === '' || distm == null ? null : Number(distm);
    state       = state === '' ? null : state;
    district    = district === '' ? null : district;
    constituncy = constituncy === '' ? null : constituncy;
    latitude    = latitude === '' ? null : latitude;
    longitude   = longitude === '' ? null : longitude;
    xcoord      = xcoord === '' || xcoord == null ? null : Number(xcoord);
    ycoord      = ycoord === '' || ycoord == null ? null : Number(ycoord);

    sttnname    = sttnname === '' ? null : sttnname;
    sttntype    = sttntype === '' ? null : sttntype;
    railway     = railway === '' ? null : railway;
    division    = division === '' ? null : division;
    category    = category === '' ? null : category;

    const globalid = generateGUID();

    let sql, params;

    if (xcoord != null && ycoord != null) {
      // With geometry
      sql = `
        INSERT INTO sde.station_test
        (
          objectid,
          globalid,
          sttncode,
          sttnname,
          sttntype,
          distkm,
          distm,
          state,
          district,
          constituncy,
          latitude,
          longitude,
          xcoord,
          ycoord,
          railway,
          division,
          category,
          shape
        )
        VALUES (
          (SELECT COALESCE(MAX(objectid), 0) + 1 FROM sde.station_test),
          $1,   -- globalid
          $2,   -- sttncode
          $3,   -- sttnname
          $4,   -- sttntype
          $5,   -- distkm
          $6,   -- distm
          $7,   -- state
          $8,   -- district
          $9,   -- constituncy
          $10,  -- latitude
          $11,  -- longitude
          $12,  -- xcoord
          $13,  -- ycoord
          $14,  -- railway
          $15,  -- division
          $16,  -- category
          ST_SetSRID(ST_MakePoint($17, $18), 4326)
        )
        RETURNING
          objectid,
          sttncode,
          sttnname,
          sttntype,
          distkm,
          distm,
          state,
          district,
          constituncy,
          railway,
          division,
          category,
          globalid;
      `;
      params = [
        globalid,   // 1
        sttncode,   // 2
        sttnname,   // 3
        sttntype,   // 4
        distkm,     // 5
        distm,      // 6
        state,      // 7
        district,   // 8
        constituncy,// 9
        latitude,   // 10
        longitude,  // 11
        xcoord,     // 12
        ycoord,     // 13
        railway,    // 14
        division,   // 15
        category,   // 16
        xcoord,     // 17 (for geometry)
        ycoord      // 18
      ];
    } else {
      // No geometry
      sql = `
        INSERT INTO sde.station_test
        (
          objectid,
          globalid,
          sttncode,
          sttnname,
          sttntype,
          distkm,
          distm,
          state,
          district,
          constituncy,
          latitude,
          longitude,
          xcoord,
          ycoord,
          railway,
          division,
          category,
          shape
        )
        VALUES (
          (SELECT COALESCE(MAX(objectid), 0) + 1 FROM sde.station_test),
          $1,   -- globalid
          $2,   -- sttncode
          $3,   -- sttnname
          $4,   -- sttntype
          $5,   -- distkm
          $6,   -- distm
          $7,   -- state
          $8,   -- district
          $9,   -- constituncy
          $10,  -- latitude
          $11,  -- longitude
          $12,  -- xcoord
          $13,  -- ycoord
          $14,  -- railway
          $15,  -- division
          $16,  -- category
          NULL
        )
        RETURNING
          objectid,
          sttncode,
          sttnname,
          sttntype,
          distkm,
          distm,
          state,
          district,
          constituncy,
          railway,
          division,
          category,
          globalid;
      `;
      params = [
        globalid,   // 1
        sttncode,   // 2
        sttnname,   // 3
        sttntype,   // 4
        distkm,     // 5
        distm,      // 6
        state,      // 7
        district,   // 8
        constituncy,// 9
        latitude,   // 10
        longitude,  // 11
        xcoord,     // 12
        ycoord,     // 13
        railway,    // 14
        division,   // 15
        category    // 16
      ];
    }

    const { rows } = await pool.query(sql, params);
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error('❌ POST station error:', e);
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

// UPDATE EXISTING STATION (attributes + optional geometry)
app.put('/api/edit/stations/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);

    let {
      // attributes
      distkm,
      distm,
      state,
      district,
      constituncy,
      sttnname,
      category,
      sttntype,

      // geometry-related coming from frontend
      latitude,     // DMS string
      longitude,    // DMS string
      xcoord,       // decimal lon
      ycoord,       // decimal lat
      shape         // EWKB hex string from pointToEWKBHex()
    } = req.body || {};

    // Normalise basic fields
    distkm      = distkm === '' || distkm == null ? null : String(distkm);
    distm       = distm === ''  || distm  == null ? null : Number(distm);
    state       = state       || null;
    district    = district    || null;
    constituncy = constituncy || null;
    sttnname    = sttnname    || null;
    category    = category    || null;
    sttntype    = sttntype    || null;

    latitude    = latitude    || null;
    longitude   = longitude   || null;

    // numeric conversion for coords
    xcoord = xcoord !== undefined && xcoord !== null && xcoord !== '' ? Number(xcoord) : null;
    ycoord = ycoord !== undefined && ycoord !== null && ycoord !== '' ? Number(ycoord) : null;
    shape  = shape  || null;   // EWKB hex string

    let sql, params;

    // CASE 1: geometry present → update all 5 fields
    if (xcoord !== null && ycoord !== null && shape) {
      sql = `
        UPDATE sde.station_test
        SET
          distkm       = $1,
          distm        = $2,
          state        = $3,
          district     = $4,
          constituncy  = $5,
          sttnname     = $6,
          category     = $7,
          sttntype     = $8,

          latitude     = $9,
          longitude    = $10,
          xcoord       = $11,
          ycoord       = $12,
          shape        = ST_GeomFromEWKB(decode($13, 'hex')),

          modified_date = NOW()
        WHERE objectid = $14
        RETURNING *;
      `;

      params = [
        distkm,
        distm,
        state,
        district,
        constituncy,
        sttnname,
        category,
        sttntype,
        latitude,
        longitude,
        xcoord,
        ycoord,
        shape,   // EWKB hex string
        id
      ];
    }
    // CASE 2: no geometry in payload → only attributes
    else {
      sql = `
        UPDATE sde.station_test
        SET
          distkm       = $1,
          distm        = $2,
          state        = $3,
          district     = $4,
          constituncy  = $5,
          sttnname     = $6,
          category     = $7,
          sttntype     = $8,
          modified_date = NOW()
        WHERE objectid = $9
        RETURNING *;
      `;

      params = [
        distkm,
        distm,
        state,
        district,
        constituncy,
        sttnname,
        category,
        sttntype,
        id
      ];
    }

    const { rows, rowCount } = await pool.query(sql, params);
    if (!rowCount) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('❌ PUT /api/edit/stations error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// DELETE
app.delete('/api/edit/stations/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { rowCount } = await pool.query(
      `DELETE FROM sde.station_test WHERE objectid=$1`,
      [id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    console.error('❌ DELETE station error:', e);
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

// VALIDATE station code from master table
app.get('/api/station_codes/:code', async (req, res) => {
  try {
    let code = String(req.params.code || '').trim().toUpperCase();

    if (!code) {
      return res.status(400).json({ error: 'Station code is required.' });
    }

    const sql = `
      SELECT
        objectid,
        station_code,
        station_name,
        zone_code,
        division_code,
        category,
        station_valid_from,
        station_valid_upto,
        transaction_date_time
      FROM sde.station_1_code
      WHERE UPPER(station_code) = $1
      ORDER BY station_valid_from DESC
      LIMIT 1;
    `;

    const { rows } = await pool.query(sql, [code]);

    if (!rows.length) {
      return res.status(404).json({ error: 'Station code not found' });
    }

    res.json(rows[0]);
  } catch (e) {
    console.error('❌ /api/station_codes/:code error:', e);
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

/* -----------------------------------------------------------
   2️⃣  TRACKS
----------------------------------------------------------- */
app.get('/api/tracks', async (req, res) => {
  try {
    const { where, params } = parseBbox(req.query.bbox);
    const sql = `
      SELECT jsonb_build_object(
        'type','FeatureCollection',
        'features',COALESCE(jsonb_agg(
          jsonb_build_object(
            'type','Feature',
            'id',objectid,
            'properties',jsonb_build_object('objectid',objectid),
            'geometry',ST_AsGeoJSON(shape)::jsonb
          )
        ),'[]'::jsonb)
      ) AS geojson
      FROM (
        SELECT objectid,shape
        FROM sde.dli_track_1_test
        WHERE ${where}
        ORDER BY objectid
        LIMIT 20000
      ) t;
    `;
    const { rows } = await pool.query(sql, params);
    res.json(rows[0]?.geojson || { type: 'FeatureCollection', features: [] });
  } catch (e) {
    console.error('❌ /api/tracks error:', e);
    res.status(500).json({ error: e.message });
  }
});

/* -----------------------------------------------------------
   3️⃣  KM POSTS
----------------------------------------------------------- */
app.get('/api/km_posts', async (req, res) => {
  try {
    const { where, params } = parseBbox(req.query.bbox);

    const sql = `
      SELECT jsonb_build_object(
        'type','FeatureCollection',
        'features', COALESCE(jsonb_agg(
          jsonb_build_object(
            'type','Feature',
            'id', objectid,
            'properties', jsonb_build_object(
              'kmpostno', kmpostno,
              'line',     line,
              'railway',  railway
            ),
            'geometry', ST_AsGeoJSON(shape)::jsonb
          )
        ), '[]'::jsonb)
      ) AS geojson
      FROM (
        SELECT
          objectid,
          kmpostno,
          line,
          railway,
          shape
        FROM sde.km_post_test
        WHERE ${where}
        ORDER BY objectid
        LIMIT 20000
      ) t;
    `;

    const { rows } = await pool.query(sql, params);
    res.json(rows[0]?.geojson || { type: 'FeatureCollection', features: [] });
  } catch (e) {
    console.error('❌ /api/km_posts error:', e);
    res.status(500).json({ error: e.message });
  }
});
/* -----------------------------------------------------------
   LAND PLAN ON TRACK (polygons)
   Frontend: GET /api/land_plan_on_track?bbox=minx,miny,maxx,maxy
----------------------------------------------------------- */
app.get('/api/land_plan_on_track', async (req, res) => {
  try {
    const { where, params } = parseBbox(req.query.bbox);

    const sql = `
      SELECT jsonb_build_object(
        'type','FeatureCollection',
        'features', COALESCE(jsonb_agg(
          jsonb_build_object(
            'type','Feature',
            'id', objectid,
            'properties', to_jsonb(t) - 'shape',
            'geometry', ST_AsGeoJSON(shape)::jsonb
          )
        ), '[]'::jsonb)
      ) AS geojson
      FROM (
        SELECT
          objectid,
          gisid,
          asset_id,
          linedetail,
          tmssection,
          division,
          railway,
          city,
          district,
          state,
          imageno,
          disttokm,
          disttom,
          mapsheetno,
          route,
          remarks,
          distfromkm,
          distfromm,
          xcoord,
          ycoord,
          valid,
          unit_type,
          unit_code,
          unit_name,
          status,
          created_date,
          modified_date,
          shape
        FROM sde.land_plan_on_track_test
        WHERE ${where}
        ORDER BY objectid
        LIMIT 5000   -- cap result size for performance
      ) t;
    `;

    const { rows } = await pool.query(sql, params);
    res.json(rows[0]?.geojson || { type: 'FeatureCollection', features: [] });
  } catch (e) {
    console.error('❌ /api/land_plan_on_track error:', e);
    res.status(500).json({ error: e.message || 'Server error' });
  }
});


/** ---------------- INDIA BOUNDARY (polygons, bottom-most) ---------------- **/
app.get('/api/india_boundary', async (req, res) => {
  try {
    const bbox = req.query.bbox;
    const zoom = Number(req.query.z || 5);

    let where = 'shape IS NOT NULL';
    const params = [];

    if (bbox) {
      const parts = String(bbox).split(',').map(Number);
      if (parts.length !== 4 || parts.some(Number.isNaN)) {
        return res.status(400).json({ error: 'Invalid bbox. Use minX,minY,maxX,maxY (EPSG:4326).' });
      }
      // Fast bbox-only check (uses GiST index)
      where += ' AND shape && ST_MakeEnvelope($1,$2,$3,$4,4326)';
      params.push(...parts);
    }

    // Choose a simplify tolerance based on zoom
    // (0 = no simplify = full detail)
    let tol = 0;
    if (zoom <= 4)      tol = 0.5;
    else if (zoom <= 6) tol = 0.1;
    else if (zoom <= 8) tol = 0.02;
    else                tol = 0;   // high zoom → full detail

    // We only simplify when tol > 0
    const geomExpr = tol > 0
      ? `ST_SimplifyPreserveTopology(shape, ${tol})`
      : `shape`;

    const sql = `
      SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(jsonb_agg(
          jsonb_build_object(
            'type', 'Feature',
            'id', objectid,
            'properties', jsonb_build_object(
              'objectid', objectid,
              'b_length', b_length,
              'b_area', b_area
            ),
            'geometry', ST_AsGeoJSON(${geomExpr})::jsonb
          )
        ), '[]'::jsonb)
      ) AS geojson
      FROM (
        SELECT objectid, b_length, b_area, ${geomExpr} AS shape
        FROM sde.india_boundry_test
        WHERE ${where}
      ) t;
    `;

    const { rows } = await pool.query(sql, params);
    res.json(rows[0]?.geojson || { type: 'FeatureCollection', features: [] });

  } catch (e) {
    console.error('❌ /api/india_boundary error:', e);
    res.status(500).json({ error: e.message || 'Server error' });
  }
});


// -----------------------------------------------------------
// Serve static HTML and JS last
// -----------------------------------------------------------
app.use(express.static(path.join(__dirname)));

// JSON 404 for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found', path: req.originalUrl });
});

// -----------------------------------------------------------
// -----------------------------------------------------------
const port = 4000; // force 4000 again
app.listen(port, () => {
  console.log(`✅ API & site running at http://localhost:${port}`);
  console.log(`   Test km_posts: http://localhost:${port}/api/km_posts?bbox=68,6,97,37`);
});


/* -----------------------------------------------------------
   DB-SIDE PERFORMANCE (run once in Postgres)
   These help APIs feel much faster for spatial + code queries.
--------------------------------------------------------------
-- 1) Spatial index on station_test
-- CREATE INDEX IF NOT EXISTS station_test_shape_gist
--   ON sde.station_test
--   USING GIST (shape);

-- 2) Spatial index on tracks
-- CREATE INDEX IF NOT EXISTS dli_track_1_test_shape_gist
--   ON sde.dli_track_1_test
--   USING GIST (shape);

-- 3) Spatial index on km_post
-- CREATE INDEX IF NOT EXISTS km_post_shape_gist
--   ON sde.km_post
--   USING GIST (shape);

-- 4) Spatial index on india_boundry
-- CREATE INDEX IF NOT EXISTS india_boundry_shape_gist
--   ON sde.india_boundry
--   USING GIST (shape);

-- 5) B-tree index for station_code validation
-- CREATE INDEX IF NOT EXISTS station_1_code_station_code_idx
--   ON sde.station_1_code (UPPER(station_code));
----------------------------------------------------------- */

