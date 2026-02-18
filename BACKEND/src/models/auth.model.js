const pool = require('../config/db');

/**
 * Find user by ID
 * Joins div_master to get proper division code (divcode)
 */
async function findUserById(userId) {
  const sql = `
    SELECT 
      u.user_id,
      u.password,
      u.user_name,
      u.zone,
      u.otp,
      u.otp_created_at,
      u.email,

      d.divcode AS division_code,

      dept.department_id,
      dept.department

    FROM user_master u

    LEFT JOIN div_master d 
      ON u.div_id = d.div_id

    LEFT JOIN sde.department_table dept
      ON u.department_id = dept.department_id

    WHERE u.user_id = $1
    LIMIT 1;
  `;

  const { rows } = await pool.query(sql, [userId]);
  return rows[0];
}

/**
 * Get user's email for OTP delivery
 */
async function getUserEmailById(userId) {
  const col = String(process.env.USER_EMAIL_COLUMN || 'email').trim();

  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col)) {
    throw new Error('Invalid USER_EMAIL_COLUMN');
  }

  const sql = `
    SELECT ${col} AS email
    FROM user_master
    WHERE user_id = $1
    LIMIT 1;
  `;

  const { rows } = await pool.query(sql, [userId]);
  return rows[0]?.email || null;
}

/**
 * Save OTP
 */
async function saveOtp(userId, otp) {
  const sql = `
    UPDATE user_master
    SET otp = $2,
        otp_created_at = NOW()
    WHERE user_id = $1;
  `;
  await pool.query(sql, [userId, otp]);
}

/**
 * Clear OTP
 */
async function clearOtp(userId) {
  const sql = `
    UPDATE user_master
    SET otp = NULL,
        otp_created_at = NULL
    WHERE user_id = $1;
  `;
  await pool.query(sql, [userId]);
}

module.exports = {
  findUserById,
  getUserEmailById,
  saveOtp,
  clearOtp,
};
