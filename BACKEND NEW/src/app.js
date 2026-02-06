require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const pool = require('./config/db');
const parseBbox = require('./utils/parseBbox');
const generateGUID = require('./utils/guid');
const stationsRoutes = require('./routes/stations.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const authRoutes = require('./routes/auth.routes');



const app = express();

// -------------------- MIDDLEWARE --------------------
app.disable('x-powered-by');
app.use(cors());
app.use(express.json());
// Gzip responses -> faster over network
app.use(compression());
app.use('/api', stationsRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', authRoutes);



app.use(express.json());   // 👈 REQUIRED
app.use(express.urlencoded({ extended: true }));



// 🩺 Health route
app.get('/__health', (req, res) => {
  res.json({ ok: true, port: Number(process.env.PORT || 4000) });
});



/* -----------------------------------------------------------
   2️⃣  TRACKS
----------------------------------------------------------- */
app.get('/api/tracks', async (req, res) => {
  try {
    const { where, params } = parseBbox(req.query.bbox);
    const division = String(req.query.division || '').trim();
let divSql = '';
if (division) {
  params.push(division);
  divSql = ` AND UPPER(division) = UPPER($${params.length})`;
}

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
        WHERE ${where}${divSql}
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
    const division = String(req.query.division || '').trim();
    let divSql = '';
    if (division) {
      params.push(division);
      divSql = ` AND UPPER(division) = UPPER($${params.length})`;
    }

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
              'railway',  railway,
               'status',   status
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
          status,
          shape
        FROM sde.km_post_test
        WHERE ${where}${divSql}
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

    const division = String(req.query.division || '').trim();
    let divSql = '';
    if (division) {
      params.push(division);
      divSql = ` AND UPPER(division) = UPPER($${params.length})`;
    }

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
          objectid, gisid, asset_id, linedetail, tmssection, division, railway, city, district, state,
          imageno, disttokm, disttom, mapsheetno, route, remarks, distfromkm, distfromm,
          xcoord, ycoord, valid, unit_type, unit_code, unit_name, status, created_date, modified_date, shape
        FROM sde.land_plan_on_track_test
        WHERE ${where}${divSql}
        ORDER BY objectid
        LIMIT 5000
      ) t;
    `;

    const { rows } = await pool.query(sql, params);
    res.json(rows[0]?.geojson || { type: 'FeatureCollection', features: [] });
  } catch (e) {
    console.error('❌ /api/land_plan_on_track error:', e);
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

/* -----------------------------------------------------------
   4️⃣  LAND PLAN ON TRACK – EDIT API
   Table: sde.land_plan_on_track_test
----------------------------------------------------------- */

// GET /api/edit/landplan?bbox=minx,miny,maxx,maxy&page=1&pageSize=10&q=abc&division=DLI
app.get('/api/edit/landplan', async (req, res) => {
  try {
    
    const { bbox, page = 1, pageSize = 10, q = '', division = '' } = req.query;

    let where = 'shape IS NOT NULL';
    const params = [];

    // bbox filter
    if (bbox) {
      const parts = String(bbox).split(',').map(Number);
      if (parts.length !== 4 || parts.some(Number.isNaN)) {
        return res.status(400).json({ error: 'Invalid bbox. Use minX,minY,maxX,maxY (EPSG:4326).' });
      }
      params.push(...parts); // $1..$4
      where += ` AND ST_Intersects(shape, ST_MakeEnvelope($1,$2,$3,$4,4326))`;
    }

    // ✅ division filter (exact match, case-insensitive)
    const div = String(division || '').trim();
    if (div) {
      params.push(div);
      where += ` AND UPPER(division) = UPPER($${params.length})`;
    }

    // search: by TMS Section / Division / Railway (LIKE)
    if (q && String(q).trim()) {
      params.push(`%${q}%`);
      const i = params.length;
      where += ` AND (
        LOWER(tmssection) LIKE LOWER($${i})
        OR LOWER(division) LIKE LOWER($${i})
        OR LOWER(railway)  LIKE LOWER($${i})
      )`;
    }

    // total
    const totalSql = `
      SELECT COUNT(*)::int AS n
      FROM sde.land_plan_on_track_test
      WHERE ${where};
    `;
    const { rows: trows } = await pool.query(totalSql, params);
    const total = trows[0]?.n || 0;

    // page slice
    const p = Math.max(1, parseInt(page, 10));
    const ps = Math.max(1, Math.min(200, parseInt(pageSize, 10)));
    const offset = (p - 1) * ps;

    const listSql = `
      SELECT
        objectid,
        railway,
        division,
        tmssection,
        distfromkm,
        distfromm,
        disttokm,
        disttom
      FROM sde.land_plan_on_track_test
      WHERE ${where}
      ORDER BY objectid
      LIMIT ${ps} OFFSET ${offset};
    `;
    const { rows } = await pool.query(listSql, params);

    res.json({ rows, total });
  } catch (e) {
    console.error('❌ /api/edit/landplan (list) error:', e);
    res.status(500).json({ error: e.message || 'Server error' });
  }
});


// GET ONE: GET /api/edit/landplan/:id
app.get('/api/edit/landplan/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);

    const { rows } = await pool.query(
      `
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
        -- full polygon geometry as GeoJSON
        ST_AsGeoJSON(shape)::json AS geom
      FROM sde.land_plan_on_track_test
      WHERE objectid = $1
      `,
      [id]
    );

    if (!rows.length) return res.status(404).json({ error: 'Not found' });

    res.json(rows[0]);
  } catch (e) {
    console.error('❌ GET /api/edit/landplan/:id error:', e);
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

// CREATE: POST /api/edit/landplan?division=DLI
app.post('/api/edit/landplan', async (req, res) => {
  try {
    const divisionQS = String(req.query.division || '').trim();
    if (!divisionQS) return res.status(400).json({ error: 'division query param required' });

    let {
      gisid, asset_id, linedetail, tmssection,
      railway, city, district, state,
      imageno, disttokm, disttom, mapsheetno, route, remarks,
      distfromkm, distfromm, xcoord, ycoord,
      valid, unit_type, unit_code, unit_name, status,
      geom
    } = req.body || {};

    const division = divisionQS; // ✅ enforce

    if (geom && typeof geom === 'object') geom = JSON.stringify(geom);
    if (!geom) return res.status(400).json({ error: 'Geometry (geom) is required for new land plan polygon.' });

    // normalize
    gisid = gisid || null; asset_id = asset_id || null; linedetail = linedetail || null; tmssection = tmssection || null;
    railway = railway || null; city = city || null; district = district || null; state = state || null;
    imageno = imageno || null; disttokm = disttokm || null; disttom = disttom || null; mapsheetno = mapsheetno || null;
    route = route || null; remarks = remarks || null; distfromkm = distfromkm || null; distfromm = distfromm || null;
    valid = valid || null; unit_type = unit_type || null; unit_name = unit_name || null; status = status || null;

    xcoord = xcoord === '' || xcoord == null ? null : Number(xcoord);
    ycoord = ycoord === '' || ycoord == null ? null : Number(ycoord);
    unit_code = unit_code === '' || unit_code == null ? null : Number(unit_code);

    const sql = `
      INSERT INTO sde.land_plan_on_track_test
      (
        objectid,
        gisid, asset_id, linedetail, tmssection,
        division, railway, city, district, state,
        imageno, disttokm, disttom, mapsheetno, route, remarks,
        distfromkm, distfromm, xcoord, ycoord,
        valid, unit_type, unit_code, unit_name, status,
        created_date, modified_date,
        shape
      )
      VALUES (
        (SELECT COALESCE(MAX(objectid), 0) + 1 FROM sde.land_plan_on_track_test),
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,
        NOW(), NOW(),
        ST_SetSRID(ST_GeomFromGeoJSON($25), 4326)
      )
      RETURNING objectid, gisid, asset_id, route, tmssection, division, railway, state, district;
    `;

    // ✅ exactly 25 params (matches $1..$25)
    const params = [
      gisid, asset_id, linedetail, tmssection,
      division, railway, city, district, state,
      imageno, disttokm, disttom, mapsheetno, route, remarks,
      distfromkm, distfromm, xcoord, ycoord,
      valid, unit_type, unit_code, unit_name,
      status,
      geom
    ];

    const { rows } = await pool.query(sql, params);
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error('❌ POST /api/edit/landplan error:', e);
    res.status(500).json({ error: e.message || 'Server error' });
  }
});



// UPDATE: PUT /api/edit/landplan/:id
// Attributes + optional geometry (geom = GeoJSON)
app.put('/api/edit/landplan/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);

    let {
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
      geom       // optional GeoJSON
    } = req.body || {};

    // Normalise
    gisid       = gisid       || null;
    asset_id    = asset_id    || null;
    linedetail  = linedetail  || null;
    tmssection  = tmssection  || null;
    division    = division    || null;
    railway     = railway     || null;
    city        = city        || null;
    district    = district    || null;
    state       = state       || null;
    imageno     = imageno     || null;
    disttokm    = disttokm    || null;
    disttom     = disttom     || null;
    mapsheetno  = mapsheetno  || null;
    route       = route       || null;
    remarks     = remarks     || null;
    distfromkm  = distfromkm  || null;
    distfromm   = distfromm   || null;
    valid       = valid       || null;
    unit_type   = unit_type   || null;
    unit_name   = unit_name   || null;
    status      = status      || null;

    xcoord = xcoord === '' || xcoord == null ? null : Number(xcoord);
    ycoord = ycoord === '' || ycoord == null ? null : Number(ycoord);
    unit_code = unit_code === '' || unit_code == null ? null : Number(unit_code);

    if (geom && typeof geom === 'object') {
      geom = JSON.stringify(geom);
    }

    let sql, params;

    // CASE 1: update attributes + geometry
    if (geom) {
      sql = `
        UPDATE sde.land_plan_on_track_test
        SET
          gisid       = $1,
          asset_id    = $2,
          linedetail  = $3,
          tmssection  = $4,
          division    = $5,
          railway     = $6,
          city        = $7,
          district    = $8,
          state       = $9,
          imageno     = $10,
          disttokm    = $11,
          disttom     = $12,
          mapsheetno  = $13,
          route       = $14,
          remarks     = $15,
          distfromkm  = $16,
          distfromm   = $17,
          xcoord      = $18,
          ycoord      = $19,
          valid       = $20,
          unit_type   = $21,
          unit_code   = $22,
          unit_name   = $23,
          status      = $24,
          modified_date = NOW(),
          shape       = ST_SetSRID(ST_GeomFromGeoJSON($25), 4326)
        WHERE objectid = $26
        RETURNING *;
      `;
      params = [
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
        geom,
        id
      ];
    }
    // CASE 2: update attributes only
    else {
      sql = `
        UPDATE sde.land_plan_on_track_test
        SET
          gisid       = $1,
          asset_id    = $2,
          linedetail  = $3,
          tmssection  = $4,
          division    = $5,
          railway     = $6,
          city        = $7,
          district    = $8,
          state       = $9,
          imageno     = $10,
          disttokm    = $11,
          disttom     = $12,
          mapsheetno  = $13,
          route       = $14,
          remarks     = $15,
          distfromkm  = $16,
          distfromm   = $17,
          xcoord      = $18,
          ycoord      = $19,
          valid       = $20,
          unit_type   = $21,
          unit_code   = $22,
          unit_name   = $23,
          status      = $24,
          modified_date = NOW()
        WHERE objectid = $25
        RETURNING *;
      `;
      params = [
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
        id
      ];
    }

    const { rows, rowCount } = await pool.query(sql, params);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });

    res.json(rows[0]);
  } catch (e) {
    console.error('❌ PUT /api/edit/landplan/:id error:', e);
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

// DELETE: DELETE /api/edit/landplan/:id
app.delete('/api/edit/landplan/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { rowCount } = await pool.query(
      `DELETE FROM sde.land_plan_on_track_test WHERE objectid = $1`,
      [id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    console.error('❌ DELETE /api/edit/landplan/:id error:', e);
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// LAND OFFSET LINES  (sde.land_offset_test)
// GET /api/land_offset?bbox=minX,minY,maxX,maxY[&limit=...]
// Returns GeoJSON FeatureCollection of MultiLineString/LineString
// ---------------------------------------------------------------------------
app.get('/api/land_offset', async (req, res) => {
  try {
    const bboxStr = req.query.bbox || '';
    const parts   = bboxStr.split(',').map(Number);

    if (parts.length !== 4 || parts.some(n => Number.isNaN(n))) {
      return res.status(400).json({ error: 'Invalid bbox. Use minX,minY,maxX,maxY' });
    }

    const [minX, minY, maxX, maxY] = parts;

    // Limit number of features returned in one go
    let limit = Number(req.query.limit) || 5000;
    if (!Number.isFinite(limit) || limit <= 0) limit = 5000;
    if (limit > 20000) limit = 20000;

    // ✅ division filter (optional) — MUST be before SQL
    const div = String(req.query.division || '').trim();

    const sql = `
      SELECT
        objectid,
        railway,
        division,
        tmssection,
        distkm,
        distm,
        stationfro,
        stationto,
        route,
        status,
        ST_AsGeoJSON(shape)::json AS geom
      FROM sde.land_offset_test
      WHERE
        shape IS NOT NULL
        AND shape && ST_MakeEnvelope($1, $2, $3, $4, 4326)
        ${div ? `AND UPPER(division) = UPPER($5)` : ``}
      ORDER BY railway, division, tmssection, distkm, distm
      LIMIT $${div ? 6 : 5};
    `;

    const queryParams = div
      ? [minX, minY, maxX, maxY, div, limit]
      : [minX, minY, maxX, maxY, limit];

    const { rows } = await pool.query(sql, queryParams);

    const features = rows
      .filter(r => r.geom)
      .map(r => ({
        type: 'Feature',
        geometry: r.geom,
        properties: {
          objectid:    r.objectid,
          railway:     r.railway,
          division:    r.division,
          tmssection:  r.tmssection,
          distkm:      r.distkm,
          distm:       r.distm,
          stationfro:  r.stationfro,
          stationto:   r.stationto,
          route:       r.route,
          status:      r.status
        }
      }));

    res.json({
      type: 'FeatureCollection',
      features
    });
  } catch (err) {
    console.error('Error in /api/land_offset:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/api/land_boundary', async (req, res) => {
  try {
    const bboxStr = req.query.bbox || '';
    const parts   = bboxStr.split(',').map(Number);

    if (parts.length !== 4 || parts.some(n => Number.isNaN(n))) {
      return res.status(400).json({ error: 'Invalid bbox. Use minX,minY,maxX,maxY' });
    }

    const [minX, minY, maxX, maxY] = parts;

    // Limit number of features returned in one go
    let limit = Number(req.query.limit) || 5000;
    if (!Number.isFinite(limit) || limit <= 0) limit = 5000;
    if (limit > 20000) limit = 20000;

    // ✅ division filter (optional)  <-- IMPORTANT: declared BEFORE sql
    const div = String(req.query.division || '').trim();

    const sql = `
      SELECT
        objectid,
        gisid,
        asset_id,
        railway,
        division,
        tmssection,
        distfromkm,
        distfromm,
        disttokm,
        disttom,
        fdetail,
        city,
        district,
        state,
        route,
        valid,
        status,
        remark,
        constituncy,
        xcoord,
        ycoord,
        ST_AsGeoJSON(shape)::json AS geom
      FROM sde.land_boundary_test
      WHERE
        shape IS NOT NULL
        AND shape && ST_MakeEnvelope($1, $2, $3, $4, 4326)
        ${div ? `AND UPPER(division) = UPPER($5)` : ``}
      ORDER BY railway, division, tmssection, distfromkm, distfromm
      LIMIT $${div ? 6 : 5};
    `;

    const queryParams = div
      ? [minX, minY, maxX, maxY, div, limit]
      : [minX, minY, maxX, maxY, limit];

    const { rows } = await pool.query(sql, queryParams);

    const features = rows
      .filter(r => r.geom)
      .map(r => ({
        type: 'Feature',
        geometry: r.geom,
        properties: {
          objectid:    r.objectid,
          gisid:       r.gisid,
          asset_id:    r.asset_id,
          railway:     r.railway,
          division:    r.division,
          tmssection:  r.tmssection,
          distfromkm:  r.distfromkm,
          distfromm:   r.distfromm,
          disttokm:    r.disttokm,
          disttom:     r.disttom,
          fdetail:     r.fdetail,
          city:        r.city,
          district:    r.district,
          state:       r.state,
          route:       r.route,
          valid:       r.valid,
          status:      r.status,
          remark:      r.remark,
          constituncy: r.constituncy,
          xcoord:      r.xcoord,
          ycoord:      r.ycoord
        }
      }));

    res.json({ type: 'FeatureCollection', features });
  } catch (err) {
    console.error('Error in /api/land_boundary:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/division_buffer?division=DLI&z=6
app.get('/api/division_buffer', async (req, res) => {
  try {
    const division = String(req.query.division || '').trim();
    if (!division) {
      return res.status(400).json({ error: 'division is required' });
    }

    const zoom = Number(req.query.z || 5);

    // simplify tolerance (same logic as india_boundary)
    let tol = 0;
    if (zoom <= 4)      tol = 0.5;
    else if (zoom <= 6) tol = 0.1;
    else if (zoom <= 8) tol = 0.02;
    else                tol = 0;

    const geomExpr = tol > 0
      ? `ST_SimplifyPreserveTopology(shape, ${tol})`
      : `shape`;

    const sql = `
      WITH q AS (
        SELECT
          objectid,
          ${geomExpr} AS g
        FROM sde.dli_buffer_1_copy
        WHERE UPPER(division) = UPPER($1)
      )
      SELECT
        jsonb_build_object(
          'type','FeatureCollection',
          'features', COALESCE(jsonb_agg(
            jsonb_build_object(
              'type','Feature',
              'id', objectid,
              'properties', jsonb_build_object(
                'objectid', objectid,
                'division', $1
              ),
              'geometry', ST_AsGeoJSON(g)::jsonb
            )
          ), '[]'::jsonb)
        ) AS geojson,
        ST_Extent(g) AS extent
      FROM q;
    `;

    const { rows } = await pool.query(sql, [division]);

    res.json({
      geojson: rows[0]?.geojson || { type: 'FeatureCollection', features: [] },
      extent: rows[0]?.extent   || null
    });

  } catch (e) {
    console.error('❌ /api/division_buffer error:', e);
    res.status(500).json({ error: 'Server error' });
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


app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found', path: req.originalUrl });
});


app.use((err, req, res, next) => {
  console.error('GLOBAL ERROR:', err);

  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});


// -----------------------------------------------------------
// Start server
// -----------------------------------------------------------

app.use(express.static(path.join(__dirname)));


module.exports = app;
