const svgCaptcha = require('svg-captcha');

class CaptchaService {
  constructor() {
    this.captchaStore = new Map();
  }

  generateCaptcha() {
    const captcha = svgCaptcha.create({
      size: 6,
      noise: 0,
      color: false,
      background: '#ffffff',
      width: 150,
      height: 50,
      fontSize: 48,
      charPreset: 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789',
    });

    let svg = captcha.data;

    // Force black text
    svg = svg.replace(/stroke="(?!none)[^"]*"/g, 'stroke="black"');
    svg = svg.replace(
      /<(path|text)\b([^>]*?)\bfill="(?!none)[^"]*"/g,
      '<$1$2fill="black"',
    );
    svg = svg.replace(
      /<g\b([^>]*?)\bfill="(?!none)[^"]*"/g,
      '<g$1fill="black"',
    );

    // Remove noise
    svg = svg.replace(/<line[^>]*>/g, '');
    svg = svg.replace(/<path d="([^"]*)"/g, (match, d) => {
      if (d.length < 50) return '';
      return match;
    });

    const captchaId = Date.now().toString();
    this.captchaStore.set(captchaId, captcha.text);

    return { captchaId, image: svg };
  }

  validateCaptcha(captchaId, userInput) {
    const storedCaptcha = this.captchaStore.get(captchaId);
    if (!storedCaptcha) return false;

    const result = storedCaptcha === userInput;
    this.captchaStore.delete(captchaId); // one-time use

    return result;
  }
}

module.exports = new CaptchaService();
