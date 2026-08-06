const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { sanitizeFields } = require('../middleware/sanitize');
const { uploadMedia, enforceCloudinaryLimits } = require('../middleware/upload');
const ctrl = require('../controllers/postController');

const router = express.Router();

router.post(
  '/',
  requireAuth,
  uploadMedia.single('media'),
  enforceCloudinaryLimits,
  sanitizeFields(['content']),
  // Content is optional when a media attachment is present (enforced in the
  // controller — a post needs text and/or media).
  [body('content').optional({ values: 'falsy' }).trim().isLength({ max: 5000 })],
  validate,
  ctrl.create
);

router.get('/community/:communityId', requireAuth, ctrl.listForCommunity);
router.get('/group/:groupId', requireAuth, ctrl.listForGroup);

router.post('/:id/upvote', requireAuth, ctrl.toggleUpvote);
router.post('/:id/pin', requireAuth, ctrl.togglePin);
router.delete('/:id', requireAuth, ctrl.remove);

router.get('/:id/comments', requireAuth, ctrl.listComments);
router.post(
  '/:id/comments',
  requireAuth,
  sanitizeFields(['content']),
  [body('content').trim().isLength({ min: 1, max: 2000 })],
  validate,
  ctrl.addComment
);

module.exports = router;
