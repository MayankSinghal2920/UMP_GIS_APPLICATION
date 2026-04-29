const http = require('http');
const https = require('https');

const ALLOWED_HOSTS = new Set(['irgeoportal.gov.in', 'www.irgeoportal.gov.in']);
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp']);

function getExtension(pathname) {
  const match = String(pathname || '').toLowerCase().match(/\.[a-z0-9]+$/);
  return match ? match[0] : '';
}

function contentTypeFor(ext) {
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'application/octet-stream';
}

function validatePreviewUrl(rawUrl) {
  const target = new URL(String(rawUrl || ''));
  const host = target.hostname.toLowerCase();
  const ext = getExtension(target.pathname);

  if (!['http:', 'https:'].includes(target.protocol)) {
    throw Object.assign(new Error('Unsupported preview protocol'), { statusCode: 400 });
  }

  if (!ALLOWED_HOSTS.has(host)) {
    throw Object.assign(new Error('Preview host not allowed'), { statusCode: 400 });
  }

  if (!target.pathname.toLowerCase().startsWith('/offtrack/landplans/')) {
    throw Object.assign(new Error('Preview path not allowed'), { statusCode: 400 });
  }

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw Object.assign(new Error('Preview file type not allowed'), { statusCode: 400 });
  }

  return { target, ext };
}

function streamRemoteFile(target, ext, res, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    const client = target.protocol === 'https:' ? https : http;
    const request = client.get(target, {
      rejectUnauthorized: false,
      headers: {
        'User-Agent': 'Mozilla/5.0 UMP-GIS LandPlanPreview/1.0',
        'Accept': 'application/pdf,image/*,*/*;q=0.8',
      },
    }, (upstream) => {
      const statusCode = upstream.statusCode || 0;
      const location = upstream.headers.location;

      if ([301, 302, 303, 307, 308].includes(statusCode) && location && redirectCount < 5) {
        upstream.resume();
        const redirected = new URL(location, target);
        streamRemoteFile(redirected, ext, res, redirectCount + 1).then(resolve).catch(reject);
        return;
      }

      if (statusCode < 200 || statusCode >= 300) {
        upstream.resume();
        reject(Object.assign(new Error(`Unable to load preview (${statusCode})`), { statusCode: statusCode || 502 }));
        return;
      }

      res.setHeader('Content-Type', upstream.headers['content-type'] || contentTypeFor(ext));
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.removeHeader('X-Frame-Options');
      res.removeHeader('Content-Security-Policy');

      upstream.pipe(res);
      upstream.on('end', resolve);
      upstream.on('error', reject);
    });

    request.setTimeout(30000, () => {
      request.destroy(new Error('Preview request timed out'));
    });
    request.on('error', reject);
  });
}

async function previewLandPlan(req, res, next) {
  try {
    const { target, ext } = validatePreviewUrl(req.query.url);
    await streamRemoteFile(target, ext, res);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).send(err.message);
    }
    return next(err);
  }
}

module.exports = { previewLandPlan };
