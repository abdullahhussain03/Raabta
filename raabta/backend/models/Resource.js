const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema(
  {
    courseCode: { type: String, required: true, trim: true, uppercase: true, maxlength: 20, index: true },
    courseName: { type: String, required: true, trim: true, maxlength: 150 },
    university: { type: mongoose.Schema.Types.ObjectId, ref: 'University', required: true, index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Path/key on disk or object storage — never a directly web-executable
    // path. See middleware/upload.js for validation + storage location.
    fileUrl: { type: String, required: true },
    fileType: { type: String, enum: ['pdf', 'docx', 'pptx', 'image'], required: true },
    originalFileName: { type: String, required: true, maxlength: 255 },
    fileSizeBytes: { type: Number, required: true },

    description: { type: String, trim: true, maxlength: 500 },
    downloadCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

resourceSchema.index({ university: 1, courseCode: 1 });
resourceSchema.index({ courseCode: 'text', courseName: 'text', description: 'text' });

module.exports = mongoose.model('Resource', resourceSchema);
