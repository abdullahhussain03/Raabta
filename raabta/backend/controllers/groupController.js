const Group = require('../models/Group');
const GroupMessage = require('../models/GroupMessage');
const { uploadBufferToCloudinary } = require('../middleware/upload');

// Any verified student can create a group; name+description+category are
// required (enforced at the schema level too) to keep out empty/junk groups.
// An optional group photo (`file` field, image only) is uploaded to
// Cloudinary when present.
exports.create = async (req, res, next) => {
  try {
    const { name, description, category } = req.body;
    let profilePicture = null;
    if (req.file) {
      const result = await uploadBufferToCloudinary(req.file.buffer, {
        folder: 'raabta/groups',
        filenameHint: `group-${Date.now()}`,
      });
      profilePicture = result.secure_url;
    }
    const group = await Group.create({
      name,
      description,
      category,
      university: req.user.university,
      createdBy: req.user._id,
      members: [req.user._id],
      profilePicture,
    });
    res.status(201).json({ group });
  } catch (err) {
    next(err);
  }
};

// Default browse only shows active groups within the student's own
// university (enforced at the query level, not just the UI).
exports.list = async (req, res, next) => {
  try {
    const { includeInactive } = req.query;
    const filter = { university: req.user.university };
    if (!includeInactive) filter.isActive = true;

    // Members are needed server-side to compute isMember, but the full
    // members array is never exposed in the browse list — only a boolean
    // telling the UI whether the current user has already joined.
    const groups = await Group.find(filter).sort('-lastActivityAt');
    const userId = req.user._id.toString();
    res.json({
      groups: groups.map((g) => {
        const obj = g.toObject();
        obj.isMember = (obj.members || []).some((m) => m.toString() === userId);
        obj.memberCount = (obj.members || []).length;
        delete obj.members;
        return obj;
      }),
    });
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, university: req.user.university });
    if (!group) return res.status(404).json({ message: 'Group not found' });
    res.json({ group });
  } catch (err) {
    next(err);
  }
};

exports.join = async (req, res, next) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, university: req.user.university });
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (!group.members.some((m) => m.toString() === req.user._id.toString())) {
      group.members.push(req.user._id);
      group.isActive = true;
      await group.save();
    }
    res.json({ group, isMember: true });
  } catch (err) {
    next(err);
  }
};

// Groups the current user has joined — powers the "My Groups" section on
// the dashboard. Scoped to the user's university like every other group
// query. Stale/inactive groups a user is still a member of stay visible
// here so they can always reach a group they joined.
exports.mine = async (req, res, next) => {
  try {
    const groups = await Group.find({
      university: req.user.university,
      members: req.user._id,
    }).sort('-lastActivityAt');

    res.json({
      groups: groups.map((g) => {
        const obj = g.toObject();
        obj.isMember = true;
        obj.memberCount = (obj.members || []).length;
        delete obj.members;
        return obj;
      }),
    });
  } catch (err) {
    next(err);
  }
};

// Set/update the group display picture. Any current member can do it;
// the image is validated + Cloudinary-cap-enforced by the uploadImage /
// enforceCloudinaryLimits middleware on the route.
exports.uploadDp = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image provided.' });
    const group = await Group.findOne({ _id: req.params.id, university: req.user.university });
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.members.some((m) => m.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Only group members can change the group photo.' });
    }

    const result = await uploadBufferToCloudinary(req.file.buffer, {
      folder: 'raabta/groups',
      filenameHint: `group-${group._id}`,
    });
    group.profilePicture = result.secure_url;
    await group.save();
    res.json({ group });
  } catch (err) {
    next(err);
  }
};

exports.leave = async (req, res, next) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, university: req.user.university });
    if (!group) return res.status(404).json({ message: 'Group not found' });

    group.members = group.members.filter((m) => m.toString() !== req.user._id.toString());
    await group.save();
    res.json({ group });
  } catch (err) {
    next(err);
  }
};

// --- Group chat (polling) ---
// The frontend calls GET on an interval (e.g. every 4-5s) rather than
// holding a WebSocket connection open. Simpler ops story for an MVP; trade
// higher latency and more redundant requests for that simplicity. Revisit
// with Socket.io/SSE if usage grows.
exports.listMessages = async (req, res, next) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, university: req.user.university });
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.members.some((m) => m.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Join this group to view its chat.' });
    }

    const { after } = req.query; // ISO timestamp for incremental polling
    const filter = { group: group._id };
    if (after) filter.createdAt = { $gt: new Date(after) };

    const messages = await GroupMessage.find(filter)
      .sort('createdAt')
      .limit(200)
      .populate('sender', 'name profilePicture');

    res.json({ messages });
  } catch (err) {
    next(err);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, university: req.user.university });
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.members.some((m) => m.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Join this group to post in its chat.' });
    }

    const message = await GroupMessage.create({
      group: group._id,
      sender: req.user._id,
      content: req.body.content,
    });

    group.lastActivityAt = new Date();
    group.isActive = true;
    await group.save();

    const populated = await message.populate('sender', 'name profilePicture');
    res.status(201).json({ message: populated });
  } catch (err) {
    next(err);
  }
};

// Manual/scheduled job concept (not wired to an actual cron in this repo —
// call this from an external scheduler, e.g. a hosting-provider cron job
// or `node jobs/flagStaleGroups.js` on a timer). Flags groups with no
// activity (posts/messages) in `weeks` weeks as isActive: false so they
// stop cluttering discovery. Never deletes data.
exports.flagStaleGroups = async (weeks = 6) => {
  const cutoff = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000);
  const result = await Group.updateMany(
    { lastActivityAt: { $lt: cutoff }, isActive: true },
    { $set: { isActive: false } }
  );
  return result;
};
