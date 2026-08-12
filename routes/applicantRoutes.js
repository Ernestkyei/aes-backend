// src/routes/applicationRoutes.js

import express from 'express';
import {
  getAllApplications,
  getApplicationById,
  createApplication,
  updateApplication,
  updateStatus,
  deleteApplication,
  getStats,
  getApplicationsByStatus,
  searchApplications,
  getApplicationsByUser,
  bulkUpdateStatus,
  getTimeline,
  checkExisting,
  getStatsByProgramType,
  getStatsByAcademicYear,
} from '../controllers/applicationController.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

// ============================================================
// AUTHENTICATED ROUTES (All routes require authentication)
// ============================================================

router.use(authMiddleware);

// ============================================================
// PUBLIC (Authenticated) ROUTES
// ============================================================

// GET /api/applications - Get all applications
router.get('/', getAllApplications);

// GET /api/applications/search - Search applications
router.get('/search', searchApplications);

// GET /api/applications/check-existing - Check if application exists
router.get('/check-existing', checkExisting);

// GET /api/applications/stats - Get statistics
router.get('/stats', getStats);

// GET /api/applications/stats/program-type - Get stats by program type
router.get('/stats/program-type', getStatsByProgramType);

// GET /api/applications/stats/academic-year - Get stats by academic year
router.get('/stats/academic-year', getStatsByAcademicYear);

// GET /api/applications/:id - Get application by ID
router.get('/:id', getApplicationById);

// GET /api/applications/:id/timeline - Get application timeline
router.get('/:id/timeline', getTimeline);

// POST /api/applications - Create new application
router.post('/', createApplication);

// PUT /api/applications/:id - Update application
router.put('/:id', updateApplication);

// PATCH /api/applications/:id/status - Update application status
router.patch('/:id/status', updateStatus);

// DELETE /api/applications/:id - Delete application
router.delete('/:id', deleteApplication);

// ============================================================
// ADMIN ROUTES
// ============================================================

router.use(adminMiddleware);

// GET /api/applications/status/:status - Get applications by status
router.get('/status/:status', getApplicationsByStatus);

// GET /api/applications/user/:userId - Get applications by user
router.get('/user/:userId', getApplicationsByUser);

// POST /api/applications/bulk-status - Bulk update status
router.post('/bulk-status', bulkUpdateStatus);

export default router;