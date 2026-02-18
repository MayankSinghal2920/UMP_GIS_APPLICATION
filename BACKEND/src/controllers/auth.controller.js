const authModel = require('../models/auth.model');
const otpService = require('../services/otp/otp-service');

function genOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Legacy login (if used)
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
        division: user.division_code,   // ✅ FIXED
        department: user.department_id,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Request OTP
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

    const reuseSec = Number(process.env.OTP_REUSE_SECONDS || 60);

    // ✅ NEW: read otp state (otp, expires_at, used, attempts)
    const otpState = await authModel.getOtpState(user_id);

    let otpToUse = null;
    let reused = false;

    if (otpState?.otp && otpState?.otp_expires_at && otpState?.otp_used === false) {
      const expiresAtMs = new Date(otpState.otp_expires_at).getTime();
      const nowMs = Date.now();

      const notExpired = nowMs <= expiresAtMs;

      // reuse window uses otp_created_at if you want "reuse within X sec"
      let withinReuseWindow = false;
      if (otpState.otp_created_at) {
        const createdAtMs = new Date(otpState.otp_created_at).getTime();
        withinReuseWindow = (nowMs - createdAtMs) >= 0 && (nowMs - createdAtMs) < reuseSec * 1000;
      }

      if (notExpired && withinReuseWindow) {
        otpToUse = String(otpState.otp);
        reused = true;
      }
    }

    if (!otpToUse) {
      otpToUse = genOtp();
      await authModel.saveOtp(user_id, otpToUse); // ✅ will set expires_at, attempts=0, otp_used=false
    }

    await otpService.sendOtp({
      to: email,
      user_name: user.user_name,
      otp: otpToUse,
    });

    return res.json({
      success: true,
      message: reused
        ? 'Reusing last OTP. Please check email.'
        : 'OTP sent to registered email',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Verify OTP
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

    const otpState = await authModel.getOtpState(user_id);

    if (!otpState?.otp || !otpState?.otp_expires_at) {
      const err = new Error('OTP not found. Please request again.');
      err.status = 401;
      throw err;
    }

    if (otpState.otp_used === true) {
      const err = new Error('OTP already used. Please request again.');
      err.status = 401;
      throw err;
    }

    const nowMs = Date.now();
    const expiresAtMs = new Date(otpState.otp_expires_at).getTime();

    if (nowMs > expiresAtMs) {
      await authModel.clearOtp(user_id);
      const err = new Error('OTP expired. Please request again.');
      err.status = 401;
      throw err;
    }

    const entered = String(otp).trim();
    const stored = String(otpState.otp).trim();

    if (entered !== stored) {
      await authModel.incrementOtpAttempts(user_id);

      // fetch attempts (or just compare using otpState.otp_attempts + 1)
      const attempts = Number(otpState.otp_attempts || 0) + 1;
      const maxAttempts = Number(process.env.OTP_MAX_ATTEMPTS || 5);

      if (attempts >= maxAttempts) {
        await authModel.clearOtp(user_id);
        const err = new Error('Too many invalid attempts. Please request a new OTP.');
        err.status = 429;
        throw err;
      }

      const err = new Error('Invalid OTP');
      err.status = 401;
      throw err;
    }

    // ✅ Success: mark used or clear
    await authModel.clearOtp(user_id); // simplest & safest

    return res.json({
      success: true,
      user: {
        user_id: user.user_id,
        user_name: user.user_name,
        railway: user.zone,
        division: user.division_code,
        department: user.department_id,
      },
    });
  } catch (err) {
    next(err);
  }
}


/**
 * Resend OTP
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
      const err = new Error('Email not available');
      err.status = 400;
      throw err;
    }

    const otpState = await authModel.getOtpState(user_id);

    let otpToUse = null;

    if (otpState?.otp && otpState?.otp_expires_at && otpState?.otp_used === false) {
      const nowMs = Date.now();
      const expiresAtMs = new Date(otpState.otp_expires_at).getTime();

      if (nowMs <= expiresAtMs) {
        otpToUse = String(otpState.otp);
      }
    }

    if (!otpToUse) {
      otpToUse = genOtp();
      await authModel.saveOtp(user_id, otpToUse);
    }

    await otpService.sendOtp({
      to: email,
      user_name: user.user_name,
      otp: otpToUse,
    });

    return res.json({ success: true, message: 'OTP resent' });
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
