const mongoose = require('mongoose');

// Unauthenticated lead-capture form for universities not yet onboarded.
// This is intentionally separate from the signup flow and does NOT create
// a User or grant any access.
const universityRequestSchema = new mongoose.Schema(
  {
    requesterName: { type: String, required: true, trim: true, maxlength: 80 },
    requesterEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 150 },
    universityName: { type: String, required: true, trim: true, maxlength: 150 },
    status: { type: String, enum: ['pending', 'reviewed', 'onboarded', 'dismissed'], default: 'pending' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('UniversityRequest', universityRequestSchema);
