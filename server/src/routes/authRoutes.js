const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate, asyncHandler } = require('../middleware/errorHandler');

const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('companyName').optional({ checkFalsy: true }).trim().notEmpty(),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

router.post('/register', registerRules, validate, asyncHandler(authController.register));
router.post('/login', loginRules, validate, asyncHandler(authController.login));
router.get('/me', protect, asyncHandler(authController.getMe));

module.exports = router;
