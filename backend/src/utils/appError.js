/**
 * Custom operational error class.
 * Distinguishes app errors from programming errors.
 */
class AppError extends Error {
  constructor(message, statusCode, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Wraps async route handlers to eliminate try/catch boilerplate.
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Standard API response helper.
 */
const sendResponse = (res, statusCode, data, meta = {}) => {
  res.status(statusCode).json({
    status: statusCode < 400 ? 'success' : 'fail',
    ...meta,
    data,
  });
};

module.exports = { AppError, catchAsync, sendResponse };