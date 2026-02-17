const nodemailer = require('nodemailer');
const path = require('path');

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

  // ✅ pooling
  pool: true,
  maxConnections: 3,
  maxMessages: 50,

  tls: { rejectUnauthorized: false },

  auth:
    process.env.FROM_MAIL && process.env.MAIL_PASSWORD
      ? { user: process.env.FROM_MAIL, pass: process.env.MAIL_PASSWORD }
      : undefined,
});

/**
 * Send OTP email to user's email.
 * ✅ Uses CID embedded image so Gmail shows logo (no localhost dependency).
 * ✅ Retries recipient if relay/policy error.
 */
async function sendOtpMail({ to, user_name, otp }) {
  const subject = 'OTP for IR Geo Application Login';

  const from = process.env.FROM_MAIL;
  if (!from) throw new Error('FROM_MAIL is missing in .env');

  // ✅ IMPORTANT: Logo absolute file path on backend filesystem
  // Update this path depending on where your IR_logo.png is.
  // If your image is inside: BACKEND/src/public/images/IR_logo.png
  const logoPath = path.join(__dirname, '../../public/images/IR_logo.png');

  // ✅ Use CID in HTML (not URL)
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

    <!-- Header -->
<!-- Header -->
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:30px;">
  <tr>
    <td align="center">

      <table cellpadding="0" cellspacing="0">
        <tr>

          <!-- Logo -->
          <td style="vertical-align:middle;padding-right:15px;">
            <img 
              src="cid:irlogo"
              alt="Indian Railways" 
              style="height:75px; display:block;"
            />
          </td>

          <!-- UMP Heading -->
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

      <!-- Underline -->
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


    <!-- Body -->
    <h2 style="margin-top:0;color:#222;font-weight:600;">
      Dear ${user_name || 'User'},
    </h2>

    <p style="font-size:15px;color:#444;">
      Your One-Time Password (OTP) for logging into the 
      <strong>UMP Web Application</strong> is:
    </p>

    <!-- OTP Box -->
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

  // ✅ Base mail options (includes attachment)
  const mailOptions = {
    from,
    to,
    subject,
    html,

    // ✅ CID attachment so Gmail shows logo
    attachments: [
      {
        filename: 'IR_logo.png',
        path: logoPath,
        cid: 'irlogo', // MUST match src="cid:irlogo"
        contentDisposition: 'inline',
      },
    ],
  };

  // Retry schedule: immediate + 3 retries
  const delays = [0, 10_000, 20_000, 40_000];
  let lastErr = null;

  for (let i = 0; i < delays.length; i++) {
    if (delays[i] > 0) await sleep(delays[i]);

    try {
      return await transporter.sendMail(mailOptions);
    } catch (err) {
      lastErr = err;

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

  throw lastErr || new Error('Unable to send OTP due to SMTP relay policy');
}

module.exports = { sendOtpMail };
