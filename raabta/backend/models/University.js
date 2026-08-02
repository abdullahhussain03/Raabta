const mongoose = require('mongoose');

const universitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true, maxlength: 150 },
    shortName: { type: String, trim: true, maxlength: 30 }, // e.g. "NUST"
    verifiedEmailDomains: [{ type: String, required: true, trim: true, lowercase: true }],
    status: { type: String, enum: ['active', 'pending'], default: 'pending', index: true },
    logoUrl: { type: String, default: null },

    // Flips true the first time status becomes 'active', so we know whether
    // the auto-seed (general community) has already run for this school.
    hasBeenActivated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('University', universitySchema);
