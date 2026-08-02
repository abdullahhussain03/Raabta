const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      validate: {
        validator: (arr) => arr.length === 2,
        message: 'A conversation must have exactly 2 participants',
      },
      required: true,
    },

    // 'pending' until the recipient accepts a first message from someone
    // with no shared group/community history. See dmController for the
    // logic that decides this on creation.
    status: { type: String, enum: ['pending', 'accepted'], default: 'accepted' },
    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    lastMessageAt: { type: Date, default: Date.now },
    lastMessagePreview: { type: String, maxlength: 200, default: '' },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
