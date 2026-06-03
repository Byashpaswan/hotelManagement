const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/appError');

const signAccessToken = (userId, role) =>
  jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    issuer: 'hotel-management-api',
    audience: 'hotel-management-client',
  });

const signRefreshToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    issuer: 'hotel-management-api',
  });

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'hotel-management-api',
      audience: 'hotel-management-client',
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') throw new AppError('Token expired. Please log in again.', 401);
    throw new AppError('Invalid token. Please log in again.', 401);
  }
};

const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
      issuer: 'hotel-management-api',
    });
  } catch {
    throw new AppError('Invalid refresh token.', 401);
  }
};

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
});

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken, getCookieOptions };