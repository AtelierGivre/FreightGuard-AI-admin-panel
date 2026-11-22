const express = require('express');
const router = express.Router();
const controller = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// Admin panel is restricted to admin and operator roles
router.use(protect, authorize('admin', 'operator'));

router.get('/stats', controller.getStats);
router.get('/review-queue', controller.getReviewQueue);
router.put('/review/:id', controller.reviewLine);
router.get('/users', controller.listUsers);
router.put('/users/:id', authorize('admin'), controller.updateUser);
router.delete('/users/:id', authorize('admin'), controller.deleteUser);
router.get('/invoices', controller.allInvoices);
router.get('/disputes', controller.allDisputes);
router.get('/settings', controller.getSettings);

module.exports = router;
