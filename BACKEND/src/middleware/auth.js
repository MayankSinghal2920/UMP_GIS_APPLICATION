const jwt = require('jsonwebtoken');
const authModel = require('../modules/auth/auth.model');

async function authenticateToken(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ success: false, message: 'Missing Bearer token' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ success: false, message: 'JWT_SECRET not configured' });
    }

    // 1) Verify JWT signature/exp first.
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (_e) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const userId = String(decoded?.sub || decoded?.user_id || '').trim();
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Token payload invalid' });
    }

    // 2) Enforce server-side session state (revocation + latest-token check).
    const session = await authModel.getSessionToken(userId);
    if (!session) {
      return res.status(401).json({ success: false, message: 'Session not found. Please login again.' });
    }

    const nowMs = Date.now();
    const dbExpiryMs = new Date(session.expires_at).getTime();

    if (session.revoked_at) {
      return res.status(401).json({ success: false, message: 'Session logged out. Please login again.' });
    }

    if (!Number.isFinite(dbExpiryMs) || nowMs > dbExpiryMs) {
      return res.status(401).json({ success: false, message: 'Session expired. Please login again.' });
    }

    if (String(session.token) !== String(token)) {
      // User logged in again elsewhere; only newest token stays valid.
      return res.status(401).json({ success: false, message: 'Session replaced. Please login again.' });
    }

    req.user = decoded;
    req.authToken = token;
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = authenticateToken;
