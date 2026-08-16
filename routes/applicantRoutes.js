import express from 'express';
import {
  getAllApplications,
  getApplicationById,
  createApplication,
  updateApplication,
  updateStatus,
  submitApplication,
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
  // NEW: Access Code Functions
  generateAccessCode,
  validateAccessCode,
  getApplicationByCode,
  updateApplicationByCode,
  submitApplicationByCode,
  resendAccessCode,
  generateBulkAccessCodes,
  // NEW: Admission Letter Functions
  generateAdmissionLetter,
  downloadAdmissionLetter,
  previewAdmissionLetter,
} from '../controllers/applicantController.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

// ======================================================
// PUBLIC ROUTES - No Authentication Required
// ======================================================

// Access Code Routes (Public)
router.post('/validate-code', validateAccessCode);
router.get('/application/:code', getApplicationByCode);
router.put('/application/:code', updateApplicationByCode);
router.post('/application/:code/submit', submitApplicationByCode);

// Download Admission Letter (Public - using access code)
router.get('/download-letter/:code', downloadAdmissionLetter);

// ======================================================
// AUTHENTICATED ROUTES - User must be logged in
// ======================================================

router.use(authMiddleware);

// Application CRUD (Authenticated)
router.get('/', getAllApplications);
router.get('/search', searchApplications);
router.get('/check-existing', checkExisting);
router.get('/stats', getStats);
router.get('/stats/program-type', getStatsByProgramType);
router.get('/stats/academic-year', getStatsByAcademicYear);
router.get('/:id', getApplicationById);
router.get('/:id/timeline', getTimeline);
router.post('/', createApplication);
router.put('/:id', updateApplication);
router.patch('/:id/status', updateStatus);
router.post('/:id/submit', submitApplication);
router.delete('/:id', deleteApplication);

// ======================================================
// ADMIN ROUTES - Admin privileges required
// ======================================================

router.use(adminMiddleware);

// Status & User Routes (Admin Only)
router.get('/status/:status', getApplicationsByStatus);
router.get('/user/:userId', getApplicationsByUser);
router.post('/bulk-status', bulkUpdateStatus);

// Access Code Management (Admin Only)
router.post('/:applicationId/generate-code', generateAccessCode);
router.post('/:applicationId/resend-code', resendAccessCode);
router.post('/bulk-generate-codes', generateBulkAccessCodes);

// Admission Letter Management (Admin Only)
router.post('/:applicationId/generate-letter', generateAdmissionLetter);
router.get('/:applicationId/preview-letter', previewAdmissionLetter);

export default router;