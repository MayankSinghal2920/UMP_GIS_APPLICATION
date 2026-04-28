const pool = require("../../config/postgres");

async function getAllUsers() {
  const sql = `
    SELECT
      u.objectid,
      u.user_id,
      u.user_name,
      u.user_type,
      u.unit_type,
      u.unit_name,
      u.zone,
      u.division,
      COALESCE(dt.department, u.department_id) AS department_id,
      u.hrmsid,
      u.designation
    FROM user_master u
    LEFT JOIN (
      SELECT department_id, MIN(department) AS department
      FROM department_table
      GROUP BY department_id
    ) dt
      ON TRIM(u.department_id) = TRIM(dt.department_id)
    ORDER BY u.user_name
  `;

  const result = await pool.query(sql);
  return result.rows;
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

async function getUserByObjectId(client, objectid) {
  const sql = `
    SELECT
      u.objectid,
      u.user_id,
      u.user_name,
      u.user_type,
      u.unit_type,
      u.unit_name,
      u.zone,
      u.division,
      COALESCE(dt.department, u.department_id) AS department_id,
      u.hrmsid,
      u.designation
    FROM user_master u
    LEFT JOIN (
      SELECT department_id, MIN(department) AS department
      FROM department_table
      GROUP BY department_id
    ) dt
      ON TRIM(u.department_id) = TRIM(dt.department_id)
    WHERE u.objectid = $1
    LIMIT 1
  `;

  const result = await client.query(sql, [objectid]);
  return result.rows[0] || null;
}

async function getEditableUserByObjectId(objectid) {
  const sql = `
    SELECT
      u.objectid,
      u.user_id,
      u.user_name,
      u.user_type,
      u.unit_type,
      u.unit_name,
      u.zone,
      u.division,
      COALESCE(dt.department, u.department_id) AS department_id,
      u.hrmsid,
      u.designation
    FROM user_master u
    LEFT JOIN (
      SELECT department_id, MIN(department) AS department
      FROM department_table
      GROUP BY department_id
    ) dt
      ON TRIM(u.department_id) = TRIM(dt.department_id)
    WHERE u.objectid = $1
    LIMIT 1
  `;

  const result = await pool.query(sql, [objectid]);
  return result.rows[0] || null;
}

async function getNextUserObjectId(client) {
  const sql = `
    SELECT
      CASE
        WHEN pg_get_serial_sequence('user_master', 'objectid') IS NOT NULL
          THEN nextval(pg_get_serial_sequence('user_master', 'objectid'))
        WHEN pg_get_serial_sequence('sde.user_master', 'objectid') IS NOT NULL
          THEN nextval(pg_get_serial_sequence('sde.user_master', 'objectid'))
        ELSE (SELECT COALESCE(MAX(objectid), 0) + 1 FROM user_master)
      END AS next_id
  `;

  const { rows } = await client.query(sql);
  return Number(rows[0]?.next_id || 1);
}

async function findExistingUserByUserId(client, userId) {
  const sql = `
    SELECT objectid, user_id
    FROM user_master
    WHERE LOWER(TRIM(COALESCE(user_id, ''))) = LOWER(TRIM($1))
    LIMIT 1
  `;

  const result = await client.query(sql, [userId]);
  return result.rows[0] || null;
}

async function findExistingUserByUserIdExcludingObjectId(client, userId, objectid) {
  const sql = `
    SELECT objectid, user_id
    FROM user_master
    WHERE LOWER(TRIM(COALESCE(user_id, ''))) = LOWER(TRIM($1))
      AND objectid <> $2
    LIMIT 1
  `;

  const result = await client.query(sql, [userId, objectid]);
  return result.rows[0] || null;
}

async function resolveDepartmentId(client, departmentValue) {
  const normalizedValue = String(departmentValue || '').trim();
  if (!normalizedValue) return null;

  const sql = `
    SELECT department_id, department
    FROM department_table
    WHERE LOWER(TRIM(COALESCE(department, ''))) = LOWER(TRIM($1))
       OR TRIM(CAST(department_id AS text)) = TRIM($1)
    ORDER BY department
    LIMIT 1
  `;

  const result = await client.query(sql, [normalizedValue]);
  return result.rows[0] || null;
}

async function resolveDivisionMetadata(client, divisionValue) {
  const normalizedValue = String(divisionValue || '').trim();
  if (!normalizedValue) {
    return {
      divId: null,
      rlyId: null,
      divisionName: null,
    };
  }

  const sql = `
    SELECT div_id, rly_id, div_name
    FROM div_master
    WHERE LOWER(TRIM(COALESCE(div_name, ''))) = LOWER(TRIM($1))
    LIMIT 1
  `;

  const result = await client.query(sql, [normalizedValue]);
  const row = result.rows[0];

  return {
    divId: row?.div_id ?? null,
    rlyId: row?.rly_id ?? null,
    divisionName: row?.div_name ? String(row.div_name).trim() : normalizedValue,
  };
}

function getAllowedUnitTypes(userType) {
  switch (normalizeText(userType)) {
    case 'checker':
    case 'maker':
    case 'approver':
      return ['Divisional', 'PUs', 'Metro Kolkata'];
    case 'admin':
      return ['Divisional', 'CRIS', 'PUs', 'Metro Kolkata'];
    case 'super admin':
      return ['CRIS'];
    default:
      return [];
  }
}

function normalizeUnitType(value) {
  const normalized = normalizeText(value);
  return normalized === 'pus' ? 'pu' : normalized;
}

function requiresOrgFields(userType) {
  return ['checker', 'maker', 'approver'].includes(normalizeText(userType));
}

function buildUnitName({ unitType, unitName, zone, division }) {
  const normalizedUnitType = normalizeUnitType(unitType);
  if (normalizedUnitType === 'pu') {
    return String(unitName || '').trim() || null;
  }

  if (normalizedUnitType === 'divisional') {
    return String(division || zone || unitType || '').trim() || null;
  }

  return String(division || zone || unitType || '').trim() || null;
}

async function createUser(payload) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userName = String(payload?.user_name || '').trim();
    const userId = String(payload?.user_id || '').trim();
    const password = String(payload?.password || '').trim();
    const userType = String(payload?.user_type || '').trim();
    const unitType = String(payload?.unit_type || '').trim();
    const unitName = String(payload?.unit_name || '').trim();
    const zone = String(payload?.zone || '').trim();
    const division = String(payload?.division || '').trim();
    const department = String(payload?.department || '').trim();

    const allowedUnitTypes = getAllowedUnitTypes(userType);
    const orgFieldsRequired = requiresOrgFields(userType);
    const usesPuField = orgFieldsRequired && normalizeUnitType(unitType) === 'pu';
    const usesMetroMinimalFields = orgFieldsRequired && normalizeText(unitType) === 'metro kolkata';
    const usesDivisionFields =
      orgFieldsRequired && normalizeUnitType(unitType) !== 'pu' && !usesMetroMinimalFields;

    if (!userName || !userId || !password || !userType || !unitType) {
      const err = new Error('user_name, user_id, password, user_type and unit_type are required');
      err.status = 400;
      throw err;
    }

    if (!allowedUnitTypes.length) {
      const err = new Error('Unsupported user type');
      err.status = 400;
      throw err;
    }

    if (!allowedUnitTypes.some((value) => normalizeText(value) === normalizeText(unitType))) {
      const err = new Error('Invalid unit type for the selected user type');
      err.status = 400;
      throw err;
    }

    if (usesPuField && (!unitName || !department)) {
      const err = new Error('unit_name and department are required for PUs users');
      err.status = 400;
      throw err;
    }

    if (usesDivisionFields && (!zone || !division || !department)) {
      const err = new Error('zone, division and department are required for the selected user type');
      err.status = 400;
      throw err;
    }

    const existingUser = await findExistingUserByUserId(client, userId);
    if (existingUser) {
      const err = new Error('User ID already exists');
      err.status = 409;
      throw err;
    }

    const departmentRow =
      orgFieldsRequired && !usesMetroMinimalFields ? await resolveDepartmentId(client, department) : null;
    if (orgFieldsRequired && !departmentRow) {
      const err = new Error('Selected department was not found');
      err.status = 400;
      throw err;
    }

    const divisionMeta = usesDivisionFields ? await resolveDivisionMetadata(client, division) : {
      divId: null,
      rlyId: null,
      divisionName: null,
    };

    if (usesDivisionFields && !divisionMeta.divisionName) {
      const err = new Error('Selected division was not found');
      err.status = 400;
      throw err;
    }

    const objectid = await getNextUserObjectId(client);
    const normalizedUnitType = allowedUnitTypes.find(
      (value) => normalizeText(value) === normalizeText(unitType),
    ) || unitType;

    const insertSql = `
      INSERT INTO user_master (
        objectid,
        user_id,
        user_name,
        password,
        user_type,
        unit_type,
        unit_name,
        zone,
        division,
        department_id,
        hrmsid,
        designation,
        assigned_checker,
        assigned_layers,
        div_id,
        rly_id
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        NULL, NULL, NULL, NULL, $11, $12
      )
    `;

    await client.query(insertSql, [
      objectid,
      userId,
      userName,
      password,
      userType,
      normalizedUnitType,
      buildUnitName({
        unitType: normalizedUnitType,
        unitName: usesPuField ? unitName : '',
        zone: usesDivisionFields ? zone : '',
        division: usesDivisionFields ? divisionMeta.divisionName : '',
      }),
      usesDivisionFields ? zone : null,
      usesDivisionFields ? divisionMeta.divisionName : null,
      orgFieldsRequired && !usesMetroMinimalFields ? departmentRow.department_id : null,
      usesDivisionFields ? divisionMeta.divId : null,
      usesDivisionFields ? divisionMeta.rlyId : null,
    ]);

    const createdUser = await getUserByObjectId(client, objectid);

    await client.query("COMMIT");
    return createdUser;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function updateUser(objectid, payload) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingUser = await client.query(
      `
        SELECT objectid, password
        FROM user_master
        WHERE objectid = $1
        FOR UPDATE
      `,
      [objectid],
    );

    if (!existingUser.rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }

    const userName = String(payload?.user_name || '').trim();
    const userId = String(payload?.user_id || '').trim();
    const password = String(payload?.password || '').trim();
    const userType = String(payload?.user_type || '').trim();
    const unitType = String(payload?.unit_type || '').trim();
    const unitName = String(payload?.unit_name || '').trim();
    const zone = String(payload?.zone || '').trim();
    const division = String(payload?.division || '').trim();
    const department = String(payload?.department || '').trim();

    const allowedUnitTypes = getAllowedUnitTypes(userType);
    const orgFieldsRequired = requiresOrgFields(userType);
    const usesPuField = orgFieldsRequired && normalizeUnitType(unitType) === 'pu';
    const usesMetroMinimalFields = orgFieldsRequired && normalizeText(unitType) === 'metro kolkata';
    const usesDivisionFields =
      orgFieldsRequired && normalizeUnitType(unitType) !== 'pu' && !usesMetroMinimalFields;

    if (!userName || !userId || !userType || !unitType) {
      const err = new Error('user_name, user_id, user_type and unit_type are required');
      err.status = 400;
      throw err;
    }

    if (!allowedUnitTypes.length) {
      const err = new Error('Unsupported user type');
      err.status = 400;
      throw err;
    }

    if (!allowedUnitTypes.some((value) => normalizeText(value) === normalizeText(unitType))) {
      const err = new Error('Invalid unit type for the selected user type');
      err.status = 400;
      throw err;
    }

    if (usesPuField && (!unitName || !department)) {
      const err = new Error('unit_name and department are required for PUs users');
      err.status = 400;
      throw err;
    }

    if (usesDivisionFields && (!zone || !division || !department)) {
      const err = new Error('zone, division and department are required for the selected user type');
      err.status = 400;
      throw err;
    }

    const conflictingUser = await findExistingUserByUserIdExcludingObjectId(client, userId, objectid);
    if (conflictingUser) {
      const err = new Error('User ID already exists');
      err.status = 409;
      throw err;
    }

    const departmentRow =
      orgFieldsRequired && !usesMetroMinimalFields ? await resolveDepartmentId(client, department) : null;
    if (orgFieldsRequired && !usesMetroMinimalFields && !departmentRow) {
      const err = new Error('Selected department was not found');
      err.status = 400;
      throw err;
    }

    const divisionMeta = usesDivisionFields ? await resolveDivisionMetadata(client, division) : {
      divId: null,
      rlyId: null,
      divisionName: null,
    };

    if (usesDivisionFields && !divisionMeta.divisionName) {
      const err = new Error('Selected division was not found');
      err.status = 400;
      throw err;
    }

    const normalizedUnitType = allowedUnitTypes.find(
      (value) => normalizeText(value) === normalizeText(unitType),
    ) || unitType;
    const passwordToStore = password || String(existingUser.rows[0]?.password || '').trim();

    const updateSql = `
      UPDATE user_master
      SET
        user_id = $2,
        user_name = $3,
        password = $4,
        user_type = $5,
        unit_type = $6,
        unit_name = $7,
        zone = $8,
        division = $9,
        department_id = $10,
        div_id = $11,
        rly_id = $12
      WHERE objectid = $1
    `;

    await client.query(updateSql, [
      objectid,
      userId,
      userName,
      passwordToStore,
      userType,
      normalizedUnitType,
      buildUnitName({
        unitType: normalizedUnitType,
        unitName: usesPuField ? unitName : '',
        zone: usesDivisionFields ? zone : '',
        division: usesDivisionFields ? divisionMeta.divisionName : '',
      }),
      usesDivisionFields ? zone : null,
      usesDivisionFields ? divisionMeta.divisionName : null,
      orgFieldsRequired && !usesMetroMinimalFields ? departmentRow.department_id : null,
      usesDivisionFields ? divisionMeta.divId : null,
      usesDivisionFields ? divisionMeta.rlyId : null,
    ]);

    const updatedUser = await getUserByObjectId(client, objectid);

    await client.query("COMMIT");
    return updatedUser;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function deleteUserByObjectId(objectid, actingUserId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `
        SELECT objectid, user_id, user_name, user_type, unit_type
        FROM user_master
        WHERE objectid = $1
        FOR UPDATE
      `,
      [objectid],
    );

    const user = userResult.rows[0];
    if (!user) {
      await client.query("ROLLBACK");
      return null;
    }

    if (normalizeText(user.user_id) === normalizeText(actingUserId)) {
      const err = new Error("You cannot delete your own logged-in user");
      err.status = 400;
      throw err;
    }

    await client.query(
      `
        UPDATE user_master
        SET assigned_checker = NULL
        WHERE LOWER(TRIM(COALESCE(assigned_checker, ''))) = LOWER(TRIM($1))
      `,
      [user.user_id],
    );

    const deleteResult = await client.query(
      `
        DELETE FROM user_master
        WHERE objectid = $1
        RETURNING objectid, user_id, user_name, user_type, unit_type
      `,
      [objectid],
    );

    await client.query("COMMIT");
    return deleteResult.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  getAllUsers,
  getEditableUserByObjectId,
  createUser,
  updateUser,
  deleteUserByObjectId,
};
