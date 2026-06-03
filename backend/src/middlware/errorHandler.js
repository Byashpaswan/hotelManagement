const logger = require('../config/logger');

const handleCastErrorDB = (err) => ({
  statusCode: 400,
  message: `Invalid ${err.path}: ${err.value}`,
});

const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue || {})[0];
  const value = err.keyValue?.[field];
  return {
    statusCode: 409,
    message: `Duplicate value for '${field}': "${value}". Please use a different value.`,
  };
};

const handleValidationErrorDB = (err) => ({
  statusCode: 422,
  message: 'Validation failed',
  errors: Object.values(err.errors).map((e) => ({ field: e.path, message: e.message })),
});

const handleJWTError = () => ({
  statusCode: 401,
  message: 'Invalid token. Please log in again.',
});

const handleJWTExpiredError = () => ({
  statusCode: 401,
  message: 'Your session has expired. Please log in again.',
});

const sendErrorDev = (err, res) => {
  res.status(err.statusCode || 500).json({
    status: err.status || 'error',
    message: err.message,
    errors: err.errors || undefined,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      errors: err.errors || undefined,
    });
  } else {
    // Don't leak internals in production
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong. Please try again later.',
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  logger.error(`${err.statusCode} — ${err.message}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    stack: err.stack,
  });

  if (process.env.NODE_ENV === 'development') {
    return sendErrorDev(err, res);
  }

  // Transform known Mongoose/JWT errors into operational errors
  let processedErr = { ...err, message: err.message, isOperational: err.isOperational };

  if (err.name === 'CastError') Object.assign(processedErr, handleCastErrorDB(err));
  if (err.code === 11000) Object.assign(processedErr, handleDuplicateFieldsDB(err));
  if (err.name === 'ValidationError') Object.assign(processedErr, handleValidationErrorDB(err));
  if (err.name === 'JsonWebTokenError') Object.assign(processedErr, handleJWTError());
  if (err.name === 'TokenExpiredError') Object.assign(processedErr, handleJWTExpiredError());

  processedErr.isOperational = true;
  sendErrorProd(processedErr, res);
};