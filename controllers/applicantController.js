// src/controllers/applicationController.js

import {
  getAllApplications as getAllApplicationsService,
  getApplicationById as getApplicationByIdService,
  createApplication as createApplicationService,
  updateApplication as updateApplicationService,
  updateStatus as updateStatusService,
  deleteApplication as deleteApplicationService,
  getStats as getStatsService,
  getApplicationsByStatus as getApplicationsByStatusService,
  searchApplications as searchApplicationsService,
  getApplicationsByUserId as getApplicationsByUserIdService,
  bulkUpdateStatus as bulkUpdateStatusService,
  getApplicationTimeline as getApplicationTimelineService,
  checkExistingApplication as checkExistingApplicationService,
  getStatsByProgramType as getStatsByProgramTypeService,
  getStatsByAcademicYear as getStatsByAcademicYearService,
} from '../services/applicantService.js';


// Get all applications
export function getAllApplications(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || '';
  const status = req.query.status || '';
  const userId = req.query.userId || '';

  getAllApplicationsService(page, limit, search, status, userId, function(err, result) {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve applications',
        errors: [err.message],
      });
    }

    res.status(200).json({
      success: true,
      message: 'Applications retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  });
}

// Get application by ID
export function getApplicationById(req, res) {
  const id = req.params.id;

  getApplicationByIdService(id, function(err, application) {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve application',
        errors: [err.message],
      });
    }

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
        errors: ['Application with the provided ID does not exist'],
      });
    }

    res.status(200).json({
      success: true,
      message: 'Application retrieved successfully',
      data: application,
    });
  });
}

// Create new application
export function createApplication(req, res) {
  const applicationData = req.body;

  createApplicationService(applicationData, function(err, newApplication) {
    if (err) {
      return res.status(400).json({
        success: false,
        message: 'Failed to create application',
        errors: [err.message],
      });
    }

    res.status(201).json({
      success: true,
      message: 'Application created successfully',
      data: newApplication,
    });
  });
}

// Update application
export function updateApplication(req, res) {
  const id = req.params.id;
  const userId = req.user ? req.user.id : null;
  const updateData = req.body;

  updateApplicationService(id, updateData, userId, function(err, updatedApplication) {
    if (err) {
      return res.status(400).json({
        success: false,
        message: 'Failed to update application',
        errors: [err.message],
      });
    }

    res.status(200).json({
      success: true,
      message: 'Application updated successfully',
      data: updatedApplication,
    });
  });
}

// Update application status
export function updateStatus(req, res) {
  const id = req.params.id;
  const status = req.body.status;
  const notes = req.body.notes || '';
  const userId = req.user ? req.user.id : null;

  if (!status) {
    return res.status(400).json({
      success: false,
      message: 'Status is required',
      errors: ['Please provide a status'],
    });
  }

  updateStatusService(id, status, userId, notes, function(err, updatedApplication) {
    if (err) {
      return res.status(400).json({
        success: false,
        message: 'Failed to update application status',
        errors: [err.message],
      });
    }

    res.status(200).json({
      success: true,
      message: 'Application status updated successfully',
      data: updatedApplication,
    });
  });
}

// Delete application
export function deleteApplication(req, res) {
  const id = req.params.id;
  const userId = req.user ? req.user.id : null;

  deleteApplicationService(id, userId, function(err, deletedApplication) {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete application',
        errors: [err.message],
      });
    }

    res.status(200).json({
      success: true,
      message: 'Application deleted successfully',
      data: deletedApplication,
    });
  });
}

// Get application statistics
export function getStats(req, res) {
  getStatsService(function(err, stats) {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve statistics',
        errors: [err.message],
      });
    }

    res.status(200).json({
      success: true,
      message: 'Statistics retrieved successfully',
      data: stats,
    });
  });
}

// Get applications by status
export function getApplicationsByStatus(req, res) {
  const status = req.params.status;

  getApplicationsByStatusService(status, function(err, applications) {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve applications',
        errors: [err.message],
      });
    }

    res.status(200).json({
      success: true,
      message: status + ' applications retrieved successfully',
      data: applications,
    });
  });
}

// Search applications
export function searchApplications(req, res) {
  const query = req.query.query;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Search query required',
      errors: ['Please provide a search query'],
    });
  }

  searchApplicationsService(query, function(err, applications) {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Failed to search applications',
        errors: [err.message],
      });
    }

    res.status(200).json({
      success: true,
      message: 'Search results retrieved successfully',
      data: applications,
    });
  });
}

// Get applications by user
export function getApplicationsByUser(req, res) {
  const userId = req.params.userId;

  getApplicationsByUserIdService(userId, function(err, applications) {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve user applications',
        errors: [err.message],
      });
    }

    res.status(200).json({
      success: true,
      message: 'User applications retrieved successfully',
      data: applications,
    });
  });
}

// Bulk update application status
export function bulkUpdateStatus(req, res) {
  const ids = req.body.ids;
  const status = req.body.status;
  const userId = req.user ? req.user.id : null;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid request',
      errors: ['Please provide an array of application IDs'],
    });
  }

  if (!status) {
    return res.status(400).json({
      success: false,
      message: 'Status is required',
      errors: ['Please provide a status'],
    });
  }

  bulkUpdateStatusService(ids, status, userId, function(err, result) {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update applications',
        errors: [err.message],
      });
    }

    res.status(200).json({
      success: true,
      message: result.count + ' applications status updated successfully',
      data: { updatedCount: result.count },
    });
  });
}

// Get application timeline
export function getTimeline(req, res) {
  const id = req.params.id;

  getApplicationTimelineService(id, function(err, timeline) {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve application timeline',
        errors: [err.message],
      });
    }

    if (!timeline) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
        errors: ['Application with the provided ID does not exist'],
      });
    }

    res.status(200).json({
      success: true,
      message: 'Application timeline retrieved successfully',
      data: timeline,
    });
  });
}

// Check existing application
export function checkExisting(req, res) {
  const userId = req.query.userId;
  const program = req.query.program;
  const academicYear = req.query.academicYear;

  if (!userId || !program || !academicYear) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameters',
      errors: ['userId, program, and academicYear are required'],
    });
  }

  checkExistingApplicationService(userId, program, academicYear, function(err, exists) {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Failed to check existing application',
        errors: [err.message],
      });
    }

    res.status(200).json({
      success: true,
      message: 'Check completed successfully',
      data: { exists: exists },
    });
  });
}

// Get statistics by program type
export function getStatsByProgramType(req, res) {
  getStatsByProgramTypeService(function(err, stats) {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve program type statistics',
        errors: [err.message],
      });
    }

    res.status(200).json({
      success: true,
      message: 'Program type statistics retrieved successfully',
      data: stats,
    });
  });
}

// Get statistics by academic year
export function getStatsByAcademicYear(req, res) {
  getStatsByAcademicYearService(function(err, stats) {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve academic year statistics',
        errors: [err.message],
      });
    }

    res.status(200).json({
      success: true,
      message: 'Academic year statistics retrieved successfully',
      data: stats,
    });
  });
}