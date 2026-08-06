const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { sanitizeFields } = require('../middleware/sanitize');
const { uploadImage, enforceCloudinaryLimits } = require('../middleware/upload');
const ctrl = require('../controllers/groupController');

const router = express.Router();

router.get('/', requireAuth, ctrl.list);
// Optional group photo (`file` field). When the request is multipart the
// image-only uploader runs; plain JSON (no photo) passes straight through.
router.post(
  '/',
  requireAuth,
  uploadImage.single('file'),
  enforceCloudinaryLimits,
  sanitizeFields(['name', 'description', 'category']),
  [
    body('name').trim().isLength({ min: 3, max: 100 }),
    body('description').trim().isLength({ min: 10, max: 500 }),
    body('category').trim().isLength({ min: 2, max: 60 }),
  ],
  validate,
  ctrl.create
);
// Must be registered before /:id so "mine" isn't parsed as an ObjectId.
router.get('/mine', requireAuth, ctrl.mine);
router.get('/:id', requireAuth, ctrl.getOne);
router.post('/:id/join', requireAuth, ctrl.join);
router.post('/:id/leave', requireAuth, ctrl.leave);
router.post('/:id/dp', requireAuth, uploadImage.single('file'), enforceCloudinaryLimits, ctrl.uploadDp);

router.get('/:id/messages', requireAuth, ctrl.listMessages);
router.post(
  '/:id/messages',
  requireAuth,
  sanitizeFields(['content']),
  [body('content').trim().isLength({ min: 1, max: 3000 })],
  validate,
  ctrl.sendMessage
);

module.exports = router;
