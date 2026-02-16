const crypto = require('crypto');

const store = new Map();
const TTL_SECONDS = Number(process.env.CAPTCHA_TTL_SECONDS || 300);

function cleanup() {
  const now = Date.now();
  for (const [id, rec] of store.entries()) {
    if (!rec || rec.expiresAt <= now) store.delete(id);
  }
}

function randomText(len = 5) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < len; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateLeftStyleSvg(text) {
  // ✅ Mimic left image style: simple serif, black, one diagonal strike
  const w = 160;
  const h = 44;

  // small jitter like typical captcha but minimal
  const x = 18 + Math.floor(Math.random() * 6);
  const y = 30 + Math.floor(Math.random() * 3);
  const rot = (-5 + Math.random() * 10).toFixed(2); // -5..+5

  const safe = escapeXml(text);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff"/>

  <!-- text (pure black, serif) -->
  <text x="${x}" y="${y}"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="30"
        font-weight="700"
        fill="#000000"
        letter-spacing="2"
        transform="rotate(${rot} ${w / 2} ${h / 2})">
    ${safe}
  </text>

  <!-- one diagonal strike line (thin) -->
  <line x1="10" y1="28" x2="${w - 10}" y2="18"
        stroke="rgba(0,0,0,0.55)" stroke-width="1.2"/>

  <!-- subtle bottom curve (like many govt captchas) -->
  <path d="M12 ${h - 10} Q ${w / 2} ${h - 2} ${w - 12} ${h - 10}"
        fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="1"/>
</svg>
`.trim();
}

function generateCaptcha() {
  cleanup();

  const text = randomText(5);
  const captchaId = crypto.randomUUID();
  const expiresAt = Date.now() + TTL_SECONDS * 1000;

  store.set(captchaId, { text, expiresAt });

  const svg = generateLeftStyleSvg(text);
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

  return { captchaId, image: dataUrl, expiresAt };
}

function validateCaptcha(captchaId, captchaValue) {
  cleanup();
  const rec = store.get(captchaId);
  if (!rec) return { ok: false, reason: 'Captcha expired' };

  if (rec.expiresAt <= Date.now()) {
    store.delete(captchaId);
    return { ok: false, reason: 'Captcha expired' };
  }

  const expected = String(rec.text || '').toLowerCase();
  const got = String(captchaValue || '').trim().toLowerCase();

  const ok = expected === got;
  store.delete(captchaId);

  return { ok, reason: ok ? 'OK' : 'Invalid captcha' };
}

module.exports = { generateCaptcha, validateCaptcha };
