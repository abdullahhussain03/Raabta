const mongoose = require('mongoose');

const communitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, trim: true, lowercase: true, index: true }, // e.g. "seecs-cs"

    // Nullable is reserved for Phase 3 cross-university communities. In
    // Phase 1 every community belongs to exactly one university.
    university: { type: mongoose.Schema.Types.ObjectId, ref: 'University', required: true, index: true },

    type: { type: String, enum: ['general', 'department', 'society', 'batch'], required: true },
    description: { type: String, trim: true, maxlength: 500 },
    isVerifiedOfficial: { type: Boolean, default: false },

    // Only ever set from req.user (an authenticated admin), never trusted
    // from the request body.
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    moderators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    memberCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

communitySchema.index({ university: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model('Community', communitySchema);
