const pool = require('../../../../../config/postgres');

async function getCount(tableName, division, type, allIndia = false) {
  let statusCondition = '';
  const params = [];

  if (!allIndia) {
    params.push(division);
  }

  if (type === 'MAKER') {
    statusCondition = 'AND status IS NULL';
  } else if (type === 'CHECKER') {
    params.push('Sent to Checker');
    statusCondition = `AND UPPER(status) = UPPER($${params.length})`;
  } else if (type === 'APPROVER') {
    params.push('Sent to Approver');
    statusCondition = `AND UPPER(status) = UPPER($${params.length})`;
  } else if (type === 'FINALIZED') {
    params.push('Sent to Database');
    statusCondition = `AND UPPER(status) = UPPER($${params.length})`;
  }

  const divisionCondition = allIndia ? '' : 'AND UPPER(division) = UPPER($1)';

  const sql = `
    SELECT COUNT(*)::int AS count
    FROM ${tableName}
    WHERE 1 = 1
    ${divisionCondition}
    ${statusCondition};
  `;

  const { rows } = await pool.query(sql, params);
  return rows[0]?.count || 0;
}

module.exports = { getCount };
