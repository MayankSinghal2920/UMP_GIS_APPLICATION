const pool = require('../config/db');

async function getGeoJSON(tableName, where, params, extraSql = '') {
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
      FROM ${tableName}
      WHERE ${where} ${extraSql}
      ORDER BY objectid
      LIMIT 20000
    ) t;
  `;
  const { rows } = await pool.query(sql, params);
  return rows[0]?.geojson || { type: "FeatureCollection", features: [] };
}

module.exports = { getGeoJSON };
