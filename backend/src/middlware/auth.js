const { verifyAccessToken } = require('../middlware/jwt');
const { AppError, catchAsync } = require('../utils/appError');
const User = require('../models/User');

/**
 * Protect: Verify JWT, load user, attach to req.
 */
const protect = catchAsync(async (req, res, next) => {
  // 1. Extract token
  let token;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    throw new AppError('You are not logged in. Please log in to access this resource.', 401);
  }

  // 2. Verify token
  const decoded = verifyAccessToken(token);

  // 3. Check user still exists and is active
  const user = await User.findOne({ _id: decoded.id, isActive: true }).select('+passwordChangedAt');
  if (!user) {
    throw new AppError('The user belonging to this token no longer exists.', 401);
  }

  // 4. Check password not changed after token issued
  if (user.passwordChangedAfter(decoded.iat)) {
    throw new AppError('Password was recently changed. Please log in again.', 401);
  }

  req.user = user;
  next();
});

/**
 * Authorize: Check roles.
 * Usage: authorize('admin', 'manager')
 */
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    throw new AppError(`Role '${req.user.role}' is not authorized for this action.`, 403);
  }
  next();
};

/**
 * Optional auth: loads user if token exists but doesn't block if not.
 */
const optionalAuth = catchAsync(async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (token) {
    try {
      const decoded = verifyAccessToken(token);
      req.user = await User.findById(decoded.id).select('+passwordChangedAt');
    } catch {
      // Ignore invalid token for optional auth
    }
  }
  next();
});

module.exports = { protect, authorize, optionalAuth };