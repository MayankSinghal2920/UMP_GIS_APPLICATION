const pool = require('../config/db');

/**
 * Find user by user_id
 */
async function findUserById(userId) {
  const sql = `
    SELECT 
      user_id,
      password,
      user_name,
      zone,
      division,
      department_id
    FROM user_master
    WHERE user_id = $1
    LIMIT 1;
  `;

  const { rows } = await pool.query(sql, [userId]);
  return rows[0]; // undefined if not found
}

module.exports = {
  findUserById,
};
