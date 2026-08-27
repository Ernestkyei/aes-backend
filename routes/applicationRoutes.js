// routes/applicationRoutes.js
import express from 'express';
import {
  approveApplicationController,
  rejectApplicationController,
  updateStatusController
} from '../controllers/applicationController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// ============================================
// ADMIN ONLY ROUTES
// ============================================
router.post('/approve', admin, approveApplicationController);
router.post('/reject', admin, rejectApplicationController);
router.patch('/status', admin, updateStatusController);


export default router;