const express = require('express');
const cors = require('cors');
const compression = require('compression');
const { Pool } = require('pg');
const pool = require('./db/pool');
const parseBbox = require('./utils/parseBbox');
const generateGUID = require('./utils/guid');
const stationsRoutes = require('./routes/stations.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const authRoutes = require('./routes/auth.routes');



const app = express();

// @@ -13,818 +20,20 @@
app.use(express.json());
// Gzip responses -> faster over network
app.use(compression());
app.use('/api', stationsRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', authRoutes);


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



/* -----------------------------------------------------------
   DASHBOARD – BRIDGE START COUNT
   GET /api/dashboard/bridge-start/count
----------------------------------------------------------- */
app.get('/api/dashboard/bridge-start/count', async (req, res) => {
  try {
    const division = String(req.query.division || '').trim();
    const type = String(req.query.type || 'TOTAL').toUpperCase();

    if (!division) {
      return res.status(400).json({ error: 'division is required' });
    }

    const params = [division];
    let statusCondition = '';

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
      FROM sde.bridge_start_test
      WHERE UPPER(division) = UPPER($1)
      ${statusCondition};
    `;

    const { rows } = await pool.query(sql, params);

    res.json({ count: rows[0]?.count || 0 });

  } catch (err) {
    console.error('❌ bridge-start count error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});



/* -----------------------------------------------------------
   DASHBOARD – BRIDGE END COUNT
   GET /api/dashboard/bridge-end/count
----------------------------------------------------------- */
app.get('/api/dashboard/bridge-end/count', async (req, res) => {
  try {
    const division = String(req.query.division || '').trim();
    const type = String(req.query.type || 'TOTAL').toUpperCase();

    if (!division) {
      return res.status(400).json({ error: 'division is required' });
    }

    const params = [division];
    let statusCondition = '';

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
      FROM sde.bridge_end_test
      WHERE UPPER(division) = UPPER($1)
      ${statusCondition};
    `;

    const { rows } = await pool.query(sql, params);

    res.json({ count: rows[0]?.count || 0 });

  } catch (err) {
    console.error('❌ bridge-end count error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// -----------------------------------------------------------
// BRIDGE MINOR COUNT
// -----------------------------------------------------------
app.get('/api/dashboard/bridge-minor/count', async (req, res) => {
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
      FROM sde.bridge_minor_test
      WHERE UPPER(division) = UPPER($1)
      ${statusCondition};
    `;

    const { rows } = await pool.query(sql, params);
    res.json({ count: rows[0]?.count || 0 });

  } catch (e) {
    console.error('❌ bridge minor count error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});


// -----------------------------------------------------------
// LEVEL XING COUNT
// -----------------------------------------------------------
app.get('/api/dashboard/level-xing/count', async (req, res) => {
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
      FROM sde.levelxing_test
      WHERE UPPER(division) = UPPER($1)
      ${statusCondition};
    `;

    const { rows } = await pool.query(sql, params);
    res.json({ count: rows[0]?.count || 0 });

  } catch (e) {
    console.error('❌ level xing count error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});


// -----------------------------------------------------------
// ROAD OVER BRIDGE COUNT
// -----------------------------------------------------------
app.get('/api/dashboard/road-over-bridge/count', async (req, res) => {
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
      FROM sde.road_over_bridge_test
      WHERE UPPER(division) = UPPER($1)
      ${statusCondition};
    `;

    const { rows } = await pool.query(sql, params);
    res.json({ count: rows[0]?.count || 0 });

  } catch (e) {
    console.error('❌ road over bridge count error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// -----------------------------------------------------------
// RUB LHS COUNT
// -----------------------------------------------------------
app.get('/api/dashboard/rub-lhs/count', async (req, res) => {
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
      FROM sde.rub_lhs_test
      WHERE UPPER(division) = UPPER($1)
      ${statusCondition};
    `;

    const { rows } = await pool.query(sql, params);
    res.json({ count: rows[0]?.count || 0 });

  } catch (e) {
    console.error('❌ rub lhs count error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});


// -----------------------------------------------------------
// ROR COUNT
// -----------------------------------------------------------
app.get('/api/dashboard/ror/count', async (req, res) => {
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
      FROM sde.ror_test
      WHERE UPPER(division) = UPPER($1)
      ${statusCondition};
    `;

    const { rows } = await pool.query(sql, params);
    res.json({ count: rows[0]?.count || 0 });

  } catch (e) {
    console.error('❌ ror count error:', e);
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
// @@ -1696,122 +905,64 @@
// });




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

