const User = require('../models/User');
const University = require('../models/University');
const Community = require('../models/Community');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateRawToken,
  hashToken,
  generateNumericCode,
} = require('../utils/tokens');
const { sendEmail, verificationEmail, passwordResetEmail, otpEmail } = require('../utils/sendEmail');
const { logAudit } = require('../utils/audit');

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes
const EMAIL_CODE_TTL_MS = 30 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const OTP_TTL_MS = 5 * 60 * 1000;

const isProd = process.env.NODE_ENV === 'production';
const cookieBase = {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true' || isProd,
  sameSite: 'lax',
};

function setAuthCookies(res, user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  res.cookie('accessToken', accessToken, { ...cookieBase, maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, { ...cookieBase, maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/auth/refresh' });
}

function clearAuthCookies(res) {
  res.clearCookie('accessToken', cookieBase);
  res.clearCookie('refreshToken', { ...cookieBase, path: '/api/auth/refresh' });
}

// --- Signup ---
// role is NEVER read from req.body — always defaults to 'student' via the
// User schema. University email domain match is required before an account
// can even be created in an unverified state.
exports.signup = async (req, res, next) => {
  try {
    const { name, email, password, universityId } = req.body;

    const university = await University.findOne({ _id: universityId, status: 'active' });
    if (!university) {
      return res.status(400).json({ message: 'Please select a valid, active university.' });
    }

    const domain = email.split('@')[1] ? email.split('@')[1].toLowerCase() : '';
    const domainAllowed = university.verifiedEmailDomains.includes(domain);
    if (!domainAllowed) {
      return res.status(400).json({ message: 'Your email domain does not match this university.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      // Same generic message regardless of whether email exists, to avoid
      // account enumeration where it matters most (this endpoint is a bit
      // of an exception since signup UX benefits from a clear message, but
      // we still avoid detail leakage elsewhere, e.g. forgot-password).
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const code = generateNumericCode(6);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      university: university._id,
      role: 'student', // explicit — never trust a client-supplied role
      isEmailVerified: false,
      emailVerificationCodeHash: hashToken(code),
      emailVerificationExpires: new Date(Date.now() + EMAIL_CODE_TTL_MS),
    });

    const { subject, html, text } = verificationEmail(code);
    await sendEmail({ to: user.email, subject, html, text });

    await logAudit({ action: 'SIGNUP', actor: user._id, req });

    res.status(201).json({
      message: 'Account created. Check your university email for a verification code.',
      userId: user._id,
    });
  } catch (err) {
    next(err);
  }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    const { userId, code } = req.body;

    const user = await User.findById(userId).select('+emailVerificationCodeHash +emailVerificationExpires');
    if (!user) return res.status(400).json({ message: 'Invalid verification request.' });

    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email already verified.' });
    }

    if (!user.emailVerificationExpires || user.emailVerificationExpires < Date.now()) {
      return res.status(400).json({ message: 'Verification code expired. Please request a new one.' });
    }

    if (hashToken(code) !== user.emailVerificationCodeHash) {
      return res.status(400).json({ message: 'Incorrect verification code.' });
    }

    user.isEmailVerified = true;
    user.emailVerificationCodeHash = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    await logAudit({ action: 'EMAIL_VERIFIED', actor: user._id, req });

    res.json({ message: 'Email verified. You can now log in.' });
  } catch (err) {
    next(err);
  }
};

exports.resendVerificationCode = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user || user.isEmailVerified) {
      // Generic response either way — don't confirm account state.
      return res.json({ message: 'If this account needs verification, a new code has been sent.' });
    }

    const code = generateNumericCode(6);
    user.emailVerificationCodeHash = hashToken(code);
    user.emailVerificationExpires = new Date(Date.now() + EMAIL_CODE_TTL_MS);
    await user.save();

    const { subject, html, text } = verificationEmail(code);
    await sendEmail({ to: user.email, subject, html, text });

    res.json({ message: 'If this account needs verification, a new code has been sent.' });
  } catch (err) {
    next(err);
  }
};

// --- Login ---
// Includes: account lockout after repeated failures, mandatory email
// verification, and mandatory-2FA gate for moderator/admin roles.
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      '+password +failedLoginAttempts +lockUntil +twoFactorEnabled'
    );

    // Same generic error for "no such user" and "wrong password" — avoids
    // account enumeration.
    const genericFail = () => res.status(401).json({ message: 'Invalid email or password.' });

    if (!user) return genericFail();

    if (user.isLocked()) {
      return res.status(423).json({ message: 'Account temporarily locked due to repeated failed attempts. Try again later.' });
    }

    const validPassword = await user.comparePassword(password);
    if (!validPassword) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
        user.failedLoginAttempts = 0;
        await logAudit({ action: 'ACCOUNT_LOCKED', actor: user._id, req });
      }
      await user.save();
      await logAudit({ action: 'LOGIN_FAILED', actor: user._id, req });
      return genericFail();
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({ message: 'Please verify your email before logging in.' });
    }

    if (user.accountStatus === 'banned') {
      return res.status(403).json({ message: 'This account has been banned.' });
    }

    // Reset failure counter on a successful password check.
    user.failedLoginAttempts = 0;
    user.lockUntil = null;

    // Mandatory 2FA (email OTP) for moderator/admin accounts.
    if (user.role === 'moderator' || user.role === 'admin') {
      const otp = generateNumericCode(6);
      user.twoFactorOtpHash = hashToken(otp);
      user.twoFactorOtpExpires = new Date(Date.now() + OTP_TTL_MS);
      await user.save();

      const { subject, html, text } = otpEmail(otp);
      await sendEmail({ to: user.email, subject, html, text });

      return res.json({
        requiresOtp: true,
        userId: user._id,
        message: 'A one-time code has been sent to your email to complete login.',
      });
    }

    await user.save();
    setAuthCookies(res, user);
    await logAudit({ action: 'LOGIN_SUCCESS', actor: user._id, req });

    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
};

