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

router.use(authMiddleware);
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
router.delete('/:id', deleteApplication);
router.use(adminMiddleware);
router.get('/status/:status', getApplicationsByStatus);
router.get('/user/:userId', getApplicationsByUser);
router.post('/bulk-status', bulkUpdateStatus);



export default router;