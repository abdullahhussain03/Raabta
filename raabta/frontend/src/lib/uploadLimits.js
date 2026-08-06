// Mirrors the backend's Cloudinary per-file caps (backend/middleware/upload.js).
// Cloudinary's free plan caps images/raw documents at 10MB and videos at
// 100MB. If the backend overrides these via CLOUDINARY_*_MAX_MB env vars,
// keep this file in sync so UI hint text and client-side checks stay truthful.
export const MAX_IMAGE_MB = 10;
export const MAX_VIDEO_MB = 100;
export const MAX_DOC_MB = 10;
