const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reportedContentType: { type: String, enum: ['post', 'comment', 'user', 'message'], required: true },
    reportedContentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    status: { type: String, enum: ['pending', 'reviewed', 'actioned'], default: 'pending', index: true },

    // Filled in when a moderator/admin actions the report.
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolutionNote: { type: String, maxlength: 500, default: '' },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);
