const nodemailer = require('nodemailer');

function isRelayPolicyError(err) {
  const msg = String(err?.response || err?.message || '').toLowerCase();
  const code = Number(err?.responseCode || 0);

  // Typical: 554 Relay rejected for policy reasons
  return code === 554 || msg.includes('relay rejected') || msg.includes('policy');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_SERVER_HOST,
  port: Number(process.env.SMTP_PORT || 25),
  secure: false,

  // ✅ keep pooling on (helps repeated sends)
  pool: true,
  maxConnections: 3,
  maxMessages: 50,

  tls: { rejectUnauthorized: false },

  // ✅ auth optional (based on your env)
  auth: process.env.FROM_MAIL && process.env.MAIL_PASSWORD
    ? { user: process.env.FROM_MAIL, pass: process.env.MAIL_PASSWORD }
    : undefined,
});

/**
 * Send OTP email to user's email.
 * ✅ IMPORTANT CHANGE:
 * If SMTP relay/policy rejects temporarily, we RETRY sending to SAME recipient.
 * Only after retries fail, optionally fallback to FROM_MAIL (if enabled).
 */
async function sendOtpMail({ to, user_name, otp }) {
  const subject = 'OTP for IR Geo Application Login';

  const html = `
    <div style="font-family:Segoe UI, Arial, sans-serif; line-height:1.6">
      <h2>Dear ${user_name || 'User'},</h2>
      <p>Your OTP for login is:</p>
      <div style="font-size:28px;font-weight:700;letter-spacing:3px;color:#0b86a7">${otp}</div>
      <p>Valid for <strong>${process.env.OTP_TTL_MINUTES || 10} minutes</strong>.</p>
      <p>Regards,<br/>IR Geo Application Team</p>
    </div>
  `;

  const from = process.env.FROM_MAIL;
  if (!from) {
    throw new Error('FROM_MAIL is missing in .env');
  }

  const mailOptions = { from, to, subject, html };

  // ✅ Retry schedule (tune if needed)
  // Immediate try + 3 retries: 10s, 20s, 40s
  const delays = [0, 10_000, 20_000, 40_000];

  let lastErr = null;

  for (let i = 0; i < delays.length; i++) {
    if (delays[i] > 0) {
      await sleep(delays[i]);
    }

    try {
      return await transporter.sendMail(mailOptions);
    } catch (err) {
      lastErr = err;

      // If NOT relay/policy error -> do not retry here, just throw
      if (!isRelayPolicyError(err)) {
        throw err;
      }

      console.warn(
        `[OTP] Relay/policy rejected for "${to}". Retry ${i + 1}/${delays.length}.`,
        err?.response || err?.message
      );
    }
  }

  // ✅ Fallback only after all retries fail
  const fallbackEnabled = String(process.env.FALLBACK_TO_FROM_MAIL || 'false') === 'true';
  if (fallbackEnabled) {
    const fallbackTo = from;

    console.warn(
      `[OTP] All retries failed for "${to}". Falling back to FROM_MAIL "${fallbackTo}".`
    );

    return await transporter.sendMail({
      ...mailOptions,
      to: fallbackTo,
      subject: `${subject} (Fallback)`,
      html: `
        <div style="font-family:Segoe UI, Arial, sans-serif; line-height:1.6">
          <p><b>Fallback delivery</b> because SMTP relay rejected recipient after retries: <b>${to}</b></p>
          <hr/>
          ${html}
        </div>
      `,
    });
  }

  // If fallback disabled, throw final error so controller log can capture it
  throw lastErr || new Error('Unable to send OTP due to SMTP relay policy');
}

module.exports = { sendOtpMail };
