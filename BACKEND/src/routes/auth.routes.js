const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');

// Legacy (pre-OTP) login. Kept for backward compatibility.
router.post('/login', authController.login);

// OTP flow
// Step-1: validate credentials + send OTP to registered email
router.post('/request-otp', authController.requestOtp);

// Step-2: verify OTP and return user session payload
router.post('/verify-otp', authController.verifyOtp);

// Optional: resend OTP using the same otpRef
router.post('/resend-otp', authController.resendOtp);

module.exports = router;
