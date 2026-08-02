const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Group = require('../models/Group');
const Post = require('../models/Post');

// Do the two users share any group membership or have both posted in the
// same community? Used to decide whether a first message should be a
// "request" or land straight in Messages.
async function haveSharedHistory(userAId, userBId) {
  const sharedGroup = await Group.exists({
    members: { $all: [userAId, userBId] },
  });
  if (sharedGroup) return true;

  const communitiesA = await Post.distinct('community', { author: userAId, community: { $ne: null } });
  if (communitiesA.length === 0) return false;
  const overlap = await Post.exists({ author: userBId, community: { $in: communitiesA } });
  return !!overlap;
}

function checkDmPermission(sender, recipient) {
  if (recipient.blockedUsers.some((id) => id.toString() === sender._id.toString())) {
    return { allowed: false, reason: 'You cannot message this user.' };
  }
  if (sender.blockedUsers.some((id) => id.toString() === recipient._id.toString())) {
    return { allowed: false, reason: 'You have blocked this user.' };
  }

  if (recipient.dmPermission === 'nobody') return { allowed: false, reason: 'This user is not accepting messages.' };
  if (recipient.dmPermission === 'sameUniversity') {
    if (recipient.university.toString() !== sender.university.toString()) {
      return { allowed: false, reason: 'This user only accepts messages from their own university.' };
    }
  }
  // 'everyone' — allowed. (Phase 1 is same-university-only overall in
  // practice since cross-university discovery is out of scope, but this
  // check is ready for when Phase 3 opens that up.)
  return { allowed: true };
}

exports.startOrGetConversation = async (req, res, next) => {
  try {
    const { recipientId } = req.body;
    if (recipientId === req.user._id.toString()) {
      return res.status(400).json({ message: "You can't message yourself." });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) return res.status(404).json({ message: 'User not found' });

    const permission = checkDmPermission(req.user, recipient);
    if (!permission.allowed) return res.status(403).json({ message: permission.reason });

    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, recipient._id], $size: 2 },
    });

    if (!conversation) {
      const sharedHistory = await haveSharedHistory(req.user._id, recipient._id);
      conversation = await Conversation.create({
        participants: [req.user._id, recipient._id],
        initiatedBy: req.user._id,
        status: sharedHistory ? 'accepted' : 'pending',
      });
    }

    res.status(201).json({ conversation });
  } catch (err) {
    next(err);
  }
};

// Requests tab vs Messages tab. Only the recipient (non-initiator) sees a
// pending conversation under "requests"; the initiator sees their own
// pending sends under Messages so they know it's awaiting acceptance.
exports.listConversations = async (req, res, next) => {
  try {
    const blockedByMe = req.user.blockedUsers || [];

    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .sort('-lastMessageAt')
      .populate('participants', 'name profilePicture university');

    const visible = conversations.filter((c) =>
      c.participants.every((p) => !blockedByMe.some((b) => b.toString() === p._id.toString()))
    );

    const requests = visible.filter(
      (c) => c.status === 'pending' && c.initiatedBy.toString() !== req.user._id.toString()
    );
    const messages = visible.filter(
      (c) => c.status === 'accepted' || c.initiatedBy.toString() === req.user._id.toString()
    );

    res.json({ requests, messages });
  } catch (err) {
    next(err);
  }
};

exports.acceptRequest = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user._id,
    });
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    if (conversation.initiatedBy.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot accept your own request.' });
    }
    conversation.status = 'accepted';
    await conversation.save();
    res.json({ conversation });
  } catch (err) {
    next(err);
  }
};

exports.listMessages = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({ _id: req.params.id, participants: req.user._id });
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    const messages = await Message.find({ conversation: conversation._id }).sort('createdAt');
    res.json({ messages, conversation });
  } catch (err) {
    next(err);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({ _id: req.params.id, participants: req.user._id })
      .populate('participants');
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    const recipient = conversation.participants.find((p) => p._id.toString() !== req.user._id.toString());

    // Re-check permission/blocking on every send, not just at conversation
    // creation — a permission or block state can change afterward.
    const permission = checkDmPermission(req.user, recipient);
    if (!permission.allowed) return res.status(403).json({ message: permission.reason });

    if (conversation.status === 'pending' && conversation.initiatedBy.toString() !== req.user._id.toString()) {
      // Replying implicitly accepts the request.
      conversation.status = 'accepted';
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user._id,
      content: req.body.content,
      readBy: [req.user._id],
    });

    conversation.lastMessageAt = new Date();
    conversation.lastMessagePreview = req.body.content.slice(0, 200);
    await conversation.save();

    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
};

exports.blockUser = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!req.user.blockedUsers.some((id) => id.toString() === userId)) {
      req.user.blockedUsers.push(userId);
      await req.user.save();
    }
    res.json({ message: 'User blocked.' });
  } catch (err) {
    next(err);
  }
};

exports.unblockUser = async (req, res, next) => {
  try {
    const { userId } = req.body;
    req.user.blockedUsers = req.user.blockedUsers.filter((id) => id.toString() !== userId);
    await req.user.save();
    res.json({ message: 'User unblocked.' });
  } catch (err) {
    next(err);
  }
};
