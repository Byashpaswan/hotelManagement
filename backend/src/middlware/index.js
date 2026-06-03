const { validationResult, body, param, query } = require('express-validator');
const { AppError } = require('../utils/appError');

/**
 * Run validation rules and send errors if any.
 */
const validate = (validations) => async (req, res, next) => {
  await Promise.all(validations.map((v) => v.run(req)));
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((e) => ({ field: e.path, message: e.msg }));
    return next(new AppError('Validation failed', 422, formatted));
  }
  next();
};

// ---- Auth Validators ----
const registerValidator = validate([
  body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2-60 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and a number'),
  body('role').optional().isIn(['admin', 'manager', 'receptionist', 'housekeeping']).withMessage('Invalid role'),
]);

const loginValidator = validate([
  body('email').isEmail().normalizeEmail().withMessage('Provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
]);

// ---- Room Validators ----
const roomValidator = validate([
  body('roomNumber').trim().notEmpty().withMessage('Room number is required'),
  body('floor').isInt({ min: 0 }).withMessage('Floor must be a non-negative integer'),
  body('type').isIn(['single', 'double', 'twin', 'suite', 'deluxe', 'presidential']).withMessage('Invalid room type'),
  body('pricePerNight').isFloat({ min: 0 }).withMessage('Price must be non-negative'),
  body('capacity.adults').isInt({ min: 1 }).withMessage('At least 1 adult capacity required'),
]);

// ---- Guest Validators ----
const guestValidator = validate([
  body('firstName').trim().isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),
  body('lastName').trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Provide a valid email'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
]);

// ---- Booking Validators ----
const bookingValidator = validate([
  body('guest').isMongoId().withMessage('Invalid guest ID'),
  body('room').isMongoId().withMessage('Invalid room ID'),
  body('checkIn').isISO8601().toDate().withMessage('Invalid check-in date'),
  body('checkOut').isISO8601().toDate().withMessage('Invalid check-out date'),
  body('adults').isInt({ min: 1 }).withMessage('At least 1 adult required'),
]);

// ---- Common Validators ----
const mongoIdValidator = (paramName = 'id') =>
  validate([param(paramName).isMongoId().withMessage(`Invalid ${paramName}`)]);

const paginationValidator = validate([
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
]);

module.exports = {
  validate,
  registerValidator,
  loginValidator,
  roomValidator,
  guestValidator,
  bookingValidator,
  mongoIdValidator,
  paginationValidator,
};