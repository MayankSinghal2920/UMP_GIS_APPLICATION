const pool = require('../../../../../config/postgres');

function normalizeDivision(value) {
  const raw = String(value || '').trim();
  const normalized = raw.toLowerCase();
  if (
    normalized === 'centre for railway information systems' ||
    normalized === 'delhi' ||
    normalized === 'delhi division'
  ) {
    return 'DLI';
  }
  return raw;
}

function normalizeDivisionSql(expression) {
  return `REGEXP_REPLACE(UPPER(COALESCE(${expression}::text, '')), '[^A-Z0-9]', '', 'g')`;
}

function buildDivisionWhereClause(columnName, paramIndex) {
  return `${normalizeDivisionSql(columnName)} = ${normalizeDivisionSql(`$${paramIndex}`)}`;
}

async function getLayerGeoJSON(layerConfig, whereSql, params, division) {
  let divisionSql = '';

  if (division && !layerConfig.ignoreDivision) {
    params.push(normalizeDivision(division));
    divisionSql = ` AND ${buildDivisionWhereClause('division', params.length)}`;
  }

  const sql = `
    SELECT jsonb_build_object(
      'type','FeatureCollection',
      'features', COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'type','Feature',
            'id', ${layerConfig.idColumn},
            'properties', to_jsonb(t) - '${layerConfig.geometryColumn}',
            'geometry', ST_AsGeoJSON(${layerConfig.geometryColumn})::jsonb
          )
        ),
        '[]'::jsonb
      )
    ) AS geojson
    FROM (
      SELECT *
      FROM ${layerConfig.table}
      WHERE ${whereSql} ${divisionSql}
      LIMIT 20000
    ) t;
  `;

  const { rows } = await pool.query(sql, params);
  return rows[0]?.geojson;
}

async function getDivisionBufferGeoJSON(division) {
  const normalizedDivision = normalizeDivision(division);
  const params = [];
  let divisionSql = '';

  if (normalizedDivision) {
    params.push(normalizedDivision);
    divisionSql = `AND ${buildDivisionWhereClause('division', params.length)}`;
  }

  const sql = `
    SELECT jsonb_build_object(
      'type','FeatureCollection',
      'features', COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'type','Feature',
            'id', objectid,
            'properties', to_jsonb(t) - 'shape',
            'geometry', ST_AsGeoJSON(shape)::jsonb
          )
        ),
        '[]'::jsonb
      )
    ) AS geojson
    FROM (
      SELECT *
      FROM sde.division_buffer
      WHERE shape IS NOT NULL ${divisionSql}
      LIMIT 1
    ) t;
  `;

  const { rows } = await pool.query(sql, params);
  return rows[0]?.geojson;
}

module.exports = { getLayerGeoJSON, getDivisionBufferGeoJSON };

