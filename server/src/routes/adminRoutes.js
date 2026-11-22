const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();
const controller = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');
const { validate, asyncHandler } = require('../middleware/errorHandler');
const { ENUMS, STAFF_ROLES } = require('../config/constants');

// The whole admin panel is restricted to staff; user-management routes add an
// extra admin-only check below.
router.use(protect, authorize(...STAFF_ROLES));

const idRule = [param('id').isMongoId().withMessage('Invalid resource ID')];

const queueRules = [
  query('status').optional().isIn(ENUMS.REVIEW_STATUS),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('invoiceId').optional().isMongoId(),
];

const reviewRules = [
  ...idRule,
  body('reviewStatus').isIn(ENUMS.REVIEW_STATUS).withMessage('Invalid review status'),
  body('reviewNote').optional().isString().trim(),
  body('correctAmount').optional().isFloat({ min: 0 }),
  body('verdict').optional().isIn(ENUMS.VERDICT),
];

const userUpdateRules = [
  ...idRule,
  body('role').optional().isIn(ENUMS.ROLE),
  body('isActive').optional().isBoolean(),
  body('name').optional().trim().notEmpty(),
];

router.get('/stats', asyncHandler(controller.getStats));
router.get('/review-queue', queueRules, validate, asyncHandler(controller.getReviewQueue));
router.put('/review/:id', reviewRules, validate, asyncHandler(controller.reviewLine));
router.get('/users', asyncHandler(controller.listUsers));
router.put(
  '/users/:id',
  authorize('admin'),
  userUpdateRules,
  validate,
  asyncHandler(controller.updateUser),
);
router.delete(
  '/users/:id',
  authorize('admin'),
  idRule,
  validate,
  asyncHandler(controller.deleteUser),
);
router.get('/invoices', asyncHandler(controller.allInvoices));
router.get('/disputes', asyncHandler(controller.allDisputes));
router.get('/settings', asyncHandler(controller.getSettings));

module.exports = router;
