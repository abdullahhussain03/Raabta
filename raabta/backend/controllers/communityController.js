const Community = require('../models/Community');
const { logAudit } = require('../utils/audit');

// Students only ever GET communities — there is no student-facing create
// endpoint in the router at all (not just hidden in the UI).
exports.listForUniversity = async (req, res, next) => {
  try {
    const universityId = req.params.universityId || req.user.university;
    const communities = await Community.find({ university: universityId }).sort('type name');
    res.json({ communities });
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const community = await Community.findById(req.params.id).populate('moderators', 'name profilePicture');
    if (!community) return res.status(404).json({ message: 'Community not found' });
    res.json({ community });
  } catch (err) {
    next(err);
  }
};

// --- Admin only ---
exports.adminCreate = async (req, res, next) => {
  try {
    const { name, slug, universityId, type, description, isVerifiedOfficial } = req.body;
    const community = await Community.create({
      name,
      slug,
      university: universityId,
      type,
      description,
      isVerifiedOfficial: !!isVerifiedOfficial,
      createdBy: req.user._id, // never trust a createdBy from the body
    });
    await logAudit({ action: 'COMMUNITY_CREATED', actor: req.user._id, targetId: community._id, req });
    res.status(201).json({ community });
  } catch (err) {
    next(err);
  }
};

exports.adminUpdate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const allowedFields = ['name', 'description', 'type', 'isVerifiedOfficial'];
    const updates = {};
    allowedFields.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    const community = await Community.findByIdAndUpdate(id, updates, { new: true });
    if (!community) return res.status(404).json({ message: 'Community not found' });

    await logAudit({ action: 'ADMIN_ACTION', actor: req.user._id, req, metadata: { op: 'update_community', communityId: id } });
    res.json({ community });
  } catch (err) {
    next(err);
  }
};

// Assign/unassign a moderator, scoped to this community (also updates the
// User.moderatedCommunities side for fast permission checks in middleware).
exports.adminSetModerator = async (req, res, next) => {
  try {
    const User = require('../models/User');
    const { id } = req.params; // community id
    const { userId, action } = req.body; // action: 'add' | 'remove'

    const community = await Community.findById(id);
    if (!community) return res.status(404).json({ message: 'Community not found' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (action === 'add') {
      if (!community.moderators.includes(userId)) community.moderators.push(userId);
      if (user.role === 'student') user.role = 'moderator';
      if (!user.moderatedCommunities.includes(id)) user.moderatedCommunities.push(id);
    } else {
      community.moderators = community.moderators.filter((m) => m.toString() !== userId);
      user.moderatedCommunities = user.moderatedCommunities.filter((c) => c.toString() !== id);
      if (user.moderatedCommunities.length === 0 && user.role === 'moderator') user.role = 'student';
    }

    await community.save();
    await user.save();

    await logAudit({ action: 'ROLE_CHANGED', actor: req.user._id, targetUser: user._id, req, metadata: { op: `${action}_moderator`, communityId: id } });

    res.json({ community, user: { id: user._id, role: user.role } });
  } catch (err) {
    next(err);
  }
};
