const express = require('express');
const authController = require('../../controller/authController');
const { registerValidator, loginValidator } = require('../../middlware');
const { protect } = require('../../middlware/auth');
const { authLimiter } = require('../../middlware/rateLimiter');

const router = express.Router();

router.post('/register', authLimiter, registerValidator, authController.register);
router.post('/login', authLimiter, loginValidator, authController.login);
router.post('/refresh-token', authController.refreshToken);

// Protected
router.use(protect);
router.post('/logout', authController.logout);
router.get('/me', authController.getMe);
router.patch('/change-password', authController.changePassword);

module.exports = router;