const pool = require('../config/db');

async function countByDivision(tableName, division, status) {
  const params = [division];
  let statusSql = '';
  if (status) {
    params.push(status);
    statusSql = ` AND status = $2`;
  }
  const sql = `
    SELECT COUNT(*)::int AS count
    FROM ${tableName}
    WHERE UPPER(division) = UPPER($1)
    ${statusSql};
  `;
  const { rows } = await pool.query(sql, params);
  return rows[0]?.count || 0;
}

module.exports = { countByDivision };
