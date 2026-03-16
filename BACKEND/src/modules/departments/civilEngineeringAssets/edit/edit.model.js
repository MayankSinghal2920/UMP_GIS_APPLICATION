const pool = require('../../../../config/db');
const { irAssetDbPool } = require('../../../../config/db');
const generateGUID = require('../../../../utils/guid');

/* ================= GET BY ID ================= */

async function getById(config, id, division) {
  const sql = `
    SELECT *
    FROM ${config.table}
    WHERE ${config.idColumn} = $1
      AND UPPER(division) = UPPER($2)
  `;

  const { rows } = await pool.query(sql, [id, division]);
  return rows[0];
}

/* ================= CREATE ================= */

async function create(config, data, division) {
  const fields = [...config.insertFields];

  const values = [];
  const params = [];

  // Always add globalid
  const globalid = generateGUID();
  fields.unshift('globalid');
  values.push(globalid);

  // Manual objectid
  let idSql = '';
  if (config.idStrategy === 'manual') {
    idSql = `(SELECT COALESCE(MAX(${config.idColumn}),0)+1 FROM ${config.table})`;
  }

  // Prepare params
  config.insertFields.forEach((field) => {
    values.push(data[field] ?? null);
  });

  // Division
  fields.push('division');
  values.push(division);

  const placeholders = values.map((_, i) => `$${i + 1}`).join(',');

  let geometrySql = '';
  if (config.geometry?.enabled) {
    const x = data[config.geometry.xField];
    const y = data[config.geometry.yField];

    if (x != null && y != null) {
      geometrySql = `,
        ${config.geometry.column} = ST_SetSRID(ST_MakePoint(${x}, ${y}), 4326)
      `;
    }
  }

  const sql = `
    INSERT INTO ${config.table} (
      ${config.idColumn},
      ${fields.join(',')}
    )
    VALUES (
      ${idSql},
      ${placeholders}
    )  
      
    RETURNING *
  `;

  const { rows } = await pool.query(sql, values);
  return rows[0];
}

/* ================= UPDATE ================= */

async function update(config, id, division, data) {
  const setClauses = [];
  const params = [];

  config.updateFields.forEach((field, index) => {
    setClauses.push(`${field} = $${index + 1}`);
    params.push(data[field] ?? null);
  });

  // optional auto update timestamp
  if (config.modifiedDateColumn) {
    setClauses.push(`${config.modifiedDateColumn} = NOW()`);
  }

  params.push(id);
  params.push(division);

  const sql = `
    UPDATE ${config.table}
    SET ${setClauses.join(',')}
    WHERE ${config.idColumn} = $${params.length - 1}
      AND UPPER(division) = UPPER($${params.length})
    RETURNING *
  `;

  const { rows } = await pool.query(sql, params);
  return rows[0];
}

/* ================= DELETE ================= */

async function remove(config, id, division) {
  const sql = `
    DELETE FROM ${config.table}
    WHERE ${config.idColumn} = $1
      AND UPPER(division) = UPPER($2)
  `;

  const { rowCount } = await pool.query(sql, [id, division]);
  return rowCount;
}

/* ================= TABLE ================= */

async function getTable(config, page, pageSize, q, division) {
  const limit = Math.min(200, Math.max(1, Number(pageSize)));
  const offset = (Number(page) - 1) * limit;

  const params = [division];
  let where = `UPPER(division) = UPPER($1)`;

  if (q && config.searchableFields?.length) {
    params.push(`%${q}%`);

    const searchConditions = config.searchableFields
      .map((field) => `LOWER(${field}) LIKE LOWER($2)`)
      .join(' OR ');

    where += ` AND (${searchConditions})`;
  }

  const totalSql = `
    SELECT COUNT(*)::int AS total
    FROM ${config.table}
    WHERE ${where}
  `;

  const listSql = `
    SELECT *
    FROM ${config.table}
    WHERE ${where}
    ORDER BY ${config.idColumn}
    LIMIT ${limit} OFFSET ${offset}
  `;

  const { rows: totalRows } = await pool.query(totalSql, params);
  const { rows } = await pool.query(listSql, params);

  return {
    rows,
    total: totalRows[0]?.total || 0,
  };
}

/* ================= VALIDATE STATION ================= */

async function validateStation(config, stationCode) {
  if (!config.validation) {
    const err = new Error('Validation config not found for layer');
    err.status = 400;
    throw err;
  }

  const validationConfig = config.validation;
  const sql = `
    SELECT *
    FROM ${validationConfig.table}
    WHERE UPPER(station_code) = UPPER($1)
    ORDER BY station_valid_upto DESC, transaction_date_time DESC NULLS LAST
    LIMIT 1
  `;

  const { rows } = await irAssetDbPool.query(sql, [stationCode]);
  return rows[0];
}

module.exports = {
  getById,
  create,
  update,
  remove,
  getTable,
  validateStation,
};
