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

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

// Register - with validation
router.post('/register', validate(registerSchema), register);

// User Login - with validation
router.post('/login', validate(loginSchema), loginUser);

// Admin Login - with validation
router.post('/admin-login', validate(adminLoginSchema), loginAdmin);

// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================

// Verify payment - with validation
router.post('/verify-payment', protect, validate(verifyPaymentSchema), verifyPayment);

// Get current user profile
router.get('/me', protect, getMe);

export default router;