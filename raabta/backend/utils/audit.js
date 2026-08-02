const AuditLog = require('../models/AuditLog');

// Fire-and-forget audit logging. Never throws — a logging failure must
// never break the actual request.
async function logAudit({ action, actor = null, targetUser = null, targetType = null, targetId = null, req = null, metadata = {} }) {
  try {
    await AuditLog.create({
      action,
      actor,
      targetUser,
      targetType,
      targetId,
      ip: req ? req.ip : null,
      metadata,
    });
  } catch (err) {
    console.error(`[audit] failed to write audit log for ${action}: ${err.message}`);
  }
}

module.exports = { logAudit };
