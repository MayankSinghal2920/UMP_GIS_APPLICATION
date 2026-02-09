const pool = require('../config/db');

async function findUser(user_id) {
  const sql = `
    SELECT 
      user_id,
      password,
      user_name,
      zone_code,
      division_code,
      department
    FROM user_master_copy
    WHERE user_id = $1
    LIMIT 1
  `;
  const { rows } = await pool.query(sql, [user_id]);
  return rows[0] || null;
}

module.exports = { findUser };
