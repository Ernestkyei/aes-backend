// routes/notificationRoutes.js
import express from 'express';
import { sendDecisionNotification } from '../services/notificationService.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// Send decision notification (both approved & rejected)
router.post('/decision', protect, admin, async (req, res) => {
  try {
    const { userId, applicationId, status, notes } = req.body;
    
    if (!userId || !applicationId || !status) {
      return res.status(400).json({
        success: false,
        message: 'User ID, Application ID, and status are required'
      });
    }

    // Get user and application
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Send notification
    const result = await sendDecisionNotification(user, { 
      ...application, 
      status,
      notes 
    });
    
    res.json({
      success: true,
      message: `Decision notification sent! Status: ${status}`,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send notification',
      error: error.message
    });
  }
});

export default router;