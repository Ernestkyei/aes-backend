// controllers/applicationController.js
import {
  approveApplication,
  rejectApplication,
  updateApplicationStatus
} from '../services/applicationService.js';

// Approve application
export const approveApplicationController = async (req, res) => {
  try {
    const { applicationId, notes } = req.body;
    const adminId = req.userId;

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: 'Application ID is required'
      });
    }

    const result = await approveApplication(applicationId, adminId, notes);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to approve application',
      error: error.message
    });
  }
};

// Reject application
export const rejectApplicationController = async (req, res) => {
  try {
    const { applicationId, notes } = req.body;
    const adminId = req.userId;

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: 'Application ID is required'
      });
    }

    const result = await rejectApplication(applicationId, adminId, notes);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reject application',
      error: error.message
    });
  }
};

// Update status (generic)
export const updateStatusController = async (req, res) => {
  try {
    const { applicationId, status, notes } = req.body;
    const adminId = req.userId;

    if (!applicationId || !status) {
      return res.status(400).json({
        success: false,
        message: 'Application ID and status are required'
      });
    }

    const result = await updateApplicationStatus(applicationId, status, adminId, notes);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update status',
      error: error.message
    });
  }
};