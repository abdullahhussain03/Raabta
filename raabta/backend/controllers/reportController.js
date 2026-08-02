const Report = require('../models/Report');
const { logAudit } = require('../utils/audit');

// Report button/icon on every post, comment, and user profile funnels here.
exports.create = async (req, res, next) => {
  try {
    const { reportedContentType, reportedContentId, reason } = req.body;
    const report = await Report.create({
      reportedContentType,
      reportedContentId,
      reportedBy: req.user._id,
      reason,
    });
    res.status(201).json({ report });
  } catch (err) {
    next(err);
  }
};

// --- Moderator/admin moderation queue ---
exports.listQueue = async (req, res, next) => {
  try {
    const filter = { status: req.query.status || 'pending' };
    const reports = await Report.find(filter)
      .sort('-createdAt')
      .populate('reportedBy', 'name email');
    res.json({ reports });
  } catch (err) {
    next(err);
  }
};

// action: 'dismiss' | 'remove_content' | 'warn_user' | 'suspend_user' | 'ban_user'
exports.actionReport = async (req, res, next) => {
  try {
    const Post = require('../models/Post');
    const Comment = require('../models/Comment');
    const User = require('../models/User');

    const { id } = req.params;
    const { action, note, suspendDays } = req.body;

    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    if (action === 'remove_content') {
      if (report.reportedContentType === 'post') await Post.findByIdAndDelete(report.reportedContentId);
      if (report.reportedContentType === 'comment') await Comment.findByIdAndDelete(report.reportedContentId);
      await logAudit({ action: 'CONTENT_REMOVED', actor: req.user._id, req, targetType: report.reportedContentType, targetId: report.reportedContentId });
    } else if (['warn_user', 'suspend_user', 'ban_user'].includes(action)) {
      const targetUserId = report.reportedContentType === 'user' ? report.reportedContentId : null;
      if (targetUserId) {
        const user = await User.findById(targetUserId);
        if (user) {
          if (action === 'warn_user') {
            user.accountStatus = 'warned';
            await logAudit({ action: 'USER_WARNED', actor: req.user._id, targetUser: user._id, req });
          } else if (action === 'suspend_user') {
            user.accountStatus = 'suspended';
            user.suspendedUntil = new Date(Date.now() + (suspendDays || 7) * 24 * 60 * 60 * 1000);
            user.tokenVersion += 1; // kick out any active sessions
            await logAudit({ action: 'USER_SUSPENDED', actor: req.user._id, targetUser: user._id, req });
          } else {
            user.accountStatus = 'banned';
            user.tokenVersion += 1;
            await logAudit({ action: 'USER_BANNED', actor: req.user._id, targetUser: user._id, req });
          }
          await user.save();
        }
      }
    }
    // 'dismiss' — no side effect beyond marking the report resolved.

    report.status = 'actioned';
    report.resolvedBy = req.user._id;
    report.resolutionNote = note || '';
    report.resolvedAt = new Date();
    await report.save();

    await logAudit({ action: 'REPORT_ACTIONED', actor: req.user._id, req, targetId: report._id, metadata: { action } });

    res.json({ report });
  } catch (err) {
    next(err);
  }
};
