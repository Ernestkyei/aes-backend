// backend/src/routes/payment.routes.js

import express from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import {
  initializePaymentRequest,
  verifyPaymentRequest,
  webhook,
  getAllPayments,
  getPaymentStats,
  getPaymentById,
  getPaymentsByUser,
  getMyPayments,
} from '../controllers/paymentController.js';

const router = express.Router();



router.post('/webhook', express.raw({ type: 'application/json' }), webhook);
router.get('/verify', verifyPaymentRequest);
router.post('/initialize', authMiddleware, initializePaymentRequest);
router.get('/my-payments', authMiddleware, getMyPayments); // Get current user's payment history

router.get('/admin/all', authMiddleware, adminMiddleware, getAllPayments);
router.get('/admin/stats', authMiddleware, adminMiddleware, getPaymentStats);
router.get('/admin/:id', authMiddleware, adminMiddleware, getPaymentById);
router.get('/admin/user/:userId', authMiddleware, adminMiddleware, getPaymentsByUser);

export default router;