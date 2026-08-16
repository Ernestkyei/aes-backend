import prisma from '../config/database.js';

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
  status: true,        // ADDED
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
        { programChoice: { contains: search, mode: 'insensitive' } },  // UPDATED
        { academicYear: { contains: search, mode: 'insensitive' } },
        { ref: { contains: search, mode: 'insensitive' } },           // ADDED
        { firstName: { contains: search, mode: 'insensitive' } },     // ADDED
        { lastName: { contains: search, mode: 'insensitive' } },      // ADDED
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
        statusHistory: {            // ADDED
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        adminNotes: true,           // ADDED
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
        programChoice: data.programChoice,  // UPDATED
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
        status: 'DRAFT',                    // UPDATED
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
        programChoice: data.programChoice,  // UPDATED
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
        // If status is OFFERED, set decisionDate
        ...(status === 'OFFERED' ? { decisionDate: new Date() } : {}),
        // If status is REJECTED, set decisionDate
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

    // Create status history entry
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
    // Delete related records first
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
    // Get current applications to track old status
    const currentApps = await prisma.application.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true }
    });

    const result = await prisma.application.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });

    // Create status history entries for each
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