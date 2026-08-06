const multer = require('multer');
const streamifier = require('streamifier');
const cloudinary = require('../config/cloudinary');

// Files are buffered in memory (never written to local disk — Render's
// filesystem is ephemeral and would lose files on every redeploy) and then
// streamed straight to Cloudinary. Swap this file alone if the storage
// provider ever changes; controllers only ever see the returned secure_url.

// Global app ceiling enforced by multer before anything else (env: MAX_UPLOAD_MB).
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB) || 100;
const MAX_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

// Cloudinary per-file caps by asset type. Defaults match Cloudinary's free
// plan (images and raw documents 10MB, videos 100MB) — the free tier will
// reject files above these even though multer accepted them, so
// enforceCloudinaryLimits() below fails fast with a clear message instead of
// a generic Cloudinary upload failure. If the account is upgraded, override
// via CLOUDINARY_IMAGE_MAX_MB / CLOUDINARY_VIDEO_MAX_MB / CLOUDINARY_RAW_MAX_MB.
const TYPE_MAX_MB = {
  image: Number(process.env.CLOUDINARY_IMAGE_MAX_MB) || 10,
  video: Number(process.env.CLOUDINARY_VIDEO_MAX_MB) || 100,
  pdf: Number(process.env.CLOUDINARY_RAW_MAX_MB) || 10,
  docx: Number(process.env.CLOUDINARY_RAW_MAX_MB) || 10,
  pptx: Number(process.env.CLOUDINARY_RAW_MAX_MB) || 10,
};

// mimetype is cross-checked here as a first filter, but is NOT fully
// trusted on its own since the client-reported header can be spoofed. In
// production, layer in real magic-byte content sniffing (e.g. the
// `file-type` package) before the Cloudinary upload call below.
//
// Allow-lists are split per endpoint: resources accept documents + images,
// posts accept images + videos (never documents). Kept as plain maps so
// mimeToFileType() stays a single lookup.
const IMAGE_MIME = {
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/webp': 'image',
};
const VIDEO_MIME = {
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',
};
const DOC_MIME = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
};

const RESOURCE_ALLOWED_MIME = { ...IMAGE_MIME, ...DOC_MIME };
const MEDIA_ALLOWED_MIME = { ...IMAGE_MIME, ...VIDEO_MIME };

function createUploader(allowedMime, errorMessage) {
  return multer({
    storage: multer.memoryStorage(),
    fileFilter(req, file, cb) {
      if (!allowedMime[file.mimetype]) {
        const err = new Error(errorMessage);
        err.statusCode = 400;
        return cb(err);
      }
      cb(null, true);
    },
    limits: { fileSize: MAX_BYTES },
  });
}

// Documents/images uploader used by course resources only.
const upload = createUploader(
  RESOURCE_ALLOWED_MIME,
  'Unsupported file type. Allowed: PDF, DOCX, PPTX, images.'
);

// Images-only uploader used for profile pictures.
const uploadImage = createUploader(
  IMAGE_MIME,
  'Unsupported file type. Allowed: images (PNG/JPEG/WebP).'
);

// Images/videos uploader used by post attachments (documents not allowed).
const uploadMedia = createUploader(
  MEDIA_ALLOWED_MIME,
  'Unsupported file type. Allowed: images (PNG/JPEG/WebP) and videos (MP4/WebM/MOV).'
);

function mimeToFileType(mimetype) {
  return RESOURCE_ALLOWED_MIME[mimetype] || MEDIA_ALLOWED_MIME[mimetype] || null;
}

// Rejects files that pass multer's global ceiling but exceed what the
// configured Cloudinary plan actually accepts for their type. Run AFTER
// upload.single(...) and BEFORE the controller so the failure surfaces as a
// clear 413 rather than a generic Cloudinary error deep in the upload.
//
// Note: the cap check runs after multer has already buffered the file in
// memory (memoryStorage), so a file between the type cap and MAX_UPLOAD_MB
// still consumes RAM briefly before being rejected — accepted tradeoff for
// the ephemeral-filesystem deployment.
function enforceCloudinaryLimits(req, res, next) {
  if (!req.file) return next();
  const type = mimeToFileType(req.file.mimetype);
  const capMb = TYPE_MAX_MB[type];
  if (capMb && req.file.size > capMb * 1024 * 1024) {
    const label = type === 'video' ? 'Videos' : type === 'image' ? 'Images' : 'Documents';
    return res.status(413).json({
      message: `${label} are limited to ${capMb}MB per file on the current Cloudinary plan.`,
    });
  }
  next();
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

module.exports = {
  upload,
  uploadImage,
  uploadMedia,
  MAX_UPLOAD_MB,
  mimeToFileType,
  enforceCloudinaryLimits,
  uploadBufferToCloudinary,
};
