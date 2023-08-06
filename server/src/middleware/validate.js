const { validationResult } = require('express-validator');

/**
 * Collects express-validator errors into a 400 response. Place after the
 * validation chain on a route.
 */
function validate(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: result.array() });
  }
  return next();
}

module.exports = validate;
