// Centralized error handler. Keeps route handlers free of boilerplate.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(`[error] ${req.method} ${req.originalUrl} -`, err.message);

  if (err.code === 11000) {
    return res.status(409).json({ error: 'Resource already exists' });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid identifier' });
  }
  return res.status(500).json({ error: 'Internal server error' });
}

module.exports = errorHandler;
