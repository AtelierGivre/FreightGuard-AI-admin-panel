const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const controller = require('../controllers/invoiceController');
const { protect } = require('../middleware/auth');
const { validate, asyncHandler } = require('../middleware/errorHandler');

router.use(protect);

const idRule = [param('id').isMongoId().withMessage('Invalid invoice ID')];

const createRules = [
  body('invoiceNumber').trim().notEmpty().withMessage('Invoice number is required'),
  body('carrierName').trim().notEmpty().withMessage('Carrier name is required'),
  body('port').trim().notEmpty().withMessage('Port is required'),
  body('totalBilled').isFloat({ min: 0 }).withMessage('Total billed must be a non-negative number'),
];

const updateRules = [
  ...idRule,
  body('invoiceNumber').optional().trim().notEmpty(),
  body('carrierName').optional().trim().notEmpty(),
  body('port').optional().trim().notEmpty(),
  body('totalBilled').optional().isFloat({ min: 0 }),
];

router.get('/', asyncHandler(controller.list));
router.get('/:id', idRule, validate, asyncHandler(controller.get));
router.post('/', createRules, validate, asyncHandler(controller.create));
router.put('/:id', updateRules, validate, asyncHandler(controller.update));
router.delete('/:id', idRule, validate, asyncHandler(controller.remove));
router.post('/:id/audit', idRule, validate, asyncHandler(controller.runAudit));

module.exports = router;
