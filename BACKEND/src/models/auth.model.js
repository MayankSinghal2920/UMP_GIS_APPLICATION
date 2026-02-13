const pool = require('../config/db');

async function findUserById(userId) {
  const sql = `
    SELECT user_id, password, user_name, zone, division, department_id, otp, otp_created_at, email
    FROM user_master
    WHERE user_id = $1
    LIMIT 1;
  `;
  const { rows } = await pool.query(sql, [userId]);
  return rows[0];
}

/**
 * Get user's email for OTP delivery.
 * Column name configurable via env: USER_EMAIL_COLUMN (default: email)
 */
async function getUserEmailById(userId) {
  const col = String(process.env.USER_EMAIL_COLUMN || 'email').trim();

  // safe identifier check
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
 * Save OTP in DB (user_master.otp) and store timestamp in otp_created_at
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
 * Clear OTP after verification / expiry / resend failures
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
