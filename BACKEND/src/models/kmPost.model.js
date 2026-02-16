const pool = require('../config/db');

async function getKmPostsGeoJSON(where, params, division) {
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
      SELECT *
      FROM sde.km_post
      WHERE ${where}${divSql}
    ) t;
  `;

  const { rows } = await pool.query(sql, params);
  return rows[0]?.geojson;
}

module.exports = {
  getKmPostsGeoJSON,
};
