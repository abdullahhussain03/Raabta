const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/requireRole');
const ctrl = require('../controllers/adminController');

const router = express.Router();

// Every route in this file is gated server-side by role === 'admin' — a
// non-admin gets a 403 from the API regardless of what the frontend shows
// or hides.
router.use(requireAuth, requireAdmin);

router.get('/users', ctrl.searchUsers);
router.post('/users/:id/verify', ctrl.manuallyVerify);
router.post('/users/:id/promote-moderator', ctrl.promoteToModerator);
router.patch('/users/:id/status', ctrl.setAccountStatus);

module.exports = router;
