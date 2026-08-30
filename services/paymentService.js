// backend/src/services/paymentService.js
import paystack from '../config/paystack.js';
import prisma from '../config/database.js';
import { sendGeneralNotification } from './notificationService.js';

export const initializePayment = async (email, amount, metadata = {}) => {
  try {
    const response = await paystack.initializePayment(email, amount, metadata);
    if (response.status) {
      await prisma.paymentTransaction.create({
        data: {
          userId: metadata.userId,
          subscriptionId: metadata.subscriptionId,
          provider: 'PAYSTACK',
          reference: response.data.reference,
          amount,
          currency: 'GHS',
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          responseData: JSON.stringify(response.data),
        },
      });
    }

    return response;
  } catch (error) {
    console.error('Payment initialization error:', error);
    throw error;
  }
};

export const verifyPayment = async (reference) => {
  try {
    const response = await paystack.verifyPayment(reference);

    if (response.status) {
      await prisma.paymentTransaction.update({
        where: { reference },
        data: {
          status: response.data.status === 'success' ? 'SUCCESSFUL' : 'FAILED',
          paidAt: response.data.paid_at ? new Date(response.data.paid_at) : null,
          responseData: JSON.stringify(response.data),
        },
      });

      if (response.data.status === 'success') {
        await handleSuccessfulPayment(response.data);
      }
    }

    return response;
  } catch (error) {
    console.error('Payment verification error:', error);
    throw error;
  }
};

export const handleSuccessfulPayment = async (paymentData) => {
  const transaction = await prisma.paymentTransaction.findUnique({
    where: { reference: paymentData.reference },
    include: { subscription: true },
  });

  if (!transaction) {
    throw new Error('Transaction not found');
  }

  const code = generateAccessCode();

  await prisma.paymentCode.create({
    data: {
      code,
      userId: transaction.userId,
      subscriptionId: transaction.subscriptionId,
      isValid: true,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.subscription.update({
    where: { id: transaction.subscriptionId },
    data: {
      isValid: true,
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      paymentStatus: 'SUCCESSFUL',
      paidAt: new Date(),
      paymentCode: code,
    },
  });

  const user = await prisma.user.findUnique({ where: { id: transaction.userId } });

  const subject = 'Your Access Code';
  const message = `Hello ${user.firstName},\n\nYour access code is: ${code}\n\nUse this code to access your subscription.`;

  await sendGeneralNotification(user, subject, message);

  return { code, user };
};

export const generateAccessCode = () => {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `AES-${year}-${random}`;
};

export const handleFailedPayment = async (paymentData) => {
  const { reference } = paymentData;
  const transaction = await prisma.paymentTransaction.update({
    where: { reference },
    data: {
      status: 'FAILED',
      responseData: JSON.stringify(paymentData),
      paidAt: paymentData.paid_at ? new Date(paymentData.paid_at) : null,
    },
  });

  return transaction;
};

export const handlePendingPayment = async (paymentData) => {
  const { reference } = paymentData;
  const transaction = await prisma.paymentTransaction.update({
    where: { reference },
    data: {
      status: 'PENDING',
      responseData: JSON.stringify(paymentData),
    },
  });

  return transaction;
};

export const getAdminPayments = async (page = 1, limit = 20, filters = {}) => {
  const where = {};

  if (filters.status) {
    where.status = filters.status.toUpperCase();
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
    if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
  }

  const total = await prisma.paymentTransaction.count({ where });

  const data = await prisma.paymentTransaction.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: { user: true, subscription: true },
  });

  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: { total, page, limit, totalPages },
  };
};

export const getPaymentStats = async () => {
  const total = await prisma.paymentTransaction.count();
  const successful = await prisma.paymentTransaction.count({ where: { status: 'SUCCESSFUL' } });
  const failed = await prisma.paymentTransaction.count({ where: { status: 'FAILED' } });
  const pending = await prisma.paymentTransaction.count({ where: { status: 'PENDING' } });

  const sumResult = await prisma.paymentTransaction.aggregate({ _sum: { amount: true }, where: { status: 'SUCCESSFUL' } });

  return {
    total,
    successful,
    failed,
    pending,
    totalAmountSuccess: sumResult._sum.amount || 0,
  };
};

export const getPaymentById = async (id) => {
  return prisma.paymentTransaction.findUnique({ where: { id }, include: { user: true, subscription: true } });
};

export const getPaymentsByUser = async (userId) => {
  return prisma.paymentTransaction.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, include: { subscription: true } });
};

export const getMyPayments = async (userId) => {
  return getPaymentsByUser(userId);
};