// routes/authRoutes.js
import express from 'express';
import {
  register,
  loginUser,
  loginAdmin,
  verifyPayment,
  getMe,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import {
  registerSchema,
  loginSchema,
  adminLoginSchema,
  verifyPaymentSchema,
} from '../validators/index.js';

const router = express.Router();

// Public routes
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), loginUser);
router.post('/admin-login', validate(adminLoginSchema), loginAdmin);

// Protected routes
router.post('/verify-payment', protect, validate(verifyPaymentSchema), verifyPayment);
router.get('/me', protect, getMe);

export default router;