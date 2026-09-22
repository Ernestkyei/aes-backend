// backend/src/services/paymentService.js

import paystack from '../config/paystack.js';
import prisma from '../config/database.js';
import { sendGeneralNotification } from './notificationService.js';


// ======================================================
// INITIALIZE PAYMENT
// ======================================================

export const initializePayment = async (email, amount, metadata = {}) => {
  try {
    const response = await paystack.initializePayment(
      email,
      amount,
      metadata
    );

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


// ======================================================
// VERIFY PAYMENT
// ======================================================
export const verifyPayment = async (reference) => {
  try {
    const response = await paystack.verifyPayment(reference);

    if (!response.status) {
      return response;
    }

    const transaction = await prisma.paymentTransaction.findUnique({
      where: { reference },
      include: {
        subscription: true,
      },
    });

    if (!transaction) {
      throw new Error('Payment transaction not found');
    }

    // ----------------------------------------------
    // PAYMENT SUCCESSFUL
    // ----------------------------------------------

    if (response.data.status === 'success') {
      // Paystack amount is in subunits.
      // Our database amount is stored in GHS.
      const expectedAmount = Math.round(
        Number(transaction.amount) * 100
      );

      const paidAmount = Number(response.data.amount);

      if (paidAmount !== expectedAmount) {
        throw new Error('Payment amount mismatch');
      }

      // Check currency
      if (response.data.currency !== transaction.currency) {
        throw new Error('Payment currency mismatch');
      }

      // Process successful payment
      const paymentResult = await handleSuccessfulPayment(
        response.data
      );

      return {
        status: true,
        message: 'Verification successful',
        data: response.data,
        accessCode: paymentResult.code,
      };
    }

    // ----------------------------------------------
    // PAYMENT NOT SUCCESSFUL
    // ----------------------------------------------

    await prisma.paymentTransaction.update({
      where: { reference },
      data: {
        status: 'FAILED',
        paidAt: response.data.paid_at
          ? new Date(response.data.paid_at)
          : null,
        responseData: JSON.stringify(response.data),
      },
    });

    return {
      status: false,
      message: `Payment status: ${response.data.status}`,
      data: response.data,
    };

  } catch (error) {
    console.error('Payment verification error:', error);
    throw error;
  }
};

// ======================================================
// HANDLE SUCCESSFUL PAYMENT
// ======================================================

export const handleSuccessfulPayment = async (paymentData) => {
  try {

    const transaction = await prisma.paymentTransaction.findUnique({
      where: {
        reference: paymentData.reference,
      },
      include: {
        subscription: true,
        user: true,
      },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }


    // ----------------------------------------------
    // SECURITY CHECKS
    // ----------------------------------------------

    const expectedAmount = Math.round(
      Number(transaction.amount) * 100
    );

    const paidAmount = Number(paymentData.amount);

    if (paidAmount !== expectedAmount) {
      throw new Error('Payment amount mismatch');
    }

    if (paymentData.currency !== transaction.currency) {
      throw new Error('Payment currency mismatch');
    }


    // ----------------------------------------------
    // CHECK IF ALREADY PROCESSED
    // ----------------------------------------------

    const existingCode = await prisma.paymentCode.findUnique({
      where: {
        subscriptionId: transaction.subscriptionId,
      },
    });


    if (
      transaction.status === 'SUCCESSFUL' &&
      transaction.subscription?.paymentStatus === 'SUCCESSFUL' &&
      existingCode
    ) {

      console.log(
        `Payment ${paymentData.reference} has already been processed.`
      );

      return {
        code: existingCode.code,
        user: transaction.user,
        alreadyProcessed: true,
      };
    }


    // ----------------------------------------------
    // CREATE ACCESS CODE + ACTIVATE SUBSCRIPTION
    // ATOMIC DATABASE TRANSACTION
    // ----------------------------------------------

    const result = await prisma.$transaction(async (tx) => {

      // Check one more time inside transaction
      // to protect against simultaneous webhook + verify calls.

      const existingPaymentCode =
        await tx.paymentCode.findUnique({
          where: {
            subscriptionId: transaction.subscriptionId,
          },
        });


      if (existingPaymentCode) {

        return {
          code: existingPaymentCode.code,
          alreadyProcessed: true,
        };
      }


      // Generate AES access code
      const code = generateAccessCode();

      const validUntil = new Date();
      validUntil.setFullYear(
        validUntil.getFullYear() + 1
      );


      // Create payment code
      await tx.paymentCode.create({
        data: {
          code,
          userId: transaction.userId,
          subscriptionId: transaction.subscriptionId,
          isValid: true,
          expiresAt: validUntil,
        },
      });


      // Update subscription
      await tx.subscription.update({
        where: {
          id: transaction.subscriptionId,
        },
        data: {
          isValid: true,
          validUntil,
          paymentStatus: 'SUCCESSFUL',
          paidAt: paymentData.paid_at
            ? new Date(paymentData.paid_at)
            : new Date(),
          paymentCode: code,
        },
      });


      // Update payment transaction
      await tx.paymentTransaction.update({
        where: {
          reference: paymentData.reference,
        },
        data: {
          status: 'SUCCESSFUL',
          paidAt: paymentData.paid_at
            ? new Date(paymentData.paid_at)
            : new Date(),
          responseData: JSON.stringify(paymentData),
        },
      });


      return {
        code,
        alreadyProcessed: false,
      };
    });


    // ----------------------------------------------
    // IF ALREADY PROCESSED
    // ----------------------------------------------

    if (result.alreadyProcessed) {

      return {
        code: result.code,
        user: transaction.user,
        alreadyProcessed: true,
      };
    }


    // ----------------------------------------------
    // SEND ACCESS CODE EMAIL
    // ----------------------------------------------

    const subject = 'Your AES Access Code';

    const message = `
Hello ${transaction.user.firstName},

Your payment has been successfully completed.

Your AES access code is:

${result.code}

Use this access code to enter your application portal.

Keep this code safe.

Thank you.
`;


    await sendGeneralNotification(
      transaction.user,
      subject,
      message
    );


    return {
      code: result.code,
      user: transaction.user,
      alreadyProcessed: false,
    };

  } catch (error) {
    console.error(
      'Handle successful payment error:',
      error
    );

    throw error;
  }
};


// ======================================================
// GENERATE AES ACCESS CODE
// ======================================================

export const generateAccessCode = () => {
  const year = new Date().getFullYear();

  const random = Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();

  return `AES-${year}-${random}`;
};


// ======================================================
// HANDLE FAILED PAYMENT
// ======================================================

export const handleFailedPayment = async (paymentData) => {
  try {

    const { reference } = paymentData;

    const transaction =
      await prisma.paymentTransaction.update({
        where: {
          reference,
        },
        data: {
          status: 'FAILED',
          responseData: JSON.stringify(paymentData),
          paidAt: paymentData.paid_at
            ? new Date(paymentData.paid_at)
            : null,
        },
      });

    return transaction;

  } catch (error) {
    console.error(
      'Handle failed payment error:',
      error
    );

    throw error;
  }
};


// ======================================================
// HANDLE PENDING PAYMENT
// ======================================================

export const handlePendingPayment = async (paymentData) => {
  try {

    const { reference } = paymentData;

    const transaction =
      await prisma.paymentTransaction.update({
        where: {
          reference,
        },
        data: {
          status: 'PENDING',
          responseData: JSON.stringify(paymentData),
        },
      });

    return transaction;

  } catch (error) {
    console.error(
      'Handle pending payment error:',
      error
    );

    throw error;
  }
};


// ======================================================
// ADMIN - GET PAYMENTS
// ======================================================

export const getAdminPayments = async (
  page = 1,
  limit = 20,
  filters = {}
) => {

  const where = {};

  if (filters.status) {
    where.status = filters.status.toUpperCase();
  }


  if (filters.startDate || filters.endDate) {

    where.createdAt = {};

    if (filters.startDate) {
      where.createdAt.gte =
        new Date(filters.startDate);
    }

    if (filters.endDate) {
      where.createdAt.lte =
        new Date(filters.endDate);
    }
  }


  const total =
    await prisma.paymentTransaction.count({
      where,
    });


  const data =
    await prisma.paymentTransaction.findMany({
      where,

      skip: (page - 1) * limit,

      take: limit,

      orderBy: {
        createdAt: 'desc',
      },

      include: {
        user: true,
        subscription: true,
      },
    });


  const totalPages = Math.ceil(
    total / limit
  );


  return {
    data,

    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  };
};


// ======================================================
// PAYMENT STATISTICS
// ======================================================

export const getPaymentStats = async () => {

  const total =
    await prisma.paymentTransaction.count();


  const successful =
    await prisma.paymentTransaction.count({
      where: {
        status: 'SUCCESSFUL',
      },
    });


  const failed =
    await prisma.paymentTransaction.count({
      where: {
        status: 'FAILED',
      },
    });


  const pending =
    await prisma.paymentTransaction.count({
      where: {
        status: 'PENDING',
      },
    });


  const sumResult =
    await prisma.paymentTransaction.aggregate({
      _sum: {
        amount: true,
      },

      where: {
        status: 'SUCCESSFUL',
      },
    });


  return {
    total,
    successful,
    failed,
    pending,
    totalAmountSuccess:
      sumResult._sum.amount || 0,
  };
};


// ======================================================
// GET PAYMENT BY ID
// ======================================================

export const getPaymentById = async (id) => {

  return prisma.paymentTransaction.findUnique({
    where: {
      id,
    },

    include: {
      user: true,
      subscription: true,
    },
  });
};


// ======================================================
// GET PAYMENTS BY USER
// ======================================================

export const getPaymentsByUser = async (userId) => {

  return prisma.paymentTransaction.findMany({
    where: {
      userId,
    },

    orderBy: {
      createdAt: 'desc',
    },

    include: {
      subscription: true,
    },
  });
};


// ======================================================
// GET MY PAYMENTS
// ======================================================

export const getMyPayments = async (userId) => {
  return getPaymentsByUser(userId);
};