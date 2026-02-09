const pool = require('../config/db');

async function getTracksGeoJSON(where, params, divSql) {
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
  return rows[0]?.geojson || { type: "FeatureCollection", features: [] };
}

module.exports = { getTracksGeoJSON };
