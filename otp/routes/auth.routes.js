const express = require('express');
const router = express.Router();

const pool = require('../db/pool');
const { sendOtpToEmail } = require('../config/auth/otp/otp.service');
const captchaService = require('../config/auth/captcha/captchaService');
// const { sendOtpToEmail } = require('../services/otp.service');


router.post('/login', async (req, res) => {
  const { user_id, password } = req.body;

  // 1) Basic check
  if (!user_id || !password) {
    return res.status(400).json({ success: false, error: "Missing user_id or password" });
  }

  try {
    const sql = `
      SELECT 
        user_id,
        password,
        user_name,
        zone_code,       -- from DB
        division_code,   -- from DB
        department
      FROM user_master_copy
      WHERE user_id = $1
      LIMIT 1
    `;

    const result = await pool.query(sql, [user_id]);

    // 2) No such user
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: "Invalid user_id or password" });
    }

    const user = result.rows[0];

    // 3) Wrong password
    if (user.password !== password) {
      return res.status(401).json({ success: false, error: "Invalid user_id or password" });
    }

    // 4) SUCCESS
    return res.json({
      success: true,
      user: {
        user_id:    user.user_id,
        user_name:  user.user_name,
        railway:    user.zone_code,      // map zone_code → railway
        division:   user.division_code,  // map division_code → division
        department: user.department
      }
    });

  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});



router.post('/send-otp', async (req, res) => {
  try {
    const { email, name, mob_number } = req.body;

    if (!email || !name) {
      return res.status(400).json({ message: 'Email & name required' });
    }

    await sendOtpToEmail(email, name, mob_number);

    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});


// / POST /v1/api/captcha/new
router.post('/new', (req, res) => {
  const clientType = req.headers['x-client-type'];
  console.log('Generating new CAPTCHA for client type:', clientType);

  const captcha = captchaService.generateCaptcha();

  if (clientType && clientType.toLowerCase() === 'mobile') {
    return res.json({
      data: captcha,
    });
  }

  return res.json(captcha);
});

// POST /v1/api/captcha/validate
router.post('/validate', (req, res) => {
  const { captchaId, captchaValue } = req.body;

  const isValid = captchaService.validateCaptcha(captchaId, captchaValue);

  res.json({
    success: isValid,
  });
});




module.exports = router;
