// ======================================================
// APPLICANT CONTROLLER
// ======================================================

import * as applicantService from '../services/applicantService.js';

// ======================================================
// GET ALL APPLICATIONS
// ======================================================

export function getAllApplications(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || '';
  const status = req.query.status || '';
  const userId = req.query.userId || '';

  applicantService.getAllApplications(page, limit, search, status, userId, (err, result) => {
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

// ======================================================
// GET APPLICATION BY ID
// ======================================================

export function getApplicationById(req, res) {
  const id = req.params.id;

  applicantService.getApplicationById(id, (err, application) => {
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

// ======================================================
// CREATE NEW APPLICATION
// ======================================================

export function createApplication(req, res) {
  const applicationData = req.body;

  if (!applicationData.userId) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required',
      errors: ['userId is required to create an application'],
    });
  }

  if (!applicationData.programChoice) {
    return res.status(400).json({
      success: false,
      message: 'Program choice is required',
      errors: ['programChoice is required'],
    });
  }

  applicantService.createApplication(applicationData, (err, newApplication) => {
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

// ======================================================
// UPDATE APPLICATION
// ======================================================

export function updateApplication(req, res) {
  const id = req.params.id;
  const userId = req.user ? req.user.id : null;
  const updateData = req.body;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
      errors: ['User must be authenticated to update an application'],
    });
  }

  applicantService.updateApplication(id, updateData, userId, (err, updatedApplication) => {
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

// ======================================================
// UPDATE APPLICATION STATUS
// ======================================================

export function updateStatus(req, res) {
  const id = req.params.id;
  const status = req.body.status;
  const notes = req.body.notes || '';
  const userId = req.user ? req.user.id : null;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
      errors: ['User must be authenticated to update status'],
    });
  }

  if (!status) {
    return res.status(400).json({
      success: false,
      message: 'Status is required',
      errors: ['Please provide a status'],
    });
  }

  const validStatuses = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_INFO', 'OFFERED', 'REJECTED', 'WAITLISTED', 'ENROLLED', 'WITHDRAWN'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status',
      errors: [`Status must be one of: ${validStatuses.join(', ')}`],
    });
  }

  applicantService.updateStatus(id, status, userId, notes, (err, updatedApplication) => {
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

// ======================================================
// SUBMIT APPLICATION
// ======================================================

export function submitApplication(req, res) {
  const id = req.params.id;
  const userId = req.user ? req.user.id : null;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
      errors: ['User must be authenticated to submit an application'],
    });
  }

  applicantService.submitApplication(id, userId, (err, submittedApplication) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: 'Failed to submit application',
        errors: [err.message],
      });
    }

    res.status(200).json({
      success: true,
      message: 'Application submitted successfully',
      data: submittedApplication,
    });
  });
}

// ======================================================
// DELETE APPLICATION
// ======================================================

export function deleteApplication(req, res) {
  const id = req.params.id;
  const userId = req.user ? req.user.id : null;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
      errors: ['User must be authenticated to delete an application'],
    });
  }

  applicantService.deleteApplication(id, userId, (err, deletedApplication) => {
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

// ======================================================
// GET APPLICATION STATISTICS
// ======================================================

export function getStats(req, res) {
  applicantService.getStats((err, stats) => {
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

// ======================================================
// GET APPLICATIONS BY STATUS
// ======================================================

export function getApplicationsByStatus(req, res) {
  const status = req.params.status;

  const validStatuses = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_INFO', 'OFFERED', 'REJECTED', 'WAITLISTED', 'ENROLLED', 'WITHDRAWN'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status',
      errors: [`Status must be one of: ${validStatuses.join(', ')}`],
    });
  }

  applicantService.getApplicationsByStatus(status, (err, applications) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve applications',
        errors: [err.message],
      });
    }

    res.status(200).json({
      success: true,
      message: `${status} applications retrieved successfully`,
      data: applications,
    });
  });
}

// ======================================================
// SEARCH APPLICATIONS
// ======================================================

export function searchApplications(req, res) {
  const query = req.query.query;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Search query required',
      errors: ['Please provide a valid search query'],
    });
  }

  applicantService.searchApplications(query, (err, applications) => {
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

// ======================================================
// GET APPLICATIONS BY USER
// ======================================================

export function getApplicationsByUser(req, res) {
  const userId = req.params.userId;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required',
      errors: ['userId parameter is required'],
    });
  }

  applicantService.getApplicationsByUserId(userId, (err, applications) => {
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

// ======================================================
// BULK UPDATE STATUS
// ======================================================

export function bulkUpdateStatus(req, res) {
  const ids = req.body.ids;
  const status = req.body.status;
  const userId = req.user ? req.user.id : null;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
      errors: ['User must be authenticated to bulk update'],
    });
  }

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

  const validStatuses = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_INFO', 'OFFERED', 'REJECTED', 'WAITLISTED', 'ENROLLED', 'WITHDRAWN'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status',
      errors: [`Status must be one of: ${validStatuses.join(', ')}`],
    });
  }

  applicantService.bulkUpdateStatus(ids, status, userId, (err, result) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update applications',
        errors: [err.message],
      });
    }

    res.status(200).json({
      success: true,
      message: `${result.count} applications status updated successfully`,
      data: { updatedCount: result.count },
    });
  });
}

