const User = require('../models/User');
const { catchAsync, sendResponse, AppError } = require('../utils/appError');
const { signAccessToken, signRefreshToken, verifyRefreshToken, getCookieOptions } = require('../middlware/jwt');
const logger = require('../config/logger');

const attachTokenCookie = (res, token) => {
  res.cookie('accessToken', token, getCookieOptions());
};

exports.register = catchAsync(async (req, res, next) => {
  const { name, email, password, role, phone } = req.body;

  // Only admins can create admin accounts
  if (role === 'admin' && req.user?.role !== 'admin') {
    throw new AppError('Only admins can create admin accounts.', 403);
  }

  const user = await User.create({ name, email, password, role, phone });
  const accessToken = signAccessToken(user._id, user.role);
  const refreshToken = signRefreshToken(user._id);

  user.refreshTokens = [{ token: refreshToken, userAgent: req.headers['user-agent'], ip: req.ip }];
  await user.save({ validateBeforeSave: false });

  attachTokenCookie(res, accessToken);
  logger.info(`New user registered: ${email} [${role}]`);

  sendResponse(res, 201, { user, accessToken, refreshToken });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email, isActive: true })
    .select('+password +loginAttempts +lockUntil +refreshTokens');

  // Account locked?
  if (user?.isLocked()) {
    throw new AppError('Account temporarily locked due to too many failed attempts. Try again in 15 minutes.', 423);
  }

  if (!user || !(await user.comparePassword(password))) {
    if (user) await user.incrementLoginAttempts();
    throw new AppError('Invalid email or password.', 401);
  }

  await user.resetLoginAttempts();

  const accessToken = signAccessToken(user._id, user.role);
  const refreshToken = signRefreshToken(user._id);

  // Keep last 5 sessions
  user.refreshTokens = [
    { token: refreshToken, userAgent: req.headers['user-agent'], ip: req.ip },
    ...(user.refreshTokens || []).slice(0, 4),
  ];
  await user.save({ validateBeforeSave: false });

  attachTokenCookie(res, accessToken);
  logger.info(`User logged in: ${email}`);

  sendResponse(res, 200, { user, accessToken, refreshToken });
});

exports.refreshToken = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new AppError('Refresh token required.', 400);

  const decoded = verifyRefreshToken(refreshToken);

  const user = await User.findOne({
    _id: decoded.id,
    isActive: true,
    'refreshTokens.token': refreshToken,
  }).select('+refreshTokens');

  if (!user) throw new AppError('Invalid or expired refresh token.', 401);

  const newAccessToken = signAccessToken(user._id, user.role);
  attachTokenCookie(res, newAccessToken);

  sendResponse(res, 200, { accessToken: newAccessToken });
});

exports.logout = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (refreshToken && req.user) {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { refreshTokens: { token: refreshToken } },
    });
  }

  res.clearCookie('accessToken');
  sendResponse(res, 200, null, { message: 'Logged out successfully.' });
});

exports.getMe = catchAsync(async (req, res, next) => {
  sendResponse(res, 200, { user: req.user });
});

exports.changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.comparePassword(currentPassword))) {
    throw new AppError('Current password is incorrect.', 400);
  }

  user.password = newPassword;
  await user.save();

  const accessToken = signAccessToken(user._id, user.role);
  sendResponse(res, 200, { accessToken }, { message: 'Password changed successfully.' });
});