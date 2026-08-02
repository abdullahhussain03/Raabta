const User = require('../models/User');
const { logAudit } = require('../utils/audit');

exports.searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    const filter = { deletedAt: null };
    if (q) {
      filter.$or = [
        { name: new RegExp(q, 'i') },
        { email: new RegExp(q, 'i') },
      ];
    }
    const users = await User.find(filter).limit(50).select('name email role accountStatus university isEmailVerified');
    res.json({ users });
  } catch (err) {
    next(err);
  }
};

// Manually verify an edge case (e.g. legitimate student whose university
// email format didn't match the domain list).
exports.manuallyVerify = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.isEmailVerified = true;
    await user.save();
    await logAudit({ action: 'ADMIN_ACTION', actor: req.user._id, targetUser: user._id, req, metadata: { op: 'manual_verify' } });
    res.json({ user: { id: user._id, isEmailVerified: user.isEmailVerified } });
  } catch (err) {
    next(err);
  }
};

// Promote a user to moderator, scoped to a specific community. (Broader
// promote-to-admin is intentionally not exposed here — that should be a
// direct DB operation by a super-admin, not a clickable button, to avoid
// accidental privilege escalation.)
exports.promoteToModerator = async (req, res, next) => {
  try {
    const { communityId } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.moderatedCommunities.some((c) => c.toString() === communityId)) {
      user.moderatedCommunities.push(communityId);
    }
    if (user.role === 'student') user.role = 'moderator';
    await user.save();

    const Community = require('../models/Community');
    await Community.findByIdAndUpdate(communityId, { $addToSet: { moderators: user._id } });

    await logAudit({ action: 'ROLE_CHANGED', actor: req.user._id, targetUser: user._id, req, metadata: { newRole: 'moderator', communityId } });

    res.json({ user: { id: user._id, role: user.role, moderatedCommunities: user.moderatedCommunities } });
  } catch (err) {
    next(err);
  }
};

exports.setAccountStatus = async (req, res, next) => {
  try {
    const { status, suspendDays } = req.body; // 'active' | 'warned' | 'suspended' | 'banned'
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.accountStatus = status;
    user.suspendedUntil = status === 'suspended' ? new Date(Date.now() + (suspendDays || 7) * 24 * 60 * 60 * 1000) : null;
    if (status === 'suspended' || status === 'banned') user.tokenVersion += 1;
    await user.save();

    const actionMap = { warned: 'USER_WARNED', suspended: 'USER_SUSPENDED', banned: 'USER_BANNED' };
    if (actionMap[status]) {
      await logAudit({ action: actionMap[status], actor: req.user._id, targetUser: user._id, req });
    }

    res.json({ user: { id: user._id, accountStatus: user.accountStatus } });
  } catch (err) {
    next(err);
  }
};
