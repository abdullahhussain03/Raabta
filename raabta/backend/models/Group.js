const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 500 },
    category: { type: String, required: true, trim: true, maxlength: 60 },

    university: { type: mongoose.Schema.Types.ObjectId, ref: 'University', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Hidden from default browse (not deleted) once flagged inactive by the
    // stale-group job. See jobs/flagStaleGroups.js for the (commented,
    // manually-triggerable) job concept.
    isActive: { type: Boolean, default: true, index: true },
    lastActivityAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Group', groupSchema);