// Second step of login for moderator/admin accounts.
exports.verifyLoginOtp = async (req, res, next) => {
  try {
    const { userId, otp } = req.body;
    const user = await User.findById(userId).select('+twoFactorOtpHash +twoFactorOtpExpires');
    if (!user) return res.status(400).json({ message: 'Invalid request.' });

    if (!user.twoFactorOtpExpires || user.twoFactorOtpExpires < Date.now()) {
      return res.status(400).json({ message: 'Code expired. Please log in again.' });
    }
    if (hashToken(otp) !== user.twoFactorOtpHash) {
      return res.status(400).json({ message: 'Incorrect code.' });
    }

    user.twoFactorOtpHash = undefined;
    user.twoFactorOtpExpires = undefined;
    await user.save();

    setAuthCookies(res, user);
    await logAudit({ action: 'LOGIN_SUCCESS', actor: user._id, req, metadata: { via2fa: true } });

    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
};

// --- Refresh / logout ---
exports.refresh = async (req, res, next) => {
  try {
    const token = req.cookies && req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: 'Not authenticated' });

    const payload = verifyRefreshToken(token);
    const user = await User.findById(payload.sub).select('+tokenVersion');
    if (!user || user.tokenVersion !== payload.tokenVersion || user.deletedAt) {
      return res.status(401).json({ message: 'Session expired, please log in again.' });
    }

    setAuthCookies(res, user);
    res.json({ user: publicUser(user) });
  } catch (err) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
};

exports.logout = async (req, res) => {
  clearAuthCookies(res);
  if (req.user) await logAudit({ action: 'LOGOUT', actor: req.user._id, req });
  res.json({ message: 'Logged out.' });
};

// --- Password reset ---
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return the same generic response — never reveal whether the
    // email exists (prevents account enumeration).
    const genericResponse = { message: 'If an account exists for this email, a reset link has been sent.' };

    if (!user) return res.json(genericResponse);

    const rawToken = generateRawToken();
    user.passwordResetTokenHash = hashToken(rawToken);
    user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await user.save();

    const { subject, html, text } = passwordResetEmail(rawToken, process.env.FRONTEND_URL);
    await sendEmail({ to: user.email, subject, html, text });

    await logAudit({ action: 'PASSWORD_RESET_REQUESTED', actor: user._id, req });

    res.json(genericResponse);
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    const tokenHash = hashToken(token);

    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+passwordResetTokenHash +passwordResetExpires +tokenVersion');

    if (!user) return res.status(400).json({ message: 'Reset link is invalid or has expired.' });

    user.password = newPassword; // re-hashed by pre-save hook
    user.passwordResetTokenHash = undefined; // single-use: invalidate immediately
    user.passwordResetExpires = undefined;
    user.tokenVersion += 1; // invalidate all existing sessions
    await user.save();

    clearAuthCookies(res);
    await logAudit({ action: 'PASSWORD_RESET_COMPLETED', actor: user._id, req });

    res.json({ message: 'Password reset. Please log in with your new password.' });
  } catch (err) {
    next(err);
  }
};

// Authenticated change-password flow (distinct from the forgot/reset flow).
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password +tokenVersion');

    const validPassword = await user.comparePassword(currentPassword);
    if (!validPassword) return res.status(401).json({ message: 'Current password is incorrect.' });

    user.password = newPassword;
    user.tokenVersion += 1; // invalidate all existing sessions, including this one
    await user.save();

    clearAuthCookies(res);
    await logAudit({ action: 'PASSWORD_CHANGED', actor: user._id, req });

    res.json({ message: 'Password changed. Please log in again.' });
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res) => {
  res.json({ user: publicUser(req.user) });
};

// Never spread a raw Mongoose doc into a JSON response — select only the
// fields the client actually needs. This is the one shared place that
// decides what "the user" looks like on the wire.
function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    university: user.university,
    program: user.program,
    year: user.year,
    interests: user.interests,
    bio: user.bio,
    profilePicture: user.profilePicture,
    role: user.role,
    dmPermission: user.dmPermission,
    isEmailVerified: user.isEmailVerified,
  };
}

exports.publicUser = publicUser;
