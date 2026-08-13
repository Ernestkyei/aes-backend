// import prisma from '../config/database.js';


// // Shared select/include fragments to keep queries consistent
// const userSelect = {
//   id: true,
//   firstName: true,
//   lastName: true,
//   email: true,
//   phoneNumber: true,
// };

// const documentSelect = {
//   id: true,
//   name: true,
//   fileName: true,
//   fileUrl: true,
//   isVerified: true,
//   type: true,
//   createdAt: true,
// };

// const defaultInclude = {
//   user: { select: userSelect },
//   documents: { select: documentSelect },
//   _count: { select: { documents: true } },
// };

// function maybeCallback(cb, err, result) {
//   if (typeof cb === 'function') {
//     return cb(err, result);
//   }
//   if (err) throw err;
//   return result;
// }

// /** Get all applications with pagination and filters. */
// export const getAllApplications = async function(
//   page = 1,
//   limit = 10,
//   search = '',
//   status = '',
//   userId = '',
//   callback
// ) {
//   try {
//     const skip = (page - 1) * limit;
//     const where = {};

//     if (search) {
//       where.OR = [
//         { program: { contains: search, mode: 'insensitive' } },
//         { academicYear: { contains: search, mode: 'insensitive' } },
//         { user: { firstName: { contains: search, mode: 'insensitive' } } },
//         { user: { lastName: { contains: search, mode: 'insensitive' } } },
//         { id: { contains: search, mode: 'insensitive' } },
//       ];
//     }
//     if (status) where.status = status;
//     if (userId) where.userId = userId;

//     const [applications, total] = await Promise.all([
//       prisma.application.findMany({
//         where,
//         skip,
//         take: limit,
//         orderBy: { createdAt: 'desc' },
//         include: defaultInclude,
//       }),
//       prisma.application.count({ where }),
//     ]);

//     const result = {
//       data: applications,
//       pagination: {
//         page,
//         limit,
//         total,
//         totalPages: Math.ceil(total / limit),
//       },
//     };

//     return maybeCallback(callback, null, result);
//   } catch (err) {
//     return maybeCallback(callback, err);
//   }
// };

// /** Get application by ID */
// export const getApplicationById = async function(id, callback) {
//   try {
//     const application = await prisma.application.findUnique({
//       where: { id },
//       include: defaultInclude,
//     });
//     if (!application) return maybeCallback(callback, null, null);
//     return maybeCallback(callback, null, application);
//   } catch (err) {
//     return maybeCallback(callback, err);
//   }
// };

// /** Create new application */
// export const createApplication = async function(data, callback) {
//   try {
//     const application = await prisma.application.create({
//       data: {
//         userId: data.userId,
//         program: data.program,
//         programType: data.programType || 'UNDERGRAD',
//         academicYear: data.academicYear || '2026/2027',
//         status: ApplicationStatus.PENDING,
//         submitted: new Date(),
//       },
//       include: { user: { select: userSelect } },
//     });

//     // Log activity (fire-and-forget but await to ensure consistency)
//     await prisma.activityLog.create({
//       data: {
//         userId: data.userId,
//         action: 'APPLICATION_CREATED',
//         details: `Application ${application.id} created for program ${application.program}`,
//       },
//     });

//     return maybeCallback(callback, null, application);
//   } catch (err) {
//     return maybeCallback(callback, err);
//   }
// };

// /** Update application */
// export const updateApplication = async function(id, data, userId, callback) {
//   try {
//     const application = await prisma.application.update({
//       where: { id },
//       data: {
//         program: data.program,
//         programType: data.programType,
//         academicYear: data.academicYear,
//       },
//       include: { user: { select: userSelect } },
//     });

//     await prisma.activityLog.create({
//       data: {
//         userId: userId,
//         action: 'APPLICATION_UPDATED',
//         details: `Application ${application.id} updated`,
//       },
//     });

//     return maybeCallback(callback, null, application);
//   } catch (err) {
//     return maybeCallback(callback, err);
//   }
// };

// /** Update application status */
// export const updateStatus = async function(id, status, userId, notes = '', callback) {
//   try {
//     const application = await prisma.application.update({
//       where: { id },
//       data: { status },
//       include: { user: { select: userSelect } },
//     });

//     let logDetails = `Application ${application.id} status changed to ${status}`;
//     if (notes) logDetails += `. Notes: ${notes}`;

//     await prisma.activityLog.create({
//       data: {
//         userId: userId,
//         action: `APPLICATION_${status}`,
//         details: logDetails,
//       },
//     });

//     return maybeCallback(callback, null, application);
//   } catch (err) {
//     return maybeCallback(callback, err);
//   }
// };

// /** Delete application */
// export const deleteApplication = async function(id, userId, callback) {
//   try {
//     const application = await prisma.application.delete({ where: { id } });

//     await prisma.activityLog.create({
//       data: {
//         userId: userId,
//         action: 'APPLICATION_DELETED',
//         details: `Application ${application.id} deleted`,
//       },
//     });

//     return maybeCallback(callback, null, application);
//   } catch (err) {
//     return maybeCallback(callback, err);
//   }
// };

