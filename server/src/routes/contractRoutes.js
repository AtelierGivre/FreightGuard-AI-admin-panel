const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const controller = require('../controllers/contractController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');

router.use(protect);

router.get('/', controller.list);
router.get('/:id', controller.get);
router.post(
  '/',
  [
    body('carrierName').trim().notEmpty().withMessage('Carrier name is required'),
    body('port').trim().notEmpty().withMessage('Port is required'),
    body('freeDays').isInt({ min: 0 }).withMessage('Free days must be a positive integer'),
  ],
  validate,
  controller.create
);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
