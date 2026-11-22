const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const controller = require('../controllers/contractController');
const { protect } = require('../middleware/auth');
const { validate, asyncHandler } = require('../middleware/errorHandler');

router.use(protect);

const idRule = [param('id').isMongoId().withMessage('Invalid contract ID')];

const createRules = [
  body('carrierName').trim().notEmpty().withMessage('Carrier name is required'),
  body('port').trim().notEmpty().withMessage('Port is required'),
  body('freeDays').isInt({ min: 0 }).withMessage('Free days must be a non-negative integer'),
  body('tiers').optional().isArray().withMessage('Tiers must be an array'),
  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),
];

const updateRules = [
  ...idRule,
  body('carrierName').optional().trim().notEmpty(),
  body('port').optional().trim().notEmpty(),
  body('freeDays').optional().isInt({ min: 0 }),
  body('tiers').optional().isArray(),
];

router.get('/', asyncHandler(controller.list));
router.get('/:id', idRule, validate, asyncHandler(controller.get));
router.post('/', createRules, validate, asyncHandler(controller.create));
router.put('/:id', updateRules, validate, asyncHandler(controller.update));
router.delete('/:id', idRule, validate, asyncHandler(controller.remove));

module.exports = router;
