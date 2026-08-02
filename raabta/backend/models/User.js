const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    // Never returned by default in API responses.
    password: { type: String, required: true, select: false },

    university: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'University',
      required: true,
      index: true,
    },

    program: { type: String, trim: true, maxlength: 120 }, // degree/program
    year: { type: String, trim: true, maxlength: 40 }, // year/semester label
    interests: [{ type: String, trim: true, maxlength: 40 }],
    bio: { type: String, trim: true, maxlength: 500 },
    profilePicture: { type: String, default: null },

    // Students can never set this themselves — role is only ever changed by
    // an admin via the admin panel (see adminController), never from the
    // public signup/profile-update payload.
    role: {
      type: String,
      enum: ['student', 'moderator', 'admin'],
      default: 'student',
    },

    // Communities a moderator is scoped to. Empty for students/admins.
    moderatedCommunities: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Community' },
    ],

    dmPermission: {
      type: String,
      enum: ['everyone', 'sameUniversity', 'nobody'],
      default: 'sameUniversity',
    },

    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // --- Email verification ---
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationCodeHash: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },

    // --- Password reset ---
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    // --- Session invalidation ---
    // Bumped on password change / forced logout so all previously issued
    // JWTs (which embed the tokenVersion at issue time) become invalid.
    tokenVersion: { type: Number, default: 0 },

    // --- Login security ---
    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, default: null, select: false },

    // --- 2FA (mandatory for moderator/admin) ---
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorOtpHash: { type: String, select: false },
    twoFactorOtpExpires: { type: Date, select: false },

    // --- Moderation status ---
    accountStatus: {
      type: String,
      enum: ['active', 'warned', 'suspended', 'banned'],
      default: 'active',
    },
    suspendedUntil: { type: Date, default: null },

    deletedAt: { type: Date, default: null }, // soft marker during async anonymization
  },
  { timestamps: true }
);

userSchema.index({ university: 1, role: 1 });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.isLocked = function isLocked() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Roles above 'student' must always be set here, server-side, by an admin
// action — never accept a role field from a public request body.
userSchema.statics.ALLOWED_SELF_SIGNUP_ROLE = 'student';

module.exports = mongoose.model('User', userSchema);
