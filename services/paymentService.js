// backend/src/services/paymentService.js
import paystack from '../config/paystack.js';
import prisma from '../config/database.js';

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

  const user = await prisma.user.findUnique({
    where: { id: transaction.userId },
  });

  await sendAccessCodeEmail(user.email, code, user.firstName);
  await sendAccessCodeSMS(user.phoneNumber, code);

  return { code, user };
};

export const generateAccessCode = () => {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `AES-${year}-${random}`;
};