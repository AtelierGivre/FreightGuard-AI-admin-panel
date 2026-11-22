const { validationResult } = require('express-validator');

/**
 * Wrap an async Express handler so rejected promises reach the error handler.
 * Express 4 does not do this automatically.
 *
 * @param {Function} fn
 * @returns {Function} Express middleware
 */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Run after express-validator chains: respond with a consistent 400 payload.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((error) => ({
        field: error.path || error.param,
        message: error.msg,
      })),
    });
  }
  return next();
};

/** API 404 handler — must be registered after all routes. */
const notFound = (req, res) =>
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });

/**
 * Global error handler. Maps known Mongoose/parser errors to friendly 400s and
 * never leaks stack traces to the client.
 */
// Express identifies error middleware by its four-argument signature; `_next` is
// intentionally unused (the ESLint config ignores parameters prefixed with `_`).
const errorHandler = (err, req, res, _next) => {
  console.error('[error]', err.stack || err);

  // Malformed JSON body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ success: false, message: 'Malformed JSON body' });
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid resource ID' });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    return res.status(400).json({
      success: false,
      message: `Duplicate value for ${field || 'field'}`,
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((error) => error.message);
    return res.status(400).json({ success: false, message: messages.join(', ') });
  }

  const status = err.statusCode || err.status || 500;
  return res.status(status).json({
    success: false,
    message: status >= 500 ? 'Internal server error' : err.message,
  });
};

module.exports = { asyncHandler, validate, notFound, errorHandler };
