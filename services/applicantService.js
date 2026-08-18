import prisma from '../config/database.js';
import PDFDocument from 'pdfkit';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Shared select/include fragments to keep queries consistent
const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phoneNumber: true,
};

const documentSelect = {
  id: true,
  name: true,
  fileName: true,
  fileUrl: true,
  status: true,        
  isVerified: true,
  type: true,
  createdAt: true,
};

const educationSelect = {
  id: true,
  highSchool: true,
  graduationYear: true,
  wassceAggregate: true,
  gpa: true,
  gpaScale: true,
  subjects: {
    select: {
      id: true,
      name: true,
      grade: true,
      score: true,
    }
  }
};

const defaultInclude = {
  user: { select: userSelect },
  documents: { select: documentSelect },
  educationRecord: { 
    include: { subjects: true }
  },
  _count: { select: { documents: true } },
};

function maybeCallback(cb, err, result) {
  if (typeof cb === 'function') {
    return cb(err, result);
  }
  if (err) throw err;
  return result;
}

// ======================================================
// GET ALL APPLICATIONS
// ======================================================

export const getAllApplications = async function(
  page = 1,
  limit = 10,
  search = '',
  status = '',
  userId = '',
  callback
) {
  try {
    const skip = (page - 1) * limit;
    const where = {};

    if (search) {
      where.OR = [
        { programChoice: { contains: search, mode: 'insensitive' } }, 
        { academicYear: { contains: search, mode: 'insensitive' } },
        { ref: { contains: search, mode: 'insensitive' } },           
        { firstName: { contains: search, mode: 'insensitive' } },     
        { lastName: { contains: search, mode: 'insensitive' } },      
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { id: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: defaultInclude,
      }),
      prisma.application.count({ where }),
    ]);

    const result = {
      data: applications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    return maybeCallback(callback, null, result);
  } catch (err) {
    return maybeCallback(callback, err);
  }
};

// ======================================================
// GET APPLICATION BY ID
// ======================================================

export const getApplicationById = async function(id, callback) {
  try {
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        ...defaultInclude,
        statusHistory: {            
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        adminNotes: true,           
      },
    });
    if (!application) return maybeCallback(callback, null, null);
    return maybeCallback(callback, null, application);
  } catch (err) {
    return maybeCallback(callback, err);
  }
};

// ======================================================
// CREATE NEW APPLICATION
// ======================================================

