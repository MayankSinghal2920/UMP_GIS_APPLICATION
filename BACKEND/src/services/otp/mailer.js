const nodemailer = require('nodemailer');

function isRelayPolicyError(err) {
  const msg = String(err?.response || err?.message || '').toLowerCase();
  const code = Number(err?.responseCode || 0);

  // Typical: 554 Relay rejected for policy reasons
  return code === 554 || msg.includes('relay rejected') || msg.includes('policy');
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_SERVER_HOST,
  port: Number(process.env.SMTP_PORT || 25),
  secure: false,
  pool: true,
  maxConnections: 3,
  maxMessages: 50,
  tls: { rejectUnauthorized: false },
  auth: process.env.FROM_MAIL && process.env.MAIL_PASSWORD
    ? { user: process.env.FROM_MAIL, pass: process.env.MAIL_PASSWORD }
    : undefined,
});


/**
 * Try sending OTP to user email.
 * If SMTP relaying is blocked (554), resend to FROM_MAIL as fallback.
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

  try {
    return await transporter.sendMail(mailOptions);
  } catch (err) {
    const fallbackEnabled = String(process.env.FALLBACK_TO_FROM_MAIL || 'true') === 'true';

    // Only fallback for relay/policy errors
    if (!fallbackEnabled || !isRelayPolicyError(err)) {
      throw err;
    }

    // Fallback recipient = FROM_MAIL
    const fallbackTo = from;

    console.warn(
      `[OTP] Relay rejected for recipient "${to}". Falling back to FROM_MAIL "${fallbackTo}".`
    );

    return await transporter.sendMail({
      ...mailOptions,
      to: fallbackTo,
      subject: `${subject} (Fallback)`,
      html: `
        <div style="font-family:Segoe UI, Arial, sans-serif; line-height:1.6">
          <p><b>Fallback delivery</b> because SMTP relay rejected recipient: <b>${to}</b></p>
          <hr/>
          ${html}
        </div>
      `,
    });
  }
}

module.exports = { sendOtpMail };

