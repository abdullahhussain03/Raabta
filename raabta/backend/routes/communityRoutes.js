const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/requireRole');
const ctrl = require('../controllers/communityController');

const router = express.Router();

// Student-facing: read-only. There is intentionally no POST route here for
// non-admins — community creation only exists under /admin below.
router.get('/university/:universityId', requireAuth, ctrl.listForUniversity);
router.get('/mine', requireAuth, ctrl.listForUniversity);
router.get('/:id', requireAuth, ctrl.getOne);

// Admin only
router.post(
  '/admin',
  requireAuth,
  requireAdmin,
  [
    body('name').trim().isLength({ min: 2, max: 100 }),
    body('slug').trim().isLength({ min: 2, max: 60 }),
    body('universityId').isMongoId(),
    body('type').isIn(['general', 'department', 'society', 'batch']),
  ],
  validate,
  ctrl.adminCreate
);
router.patch('/admin/:id', requireAuth, requireAdmin, ctrl.adminUpdate);
router.post('/admin/:id/moderators', requireAuth, requireAdmin, ctrl.adminSetModerator);

module.exports = router;
