import express from 'express';
import {
  accessCodeLogin,
  adminLoginController,
  getMe,
} from '../controllers/authController.js';

import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();


// Applicant enters access code
router.post('/access-code', accessCodeLogin);
// Admin email/password login
router.post('/admin-login', adminLoginController);


// Logged-in user
router.get('/me', authMiddleware, getMe);


export default router;