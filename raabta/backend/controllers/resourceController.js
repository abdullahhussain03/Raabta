const Resource = require('../models/Resource');
const { mimeToFileType, uploadBufferToCloudinary } = require('../middleware/upload');

exports.upload = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'A file is required.' });

    const fileType = mimeToFileType(req.file.mimetype);
    if (!fileType) return res.status(400).json({ message: 'Unsupported file type.' });

    const { courseCode, courseName, description } = req.body;

    const result = await uploadBufferToCloudinary(req.file.buffer, {
      folder: `raabta/resources/${req.user.university}`,
      filenameHint: req.file.originalname,
    });

    const resource = await Resource.create({
      courseCode,
      courseName,
      university: req.user.university,
      uploadedBy: req.user._id,
      fileUrl: result.secure_url,
      fileType,
      originalFileName: req.file.originalname,
      fileSizeBytes: req.file.size,
      description,
    });

    res.status(201).json({ resource });
  } catch (err) {
    next(err);
  }
};

// Searchable/filterable by course code and university (own university by
// default — cross-university browsing is Phase 3/out of scope).
exports.list = async (req, res, next) => {
  try {
    const { courseCode, q } = req.query;
    const filter = { university: req.user.university };
    if (courseCode) filter.courseCode = new RegExp(`^${courseCode}`, 'i');
    if (q) filter.$text = { $search: q };

    const resources = await Resource.find(filter)
      .sort('-createdAt')
      .populate('uploadedBy', 'name profilePicture');

    res.json({ resources });
  } catch (err) {
    next(err);
  }
};

// Cloudinary URLs are public-by-default for the asset itself, but the
// listing/metadata (and therefore discovery of the URL) stays gated behind
// auth + same-university checks. Increment downloadCount and hand back the
// URL for the client to open/download directly.
exports.download = async (req, res, next) => {
  try {
    const resource = await Resource.findOne({ _id: req.params.id, university: req.user.university });
    if (!resource) return res.status(404).json({ message: 'Resource not found' });

    resource.downloadCount += 1;
    await resource.save();

    res.json({ url: resource.fileUrl, fileName: resource.originalFileName });
  } catch (err) {
    next(err);
  }
};
