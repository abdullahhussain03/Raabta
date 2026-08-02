const crypto = require('crypto');
const User = require('../models/User');
const { logAudit } = require('../utils/audit');
const { uploadBufferToCloudinary } = require('../middleware/upload');

exports.uploadProfilePicture = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'An image file is required.' });

    const result = await uploadBufferToCloudinary(req.file.buffer, {
      folder: `raabta/profile-pictures/${req.user._id}`,
      filenameHint: 'avatar',
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profilePicture: result.secure_url },
      { new: true }
    );

    res.json({ profilePicture: user.profilePicture });
  } catch (err) {
    next(err);
  }
};

const EDITABLE_FIELDS = ['name', 'program', 'year', 'interests', 'bio', 'profilePicture', 'dmPermission'];

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('university', 'name shortName');
    if (!user || user.deletedAt) return res.status(404).json({ message: 'User not found' });

    // Blocked-either-direction users are hidden at the query/response
    // level, not just the UI.
    const viewerBlocked = req.user.blockedUsers.some((id) => id.toString() === user._id.toString());
    const blockedViewer = user.blockedUsers.some((id) => id.toString() === req.user._id.toString());
    if (viewerBlocked || blockedViewer) return res.status(404).json({ message: 'User not found' });

    res.json({
      user: {
        id: user._id,
        name: user.name,
        university: user.university,
        program: user.program,
        year: user.year,
        interests: user.interests,
        bio: user.bio,
        profilePicture: user.profilePicture,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Mass-assignment safe: only ever writes an explicit allow-list of fields
// from the request body, never req.body directly into the document (a
// student could otherwise attempt role: 'admin' in the payload).
exports.updateProfile = async (req, res, next) => {
  try {
    const updates = {};
    EDITABLE_FIELDS.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

// Real deletion, not a soft deactivation flag: personal fields are
// scrubbed/anonymized so the record no longer identifies the person, while
// content (posts/comments) can remain attributed to an anonymized shell
// for community continuity (common pattern — adjust per legal requirements).
exports.deleteAccount = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+password');
    const anonymizedEmail = `deleted_${crypto.randomBytes(8).toString('hex')}@deleted.raabta.app`;

    user.name = 'Deleted User';
    user.email = anonymizedEmail;
    user.password = crypto.randomBytes(32).toString('hex'); // unusable random value, still hashed by pre-save
    user.bio = '';
    user.interests = [];
    user.profilePicture = null;
    user.program = '';
    user.year = '';
    user.blockedUsers = [];
    user.deletedAt = new Date();
    user.tokenVersion += 1;

    await user.save();

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });

    await logAudit({ action: 'ADMIN_ACTION', actor: req.user._id, req, metadata: { op: 'self_account_deletion' } });

    res.json({ message: 'Your account and personal data have been deleted.' });
  } catch (err) {
    next(err);
  }
};