// ======================================================
// GET APPLICATION TIMELINE
// ======================================================

export function getTimeline(req, res) {
  const id = req.params.id;

  applicantService.getApplicationTimeline(id, (err, timeline) => {
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

// ======================================================
// CHECK EXISTING APPLICATION
// ======================================================

export function checkExisting(req, res) {
  const userId = req.query.userId;
  const programChoice = req.query.programChoice;
  const academicYear = req.query.academicYear;

  if (!userId || !programChoice || !academicYear) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameters',
      errors: ['userId, programChoice, and academicYear are required'],
    });
  }

  applicantService.checkExistingApplication(userId, programChoice, academicYear, (err, exists) => {
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
      data: { exists },
    });
  });
}

// ======================================================
// GET STATS BY PROGRAM TYPE
// ======================================================

export function getStatsByProgramType(req, res) {
  applicantService.getStatsByProgramType((err, stats) => {
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

// ======================================================
// GET STATS BY ACADEMIC YEAR
// ======================================================

export function getStatsByAcademicYear(req, res) {
  applicantService.getStatsByAcademicYear((err, stats) => {
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

// ======================================================
// ======================================================
// ACCESS CODE FUNCTIONS
// ======================================================
// ======================================================

// ======================================================
// GENERATE ACCESS CODE (Admin Only)
// ======================================================

export function generateAccessCode(req, res) {
  const { applicationId } = req.params;
  const adminId = req.user ? req.user.id : null;

  if (!adminId) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
      errors: ['Admin authentication required'],
    });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.',
    });
  }

  applicantService.generateAccessCode(applicationId, adminId, (err, result) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: 'Failed to generate access code',
        errors: [err.message],
      });
    }

    res.status(200).json({
      success: true,
      message: 'Access code generated successfully',
      data: result,
    });
  });
}

// ======================================================
// VALIDATE ACCESS CODE (Public - No Login)
// ======================================================

export function validateAccessCode(req, res) {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({
      success: false,
      message: 'Access code is required',
      errors: ['Please provide your access code'],
    });
  }

  applicantService.validateAccessCode(code, (err, application) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: 'Invalid access code',
        errors: [err.message],
      });
    }

    res.status(200).json({
      success: true,
      message: 'Access granted successfully',
      data: {
        application: {
          id: application.id,
          ref: application.ref,
          programChoice: application.programChoice,
          status: application.status,
          outcome: application.outcome,
          firstName: application.firstName,
          lastName: application.lastName,
          email: application.email,
          phoneNumber: application.phoneNumber,
          submittedAt: application.submittedAt,
          decisionDate: application.decisionDate,
          documents: application.documents,
          educationRecord: application.educationRecord,
          statusHistory: application.statusHistory,
        }
      },
    });
  });
}

// ======================================================
// GET APPLICATION BY ACCESS CODE (Public - No Login)
// ======================================================

export function getApplicationByCode(req, res) {
  const { code } = req.params;

  if (!code) {
    return res.status(400).json({
      success: false,
      message: 'Access code is required',
    });
  }

  applicantService.getApplicationByCode(code, (err, application) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: 'Invalid access code',
        errors: [err.message],
      });
    }

    res.status(200).json({
      success: true,
      message: 'Application retrieved successfully',
      data: {
        id: application.id,
        ref: application.ref,
        programChoice: application.programChoice,
        status: application.status,
        outcome: application.outcome,
        firstName: application.firstName,
        lastName: application.lastName,
        email: application.email,
        phoneNumber: application.phoneNumber,
        submittedAt: application.submittedAt,
        decisionDate: application.decisionDate,
        documents: application.documents,
        educationRecord: application.educationRecord,
        statusHistory: application.statusHistory,
        admissionLetterUrl: application.admissionLetterUrl,
      },
    });
  });
}

// ======================================================
// UPDATE APPLICATION BY ACCESS CODE (Public - No Login)
// ======================================================

export function updateApplicationByCode(req, res) {
  const { code } = req.params;
  const updateData = req.body;

  if (!code) {
    return res.status(400).json({
      success: false,
      message: 'Access code is required',
    });
  }

  applicantService.updateApplicationByCode(code, updateData, (err, updated) => {
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
      data: updated,
    });
  });
}

// ======================================================
// SUBMIT APPLICATION BY ACCESS CODE (Public - No Login)
// ======================================================

export function submitApplicationByCode(req, res) {
  const { code } = req.params;

  if (!code) {
    return res.status(400).json({
      success: false,
      message: 'Access code is required',
    });
  }

  applicantService.submitApplicationByCode(code, (err, submitted) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: 'Failed to submit application',
        errors: [err.message],
      });
    }

    res.status(200).json({
      success: true,
      message: 'Application submitted successfully',
      data: submitted,
    });
  });
}

