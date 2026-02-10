const { sendOTP } = require('./mailer');
const { saveOtp } = require('./otp');
// const { saveOtp } = require('../otpStore');

async function sendOtpToEmail(email, name, mob_number) {
  console.log('sendOtpToEmail:', email, name, mob_number);

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  saveOtp(email, otp);

  await sendOTP(
    'Your OTP for login',
    { email, name },
    otp
  );
}

module.exports = { sendOtpToEmail };
