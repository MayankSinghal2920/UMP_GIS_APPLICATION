const authModel = require('../models/auth.model');
const otpService = require('../services/otp/otp-service'); // should only send mail now

function genOtp() {
  // 6-digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * POST /api/auth/login (legacy)
 * (Optional: You can keep it OR disable it once OTP is fully enforced)
 */
async function login(req, res, next) {
  try {
    const { user_id, password } = req.body || {};

    if (!user_id || !password) {
      const err = new Error('Missing user_id or password');
      err.status = 400;
      throw err;
    }

    const user = await authModel.findUserById(user_id);

    if (!user || user.password !== password) {
      const err = new Error('Invalid user_id or password');
      err.status = 401;
      throw err;
    }

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

/**
 * POST /api/auth/request-otp
 * Validates credentials, generates OTP, stores it in DB (user_master.otp),
 * sets otp_created_at, sends OTP to email.
 *
 * Response: { success:true, message:'OTP sent' }
 */
async function requestOtp(req, res, next) {
  try {
    const { user_id, password } = req.body || {};

    if (!user_id || !password) {
      const err = new Error('Missing user_id or password');
      err.status = 400;
      throw err;
    }

    const user = await authModel.findUserById(user_id);
    if (!user || user.password !== password) {
      const err = new Error('Invalid user_id or password');
      err.status = 401;
      throw err;
    }

    const email = await authModel.getUserEmailById(user_id);
    if (!email) {
      const err = new Error('Email not available for this user');
      err.status = 400;
      throw err;
    }

    const ttlMin = Number(process.env.OTP_TTL_MINUTES || 10);
    const reuseSec = Number(process.env.OTP_REUSE_SECONDS || 60);

    let otpToUse = null;
    let reused = false;

    // ✅ Reuse last OTP if recent
    if (user.otp && user.otp_created_at) {
      const createdAtMs = new Date(user.otp_created_at).getTime();
      const ageMs = Date.now() - createdAtMs;

      const withinTtl = ageMs >= 0 && ageMs < ttlMin * 60 * 1000;
      const withinReuseWindow = ageMs < reuseSec * 1000;

      if (withinTtl && withinReuseWindow) {
        otpToUse = String(user.otp);
        reused = true;
      }
    }

    // ✅ Otherwise generate fresh OTP and store in DB
    if (!otpToUse) {
      otpToUse = Math.floor(100000 + Math.random() * 900000).toString();
      await authModel.saveOtp(user_id, otpToUse);
    }

    // ✅ Send email asynchronously (mailer handles fallback if relay rejected)
    otpService
      .sendOtp({ to: email, user_name: user.user_name, otp: otpToUse })
      .catch((mailErr) =>
        console.error('[OTP] Mail send failed:', mailErr?.message || mailErr)
      );

    // ✅ Message changes only in reuse case
    return res.json({
      success: true,
      message: reused
        ? 'Reusing last OTP (generated recently). Please check email (or fallback mailbox due to policy).'
        : 'OTP sent to registered email (or fallback mailbox due to policy)',
    });
  } catch (err) {
    next(err);
  }
}



/**
 * POST /api/auth/verify-otp
 * Body: { user_id, otp }
 * Checks DB user_master.otp and otp_created_at (expiry),
 * clears OTP on success and returns user payload.
 */
async function verifyOtp(req, res, next) {
  try {
    const { user_id, otp } = req.body || {};

    if (!user_id || !otp) {
      const err = new Error('Missing user_id or otp');
      err.status = 400;
      throw err;
    }

    const user = await authModel.findUserById(user_id);
    if (!user) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }

    if (!user.otp) {
      const err = new Error('OTP not found. Please request OTP again.');
      err.status = 401;
      throw err;
    }

    // ✅ Expiry check (requires otp_created_at column)
    const ttlMin = Number(process.env.OTP_TTL_MINUTES || 10);
    if (user.otp_created_at) {
      const createdAtMs = new Date(user.otp_created_at).getTime();
      const ageMs = Date.now() - createdAtMs;
      if (ageMs > ttlMin * 60 * 1000) {
        await authModel.clearOtp(user_id);
        const err = new Error('OTP expired. Please request again.');
        err.status = 401;
        throw err;
      }
    }

    // ✅ OTP match
    if (String(user.otp) !== String(otp).trim()) {
      const err = new Error('Invalid OTP');
      err.status = 401;
      throw err;
    }

    // ✅ Clear OTP after successful verification
    await authModel.clearOtp(user_id);

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

/**
 * POST /api/auth/resend-otp
 * Body: { user_id }
 * Generates new OTP, stores in DB, sends again.
 */
async function resendOtp(req, res, next) {
  try {
    const { user_id } = req.body || {};

    if (!user_id) {
      const err = new Error('Missing user_id');
      err.status = 400;
      throw err;
    }

    const user = await authModel.findUserById(user_id);
    if (!user) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }

    const email = await authModel.getUserEmailById(user_id);
    if (!email) {
      const err = new Error('Email not available for this user');
      err.status = 400;
      throw err;
    }

    const otp = genOtp();
    await authModel.saveOtp(user_id, otp);

    await otpService.sendOtpMail({
      to: email,
      user_name: user.user_name,
      otp,
    });

    res.json({ success: true, message: 'OTP resent' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  requestOtp,
  verifyOtp,
  resendOtp,
};
