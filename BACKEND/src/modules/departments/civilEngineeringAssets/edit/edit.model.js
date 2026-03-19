const pool = require('../../../../config/db');
const { irAssetDbPool } = require('../../../../config/db');
const generateGUID = require('../../../../utils/guid');

function splitQualifiedName(name) {
  const raw = String(name || '').trim();
  if (!raw) throw new Error('Table name is required');

  const parts = raw.split('.').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 1) return { schema: 'public', table: parts[0] };
  return { schema: parts[0], table: parts[1] };
}

async function getTableColumns(client, qualifiedName) {
  const { schema, table } = splitQualifiedName(qualifiedName);
  const sql = `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = $1
      AND table_name = $2
    ORDER BY ordinal_position
  `;

  const { rows } = await client.query(sql, [schema, table]);
  return rows.map((row) => String(row.column_name).trim());
}

async function getColumnDataType(client, qualifiedName, columnName) {
  const { schema, table } = splitQualifiedName(qualifiedName);
  const sql = `
    SELECT data_type
    FROM information_schema.columns
    WHERE table_schema = $1
      AND table_name = $2
      AND column_name = $3
    LIMIT 1
  `;

  const { rows } = await client.query(sql, [schema, table, columnName]);
  return String(rows[0]?.data_type || '').trim().toLowerCase();
}

async function getNextManualId(client, qualifiedName, columnName) {
  const dataType = await getColumnDataType(client, qualifiedName, columnName);
  const numericTypes = new Set([
    'smallint',
    'integer',
    'bigint',
    'decimal',
    'numeric',
    'real',
    'double precision',
  ]);

  const valueExpr = numericTypes.has(dataType)
    ? `${columnName}::bigint`
    : `NULLIF(REGEXP_REPLACE(${columnName}::text, '[^0-9]', '', 'g'), '')::bigint`;

  const sql = `SELECT COALESCE(MAX(${valueExpr}), 0) + 1 AS next_id FROM ${qualifiedName}`;
  const { rows } = await client.query(sql);
  return Number(rows[0]?.next_id || 1);
}

async function getByIdWithClient(client, config, id, division, lock = false) {
  const sql = `
    SELECT *
    FROM ${config.table}
    WHERE ${config.idColumn} = $1
      AND UPPER(division) = UPPER($2)
    ${lock ? 'FOR UPDATE' : ''}
  `;

  const { rows } = await client.query(sql, [id, division]);
  return rows[0];
}

async function getDraftAssignments(client, makerUserId, fallbackDivision) {
  const makerSql = `
    SELECT
      u.department_id,
      COALESCE(d.divcode, $2) AS division_code
    FROM user_master u
    LEFT JOIN div_master d ON u.div_id = d.div_id
    WHERE u.user_id = $1
    LIMIT 1
  `;

  const { rows: makerRows } = await client.query(makerSql, [makerUserId, fallbackDivision]);
  const maker = makerRows[0];

  if (!maker) {
    const err = new Error('Maker user not found');
    err.status = 404;
    throw err;
  }

  const assignmentSql = `
    SELECT
      MAX(CASE WHEN LOWER(u.user_type) = 'checker' THEN u.user_id END) AS checker_user_id,
      MAX(CASE WHEN LOWER(u.user_type) = 'approver' THEN u.user_id END) AS approver_user_id
    FROM user_master u
    LEFT JOIN div_master d ON u.div_id = d.div_id
    WHERE ($1::text IS NULL OR CAST(u.department_id AS text) = CAST($1 AS text))
      AND UPPER(COALESCE(d.divcode, '')) = UPPER($2)
  `;

  const { rows } = await client.query(assignmentSql, [maker.department_id ?? null, maker.division_code || fallbackDivision]);
  return {
    checkerUserId: rows[0]?.checker_user_id ? String(rows[0].checker_user_id).trim() : null,
    approverUserId: rows[0]?.approver_user_id ? String(rows[0].approver_user_id).trim() : null,
  };
}

function normalizeStationDraftPayload(data, originalRow) {
  const lat = Number(data?.lat ?? data?.latitude ?? data?.ycoord ?? originalRow?.latitude ?? originalRow?.ycoord);
  const lng = Number(data?.lng ?? data?.lon ?? data?.longitude ?? data?.xcoord ?? originalRow?.longitude ?? originalRow?.xcoord);

  return {
    ...originalRow,
    ...data,
    sttntype: data?.sttntype ?? data?.stationtype ?? originalRow?.sttntype,
    constituncy: data?.constituncy ?? data?.constituency ?? originalRow?.constituncy,
    latitude: Number.isFinite(lat) ? lat : originalRow?.latitude ?? null,
    longitude: Number.isFinite(lng) ? lng : originalRow?.longitude ?? null,
    ycoord: Number.isFinite(lat) ? lat : originalRow?.ycoord ?? null,
    xcoord: Number.isFinite(lng) ? lng : originalRow?.xcoord ?? null,
  };
}

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

