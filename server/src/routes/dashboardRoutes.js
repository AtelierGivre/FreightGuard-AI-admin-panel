const express = require('express');
const router = express.Router();
const controller = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', controller.getDashboard);

module.exports = router;
