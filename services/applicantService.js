// src/services/applicationService.js

import prisma from '../config/database.js';
import { ApplicationStatus } from '../types/index.js';

// Get all applications with pagination and filters
export const getAllApplications = function(page, limit, search, status, userId, callback) {
  page = page || 1;
  limit = limit || 10;
  search = search || '';
  status = status || '';
  userId = userId || '';

  const skip = (page - 1) * limit;

  // Build where clause
  const where = {};

  if (search) {
    where.OR = [
      { program: { contains: search, mode: 'insensitive' } },
      { academicYear: { contains: search, mode: 'insensitive' } },
      { user: { firstName: { contains: search, mode: 'insensitive' } } },
      { user: { lastName: { contains: search, mode: 'insensitive' } } },
      { id: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (status) {
    where.status = status;
  }

  if (userId) {
    where.userId = userId;
  }

  prisma.application.findMany({
    where,
    skip,
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
        },
      },
      documents: {
        select: {
          id: true,
          name: true,
          fileName: true,
          fileUrl: true,
          isVerified: true,
        },
      },
      _count: {
        select: {
          documents: true,
        },
      },
    },
  })
  .then(function(applications) {
    prisma.application.count({ where })
      .then(function(total) {
        callback(null, {
          data: applications,
          pagination: {
            page: page,
            limit: limit,
            total: total,
            totalPages: Math.ceil(total / limit),
          },
        });
      })
      .catch(function(err) {
        callback(err);
      });
  })
  .catch(function(err) {
    callback(err);
  });
};

// Get application by ID
export const getApplicationById = function(id, callback) {
  prisma.application.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
        },
      },
      documents: {
        select: {
          id: true,
          name: true,
          fileName: true,
          fileUrl: true,
          isVerified: true,
          type: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          documents: true,
        },
      },
    },
  })
  .then(function(application) {
    if (!application) {
      return callback(null, null);
    }
    callback(null, application);
  })
  .catch(function(err) {
    callback(err);
  });
};

// Create new application
export const createApplication = function(data, callback) {
  prisma.application.create({
    data: {
      userId: data.userId,
      program: data.program,
      programType: data.programType || 'UNDERGRAD',
      academicYear: data.academicYear || '2026/2027',
      status: ApplicationStatus.PENDING,
      submitted: new Date(),
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
        },
      },
    },
  })
  .then(function(application) {
    // Log activity
    prisma.activityLog.create({
      data: {
        userId: data.userId,
        action: 'APPLICATION_CREATED',
        details: 'Application ' + application.id + ' created for program ' + application.program,
      },
    })
    .then(function() {
      callback(null, application);
    })
    .catch(function(err) {
      callback(err);
    });
  })
  .catch(function(err) {
    callback(err);
  });
};