// /** Get application statistics */
// export const getStats = async function(callback) {
//   try {
//     const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

//     const [
//       total,
//       pending,
//       review,
//       approved,
//       rejected,
//       totalThisMonth,
//       approvedThisMonth,
//     ] = await Promise.all([
//       prisma.application.count(),
//       prisma.application.count({ where: { status: 'PENDING' } }),
//       prisma.application.count({ where: { status: 'REVIEW' } }),
//       prisma.application.count({ where: { status: 'APPROVED' } }),
//       prisma.application.count({ where: { status: 'REJECTED' } }),
//       prisma.application.count({ where: { submitted: { gte: startOfMonth } } }),
//       prisma.application.count({ where: { status: 'APPROVED', submitted: { gte: startOfMonth } } }),
//     ]);

//     const result = {
//       total,
//       pending,
//       review,
//       approved,
//       rejected,
//       totalThisMonth,
//       approvedThisMonth,
//     };

//     return maybeCallback(callback, null, result);
//   } catch (err) {
//     return maybeCallback(callback, err);
//   }
// };

// /** Get applications by status */
// export const getApplicationsByStatus = async function(status, callback) {
//   try {
//     const applications = await prisma.application.findMany({
//       where: { status },
//       include: { user: { select: userSelect } },
//       orderBy: { createdAt: 'desc' },
//     });
//     return maybeCallback(callback, null, applications);
//   } catch (err) {
//     return maybeCallback(callback, err);
//   }
// };

// /** Search applications */
// export const searchApplications = async function(query, callback) {
//   try {
//     const applications = await prisma.application.findMany({
//       where: {
//         OR: [
//           { program: { contains: query, mode: 'insensitive' } },
//           { academicYear: { contains: query, mode: 'insensitive' } },
//           { user: { firstName: { contains: query, mode: 'insensitive' } } },
//           { user: { lastName: { contains: query, mode: 'insensitive' } } },
//           { id: { contains: query, mode: 'insensitive' } },
//         ],
//       },
//       include: defaultInclude,
//       orderBy: { createdAt: 'desc' },
//     });
//     return maybeCallback(callback, null, applications);
//   } catch (err) {
//     return maybeCallback(callback, err);
//   }
// };

// /** Get applications by user ID */
// export const getApplicationsByUserId = async function(userId, callback) {
//   try {
//     const applications = await prisma.application.findMany({
//       where: { userId },
//       include: {
//         user: { select: userSelect },
//         documents: { select: documentSelect },
//       },
//       orderBy: { createdAt: 'desc' },
//     });
//     return maybeCallback(callback, null, applications);
//   } catch (err) {
//     return maybeCallback(callback, err);
//   }
// };

// /** Bulk update application status */
// export const bulkUpdateStatus = async function(ids, status, userId, callback) {
//   try {
//     const result = await prisma.application.updateMany({
//       where: { id: { in: ids } },
//       data: { status },
//     });

//     const logPromises = ids.map((id) =>
//       prisma.activityLog.create({
//         data: {
//           userId: userId,
//           action: `APPLICATION_${status}_BULK`,
//           details: `Application ${id} status changed to ${status} (bulk update)`,
//         },
//       })
//     );

//     await Promise.all(logPromises);
//     return maybeCallback(callback, null, result);
//   } catch (err) {
//     return maybeCallback(callback, err);
//   }
// };

// /** Get application timeline */
// export const getApplicationTimeline = async function(applicationId, callback) {
//   try {
//     const application = await prisma.application.findUnique({
//       where: { id: applicationId },
//       include: {
//         user: { select: userSelect },
//         documents: true,
//       },
//     });

//     if (!application) return maybeCallback(callback, null, null);
//     const logs = await prisma.activityLog.findMany({
//       where: { details: { contains: applicationId } },
//       orderBy: { createdAt: 'desc' },
//       take: 20,
//     });
//     return maybeCallback(callback, null, { application, activity: logs });
//   } catch (err) {
//     return maybeCallback(callback, err);
//   }
// };


// /** Check if user has an existing application */
// export const checkExistingApplication = async function(userId, program, academicYear, callback) {
//   try {
//     const existing = await prisma.application.findFirst({
//       where: { userId, program, academicYear },
//     });
//     return maybeCallback(callback, null, !!existing);
//   } catch (err) {
//     return maybeCallback(callback, err);
//   }
// };

// /** Get application count by program type */
// export const getStatsByProgramType = async function(callback) {
//   try {
//     const stats = await prisma.application.groupBy({
//       by: ['programType'],
//       _count: { programType: true },
//     });
//     return maybeCallback(callback, null, stats);
//   } catch (err) {
//     return maybeCallback(callback, err);
//   }
// };

// /** Get application count by academic year */
// export const getStatsByAcademicYear = async function(callback) {
//   try {
//     const stats = await prisma.application.groupBy({
//       by: ['academicYear'],
//       _count: { academicYear: true },
//     });
//     return maybeCallback(callback, null, stats);
//   } catch (err) {
//     return maybeCallback(callback, err);
//   }
// };
