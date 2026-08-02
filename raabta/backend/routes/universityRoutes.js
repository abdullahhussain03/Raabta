const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/requireRole');
const ctrl = require('../controllers/universityController');

const router = express.Router();

// Public
router.get('/', ctrl.listActiveUniversities);
router.post(
  '/request',
  [
    body('requesterName').trim().isLength({ min: 2, max: 80 }),
    body('requesterEmail').isEmail().normalizeEmail(),
    body('universityName').trim().isLength({ min: 2, max: 150 }),
  ],
  validate,
  ctrl.requestUniversity
);

// Admin
router.get('/admin/all', requireAuth, requireAdmin, ctrl.adminListUniversities);
router.post(
  '/admin',
  requireAuth,
  requireAdmin,
  [
    body('name').trim().isLength({ min: 2, max: 150 }),
    body('verifiedEmailDomains').isArray({ min: 1 }),
    body('status').optional().isIn(['active', 'pending']),
  ],
  validate,
  ctrl.adminCreateUniversity
);
router.patch('/admin/:id', requireAuth, requireAdmin, ctrl.adminUpdateUniversity);
router.get('/admin/requests', requireAuth, requireAdmin, ctrl.adminListUniversityRequests);
router.patch('/admin/requests/:id', requireAuth, requireAdmin, ctrl.adminUpdateUniversityRequestStatus);

module.exports = router;
