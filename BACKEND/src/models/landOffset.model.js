const pool = require('../config/db');

async function getLandOffsetGeoJSON(where, params, divSql) {
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
      SELECT *
      FROM sde.land_offset_test
      WHERE ${where}${divSql}
      ORDER BY objectid
      LIMIT 20000
    ) t;
  `;
  const { rows } = await pool.query(sql, params);
  return rows[0]?.geojson || { type: "FeatureCollection", features: [] };
}

module.exports = { getLandOffsetGeoJSON };
