const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { sanitizeFields } = require('../middleware/sanitize');
const ctrl = require('../controllers/dmController');

const router = express.Router();

router.get('/conversations', requireAuth, ctrl.listConversations);
router.post('/conversations', requireAuth, [body('recipientId').isMongoId()], validate, ctrl.startOrGetConversation);
router.post('/conversations/:id/accept', requireAuth, ctrl.acceptRequest);

router.get('/conversations/:id/messages', requireAuth, ctrl.listMessages);
router.post(
  '/conversations/:id/messages',
  requireAuth,
  sanitizeFields(['content']),
  [body('content').trim().isLength({ min: 1, max: 3000 })],
  validate,
  ctrl.sendMessage
);

router.post('/block', requireAuth, [body('userId').isMongoId()], validate, ctrl.blockUser);
router.post('/unblock', requireAuth, [body('userId').isMongoId()], validate, ctrl.unblockUser);

module.exports = router;
