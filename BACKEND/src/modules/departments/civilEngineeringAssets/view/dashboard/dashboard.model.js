// src/modules/departments/civilEngineeringAssets/view/dashboard/dashboard.model.js

const pool = require('../../../../../config/db');

async function getCount(tableName, division, type) {
  let statusCondition = '';
  const params = [division];

  if (type === 'MAKER') {
    params.push('Sent to Maker');
    statusCondition = 'AND UPPER(status) = UPPER($2)';
  } else if (type === 'CHECKER') {
    params.push('Sent to Checker');
    statusCondition = 'AND UPPER(status) = UPPER($2)';
  } else if (type === 'APPROVER') {
    params.push('Sent to Approver');
    statusCondition = 'AND UPPER(status) = UPPER($2)';
  } else if (type === 'FINALIZED') {
    params.push('Approved');
    statusCondition = 'AND UPPER(status) = UPPER($2)';
  }

  const sql = `
    SELECT COUNT(*)::int AS count
    FROM ${tableName}
    WHERE UPPER(division) = UPPER($1)
    ${statusCondition};
  `;

  const { rows } = await pool.query(sql, params);
  return rows[0]?.count || 0;
}

module.exports = { getCount };
