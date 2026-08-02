import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import { JWT_CONFIG } from '../config/jwt.js';

// ============================================
// Helper Functions
// ============================================

export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

export const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_CONFIG.secret, { 
    expiresIn: JWT_CONFIG.expiresIn 
  });
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_CONFIG.secret);
  } catch (error) {
    return null;
  }
};

export const generatePaymentCode = () => {
  const year = new Date().getFullYear();
  const random1 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const random2 = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `AES-${year}-${random1}-${random2}`;
};

// ============================================
// Register Student
// ============================================
export const registerStudent = async (userData) => {
  try {
    const { email, password, firstName, lastName, phoneNumber, subscriptionType } = userData;

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return { 
        success: false, 
        message: 'User with this email already exists' 
      };
    }

    const pricing = {
      UNDERGRADUATE: 100,
      POSTGRADUATE: 150,
      INTERNATIONAL: 200,
    };

    const hashedPassword = await hashPassword(password);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          firstName,
          lastName,
          phoneNumber,
          role: 'APPLICANT',
          isActive: true,
        },
      });

      const subscription = await tx.subscription.create({
        data: {
          userId: user.id,
          type: subscriptionType,
          amount: pricing[subscriptionType],
          currency: 'GHS',
          paymentStatus: 'PENDING',
          isValid: false,
        },
      });

      const paymentCode = await tx.paymentCode.create({
        data: {
          code: generatePaymentCode(),
          userId: user.id,
          subscriptionId: subscription.id,
          isValid: true,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      await tx.subscription.update({
        where: { id: subscription.id },
        data: { paymentCode: paymentCode.code },
      });

      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: 'REGISTER',
          details: `Student registered with ${subscriptionType} subscription`,
        },
      });

      return { user, subscription, paymentCode };
    });

    const token = generateToken(result.user.id);

    return {
      success: true,
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
      },
      subscription: {
        id: result.subscription.id,
        type: result.subscription.type,
        amount: result.subscription.amount,
        paymentStatus: result.subscription.paymentStatus,
        paymentCode: result.paymentCode.code,
      },
      paymentCode: result.paymentCode.code,
      message: 'Registration successful! Please complete payment to activate your account.',
    };
  } catch (error) {
    console.error('Registration error:', error);
    return { 
      success: false, 
      message: 'An error occurred during registration' 
    };
  }
};

// ============================================
// Login
// ============================================
export const login = async (email, password) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        subscription: true,
      },
    });

    if (!user) {
      return { success: false, message: 'Invalid email or password' };
    }

    if (!user.isActive) {
      return { 
        success: false, 
        message: 'Account is deactivated. Please contact support.' 
      };
    }

    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      return { success: false, message: 'Invalid email or password' };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        details: `User logged in with role: ${user.role}`,
      },
    });

    const token = generateToken(user.id);

    let needsPayment = false;
    let needsVerification = false;
    let dashboardStep = 'dashboard';

    if (user.role === 'APPLICANT') {
      if (!user.subscription || user.subscription.paymentStatus === 'PENDING') {
        needsPayment = true;
        dashboardStep = 'payment';
      } else if (user.subscription.paymentStatus === 'PAID' && !user.subscription.isValid) {
        needsVerification = true;
        dashboardStep = 'verify-payment';
      } else if (user.subscription.isValid) {
        dashboardStep = 'dashboard';
      }
    }

    return {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      subscription: user.subscription,
      needsPayment,
      needsVerification,
      dashboardStep,
    };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, message: 'An error occurred during login' };
  }
};

// ============================================
// Admin Login
// ============================================
export const adminLogin = async (email, password) => {
  const result = await login(email, password);
  if (!result.success) return result;

  if (result.user.role !== 'ADMIN') {
    return {
      success: false,
      message: 'Access denied. Admin portal only.',
    };
  }

  return result;
};

// ============================================
// Verify Payment Code
// ============================================
export const verifyPaymentCode = async (userId, code) => {
  try {
    const paymentCode = await prisma.paymentCode.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        user: true,
        subscription: true,
      },
    });

    if (!paymentCode) {
      return { 
        success: false, 
        message: 'Invalid payment code' 
      };
    }

    if (paymentCode.userId !== userId) {
      return { 
        success: false, 
        message: 'This payment code does not belong to you' 
      };
    }

    if (!paymentCode.isValid) {
      return { 
        success: false, 
        message: 'This payment code has already been used' 
      };
    }

    if (paymentCode.expiresAt < new Date()) {
      return { 
        success: false, 
        message: 'This payment code has expired' 
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.paymentCode.update({
        where: { id: paymentCode.id },
        data: {
          isValid: false,
          usedAt: new Date(),
        },
      });

      await tx.subscription.update({
        where: { id: paymentCode.subscriptionId },
        data: {
          isValid: true,
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });

      await tx.activityLog.create({
        data: {
          userId: userId,
          action: 'VERIFY_CODE',
          details: `Payment code ${code} verified successfully`,
        },
      });
    });

    return {
      success: true,
      message: 'Payment code verified successfully! You can now access all features.',
    };
  } catch (error) {
    console.error('Verify payment code error:', error);
    return { 
      success: false, 
      message: 'An error occurred while verifying your payment code' 
    };
  }
};

// ============================================
// Get Current User
// ============================================
export const getCurrentUser = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true,
        applications: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
        documents: {
          where: {
            applicationId: null,
          },
        },
        _count: {
          select: {
            applications: true,
            documents: true,
          },
        },
      },
    });

    if (!user || !user.isActive) return null;

    return user;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
};