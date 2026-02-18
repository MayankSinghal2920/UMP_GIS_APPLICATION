const nodemailer = require('nodemailer');
const path = require('path');

const activeOtpSends = new Map(); // key = email, value = { cancelled: boolean }

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_SERVER_HOST,
  port: Number(process.env.SMTP_PORT || 25),
  secure: false,

  // pooling
  pool: true,
  maxConnections: 3,
  maxMessages: 50,

  // ✅ prevents "stuck" sendMail when SMTP is slow/unresponsive
  connectionTimeout: Number(process.env.SMTP_CONN_TIMEOUT_MS || 10_000),
  greetingTimeout: Number(process.env.SMTP_GREET_TIMEOUT_MS || 10_000),
  socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 20_000),

  tls: { rejectUnauthorized: false },

  auth:
    process.env.FROM_MAIL && process.env.MAIL_PASSWORD
      ? { user: process.env.FROM_MAIL, pass: process.env.MAIL_PASSWORD }
      : undefined,
});

/**
 * Send OTP email to user's email.
 * ✅ Cancels previous in-flight send for same recipient (resend case)
 * ✅ Fail fast (no long retries)
 * ✅ Timeout protection (no port change)
 */
async function sendOtpMail({ to, user_name, otp }) {
  const subject = 'OTP for IR Geo Application Login';

  const from = process.env.FROM_MAIL;
  if (!from) throw new Error('FROM_MAIL is missing in .env');

  // ✅ Cancel any previous in-flight send for same recipient
  if (activeOtpSends.has(to)) {
    activeOtpSends.get(to).cancelled = true;
  }
  const ctx = { cancelled: false };
  activeOtpSends.set(to, ctx);

  try {
    const logoPath = path.join(__dirname, '../../public/images/IR_logo.png');

    const html = `
<div style="background:#f4f6f9;padding:40px 0;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="
      max-width:650px;
      margin:0 auto;
      background:#ffffff;
      border-radius:14px;
      padding:40px;
      box-shadow:0 6px 18px rgba(0,0,0,0.08);
    ">

<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:30px;">
  <tr>
    <td align="center">
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;padding-right:15px;">
            <img 
              src="cid:irlogo"
              alt="Indian Railways" 
              style="height:75px; display:block;"
            />
          </td>

          <td style="vertical-align:middle;">
            <h1 style="
              margin:0;
              font-size:36px;
              letter-spacing:2px;
              color:#1a1a1a;
              font-weight:800;
              font-family:'Segoe UI', Arial, sans-serif;
            ">
              UMP
            </h1>
          </td>
        </tr>
      </table>

      <div style="
        height:4px;
        width:180px;
        background:#0b86a7;
        margin:15px auto 0;
        border-radius:3px;
      "></div>
    </td>
  </tr>
</table>

    <h2 style="margin-top:0;color:#222;font-weight:600;">
      Dear ${user_name || 'User'},
    </h2>

    <p style="font-size:15px;color:#444;">
      Your One-Time Password (OTP) for logging into the 
      <strong>UMP Web Application</strong> is:
    </p>

    <div style="
        margin:30px 0;
        text-align:center;
        font-size:34px;
        font-weight:800;
        letter-spacing:6px;
        color:#0b86a7;
        background:#f1f7fa;
        padding:18px 0;
        border-radius:8px;
        border:1px solid #dbe9f0;
      ">
      ${otp}
    </div>

    <p style="font-size:14px;color:#555;">
      This OTP is valid for 
      <strong>${process.env.OTP_TTL_MINUTES || 10} minutes</strong>.
    </p>

    <p style="font-size:14px;color:#555;">
      Please do not share this OTP with anyone. If you did not request it,
      kindly ignore this email.
    </p>

    <br/>

    <p style="font-size:14px;color:#222;">
      Thanks,<br/>
      <strong>Team UMP</strong>
    </p>

  </div>
</div>
`;

    const mailOptions = {
      from,
      to,
      subject,
      html,
      attachments: [
        {
          filename: 'IR_logo.png',
          path: logoPath,
          cid: 'irlogo',
          contentDisposition: 'inline',
        },
      ],
    };

    // ✅ fail-fast: no long retries for OTP
    const delays = [0];

    for (let i = 0; i < delays.length; i++) {
      if (ctx.cancelled) {
        // return a clear status; controller can ignore it
        return { cancelled: true };
      }

      if (delays[i] > 0) await sleep(delays[i]);

      if (ctx.cancelled) return { cancelled: true };

      // ✅ If cancelled while SMTP send is happening, we can't stop nodemailer mid-flight,
      // but we can ensure future sends for this recipient override this context.
      const info = await transporter.sendMail(mailOptions);
      return { cancelled: false, info };
    }

    return { cancelled: true };
  } finally {
    if (activeOtpSends.get(to) === ctx) {
      activeOtpSends.delete(to);
    }
  }
}

module.exports = { sendOtpMail };
