const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { sanitizeFields } = require('../middleware/sanitize');
const ctrl = require('../controllers/groupController');

const router = express.Router();

router.get('/', requireAuth, ctrl.list);
router.post(
  '/',
  requireAuth,
  sanitizeFields(['name', 'description', 'category']),
  [
    body('name').trim().isLength({ min: 3, max: 100 }),
    body('description').trim().isLength({ min: 10, max: 500 }),
    body('category').trim().isLength({ min: 2, max: 60 }),
  ],
  validate,
  ctrl.create
);
router.get('/:id', requireAuth, ctrl.getOne);
router.post('/:id/join', requireAuth, ctrl.join);
router.post('/:id/leave', requireAuth, ctrl.leave);

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
