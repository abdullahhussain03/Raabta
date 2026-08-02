const { verifyAccessToken } = require('../utils/tokens');
const User = require('../models/User');

// Reads the access token from the httpOnly cookie (never from a header /
// localStorage — see security notes in README). Verifies signature, expiry,
// AND that the token's tokenVersion still matches the user's current
// tokenVersion in the DB — this is what makes password-change /
// forced-logout invalidate all existing sessions immediately.
async function requireAuth(req, res, next) {
  try {
    const token = req.cookies && req.cookies.accessToken;
    if (!token) return res.status(401).json({ message: 'Not authenticated' });

    const payload = verifyAccessToken(token);

    const user = await User.findById(payload.sub).select('+tokenVersion');
    if (!user) return res.status(401).json({ message: 'Not authenticated' });

    if (user.deletedAt) return res.status(401).json({ message: 'Not authenticated' });

    if (user.tokenVersion !== payload.tokenVersion) {
      return res.status(401).json({ message: 'Session expired, please log in again' });
    }

    if (user.accountStatus === 'banned') {
      return res.status(403).json({ message: 'This account has been banned' });
    }
    if (user.accountStatus === 'suspended' && user.suspendedUntil && user.suspendedUntil > Date.now()) {
      return res.status(403).json({ message: 'This account is temporarily suspended' });
    }

    // req.user carries only what route handlers need — role checks in
    // requireRole() trust req.user.role, which came from the DB lookup
    // above, not merely from the JWT payload.
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
}

// Optional auth: attaches req.user if a valid session exists, but does not
// reject the request otherwise. Useful for public-ish endpoints that
// personalize when logged in (e.g. landing page).
async function attachUserIfPresent(req, res, next) {
  const token = req.cookies && req.cookies.accessToken;
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);
    if (user && user.tokenVersion === payload.tokenVersion && !user.deletedAt) {
      req.user = user;
    }
  } catch (err) {
    // ignore — treat as anonymous
  }
  next();
}

module.exports = { requireAuth, attachUserIfPresent };
