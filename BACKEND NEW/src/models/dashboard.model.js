const pool = require('../config/db');

function buildStatusCondition(type, params) {
  const map = {
    MAKER: 'Sent to Maker',
    CHECKER: 'Sent to Checker',
    APPROVER: 'Sent to Approver',
    FINALIZED: 'Approved'
  };

  if (map[type]) {
    params.push(map[type]);
    return `AND status = $${params.length}`;
  }
  return '';
}

async function getDashboardCount({ tableName, division, type }) {
  const params = [division];
  const statusCondition = buildStatusCondition(type, params);

  const sql = `
    SELECT COUNT(*)::int AS count
    FROM ${tableName}
    WHERE UPPER(division) = UPPER($1)
    ${statusCondition};
  `;

  const { rows } = await pool.query(sql, params);
  return rows[0]?.count || 0;
}

module.exports = { getDashboardCount };
