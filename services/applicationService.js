// services/applicationService.js
import prisma from '../config/database.js';
import { sendDecisionNotification } from './notificationService.js';

// Approve application with notification
export const approveApplication = async (applicationId, adminId, notes) => {
  try {
    // 1. Update application
    const application = await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: 'APPROVED',
        notes: notes || 'Congratulations! You have been admitted.',
        reviewedBy: adminId,
        reviewedAt: new Date()
      }
    });

    // 2. Get user
    const user = await prisma.user.findUnique({
      where: { id: application.userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // 3. Send notification (Email + SMS)
    await sendDecisionNotification(user, application);

    // 4. Log activity
    await prisma.activityLog.create({
      data: {
        userId: application.userId,
        action: 'APPLICATION_APPROVED',
        details: `Application ${application.ref} approved by admin ${adminId}`
      }
    });

    return {
      success: true,
      message: 'Application approved successfully',
      data: application
    };

  } catch (error) {
    console.error('Approve error:', error);
    return {
      success: false,
      message: 'Failed to approve application',
      error: error.message
    };
  }
};

// Reject application with notification
export const rejectApplication = async (applicationId, adminId, notes) => {
  try {
    // 1. Update application
    const application = await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: 'REJECTED',
        notes: notes || 'We regret to inform you that your application was not successful.',
        reviewedBy: adminId,
        reviewedAt: new Date()
      }
    });

    // 2. Get user
    const user = await prisma.user.findUnique({
      where: { id: application.userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // 3. Send notification (Email + SMS)
    await sendDecisionNotification(user, application);

    // 4. Log activity
    await prisma.activityLog.create({
      data: {
        userId: application.userId,
        action: 'APPLICATION_REJECTED',
        details: `Application ${application.ref} rejected by admin ${adminId}`
      }
    });

    return {
      success: true,
      message: 'Application rejected',
      data: application
    };

  } catch (error) {
    console.error('Reject error:', error);
    return {
      success: false,
      message: 'Failed to reject application',
      error: error.message
    };
  }
};

// Update application status (generic)
export const updateApplicationStatus = async (applicationId, status, adminId, notes) => {
  try {
    const validStatuses = ['PENDING', 'REVIEW', 'APPROVED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status');
    }

    // 1. Update application
    const application = await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: status,
        notes: notes || undefined,
        reviewedBy: (status === 'APPROVED' || status === 'REJECTED') ? adminId : undefined,
        reviewedAt: (status === 'APPROVED' || status === 'REJECTED') ? new Date() : undefined
      }
    });

    // 2. Get user
    const user = await prisma.user.findUnique({
      where: { id: application.userId }
    });

    // 3. Send notification for final decisions only
    if (user && (status === 'APPROVED' || status === 'REJECTED')) {
      await sendDecisionNotification(user, application);
    }

    // 4. Log activity
    await prisma.activityLog.create({
      data: {
        userId: application.userId,
        action: `APPLICATION_${status}`,
        details: `Application ${application.ref} status changed to ${status} by admin ${adminId}`
      }
    });

    return {
      success: true,
      message: `Application status updated to ${status}`,
      data: application
    };

  } catch (error) {
    console.error('Update status error:', error);
    return {
      success: false,
      message: 'Failed to update application status',
      error: error.message
    };
  }
};