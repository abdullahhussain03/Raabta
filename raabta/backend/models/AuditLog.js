const mongoose = require('mongoose');

// Append-only trail of security-relevant events: failed logins, role
// changes, admin actions, bans, etc. Never log password/token values here.
const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'LOGIN_SUCCESS',
        'LOGIN_FAILED',
        'ACCOUNT_LOCKED',
        'LOGOUT',
        'SIGNUP',
        'EMAIL_VERIFIED',
        'PASSWORD_RESET_REQUESTED',
        'PASSWORD_RESET_COMPLETED',
        'PASSWORD_CHANGED',
        'ROLE_CHANGED',
        'USER_SUSPENDED',
        'USER_BANNED',
        'USER_WARNED',
        'CONTENT_REMOVED',
        'REPORT_ACTIONED',
        'UNIVERSITY_ACTIVATED',
        'COMMUNITY_CREATED',
        'ADMIN_ACTION',
      ],
      index: true,
    },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null for system/anonymous
    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    targetType: { type: String, default: null }, // e.g. 'Post', 'Community'
    targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
    ip: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
