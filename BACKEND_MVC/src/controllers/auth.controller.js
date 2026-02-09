const authModel = require('../models/auth.model');

async function login(req, res, next) {
  try {
    const { user_id, password } = req.body;

    if (!user_id || !password) {
      return res.status(400).json({ success: false, error: "Missing user_id or password" });
    }

    const user = await authModel.findUser(user_id);

    if (!user || user.password !== password) {
      return res.status(401).json({ success: false, error: "Invalid user_id or password" });
    }

    return res.json({
      success: true,
      user: {
        user_id: user.user_id,
        user_name: user.user_name,
        zone_code: user.zone_code,
        division_code: user.division_code,
        department: user.department
      }
    });
  } catch (e) { next(e); }
}

module.exports = { login };
