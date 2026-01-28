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
        SELECT objectid, sttncode, sttnname, sttntype, division, railway, category, state, district, shape
        FROM sde.station_test
        WHERE ${where}${divSql}
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

// station count

app.get('/api/dashboard/stations/count', async (req, res) => {
  try {
    const division = String(req.query.division || '').trim();
    const type = String(req.query.type || 'TOTAL').toUpperCase();

    if (!division) {
      return res.status(400).json({ error: 'division is required' });
    }

    let statusCondition = '';
    const params = [division];

    if (type === 'MAKER') {
      params.push('Sent to Maker');
      statusCondition = `AND status = $2`;
    } else if (type === 'CHECKER') {
      params.push('Sent to Checker');
      statusCondition = `AND status = $2`;
    } else if (type === 'APPROVER') {
      params.push('Sent to Approver');
      statusCondition = `AND status = $2`;
    } else if (type === 'FINALIZED') {
      params.push('Approved');
      statusCondition = `AND status = $2`;
    }

    const sql = `
      SELECT COUNT(*)::int AS count
      FROM sde.station_test
      WHERE UPPER(division) = UPPER($1)
      ${statusCondition};
    `;

    const { rows } = await pool.query(sql, params);
    res.json({ count: rows[0].count });

  } catch (e) {
    console.error('❌ station count error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});



// GET /api/edit/stations?bbox=minx,miny,maxx,maxy&page=1&pageSize=10&q=ndls&division=DLI
app.get('/api/edit/stations', async (req, res) => {
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
    if (division) {
      params.push(division);
      where += ` AND UPPER(division) = UPPER($${params.length})`;
    }

    // search filter
    if (q) {
      params.push(`%${q}%`);
      const i = params.length;
      where += ` AND (
        LOWER(sttncode) LIKE LOWER($${i})
        OR LOWER(state) LIKE LOWER($${i})
        OR LOWER(district) LIKE LOWER($${i})
      )`;
    }
    // total
    const totalSql = `SELECT COUNT(*)::int AS n FROM sde.station_test WHERE ${where}`;
    const { rows: t } = await pool.query(totalSql, params);

    const ps = Math.min(200, Math.max(1, Number(pageSize)));
    const off = (Number(page)-1) * ps;

    const listSql = `
      SELECT objectid, sttncode, distkm, distm, state, district, division
      FROM sde.station_test
      WHERE ${where}
      ORDER BY objectid
      LIMIT ${ps} OFFSET ${off};
    `;

    const { rows } = await pool.query(listSql, params);
    res.json({ rows, total: t[0]?.n || 0 });
  } catch (e) {
    console.error('❌ /api/edit/stations error:', e);
    res.status(500).json({ error:e.message });
  }
});

// function mustDivision(req, res) {
//   // allow division from querystring primarily; fallback to body if needed
//   const div = String(req.query.division || (req.body && req.body.division) || '').trim();

//   if (!div) {
//     res.status(400).json({ error: 'division is required (send ?division=DLI)' });
//     return null;
//   }
//   return div;
// }
 

// GET single row (send lat/lon too)
// GET single station row (optionally filtered by division)
// GET /api/edit/stations/:id[?division=DLI]
// GET /api/edit/stations/:id?division=DLI
app.get('/api/edit/stations/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });

    const division = String(req.query.division || '').trim();
    if (!division) return res.status(400).json({ error: 'division query param required' });

    const sql = `
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
        xcoord,
        ycoord,
        latitude,
        longitude,
        CASE WHEN shape IS NOT NULL THEN ST_Y(shape::geometry) ELSE NULL END AS lat,
        CASE WHEN shape IS NOT NULL THEN ST_X(shape::geometry) ELSE NULL END AS lon
      FROM sde.station_test
      WHERE objectid = $1 AND UPPER(division) = UPPER($2)
    `;

    const { rows } = await pool.query(sql, [id, division]);

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

// CREATE STATION
// CREATE STATION (division enforced from querystring)
// CREATE STATION
// POST /api/edit/stations?division=DLI
app.post('/api/edit/stations', async (req, res) => {
  try {
    const division = String(req.query.division || '').trim();
    if (!division) return res.status(400).json({ error: 'division query param required' });

    let {
      sttncode, sttnname, sttntype,
      distkm, distm, state, district, constituncy,
      latitude, longitude, xcoord, ycoord,
      railway, category
    } = req.body || {};

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
    category    = category === '' ? null : category;

    const globalid = generateGUID();

    // WITH geometry
    if (xcoord != null && ycoord != null) {
      const sql = `
        INSERT INTO sde.station_test
        (
          objectid, globalid, sttncode, sttnname, sttntype,
          distkm, distm, state, district, constituncy,
          latitude, longitude, xcoord, ycoord,
          railway, division, category, shape
        )
        VALUES (
          (SELECT COALESCE(MAX(objectid), 0) + 1 FROM sde.station_test),
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
          ST_SetSRID(ST_MakePoint($18,$19), 4326)
        )
        RETURNING objectid, sttncode, division, railway, globalid;
      `;

      const params = [
        globalid,
        sttncode, sttnname, sttntype,
        distkm, distm, state, district, constituncy,
        latitude, longitude,
        xcoord, ycoord,
        railway,
        division,      // enforced
        category,
        xcoord, ycoord // point lon/lat
      ];

      const { rows } = await pool.query(sql, params);
      return res.status(201).json(rows[0]);
    }

    // NO geometry
    const sql = `
      INSERT INTO sde.station_test
      (
        objectid, globalid, sttncode, sttnname, sttntype,
        distkm, distm, state, district, constituncy,
        latitude, longitude, xcoord, ycoord,
        railway, division, category, shape
      )
      VALUES (
        (SELECT COALESCE(MAX(objectid), 0) + 1 FROM sde.station_test),
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
        NULL
      )
      RETURNING objectid, sttncode, division, railway, globalid;
    `;

    const params = [
      globalid,
      sttncode, sttnname, sttntype,
      distkm, distm, state, district, constituncy,
      latitude, longitude,
      xcoord, ycoord,
      railway,
      division,  // enforced
      category
    ];

    const { rows } = await pool.query(sql, params);
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error('❌ POST station error:', e);
    res.status(500).json({ error: e.message || 'Server error' });
  }
});




// UPDATE EXISTING STATION (attributes + optional geometry)
// UPDATE EXISTING STATION (division enforced from querystring)
app.put('/api/edit/stations/:id', async (req, res) => {
  try {
    const division = String(req.query.division || '').trim();
    if (!division)
      return res.status(400).json({ error:'division required' });

    const id = Number(req.params.id);

    let {
      distkm, distm, state, district, constituncy,
      sttnname, category, sttntype,
      latitude, longitude, xcoord, ycoord, shape
    } = req.body || {};

    let sql, params;

    if (shape && xcoord != null && ycoord != null) {
      sql = `
        UPDATE sde.station_test SET
          distkm=$1, distm=$2, state=$3, district=$4, constituncy=$5,
          sttnname=$6, category=$7, sttntype=$8,
          latitude=$9, longitude=$10, xcoord=$11, ycoord=$12,
          shape=ST_GeomFromEWKB(decode($13,'hex')),
          modified_date=NOW()
        WHERE objectid=$14 AND UPPER(division)=UPPER($15)
        RETURNING *;
      `;
      params = [
        distkm, distm, state, district, constituncy,
        sttnname, category, sttntype,
        latitude, longitude, xcoord, ycoord,
        shape, id, division
      ];
    } else {
      sql = `
        UPDATE sde.station_test SET
          distkm=$1, distm=$2, state=$3, district=$4, constituncy=$5,
          sttnname=$6, category=$7, sttntype=$8,
          modified_date=NOW()
        WHERE objectid=$9 AND UPPER(division)=UPPER($10)
        RETURNING *;
      `;
      params = [
        distkm, distm, state, district, constituncy,
        sttnname, category, sttntype,
        id, division
      ];
    }

    const { rows, rowCount } = await pool.query(sql, params);
    if (!rowCount) return res.status(404).json({ error:'Not found' });

    res.json(rows[0]);
  } catch (e) {
    console.error('❌ PUT station error:', e);
    res.status(500).json({ error:e.message });
  }
});


//DELETE
app.delete('/api/edit/stations/:id', async (req, res) => {
  try {
    const division = String(req.query.division || '').trim();
    if (!division)
      return res.status(400).json({ error:'division required' });

    const id = Number(req.params.id);

    const { rowCount } = await pool.query(
      `DELETE FROM sde.station_test
       WHERE objectid=$1 AND UPPER(division)=UPPER($2)`,
      [id, division]
    );

    if (!rowCount) return res.status(404).json({ error:'Not found' });
    res.json({ ok:true });
  } catch (e) {
    console.error('❌ DELETE station error:', e);
    res.status(500).json({ error:e.message });
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




app.post('/api/login', async (req, res) => {
  const { user_id, password } = req.body;

  // 1) Basic check
  if (!user_id || !password) {
    return res.status(400).json({ success: false, error: "Missing user_id or password" });
  }

  try {
    const sql = `
      SELECT 
        user_id,
        password,
        user_name,
        zone_code,       -- from DB
        division_code,   -- from DB
        department
      FROM user_master_copy
      WHERE user_id = $1
      LIMIT 1
    `;

    const result = await pool.query(sql, [user_id]);

    // 2) No such user
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: "Invalid user_id or password" });
    }

    const user = result.rows[0];

    // 3) Wrong password
    if (user.password !== password) {
      return res.status(401).json({ success: false, error: "Invalid user_id or password" });
    }

    // 4) SUCCESS
    return res.json({
      success: true,
      user: {
        user_id:    user.user_id,
        user_name:  user.user_name,
        railway:    user.zone_code,      // map zone_code → railway
        division:   user.division_code,  // map division_code → division
        department: user.department
      }
    });

  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});



// -----------------------------------------------------------
// Serve static HTML and JS last
// -----------------------------------------------------------
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});


// JSON 404 for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found', path: req.originalUrl });
});

// -----------------------------------------------------------
// Start server
// -----------------------------------------------------------

app.use(express.static(path.join(__dirname)));


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






