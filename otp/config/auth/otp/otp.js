const otpStore = new Map();

function saveOtp(email, otp) {
  const now = new Date();
  const expiresAt = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23, 59, 59, 999
  ).getTime();

  otpStore.set(email, { otp, expiresAt });
}

function getOtp(email) {
  return otpStore.get(email);
}

module.exports = { saveOtp, getOtp };
