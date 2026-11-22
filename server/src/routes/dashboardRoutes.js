const express = require('express');
const router = express.Router();
const controller = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.use(protect);
router.get('/', asyncHandler(controller.getDashboard));

module.exports = router;