export const createApplication = async function(data, callback) {
  try {
    // Generate reference number
    const ref = `AES-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    const application = await prisma.application.create({
      data: {
        userId: data.userId,
        ref: data.ref || ref,
        
        // Personal Information
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        gender: data.gender,
        nationality: data.nationality,
        phoneNumber: data.phoneNumber,
        email: data.email,
        address: data.address,
        city: data.city,
        country: data.country,
        countryOfResidence: data.countryOfResidence,
        
        // Academic Information
        highSchool: data.highSchool,
        graduationYear: data.graduationYear,
        gpa: data.gpa,
        gpaScale: data.gpaScale || 4.0,
        wassceAggregate: data.wassceAggregate,
        
        // Program Information
        programChoice: data.programChoice,
        programType: data.programType || 'UNDERGRAD',
        academicYear: data.academicYear || '2026/2027',
        
        // Test Scores
        satScore: data.satScore,
        actScore: data.actScore,
        ieltsScore: data.ieltsScore,
        toeflScore: data.toeflScore,
        
        // Work Experience & Extras
        workExperience: data.workExperience,
        achievements: data.achievements,
        extracurricular: data.extracurricular,
        personalStatement: data.personalStatement,
        
        // Status
        status: 'DRAFT',
        open: true,
        isDraft: true,
        submittedAt: data.submittedAt ? new Date(data.submittedAt) : undefined,
        
        // Education Record (if provided)
        educationRecord: data.educationInfo ? {
          create: {
            highSchool: data.educationInfo.highSchool,
            graduationYear: data.educationInfo.graduationYear,
            wassceAggregate: data.educationInfo.wassceAggregate,
            gpa: data.educationInfo.gpa,
            gpaScale: data.educationInfo.gpaScale || 4.0,
            subjects: {
              create: data.educationInfo.subjects?.map(subject => ({
                name: subject.name,
                grade: subject.grade,
                score: subject.score,
              })) || []
            }
          }
        } : undefined,
      },
      include: { 
        user: { select: userSelect },
        educationRecord: { include: { subjects: true } }
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: data.userId,
        action: 'APPLICATION_CREATED',
        details: `Application ${application.id} created for program ${application.programChoice}`,
      },
    });

    // Create initial status history entry
    await prisma.applicationStatusHistory.create({
      data: {
        applicationId: application.id,
        oldStatus: null,
        newStatus: 'DRAFT',
        changedBy: data.userId,
        note: 'Application created',
      },
    });

    return maybeCallback(callback, null, application);
  } catch (err) {
    return maybeCallback(callback, err);
  }
};


// ======================================================
// UPDATE APPLICATION
// ======================================================

export const updateApplication = async function(id, data, userId, callback) {
  try {
    const application = await prisma.application.update({
      where: { id },
      data: {
        // Personal Information
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        gender: data.gender,
        nationality: data.nationality,
        phoneNumber: data.phoneNumber,
        email: data.email,
        address: data.address,
        city: data.city,
        country: data.country,
        countryOfResidence: data.countryOfResidence,
        
        // Academic Information
        highSchool: data.highSchool,
        graduationYear: data.graduationYear,
        gpa: data.gpa,
        gpaScale: data.gpaScale,
        wassceAggregate: data.wassceAggregate,
        
        // Program Information
        programChoice: data.programChoice,
        programType: data.programType,
        academicYear: data.academicYear,
        
        // Test Scores
        satScore: data.satScore,
        actScore: data.actScore,
        ieltsScore: data.ieltsScore,
        toeflScore: data.toeflScore,
        
        // Work Experience & Extras
        workExperience: data.workExperience,
        achievements: data.achievements,
        extracurricular: data.extracurricular,
        personalStatement: data.personalStatement,
      },
      include: { 
        user: { select: userSelect },
        educationRecord: { include: { subjects: true } }
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: userId,
        action: 'APPLICATION_UPDATED',
        details: `Application ${application.id} updated`,
      },
    });

    return maybeCallback(callback, null, application);
  } catch (err) {
    return maybeCallback(callback, err);
  }
};

// ======================================================
// UPDATE APPLICATION STATUS
// ======================================================

export const updateStatus = async function(id, status, userId, notes = '', callback) {
  try {
    // Get current application to track old status
    const currentApp = await prisma.application.findUnique({
      where: { id },
      select: { status: true }
    });

    if (!currentApp) {
      return maybeCallback(callback, new Error('Application not found'));
    }

    const application = await prisma.application.update({
      where: { id },
      data: { 
        status,
        ...(status === 'OFFERED' ? { decisionDate: new Date() } : {}),
        ...(status === 'REJECTED' ? { decisionDate: new Date() } : {}),
      },
      include: { 
        user: { select: userSelect },
        educationRecord: { include: { subjects: true } }
      },
    });

    // Create status history entry
    await prisma.applicationStatusHistory.create({
      data: {
        applicationId: id,
        oldStatus: currentApp.status,
        newStatus: status,
        changedBy: userId,
        note: notes || `Status changed from ${currentApp.status} to ${status}`,
      },
    });

    let logDetails = `Application ${application.id} status changed from ${currentApp.status} to ${status}`;
    if (notes) logDetails += `. Notes: ${notes}`;

    await prisma.activityLog.create({
      data: {
        userId: userId,
        action: `APPLICATION_${status}`,
        details: logDetails,
      },
    });

    return maybeCallback(callback, null, application);
  } catch (err) {
    return maybeCallback(callback, err);
  }
};

// ======================================================
// SUBMIT APPLICATION (Draft → Submitted)
// ======================================================

export const submitApplication = async function(id, userId, callback) {
  try {
    const application = await prisma.application.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        isDraft: false,
        submittedAt: new Date(),
      },
      include: { 
        user: { select: userSelect },
        educationRecord: { include: { subjects: true } }
      },
    });

    await prisma.applicationStatusHistory.create({
      data: {
        applicationId: id,
        oldStatus: 'DRAFT',
        newStatus: 'SUBMITTED',
        changedBy: userId,
        note: 'Application submitted',
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: userId,
        action: 'APPLICATION_SUBMITTED',
        details: `Application ${application.id} submitted`,
      },
    });

    return maybeCallback(callback, null, application);
  } catch (err) {
    return maybeCallback(callback, err);
  }
};

// ======================================================
// DELETE APPLICATION
// ======================================================

export const deleteApplication = async function(id, userId, callback) {
  try {
    await prisma.educationRecord.deleteMany({
      where: { applicationId: id }
    });
    
    await prisma.applicationStatusHistory.deleteMany({
      where: { applicationId: id }
    });

    const application = await prisma.application.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: userId,
        action: 'APPLICATION_DELETED',
        details: `Application ${application.id} deleted`,
      },
    });

    return maybeCallback(callback, null, application);
  } catch (err) {
    return maybeCallback(callback, err);
  }
};

// ======================================================
// GET APPLICATION STATISTICS
// ======================================================
export const getStats = async function(callback) {
  try {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [
      total,
      draft,
      submitted,
      underReview,
      offered,
      rejected,
      totalThisMonth,
      offeredThisMonth,
    ] = await Promise.all([
      prisma.application.count(),
      prisma.application.count({ where: { status: 'DRAFT' } }),
      prisma.application.count({ where: { status: 'SUBMITTED' } }),
      prisma.application.count({ where: { status: 'UNDER_REVIEW' } }),
      prisma.application.count({ where: { status: 'OFFERED' } }),
      prisma.application.count({ where: { status: 'REJECTED' } }),
      prisma.application.count({ where: { submittedAt: { gte: startOfMonth } } }),
      prisma.application.count({ where: { status: 'OFFERED', submittedAt: { gte: startOfMonth } } }),
    ]);

    const result = {
      total,
      draft,
      submitted,
      underReview,
      offered,
      rejected,
      totalThisMonth,
      offeredThisMonth,
      approvalRate: total > 0 ? Math.round((offered / total) * 100) : 0,
    };

    return maybeCallback(callback, null, result);
  } catch (err) {
    return maybeCallback(callback, err);
  }
};

// ======================================================
// GET APPLICATIONS BY STATUS
// ======================================================

export const getApplicationsByStatus = async function(status, callback) {
  try {
    const applications = await prisma.application.findMany({
      where: { status },
      include: { 
        user: { select: userSelect },
        educationRecord: { include: { subjects: true } }
      },
      orderBy: { createdAt: 'desc' },
    });
    return maybeCallback(callback, null, applications);
  } catch (err) {
    return maybeCallback(callback, err);
  }
};

// ======================================================
// SEARCH APPLICATIONS
// ======================================================

export const searchApplications = async function(query, callback) {
  try {
    const applications = await prisma.application.findMany({
      where: {
        OR: [
          { programChoice: { contains: query, mode: 'insensitive' } },
          { academicYear: { contains: query, mode: 'insensitive' } },
          { ref: { contains: query, mode: 'insensitive' } },
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { user: { firstName: { contains: query, mode: 'insensitive' } } },
          { user: { lastName: { contains: query, mode: 'insensitive' } } },
          { id: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: defaultInclude,
      orderBy: { createdAt: 'desc' },
    });
    return maybeCallback(callback, null, applications);
  } catch (err) {
    return maybeCallback(callback, err);
  }
};

// ======================================================
// GET APPLICATIONS BY USER ID
// ======================================================

export const getApplicationsByUserId = async function(userId, callback) {
  try {
    const applications = await prisma.application.findMany({
      where: { userId },
      include: {
        user: { select: userSelect },
        documents: { select: documentSelect },
        educationRecord: { include: { subjects: true } },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return maybeCallback(callback, null, applications);
  } catch (err) {
    return maybeCallback(callback, err);
  }
};

// ======================================================
// BULK UPDATE STATUS
// ======================================================

export const bulkUpdateStatus = async function(ids, status, userId, callback) {
  try {
    const currentApps = await prisma.application.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true }
    });

    const result = await prisma.application.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });

    const historyPromises = currentApps.map(app =>
      prisma.applicationStatusHistory.create({
        data: {
          applicationId: app.id,
          oldStatus: app.status,
          newStatus: status,
          changedBy: userId,
          note: 'Bulk status update',
        },
      })
    );
    await Promise.all(historyPromises);

    const logPromises = ids.map((id) =>
      prisma.activityLog.create({
        data: {
          userId: userId,
          action: `APPLICATION_${status}_BULK`,
          details: `Application ${id} status changed to ${status} (bulk update)`,
        },
      })
    );
    await Promise.all(logPromises);

    return maybeCallback(callback, null, result);
  } catch (err) {
    return maybeCallback(callback, err);
  }
};

// ======================================================
// GET APPLICATION TIMELINE
// ======================================================

export const getApplicationTimeline = async function(applicationId, callback) {
  try {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        user: { select: userSelect },
        documents: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
        educationRecord: { include: { subjects: true } },
      },
    });

    if (!application) return maybeCallback(callback, null, null);

    const logs = await prisma.activityLog.findMany({
      where: { details: { contains: applicationId } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return maybeCallback(callback, null, { application, activity: logs });
  } catch (err) {
    return maybeCallback(callback, err);
  }
};

// ======================================================
// CHECK EXISTING APPLICATION
// ======================================================

export const checkExistingApplication = async function(userId, programChoice, academicYear, callback) {
  try {
    const existing = await prisma.application.findFirst({
      where: { userId, programChoice, academicYear },
    });
    return maybeCallback(callback, null, !!existing);
  } catch (err) {
    return maybeCallback(callback, err);
  }
};

// ======================================================
// GET STATS BY PROGRAM TYPE
// ======================================================

export const getStatsByProgramType = async function(callback) {
  try {
    const stats = await prisma.application.groupBy({
      by: ['programType'],
      _count: { programType: true },
    });
    return maybeCallback(callback, null, stats);
  } catch (err) {
    return maybeCallback(callback, err);
  }
};

// ======================================================
// GET STATS BY ACADEMIC YEAR
// ======================================================

export const getStatsByAcademicYear = async function(callback) {
  try {
    const stats = await prisma.application.groupBy({
      by: ['academicYear'],
      _count: { academicYear: true },
    });
    return maybeCallback(callback, null, stats);
  } catch (err) {
    return maybeCallback(callback, err);
  }
};

// ======================================================
// ======================================================
// NEW: ACCESS CODE FUNCTIONS
// ======================================================
// ======================================================

// ======================================================
// GENERATE ACCESS CODE (Admin Only)
// ======================================================

export const generateAccessCode = async function(applicationId, adminId, callback) {
  try {
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const code = `AES-${year}-${random}`;

    const application = await prisma.application.findUnique({
      where: { id: applicationId }
    });

    if (!application) {
      return maybeCallback(callback, new Error('Application not found'), null);
    }

    // Check if code already exists
    const existingCode = await prisma.accessCode.findUnique({
      where: { code }
    });

    if (existingCode) {
      return maybeCallback(callback, new Error('Code already exists, try again'), null);
    }

    const accessCode = await prisma.accessCode.create({
      data: {
        code: code,
        applicationId: applicationId,
        generatedBy: adminId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      },
    });

    await prisma.application.update({
      where: { id: applicationId },
      data: { accessCode: code },
    });

    return maybeCallback(callback, null, {
      code: code,
      applicationId: applicationId,
      expiresAt: accessCode.expiresAt,
    });
  } catch (err) {
    return maybeCallback(callback, err);
  }
};

// ======================================================
// VALIDATE ACCESS CODE (Public - No Login)
// ======================================================

export const validateAccessCode = async function(code, callback) {
  try {
    const accessCode = await prisma.accessCode.findUnique({
      where: { code },
      include: {
        application: {
          include: {
            educationRecord: { include: { subjects: true } },
            documents: true,
            statusHistory: {
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          }
        }
      }
    });

    if (!accessCode) {
      return maybeCallback(callback, new Error('Invalid access code'), null);
    }

    if (!accessCode.isActive) {
      return maybeCallback(callback, new Error('Access code is no longer active'), null);
    }

    if (accessCode.expiresAt && new Date() > accessCode.expiresAt) {
      return maybeCallback(callback, new Error('Access code has expired'), null);
    }

    // Mark as used if not already
    if (!accessCode.isUsed) {
      await prisma.accessCode.update({
        where: { id: accessCode.id },
        data: {
          isUsed: true,
          usedAt: new Date(),
        },
      });
    }

    return maybeCallback(callback, null, accessCode.application);
  } catch (err) {
    return maybeCallback(callback, err);
  }
};

// ======================================================
// GET APPLICATION BY ACCESS CODE (Public - No Login)
// ======================================================

export const getApplicationByCode = async function(code, callback) {
  try {
    const application = await prisma.application.findUnique({
      where: { accessCode: code },
      include: {
        educationRecord: { include: { subjects: true } },
        documents: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      }
    });

    if (!application) {
      return maybeCallback(callback, new Error('Application not found'), null);
    }

    return maybeCallback(callback, null, application);
  } catch (err) {
    return maybeCallback(callback, err);
  }
};

// ======================================================
// UPDATE APPLICATION BY ACCESS CODE (Public - No Login)
// ======================================================

export const updateApplicationByCode = async function(code, data, callback) {
  try {
    const application = await prisma.application.findUnique({
      where: { accessCode: code },
      select: { id: true, status: true }
    });

    if (!application) {
      return maybeCallback(callback, new Error('Application not found'), null);
    }

    if (!['DRAFT', 'NEEDS_INFO'].includes(application.status)) {
      return maybeCallback(callback, new Error('Application cannot be modified at this stage'), null);
    }

    const updated = await prisma.application.update({
      where: { id: application.id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        gender: data.gender,
        nationality: data.nationality,
        phoneNumber: data.phoneNumber,
        email: data.email,
        address: data.address,
        city: data.city,
        country: data.country,
        countryOfResidence: data.countryOfResidence,
        highSchool: data.highSchool,
        graduationYear: data.graduationYear,
        gpa: data.gpa,
        gpaScale: data.gpaScale || 4.0,
        wassceAggregate: data.wassceAggregate,
        programChoice: data.programChoice,
        programType: data.programType,
        academicYear: data.academicYear,
        satScore: data.satScore,
        actScore: data.actScore,
        ieltsScore: data.ieltsScore,
        toeflScore: data.toeflScore,
        workExperience: data.workExperience,
        achievements: data.achievements,
        extracurricular: data.extracurricular,
        personalStatement: data.personalStatement,
      },
      include: {
        educationRecord: { include: { subjects: true } },
      }
    });

    return maybeCallback(callback, null, updated);
  } catch (err) {
    return maybeCallback(callback, err);
  }
};

// ======================================================
// SUBMIT APPLICATION BY ACCESS CODE (Public - No Login)
// ======================================================

export const submitApplicationByCode = async function(code, callback) {
  try {
    const application = await prisma.application.findUnique({
      where: { accessCode: code },
      select: { id: true, status: true }
    });

    if (!application) {
      return maybeCallback(callback, new Error('Application not found'), null);
    }

    if (application.status !== 'DRAFT') {
      return maybeCallback(callback, new Error('Only draft applications can be submitted'), null);
    }

    const updated = await prisma.application.update({
      where: { id: application.id },
      data: {
        status: 'SUBMITTED',
        isDraft: false,
        submittedAt: new Date(),
      },
      include: {
        educationRecord: { include: { subjects: true } },
        documents: true,
      }
    });

    await prisma.applicationStatusHistory.create({
      data: {
        applicationId: application.id,
        oldStatus: 'DRAFT',
        newStatus: 'SUBMITTED',
        changedBy: 'applicant',
        note: 'Application submitted via access code',
      },
    });

    await prisma.accessCode.update({
      where: { code },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });

    return maybeCallback(callback, null, updated);
  } catch (err) {
    return maybeCallback(callback, err);
  }
};

// ======================================================
// RESEND ACCESS CODE (Admin Only)
// ======================================================

export const resendAccessCode = async function(applicationId, callback) {
  try {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { accessCode: true, email: true, firstName: true, lastName: true }
    });

    if (!application || !application.accessCode) {
      return maybeCallback(callback, new Error('No access code found'), null);
    }

    // Here you would send email/SMS
    // For now, just return the code
    return maybeCallback(callback, null, {
      code: application.accessCode,
      message: 'Access code resent successfully',
    });
  } catch (err) {
    return maybeCallback(callback, err);
  }
};

// ======================================================
// GENERATE BULK ACCESS CODES (Admin Only)
// ======================================================

export const generateBulkAccessCodes = async function(applicationIds, adminId, callback) {
  try {
    const results = [];
    
    for (const id of applicationIds) {
      const result = await new Promise((resolve, reject) => {
        generateAccessCode(id, adminId, (err, res) => {
          if (err) reject(err);
          else resolve(res);
        });
      });
      results.push(result);
    }

    return maybeCallback(callback, null, results);
  } catch (err) {
    return maybeCallback(callback, err);
  }
};

// ======================================================
// ======================================================
// NEW: ADMISSION LETTER FUNCTIONS
// ======================================================
// ======================================================

// ======================================================
// GENERATE ADMISSION LETTER (Admin Only)
// ======================================================

export const generateAdmissionLetter = async function(applicationId, callback) {
  try {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        educationRecord: { include: { subjects: true } },
        user: true,
      }
    });

    if (!application) {
      return maybeCallback(callback, new Error('Application not found'), null);
    }

    if (application.status !== 'OFFERED') {
      return maybeCallback(callback, new Error('Application has not been offered admission'), null);
    }

    // Create PDF
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    const outputDir = path.join(__dirname, '../../uploads/admission-letters');
    await fs.ensureDir(outputDir);

    const fileName = `admission-letter-${application.ref || application.id}.pdf`;
    const filePath = path.join(outputDir, fileName);

    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // Header
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .fillColor('#1a237e')
      .text('UNIVERSITY OF GHANA', { align: 'center' })
      .moveDown(0.5);

    doc
      .fontSize(16)
      .font('Helvetica')
      .fillColor('#333333')
      .text('OFFICE OF THE REGISTRAR', { align: 'center' })
      .moveDown(0.5);

    doc
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .strokeColor('#1a237e')
      .lineWidth(2)
      .stroke()
      .moveDown(1.5);

    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .fillColor('#1a237e')
      .text('ADMISSION LETTER', { align: 'center' })
      .moveDown(2);

    doc
      .fontSize(12)
      .font('Helvetica')
      .fillColor('#333333')
      .text(`Ref: ${application.ref || application.id}`, { align: 'right' })
      .text(`Date: ${new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`, { align: 'right' })
      .moveDown(2);

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text(`Dear ${application.firstName} ${application.lastName},`)
      .moveDown(1);

    doc
      .fontSize(12)
      .font('Helvetica')
      .text(
        `We are pleased to inform you that you have been offered admission to the ` +
        `${application.programChoice} program for the ` +
        `${application.academicYear} academic year.`,
        { align: 'justify' }
      )
      .moveDown(1);

    doc.text(
      `This offer is based on your academic qualifications and performance in the ` +
      `admission process. You have been selected among many qualified candidates.`,
      { align: 'justify' }
    )
    .moveDown(1);

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Important Information')
      .moveDown(0.5);

    doc
      .fontSize(12)
      .font('Helvetica')
      .text('1. Program Details:', { underline: true })
      .moveDown(0.3);

    const details = [
      `   • Program: ${application.programChoice}`,
      `   • Program Type: ${application.programType || 'Undergraduate'}`,
      `   • Academic Year: ${application.academicYear}`,
      `   • Duration: 4 Years (Full-Time)`,
    ];
    details.forEach(line => doc.text(line))
    .moveDown(0.5);

    doc
      .text('2. Registration Dates:')
      .moveDown(0.3);

    const dates = [
      `   • Registration Opens: ${new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}`,
      `   • Registration Closes: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}`,
      `   • Lectures Begin: ${new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toLocaleDateString()}`,
    ];
    dates.forEach(line => doc.text(line))
    .moveDown(0.5);

    doc
      .text('3. Required Documents:')
      .moveDown(0.3);

    const documents = [
      '   • WASSCE Certificate (Original)',
      '   • Birth Certificate',
      '   • National ID Card',
      '   • Passport Photographs (2 copies)',
      '   • Medical Report',
    ];
    documents.forEach(line => doc.text(line))
    .moveDown(1);

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Academic Requirements')
      .moveDown(0.5);

    doc
      .fontSize(12)
      .font('Helvetica')
      .text(
        `You are required to have a minimum aggregate of ${application.wassceAggregate || '10'} ` +
        `in WASSCE with core subjects (Mathematics, English, and Integrated Science) and ` +
        `the required elective subjects.`
      )
      .moveDown(1);

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Contact Us')
      .moveDown(0.5);

    doc
      .fontSize(12)
      .font('Helvetica')
      .text('For further inquiries, please contact:')
      .moveDown(0.3);

    const contacts = [
      '   📞 Phone: +233 302 123 456',
      '   📧 Email: admissions@university.edu.gh',
      '   🌐 Website: www.university.edu.gh',
      '   📍 Address: P.O. Box 123, Legon, Accra, Ghana',
    ];
    contacts.forEach(line => doc.text(line))
    .moveDown(1);

    doc
      .fontSize(12)
      .text('Yours sincerely,')
      .moveDown(1.5);

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Prof. John Doe')
      .text('Registrar')
      .text('University of Ghana')
      .moveDown(0.5);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#666666')
      .text(
        'This is a computer-generated letter and does not require a signature.',
        { align: 'center' }
      )
      .moveDown(0.5);

    doc
      .fontSize(10)
      .fillColor('#999999')
      .text(
        '© University of Ghana | All Rights Reserved',
        { align: 'center' }
      );

    doc.end();

    await new Promise((resolve) => {
      writeStream.on('finish', resolve);
    });

    await prisma.application.update({
      where: { id: applicationId },
      data: {
        admissionLetterUrl: `/uploads/admission-letters/${fileName}`,
        decisionDate: new Date(),
      },
    });

    return maybeCallback(callback, null, {
      success: true,
      message: 'Admission letter generated successfully',
      filePath: `/uploads/admission-letters/${fileName}`,
      fileName: fileName,
    });

  } catch (err) {
    return maybeCallback(callback, err);
  }
};

// ======================================================
// DOWNLOAD ADMISSION LETTER BY CODE (Public - No Login)
// ======================================================

export const downloadAdmissionLetterByCode = async function(code, callback) {
  try {
    const application = await prisma.application.findUnique({
      where: { accessCode: code },
      select: { admissionLetterUrl: true, ref: true, id: true }
    });

    if (!application) {
      return maybeCallback(callback, new Error('Application not found'), null);
    }

    if (!application.admissionLetterUrl) {
      return maybeCallback(callback, new Error('Admission letter not found'), null);
    }

    const filePath = path.join(__dirname, '../..', application.admissionLetterUrl);
    const fileName = `admission-letter-${application.ref || application.id}.pdf`;

    // Check if file exists
    if (!await fs.pathExists(filePath)) {
      return maybeCallback(callback, new Error('Admission letter file not found'), null);
    }

    return maybeCallback(callback, null, {
      filePath: filePath,
      fileName: fileName,
    });
  } catch (err) {
    return maybeCallback(callback, err);
  }
};

// ======================================================
// EXPORT ALL FUNCTIONS
// ======================================================

export default {
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
  getApplicationsByUserId,
  bulkUpdateStatus,
  getApplicationTimeline,
  checkExistingApplication,
  getStatsByProgramType,
  getStatsByAcademicYear,
  
  // Access Code Functions
  generateAccessCode,
  validateAccessCode,
  getApplicationByCode,
  updateApplicationByCode,
  submitApplicationByCode,
  resendAccessCode,
  generateBulkAccessCodes,
  
  // Admission Letter Functions
  generateAdmissionLetter,
  downloadAdmissionLetterByCode,
};