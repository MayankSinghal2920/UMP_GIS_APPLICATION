const express = require('express');
const router = express.Router();

const pool = require('../config/db');
const parseBbox = require('../utils/parseBbox');
const generateGUID = require('../utils/guid');


/**
 * STATIONS (GeoJSON for Leaflet layer)
 * GET /api/stations?bbox=minx,miny,maxx,maxy&division=DLI
 */
router.get('/stations', async (req, res) => {
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
        WHERE ${where}${divSql}
        ORDER BY objectid
        LIMIT 20000
      ) t;
    `;

    const { rows } = await pool.query(sql, params);

    res.json(rows[0]?.geojson || {
      type: 'FeatureCollection',
      features: []
    });

  } catch (e) {
    console.error('❌ /api/stations error:', e);
    res.status(500).json({ error: e.message || 'Server error' });
  }
});


// GET /api/edit/stations?bbox=minx,miny,maxx,maxy&page=1&pageSize=10&q=ndls&division=DLI
router.get('/edit/stations', async (req, res) => {
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


// GET single row (send lat/lon too)
// GET single station row (optionally filtered by division)
// GET /api/edit/stations/:id[?division=DLI]
// GET /api/edit/stations/:id?division=DLI
router.get('/edit/stations/:id', async (req, res) => {
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


// CREATE STATION
// CREATE STATION (division enforced from querystring)
// CREATE STATION
// POST /api/edit/stations?division=DLI
router.post('/edit/stations', async (req, res) => {
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
router.put('/edit/stations/:id', async (req, res) => {
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
router.delete('/edit/stations/:id', async (req, res) => {
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
router.get('/station_codes/:code', async (req, res) => {
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

module.exports = router;
