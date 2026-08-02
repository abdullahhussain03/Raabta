const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimiters');
const { requireAuth } = require('../middleware/auth');
const auth = require('../controllers/authController');

const router = express.Router();

router.post(
  '/signup',
  authLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name is required'),
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('universityId').isMongoId().withMessage('A valid university must be selected'),
  ],
  validate,
  auth.signup
);

router.post(
  '/verify-email',
  authLimiter,
  [body('userId').isMongoId(), body('code').isLength({ min: 6, max: 6 })],
  validate,
  auth.verifyEmail
);

router.post(
  '/resend-code',
  authLimiter,
  [body('userId').isMongoId()],
  validate,
  auth.resendVerificationCode
);

router.post(
  '/login',
  authLimiter,
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  validate,
  auth.login
);

router.post(
  '/verify-otp',
  authLimiter,
  [body('userId').isMongoId(), body('otp').isLength({ min: 6, max: 6 })],
  validate,
  auth.verifyLoginOtp
);

router.post('/refresh', auth.refresh);
router.post('/logout', requireAuth, auth.logout);

router.post(
  '/forgot-password',
  passwordResetLimiter,
  [body('email').isEmail().normalizeEmail()],
  validate,
  auth.forgotPassword
);

router.post(
  '/reset-password',
  passwordResetLimiter,
  [body('token').notEmpty(), body('newPassword').isLength({ min: 8 })],
  validate,
  auth.resetPassword
);

router.post(
  '/change-password',
  requireAuth,
  [body('currentPassword').notEmpty(), body('newPassword').isLength({ min: 8 })],
  validate,
  auth.changePassword
);

router.get('/me', requireAuth, auth.me);

module.exports = router;
