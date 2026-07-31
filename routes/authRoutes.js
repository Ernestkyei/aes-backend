import express from 'express';
import {
  register,
  loginUser,
  loginAdmin,
  verifyPayment,
  getMe,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', loginUser);
router.post('/admin-login', loginAdmin);

// Protected routes (require valid JWT)
router.post('/verify-payment', protect, verifyPayment);
router.get('/me', protect, getMe);

export default router;