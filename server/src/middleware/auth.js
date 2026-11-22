const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');

const unauthorized = (res, message) => res.status(401).json({ success: false, message });

/**
 * Verify the Bearer token and attach the authenticated user to `req.user`.
 * Only the fields needed for authorisation are loaded — never the password.
 */
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(res, 'Not authorised: no token provided');
  }

  const token = authHeader.split(' ')[1];
  if (!token) return unauthorized(res, 'Not authorised: empty token');

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await User.findById(decoded.id).select('name email role company isActive');

    if (!user) return unauthorized(res, 'Not authorised: user no longer exists');
    if (!user.isActive) return unauthorized(res, 'Account is inactive');

    req.user = user;
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return unauthorized(res, 'Session expired, please sign in again');
    }
    return unauthorized(res, 'Not authorised: invalid token');
  }
};

/**
 * Role guard. Usage: `authorize('admin')` or `authorize('admin', 'operator')`.
 * Must be registered after `protect`.
 */
const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`,
      });
    }
    return next();
  };

module.exports = { protect, authorize };
