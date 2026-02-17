const pool = require('../config/db');

async function getIndiaBoundaryGeoJSON(where, params) {
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
      FROM sde.india_boundry
      WHERE ${where}
    ) t;
  `;

  const { rows } = await pool.query(sql, params);
  return rows[0]?.geojson;
}

module.exports = {
  getIndiaBoundaryGeoJSON,
};
