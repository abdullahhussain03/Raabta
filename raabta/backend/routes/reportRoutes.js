const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const ctrl = require('../controllers/reportController');

const router = express.Router();

router.post(
  '/',
  requireAuth,
  [
    body('reportedContentType').isIn(['post', 'comment', 'user', 'message']),
    body('reportedContentId').isMongoId(),
    body('reason').trim().isLength({ min: 3, max: 500 }),
  ],
  validate,
  ctrl.create
);

// Moderators and admins can view/action the queue (moderator scoping to
// their own communities is enforced by requireCommunityModOrAdmin on
// community-specific routes; the global report queue itself requires at
// least moderator level and admins have full reach).
router.get('/queue', requireAuth, requireRole('moderator', 'admin'), ctrl.listQueue);
router.patch('/:id/action', requireAuth, requireRole('moderator', 'admin'), ctrl.actionReport);

module.exports = router;
