const rateLimit = require('express-rate-limit');

// Tight limiter for login/signup specifically — blocks brute-force and
// credential-stuffing. Keyed by IP; account-level lockout is handled
// separately in authController via failedLoginAttempts/lockUntil.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again later.' },
});

// Looser limiter for password-reset requests (prevents email-bombing).
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});

// General limiter applied to the whole API to slow down scraping/abuse.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, passwordResetLimiter, generalLimiter };
