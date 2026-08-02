const multer = require('multer');
const streamifier = require('streamifier');
const cloudinary = require('../config/cloudinary');

// Files are buffered in memory (never written to local disk — Render's
// filesystem is ephemeral and would lose files on every redeploy) and then
// streamed straight to Cloudinary. Swap this file alone if the storage
// provider ever changes; controllers only ever see the returned secure_url.
const MAX_BYTES = (Number(process.env.MAX_UPLOAD_MB) || 20) * 1024 * 1024;

// mimetype is cross-checked here as a first filter, but is NOT fully
// trusted on its own since the client-reported header can be spoofed. In
// production, layer in real magic-byte content sniffing (e.g. the
// `file-type` package, reading the buffer's actual signature) before the
// Cloudinary upload call below.
const ALLOWED_MIME = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/webp': 'image',
};

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME[file.mimetype]) {
    return cb(new Error('Unsupported file type. Allowed: PDF, DOCX, PPTX, images.'));
  }
  cb(null, true);
}

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: MAX_BYTES },
});

function mimeToFileType(mimetype) {
  return ALLOWED_MIME[mimetype] || null;
}

// Streams a buffer (from multer memoryStorage) up to Cloudinary. `resource_type:
// 'auto'` lets Cloudinary handle both documents (as 'raw') and images
// correctly. `folder` keeps uploads namespaced and easy to manage/restrict
// access to in the Cloudinary dashboard.
function uploadBufferToCloudinary(buffer, { folder, filenameHint }) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
        use_filename: true,
        unique_filename: true,
        filename_override: filenameHint,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

module.exports = { upload, mimeToFileType, uploadBufferToCloudinary };