async function create(config, data, division) {
  const fields = [...config.insertFields];
  const values = [];

  const globalid = generateGUID();
  fields.unshift('globalid');
  values.push(globalid);

  let idSql = '';
  if (config.idStrategy === 'manual') {
    idSql = `(SELECT COALESCE(MAX(${config.idColumn}),0)+1 FROM ${config.table})`;
  }

  config.insertFields.forEach((field) => {
    values.push(data[field] ?? null);
  });

  fields.push('division');
  values.push(division);

  const placeholders = values.map((_, i) => `$${i + 1}`).join(',');

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

async function update(config, id, division, data) {
  const setClauses = [];
  const params = [];

  config.updateFields.forEach((field, index) => {
    setClauses.push(`${field} = $${index + 1}`);
    params.push(data[field] ?? null);
  });

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

async function remove(config, id, division) {
  const sql = `
    DELETE FROM ${config.table}
    WHERE ${config.idColumn} = $1
      AND UPPER(division) = UPPER($2)
  `;

  const { rowCount } = await pool.query(sql, [id, division]);
  return rowCount;
}

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

async function sendStationEdit(config, id, division, data, makerUserId) {
  if (!config.draftWorkflow) {
    const err = new Error('Draft workflow config not found for layer');
    err.status = 400;
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const originalRow = await getByIdWithClient(client, config, id, division, true);
    if (!originalRow) {
      await client.query('ROLLBACK');
      return null;
    }

    const currentStatus = originalRow?.status == null ? '' : String(originalRow.status).trim();
    if (currentStatus) {
      const err = new Error('Only maker-pending records can be sent through this workflow');
      err.status = 400;
      throw err;
    }

    const workflow = config.draftWorkflow;
    const draftTableColumns = await getTableColumns(client, workflow.table);
    const assignments = await getDraftAssignments(client, makerUserId, division);
    const merged = normalizeStationDraftPayload(data, originalRow);

    const record = {
      ...merged,
      division,
      [workflow.editIdColumn]: draftTableColumns.includes(workflow.editIdColumn)
        ? await getNextManualId(client, workflow.table, workflow.editIdColumn)
        : undefined,
      [workflow.originalIdColumn]: originalRow[config.idColumn],
      [workflow.statusColumn]: workflow.draftStatusValue,
      [workflow.checkerColumn]: assignments.checkerUserId,
      [workflow.approverColumn]: assignments.approverUserId,
      objectid: draftTableColumns.includes('objectid') ? await getNextManualId(client, workflow.table, 'objectid') : undefined,
      globalid: draftTableColumns.includes('globalid') ? generateGUID() : undefined,
    };

    const insertColumns = [];
    const placeholders = [];
    const values = [];

    draftTableColumns.forEach((column) => {
      if (column === config.geometry?.column) return;
      if (!Object.prototype.hasOwnProperty.call(record, column)) return;
      const value = record[column];
      if (value === undefined) return;
      insertColumns.push(column);
      values.push(value);
      placeholders.push(`$${values.length}`);
    });

    if (config.geometry?.enabled && draftTableColumns.includes(config.geometry.column)) {
      const x = Number(record[config.geometry.xField]);
      const y = Number(record[config.geometry.yField]);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        insertColumns.push(config.geometry.column);
        placeholders.push(`ST_SetSRID(ST_MakePoint(${x}, ${y}), 4326)`);
      }
    }

    const insertSql = `
      INSERT INTO ${workflow.table} (
        ${insertColumns.join(',')}
      )
      VALUES (
        ${placeholders.join(',')}
      )
      RETURNING *
    `;

    const { rows } = await client.query(insertSql, values);

    const updateOriginalSql = `
      UPDATE ${config.table}
      SET ${workflow.statusColumn} = $1
      WHERE ${config.idColumn} = $2
        AND UPPER(division) = UPPER($3)
      RETURNING *
    `;

    const { rows: originalRows } = await client.query(updateOriginalSql, [
      workflow.originalStatusValue,
      id,
      division,
    ]);

    await client.query('COMMIT');
    return {
      draft: rows[0],
      original: originalRows[0],
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  getById,
  create,
  update,
  remove,
  getTable,
  validateStation,
  sendStationEdit,
};

