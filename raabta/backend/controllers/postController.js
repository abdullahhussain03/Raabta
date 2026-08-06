const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Community = require('../models/Community');
const Group = require('../models/Group');
const cloudinary = require('../config/cloudinary');
const { uploadBufferToCloudinary, mimeToFileType } = require('../middleware/upload');

// A post belongs to exactly one of community/group — validated at the
// schema level too, but we double-check here for a clean 400 instead of a
// 500 from the pre-validate hook.
exports.create = async (req, res, next) => {
  try {
    const { communityId, groupId } = req.body;
    const content = (req.body.content || '').trim();
    // isAnonymous arrives as a JSON boolean, but as a string ('true'/'false'/'on')
    // from multipart forms — normalize both.
    const isAnon = req.body.isAnonymous === true || req.body.isAnonymous === 'true' || req.body.isAnonymous === 'on';

    // A post needs text, a media attachment, or both.
    if (!content && !req.file) {
      return res.status(400).json({ message: 'A post needs text, a photo/video, or both.' });
    }

    if (!!communityId === !!groupId) {
      return res.status(400).json({ message: 'Provide exactly one of communityId or groupId.' });
    }

    if (groupId) {
      const group = await Group.findOne({ _id: groupId, university: req.user.university });
      if (!group) return res.status(404).json({ message: 'Group not found' });
      if (!group.members.some((m) => m.toString() === req.user._id.toString())) {
        return res.status(403).json({ message: 'Join this group to post.' });
      }
    }
    if (communityId) {
      const community = await Community.findOne({ _id: communityId, university: req.user.university });
      if (!community) return res.status(404).json({ message: 'Community not found' });
    }

    // Optional media attachment — uploaded to Cloudinary, mirroring the
    // course-resources flow (see resourceController.upload). Documents are
    // already rejected at the multer fileFilter for this route, so any file
    // that reaches here is an image or video. Media is shown for anonymous
    // posts too — the attachment itself isn't identity-revealing.
    let mediaUrl = null;
    let mediaType = null;
    let uploadedPublicId = null;
    if (req.file) {
      const fileType = mimeToFileType(req.file.mimetype); // 'image' | 'video'
      if (!fileType) {
        return res.status(400).json({ message: 'Post media must be an image or video.' });
      }
      const result = await uploadBufferToCloudinary(req.file.buffer, {
        folder: `raabta/posts/${req.user.university}`,
        filenameHint: req.file.originalname,
      });
      mediaUrl = result.secure_url;
      mediaType = fileType;
      uploadedPublicId = result.public_id;
    }

    let post;
    try {
      post = await Post.create({
        author: req.user._id,
        community: communityId || null,
        group: groupId || null,
        content,
        isAnonymous: isAnon,
        mediaUrl,
        mediaType,
      });
    } catch (err) {
      // If the DB write fails, don't leave an orphaned asset in Cloudinary.
      if (uploadedPublicId) {
        cloudinary.uploader.destroy(uploadedPublicId).catch(() => {});
      }
      throw err;
    }

    const populated = await Post.findById(post._id).populate('author', 'name profilePicture');
    res.status(201).json({ post: populated.toPublicJSON(false) });
  } catch (err) {
    next(err);
  }
};

// Blocked users' content is filtered at the query level (never just hidden
// client-side) — a malicious client calling the API directly still can't
// see it.
exports.listForCommunity = async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const blockedByMe = req.user.blockedUsers || [];

    const posts = await Post.find({ community: communityId, author: { $nin: blockedByMe } })
      .sort({ isPinned: -1, createdAt: -1 })
      .populate('author', 'name profilePicture');

    const isModOrAdmin = req.user.role === 'admin' ||
      (req.user.role === 'moderator' && req.user.moderatedCommunities.some((c) => c.toString() === communityId));

    res.json({ posts: posts.map((p) => p.toPublicJSON(isModOrAdmin)) });
  } catch (err) {
    next(err);
  }
};

exports.listForGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const blockedByMe = req.user.blockedUsers || [];

    const posts = await Post.find({ group: groupId, author: { $nin: blockedByMe } })
      .sort({ isPinned: -1, createdAt: -1 })
      .populate('author', 'name profilePicture');

    res.json({ posts: posts.map((p) => p.toPublicJSON(false)) });
  } catch (err) {
    next(err);
  }
};

exports.toggleUpvote = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const userId = req.user._id.toString();
    const alreadyUpvoted = post.upvotes.some((u) => u.toString() === userId);

    if (alreadyUpvoted) {
      post.upvotes = post.upvotes.filter((u) => u.toString() !== userId);
    } else {
      post.upvotes.push(req.user._id);
    }
    await post.save();

    res.json({ upvoteCount: post.upvotes.length, upvoted: !alreadyUpvoted });
  } catch (err) {
    next(err);
  }
};

// Pin/unpin: admin, or moderator scoped to that specific community.
exports.togglePin = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (!post.community) return res.status(400).json({ message: 'Only community posts can be pinned.' });

    const isAdmin = req.user.role === 'admin';
    const isScoppedMod = req.user.role === 'moderator' &&
      req.user.moderatedCommunities.some((c) => c.toString() === post.community.toString());

    if (!isAdmin && !isScoppedMod) return res.status(403).json({ message: 'Forbidden' });

    post.isPinned = !post.isPinned;
    await post.save();
    res.json({ post });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const isOwner = post.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isScoppedMod = req.user.role === 'moderator' && post.community &&
      req.user.moderatedCommunities.some((c) => c.toString() === post.community.toString());

    if (!isOwner && !isAdmin && !isScoppedMod) return res.status(403).json({ message: 'Forbidden' });

    await post.deleteOne();
    await Comment.deleteMany({ post: post._id });
    res.json({ message: 'Post removed' });
  } catch (err) {
    next(err);
  }
};

// --- Comments ---
exports.addComment = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = await Comment.create({
      post: post._id,
      author: req.user._id,
      content: req.body.content,
    });
    post.commentCount += 1;
    await post.save();

    const populated = await comment.populate('author', 'name profilePicture');
    res.status(201).json({ comment: populated });
  } catch (err) {
    next(err);
  }
};

exports.listComments = async (req, res, next) => {
  try {
    const blockedByMe = req.user.blockedUsers || [];
    const comments = await Comment.find({ post: req.params.id, author: { $nin: blockedByMe } })
      .sort('createdAt')
      .populate('author', 'name profilePicture');
    res.json({ comments });
  } catch (err) {
    next(err);
  }
};
