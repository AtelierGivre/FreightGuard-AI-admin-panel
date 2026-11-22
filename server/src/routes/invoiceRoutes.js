const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const controller = require('../controllers/invoiceController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');

router.use(protect);

router.get('/', controller.list);
router.get('/:id', controller.get);
router.post(
  '/',
  [
    body('invoiceNumber').trim().notEmpty().withMessage('Invoice number is required'),
    body('carrierName').trim().notEmpty().withMessage('Carrier name is required'),
    body('port').trim().notEmpty().withMessage('Port is required'),
    body('totalBilled').isNumeric().withMessage('Total billed must be a number'),
  ],
  validate,
  controller.create
);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);
router.post('/:id/audit', controller.runAudit);

module.exports = router;
