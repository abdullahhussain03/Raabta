const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { upload, enforceCloudinaryLimits } = require('../middleware/upload');
const { sanitizeFields } = require('../middleware/sanitize');
const ctrl = require('../controllers/resourceController');

const router = express.Router();

router.get('/', requireAuth, ctrl.list);
router.post(
  '/',
  requireAuth,
  upload.single('file'),
  enforceCloudinaryLimits,
  sanitizeFields(['courseName', 'description']),
  [
    body('courseCode').trim().isLength({ min: 2, max: 20 }),
    body('courseName').trim().isLength({ min: 2, max: 150 }),
  ],
  validate,
  ctrl.upload
);
router.get('/:id/download', requireAuth, ctrl.download);

module.exports = router;
