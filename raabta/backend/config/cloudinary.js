const cloudinary = require('cloudinary').v2;

// Cloudinary is used from the start (not local disk) so uploaded files
// survive redeploys on ephemeral filesystems like Render/Railway. All
// three CLOUDINARY_* vars are required in production; see .env.example.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

module.exports = cloudinary;
