const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const captchaService = require('../services/captcha/captchaService'); // ✅ ADD THIS

// Legacy (pre-OTP) login. Kept for backward compatibility.
router.post('/login', authController.login);

// OTP flow
// Step-1: validate credentials + send OTP to registered email
router.post('/request-otp', authController.requestOtp);

// Step-2: verify OTP and return user session payload
router.post('/verify-otp', authController.verifyOtp);

// Optional: resend OTP using the same otpRef
router.post('/resend-otp', authController.resendOtp);

/**
 * CAPTCHA
 * NOTE: These endpoints will become:
 * POST /api/auth/captcha/new
 * POST /api/auth/captcha/validate
 * (because this router is probably mounted on /api/auth)
 */

// POST /api/auth/captcha/new
router.post('/captcha/new', (req, res) => {
  try {
    const clientType = req.headers['x-client-type'];
    console.log('Generating new CAPTCHA for client type:', clientType);

    const captcha = captchaService.generateCaptcha();

    // ✅ prevent browser caching
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    // support both shapes (mobile wrapper)
    if (clientType && String(clientType).toLowerCase() === 'mobile') {
      return res.json({ data: captcha });
    }

    return res.json({
      success: true,
      captchaId: captcha?.captchaId,
      image: captcha?.image || captcha?.dataUrl || '',
      expiresAt: captcha?.expiresAt,
    });
  } catch (e) {
    console.error('[CAPTCHA] generate failed:', e);
    return res.status(500).json({
      success: false,
      message: 'Captcha generation failed',
      error: String(e?.message || e),
    });
  }
});


// POST /api/auth/captcha/validate
router.post('/captcha/validate', (req, res) => {
  const { captchaId, captchaValue } = req.body || {};

  if (!captchaId || !captchaValue) {
    return res.status(400).json({
      success: false,
      message: 'Missing captchaId or captchaValue',
    });
  }

  const result = captchaService.validateCaptcha(captchaId, captchaValue);

  // support both boolean return OR {ok, reason}
  const ok = typeof result === 'boolean' ? result : !!result?.ok;

  return res.json({
    success: ok,
    message: ok ? 'Captcha ok' : (result?.reason || 'Invalid captcha'),
  });
});

// res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
// res.set('Pragma', 'no-cache');
// res.set('Expires', '0');


module.exports = router;
