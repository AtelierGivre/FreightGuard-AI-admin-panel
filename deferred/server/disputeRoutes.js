const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const controller = require('../controllers/disputeController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');

router.use(protect);

router.get('/', controller.list);
router.get('/:id', controller.get);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.post('/generate-letter', [body('invoiceId').notEmpty().withMessage('Invoice ID is required')], validate, controller.generateLetter);
router.post('/:id/recovery', [body('amount').isNumeric({ min: 0 }).withMessage('Amount must be a positive number')], validate, controller.recordRecovery);

module.exports = router;
