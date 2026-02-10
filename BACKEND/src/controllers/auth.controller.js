const authModel = require('../models/auth.model');

/**
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { user_id, password } = req.body || {};

    // 1️⃣ Basic validation
    if (!user_id || !password) {
      const err = new Error('Missing user_id or password');
      err.status = 400;
      throw err;
    }

    // 2️⃣ Fetch user
    const user = await authModel.findUserById(user_id);

    if (!user) {
      const err = new Error('Invalid user_id or password');
      err.status = 401;
      throw err;
    }

    // 3️⃣ Password check (plain-text for now)
    // ⚠️ Later we will replace with bcrypt
    if (user.password !== password) {
      const err = new Error('Invalid user_id or password');
      err.status = 401;
      throw err;
    }

    // 4️⃣ SUCCESS → send identity + scope
    res.json({
      success: true,
      user: {
        user_id: user.user_id,
        user_name: user.user_name,
        railway: user.zone,
        division: user.division,
        department: user.department_id,
     
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
};
