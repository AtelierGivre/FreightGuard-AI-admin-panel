const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const controller = require('../controllers/disputeController');
const { protect } = require('../middleware/auth');
const { validate, asyncHandler } = require('../middleware/errorHandler');
const { ENUMS } = require('../config/constants');

router.use(protect);

const idRule = [param('id').isMongoId().withMessage('Invalid dispute ID')];

const createRules = [
  body('invoiceId').isMongoId().withMessage('Valid invoice ID is required'),
  body('disputedAmount').optional().isFloat({ min: 0 }),
  body('notes').optional().isString().trim(),
];

const letterRules = [
  body('invoiceId').isMongoId().withMessage('Valid invoice ID is required'),
  body('lineIds').optional().isArray().withMessage('lineIds must be an array'),
  body('lineIds.*').optional().isMongoId(),
];

const statusRules = [
  ...idRule,
  body('status').isIn(ENUMS.DISPUTE_STATUS).withMessage('Invalid dispute status'),
  body('sentAt').optional().isISO8601().toDate(),
  body('responseDueDate').optional().isISO8601().toDate(),
  body('notes').optional().isString().trim(),
];

const recoveryRules = [
  ...idRule,
  body('amount').isFloat({ min: 0.01 }).withMessage('Recovery amount must be greater than zero'),
  body('recoveredAt').optional().isISO8601().toDate(),
];

router.get('/', asyncHandler(controller.list));
router.get('/:id', idRule, validate, asyncHandler(controller.get));
router.post('/', createRules, validate, asyncHandler(controller.create));
router.post('/letters', letterRules, validate, asyncHandler(controller.generateLetter));
router.put('/:id/status', statusRules, validate, asyncHandler(controller.updateStatus));
router.post('/:id/recovery', recoveryRules, validate, asyncHandler(controller.recordRecovery));

module.exports = router;
