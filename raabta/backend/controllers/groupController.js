const Group = require('../models/Group');
const GroupMessage = require('../models/GroupMessage');

// Any verified student can create a group; name+description+category are
// required (enforced at the schema level too) to keep out empty/junk groups.
exports.create = async (req, res, next) => {
  try {
    const { name, description, category } = req.body;
    const group = await Group.create({
      name,
      description,
      category,
      university: req.user.university,
      createdBy: req.user._id,
      members: [req.user._id],
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

    const groups = await Group.find(filter).sort('-lastActivityAt').select('-members');
    res.json({ groups });
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