// Update application
export const updateApplication = function(id, data, userId, callback) {
  prisma.application.update({
    where: { id },
    data: {
      program: data.program,
      programType: data.programType,
      academicYear: data.academicYear,
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  })
  .then(function(application) {
    // Log activity
    prisma.activityLog.create({
      data: {
        userId: userId,
        action: 'APPLICATION_UPDATED',
        details: 'Application ' + application.id + ' updated',
      },
    })
    .then(function() {
      callback(null, application);
    })
    .catch(function(err) {
      callback(err);
    });
  })
  .catch(function(err) {
    callback(err);
  });
};

// Update application status
export const updateStatus = function(id, status, userId, notes, callback) {
  notes = notes || '';

  prisma.application.update({
    where: { id },
    data: { status: status },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  })
  .then(function(application) {
    var logDetails = 'Application ' + application.id + ' status changed to ' + status;
    if (notes) {
      logDetails = logDetails + '. Notes: ' + notes;
    }

    prisma.activityLog.create({
      data: {
        userId: userId,
        action: 'APPLICATION_' + status,
        details: logDetails,
      },
    })
    .then(function() {
      callback(null, application);
    })
    .catch(function(err) {
      callback(err);
    });
  })
  .catch(function(err) {
    callback(err);
  });
};

// Delete application
export const deleteApplication = function(id, userId, callback) {
  prisma.application.delete({
    where: { id },
  })
  .then(function(application) {
    prisma.activityLog.create({
      data: {
        userId: userId,
        action: 'APPLICATION_DELETED',
        details: 'Application ' + application.id + ' deleted',
      },
    })
    .then(function() {
      callback(null, application);
    })
    .catch(function(err) {
      callback(err);
    });
  })
  .catch(function(err) {
    callback(err);
  });
};

// Get application statistics
export const getStats = function(callback) {
  var total, pending, review, approved, rejected, totalThisMonth, approvedThisMonth;

  prisma.application.count()
    .then(function(result) {
      total = result;
      return prisma.application.count({ where: { status: 'PENDING' } });
    })
    .then(function(result) {
      pending = result;
      return prisma.application.count({ where: { status: 'REVIEW' } });
    })
    .then(function(result) {
      review = result;
      return prisma.application.count({ where: { status: 'APPROVED' } });
    })
    .then(function(result) {
      approved = result;
      return prisma.application.count({ where: { status: 'REJECTED' } });
    })
    .then(function(result) {
      rejected = result;
      return prisma.application.count({
        where: {
          submitted: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      });
    })
    .then(function(result) {
      totalThisMonth = result;
      return prisma.application.count({
        where: {
          status: 'APPROVED',
          submitted: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      });
    })
    .then(function(result) {
      approvedThisMonth = result;
      callback(null, {
        total: total,
        pending: pending,
        review: review,
        approved: approved,
        rejected: rejected,
        totalThisMonth: totalThisMonth,
        approvedThisMonth: approvedThisMonth,
      });
    })
    .catch(function(err) {
      callback(err);
    });
};

// Get applications by status
export const getApplicationsByStatus = function(status, callback) {
  prisma.application.findMany({
    where: { status: status },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
  .then(function(applications) {
    callback(null, applications);
  })
  .catch(function(err) {
    callback(err);
  });
};

// Search applications
export const searchApplications = function(query, callback) {
  prisma.application.findMany({
    where: {
      OR: [
        { program: { contains: query, mode: 'insensitive' } },
        { academicYear: { contains: query, mode: 'insensitive' } },
        { user: { firstName: { contains: query, mode: 'insensitive' } } },
        { user: { lastName: { contains: query, mode: 'insensitive' } } },
        { id: { contains: query, mode: 'insensitive' } },
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      _count: {
        select: {
          documents: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
  .then(function(applications) {
    callback(null, applications);
  })
  .catch(function(err) {
    callback(err);
  });
};

// Get applications by user ID
export const getApplicationsByUserId = function(userId, callback) {
  prisma.application.findMany({
    where: { userId: userId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      documents: {
        select: {
          id: true,
          name: true,
          isVerified: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
  .then(function(applications) {
    callback(null, applications);
  })
  .catch(function(err) {
    callback(err);
  });
};

// Bulk update application status
export const bulkUpdateStatus = function(ids, status, userId, callback) {
  prisma.application.updateMany({
    where: {
      id: { in: ids },
    },
    data: { status: status },
  })
  .then(function(result) {
    // Log activity for each application
    var logPromises = ids.map(function(id) {
      return prisma.activityLog.create({
        data: {
          userId: userId,
          action: 'APPLICATION_' + status + '_BULK',
          details: 'Application ' + id + ' status changed to ' + status + ' (bulk update)',
        },
      });
    });

    Promise.all(logPromises)
      .then(function() {
        callback(null, result);
      })
      .catch(function(err) {
        callback(err);
      });
  })
  .catch(function(err) {
    callback(err);
  });
};

// Get application timeline
export const getApplicationTimeline = function(applicationId, callback) {
  var applicationData;

  prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      documents: true,
    },
  })
  .then(function(application) {
    if (!application) {
      return callback(null, null);
    }
    applicationData = application;
    return prisma.activityLog.findMany({
      where: {
        details: { contains: applicationId },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  })
  .then(function(logs) {
    callback(null, {
      application: applicationData,
      activity: logs,
    });
  })
  .catch(function(err) {
    callback(err);
  });
};

// Check if user has an existing application
export const checkExistingApplication = function(userId, program, academicYear, callback) {
  prisma.application.findFirst({
    where: {
      userId: userId,
      program: program,
      academicYear: academicYear,
    },
  })
  .then(function(existing) {
    callback(null, !!existing);
  })
  .catch(function(err) {
    callback(err);
  });
};

// Get application count by program type
export const getStatsByProgramType = function(callback) {
  prisma.application.groupBy({
    by: ['programType'],
    _count: {
      programType: true,
    },
  })
  .then(function(stats) {
    callback(null, stats);
  })
  .catch(function(err) {
    callback(err);
  });
};

// Get application count by academic year
export const getStatsByAcademicYear = function(callback) {
  prisma.application.groupBy({
    by: ['academicYear'],
    _count: {
      academicYear: true,
    },
  })
  .then(function(stats) {
    callback(null, stats);
  })
  .catch(function(err) {
    callback(err);
  });
};