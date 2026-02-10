function notFoundApi(req, res, next) {
  res.status(404).json({ error: 'API route not found', path: req.originalUrl });
}

function errorHandler(err, req, res, next) {
  console.error('❌ API error:', err);
  const status = err.statusCode || err.status || 500;
  res.status(status).json({ error: err.message || 'Server error' });
}

module.exports = { notFoundApi, errorHandler };
