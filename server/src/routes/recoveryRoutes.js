const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const controller = require('../controllers/recoveryController');
const { protect, authorize } = require('../middleware/auth');
const { validate, asyncHandler } = require('../middleware/errorHandler');
const { STAFF_ROLES } = require('../config/constants');

router.use(protect);

const billingRules = [
  param('id').isMongoId().withMessage('Invalid recovery ID'),
  body('billingStatus').isIn(['due', 'paid']).withMessage('Billing status must be due or paid'),
];

router.get('/', asyncHandler(controller.list));
router.put(
  '/:id/billing',
  authorize(...STAFF_ROLES),
  billingRules,
  validate,
  asyncHandler(controller.updateBilling),
);

module.exports = router;
