const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // A post belongs to exactly one of community/group — enforced below.
    community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', default: null },
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },

    // content is optional ONLY when a media attachment is present — a post
    // needs text, media, or both (enforced in the controller, see
    // postController.create). Sanitized on input, see middleware/sanitize.js.
    content: { type: String, trim: true, maxlength: 5000, default: '' },
    mediaUrl: { type: String, default: null },
    mediaType: { type: String, enum: ['image', 'video', null], default: null },

    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isPinned: { type: Boolean, default: false }, // admin/mod only
    isAnonymous: { type: Boolean, default: false },

    commentCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

postSchema.pre('validate', function enforceExactlyOneParent(next) {
  const hasCommunity = !!this.community;
  const hasGroup = !!this.group;
  if (hasCommunity === hasGroup) {
    // both set or both empty — invalid either way
    return next(new Error('Post must belong to exactly one of community or group'));
  }
  next();
});

// Anonymous posts hide the author in API responses (see toPublicJSON in the
// controller), but `author` is always persisted here for moderation
// accountability. Never null this out.
postSchema.methods.toPublicJSON = function toPublicJSON(viewerIsModOrAuthor = false) {
  const obj = this.toObject();
  if (obj.isAnonymous && !viewerIsModOrAuthor) {
    obj.author = { _id: null, name: 'Anonymous', profilePicture: null };
  }
  return obj;
};

postSchema.index({ community: 1, createdAt: -1 });
postSchema.index({ group: 1, createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);
