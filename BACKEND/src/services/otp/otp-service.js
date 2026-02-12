const { sendOtpMail } = require('./mailer');

/**
 * Sends OTP email.
 * OTP generation + DB storage is handled in controller.
 */
async function sendOtp({ to, user_name, otp }) {
  return sendOtpMail({ to, user_name, otp });
}

module.exports = {
  sendOtp,
};