// ======================================================
// RESEND ACCESS CODE (Admin Only)
// ======================================================

export function resendAccessCode(req, res) {
  const { applicationId } = req.params;

  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.',
    });
  }

  applicantService.resendAccessCode(applicationId, (err, result) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: 'Failed to resend access code',
        errors: [err.message],
      });
    }

    res.status(200).json({
      success: true,
      message: 'Access code resent successfully',
      data: result,
    });
  });
}

// ======================================================
// GENERATE BULK ACCESS CODES (Admin Only)
// ======================================================

export function generateBulkAccessCodes(req, res) {
  const { applicationIds } = req.body;
  const adminId = req.user ? req.user.id : null;

  if (!adminId || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.',
    });
  }

  if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid request',
      errors: ['Please provide an array of application IDs'],
    });
  }

  applicantService.generateBulkAccessCodes(applicationIds, adminId, (err, results) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: 'Failed to generate access codes',
        errors: [err.message],
      });
    }

    res.status(200).json({
      success: true,
      message: `${results.length} access codes generated successfully`,
      data: results,
    });
  });
}

// ======================================================
// ======================================================
// ADMISSION LETTER FUNCTIONS
// ======================================================
// ======================================================

// ======================================================
// GENERATE ADMISSION LETTER (Admin Only)
// ======================================================

export function generateAdmissionLetter(req, res) {
  const { applicationId } = req.params;

  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.',
    });
  }

  applicantService.generateAdmissionLetter(applicationId, (err, result) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: 'Failed to generate admission letter',
        errors: [err.message],
      });
    }

    res.status(200).json({
      success: true,
      message: 'Admission letter generated successfully',
      data: result,
    });
  });
}

// ======================================================
// DOWNLOAD ADMISSION LETTER (Public - No Login)
// ======================================================

export function downloadAdmissionLetter(req, res) {
  const { code } = req.params;

  if (!code) {
    return res.status(400).json({
      success: false,
      message: 'Access code is required',
    });
  }

  applicantService.downloadAdmissionLetterByCode(code, (err, result) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: 'Failed to download admission letter',
        errors: [err.message],
      });
    }

    if (result && result.filePath) {
      res.download(result.filePath, result.fileName, (downloadErr) => {
        if (downloadErr) {
          res.status(500).json({
            success: false,
            message: 'Failed to download file',
            errors: [downloadErr.message],
          });
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Admission letter not found',
        errors: ['No admission letter has been generated for this application'],
      });
    }
  });
}

// ======================================================
// PREVIEW ADMISSION LETTER (Admin Only)
// ======================================================

export function previewAdmissionLetter(req, res) {
  const { applicationId } = req.params;

  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.',
    });
  }

  applicantService.getApplicationById(applicationId, (err, application) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: 'Application not found',
        errors: [err.message],
      });
    }

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Admission Letter Preview</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 50px; }
          .header { text-align: center; border-bottom: 3px solid #1a237e; padding-bottom: 20px; }
          .title { text-align: center; font-size: 24px; color: #1a237e; margin: 30px 0; }
          .ref-date { text-align: right; margin: 10px 0; }
          .section { margin: 25px 0; }
          .section-title { font-weight: bold; font-size: 16px; color: #1a237e; }
          .signature { margin-top: 50px; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>UNIVERSITY OF GHANA</h1>
          <h2>OFFICE OF THE REGISTRAR</h2>
        </div>
        <div class="title">ADMISSION LETTER</div>
        <div class="ref-date">
          <p>Ref: ${application.ref || application.id}</p>
          <p>Date: ${new Date().toLocaleDateString()}</p>
        </div>
        <div class="section">
          <p>Dear <strong>${application.firstName} ${application.lastName}</strong>,</p>
          <p>We are pleased to inform you that you have been offered admission to the 
          <strong>${application.programChoice}</strong> program for the 
          <strong>${application.academicYear}</strong> academic year.</p>
        </div>
        <div class="section">
          <div class="section-title">Important Information</div>
          <ul>
            <li>Program: ${application.programChoice}</li>
            <li>Duration: 4 Years (Full-Time)</li>
            <li>Registration Opens: ${new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}</li>
          </ul>
        </div>
        <div class="signature">
          <p>Yours sincerely,</p>
          <br><br>
          <p><strong>Prof. John Doe</strong></p>
          <p>Registrar</p>
        </div>
        <div class="footer">
          <p>© University of Ghana | All Rights Reserved</p>
        </div>
      </body>
      </html>
    `;

    res.send(html);
  });
}

// ======================================================
// EXPORT ALL FUNCTIONS
// ======================================================

export default {
  // Existing functions
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
  
  // Access Code functions
  generateAccessCode,
  validateAccessCode,
  getApplicationByCode,
  updateApplicationByCode,
  submitApplicationByCode,
  resendAccessCode,
  generateBulkAccessCodes,
  
  // Admission Letter functions
  generateAdmissionLetter,
  downloadAdmissionLetter,
  previewAdmissionLetter,
};