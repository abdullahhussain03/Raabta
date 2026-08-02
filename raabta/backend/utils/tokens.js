const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Short-lived access token carries identity + role + tokenVersion. The
// tokenVersion is checked against the User document on every request so
// that a password change / forced logout invalidates all previously issued
// tokens immediately (see middleware/auth.js).
function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, tokenVersion: user.tokenVersion },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  );
}

// Refresh token is opaque-ish (still a JWT, but only ever used against the
// /auth/refresh endpoint to mint new access tokens) and lives longer.
function signRefreshToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), tokenVersion: user.tokenVersion },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

// Generic single-use, time-limited token generator for email verification
// and password reset flows. We store only the SHA-256 hash of the token in
// the DB and email the raw token to the user, mirroring how password
// hashing works — a DB leak alone can't be used to complete the flow.
function generateRawToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

// 6-digit numeric code, used for email verification codes and 2FA OTPs.
function generateNumericCode(length = 6) {
  const max = 10 ** length;
  const code = crypto.randomInt(0, max).toString().padStart(length, '0');
  return code;
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateRawToken,
  hashToken,
  generateNumericCode,
};
