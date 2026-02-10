const { findUserById } = require('../models/auth.model');

async function login(req, res, next) {
  const { user_id, password } = req.body || {};

  if (!user_id || !password) {
    return res.status(400).json({ success: false, error: "Missing user_id or password" });
  }

  try {
    const user = await findUserById(user_id);

    if (!user || user.password !== password) {
      return res.status(401).json({ success: false, error: "Invalid user_id or password" });
    }

    return res.json({
      success: true,
      user: {
        user_id: user.user_id,
        user_name: user.user_name,
        railway: user.zone_code,
        division: user.division_code,
        department: user.department
      }
    });
  } catch (err) {
  console.error('LOGIN ERROR:', err);
  return res.status(500).json({
    success: false,
    error: 'Login failed'
  });
}
}

module.exports = { login };
