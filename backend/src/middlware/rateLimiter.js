const rateLimit = require('express-rate-limit');
const { AppError } = require('../utils/appError');

const createLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'fail', message },
    handler: (req, res, next, options) => {
      next(new AppError(options.message.message, 429));
    },
    skip: (req) => process.env.NODE_ENV === 'test',
  });

const globalLimiter = createLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  parseInt(process.env.RATE_LIMIT_MAX) || 100,
  'Too many requests from this IP. Please try again later.'
);

const authLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  'Too many authentication attempts. Please try again in 15 minutes.'
);

const strictLimiter = createLimiter(
  60 * 60 * 1000, // 1 hour
  5,
  'Too many sensitive requests from this IP. Please try again in 1 hour.'
);

module.exports = { globalLimiter, authLimiter, strictLimiter };