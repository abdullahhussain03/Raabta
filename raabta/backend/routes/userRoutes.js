const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { sanitizeFields } = require('../middleware/sanitize');
const { upload } = require('../middleware/upload');
const ctrl = require('../controllers/userController');

const router = express.Router();

router.get('/:id', requireAuth, ctrl.getProfile);
router.post('/me/profile-picture', requireAuth, upload.single('file'), ctrl.uploadProfilePicture);
router.patch(
  '/me',
  requireAuth,
  sanitizeFields(['name', 'bio', 'program', 'year']),
  [
    body('name').optional().trim().isLength({ min: 2, max: 80 }),
    body('bio').optional().trim().isLength({ max: 500 }),
    body('dmPermission').optional().isIn(['everyone', 'sameUniversity', 'nobody']),
  ],
  validate,
  ctrl.updateProfile
);
router.delete('/me', requireAuth, ctrl.deleteAccount);

module.exports = router;
