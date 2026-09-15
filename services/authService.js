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
  return jwt.sign(
    { userId },
    JWT_CONFIG.secret,
    {
      expiresIn: JWT_CONFIG.expiresIn,
    }
  );
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_CONFIG.secret);
  } catch (error) {
    return null;
  }
};

// ============================================
// Generate Access Code
// ============================================

export const generatePaymentCode = () => {
  const year = new Date().getFullYear();

  const random1 = Math.random()
    .toString(36)
    .substring(2, 6)
    .toUpperCase();

  const random2 = Math.random()
    .toString(36)
    .substring(2, 6)
    .toUpperCase();

  return `AES-${year}-${random1}-${random2}`;
};

// ============================================
// Applicant Access Code Login
// ============================================
// They enter the access code they received
// after successful payment.

export const verifyAccessCode = async (code) => {
  try {
    if (!code) {
      return {
        success: false,
        message: 'Access code is required',
      };
    }

    const normalizedCode = code.trim().toUpperCase();
    const paymentCode = await prisma.paymentCode.findUnique({
      where: {
        code: normalizedCode,
      },

      include: {
        user: true,
        subscription: true,
      },
    });

    if (!paymentCode) {
      return {
        success: false,
        message: 'Invalid access code',
      };
    }

    if (!paymentCode.isValid) {
      return {
        success: false,
        message: 'This access code is no longer valid',
      };
    }

    if (paymentCode.expiresAt < new Date()) {
      return {
        success: false,
        message: 'This access code has expired',
      };
    }

    if (!paymentCode.subscription) {
      return {
        success: false,
        message: 'Subscription not found',
      };
    }

    if (paymentCode.subscription.paymentStatus !== 'SUCCESSFUL') {
      return {
        success: false,
        message: 'Payment has not been completed',
      };
    }

    if (!paymentCode.subscription.isValid) {
      return {
        success: false,
        message: 'This subscription is not active',
      };
    }

    if (!paymentCode.user || !paymentCode.user.isActive) {
      return {
        success: false,
        message: 'Applicant account is inactive',
      };
    }

    // Update last login
    await prisma.user.update({
      where: {
        id: paymentCode.userId,
      },

      data: {
        lastLogin: new Date(),
      },
    });

    // Record access
    await prisma.activityLog.create({
      data: {
        userId: paymentCode.userId,
        action: 'ACCESS_CODE_LOGIN',
        details: 'Applicant entered the application portal using an access code',
      },
    });

    // Create JWT for the applicant
    const token = generateToken(paymentCode.userId);

    // Get applicant application
    const application = await prisma.application.findFirst({
      where: {
        userId: paymentCode.userId,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,

      token,

      user: {
        id: paymentCode.user.id,
        email: paymentCode.user.email,
        firstName: paymentCode.user.firstName,
        lastName: paymentCode.user.lastName,
        phoneNumber: paymentCode.user.phoneNumber,
        role: paymentCode.user.role,
      },

      subscription: {
        id: paymentCode.subscription.id,
        type: paymentCode.subscription.type,
        amount: paymentCode.subscription.amount,
        currency: paymentCode.subscription.currency,
        paymentStatus: paymentCode.subscription.paymentStatus,
        isValid: paymentCode.subscription.isValid,
        validUntil: paymentCode.subscription.validUntil,
      },

      application,

      message: 'Access granted. Welcome to your application portal.',
    };

  } catch (error) {
    console.error('Access code verification error:', error);

    return {
      success: false,
      message: 'An error occurred while verifying the access code',
    };
  }
};

// ============================================
// Admin Login
// ============================================
// Admin still uses email + password.

export const adminLogin = async (email, password) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },

      include: {
        subscription: true,
      },
    });

    if (!user) {
      return {
        success: false,
        message: 'Invalid email or password',
      };
    }

    if (!user.isActive) {
      return {
        success: false,
        message: 'Account is deactivated. Please contact support.',
      };
    }

    if (user.role !== 'ADMIN') {
      return {
        success: false,
        message: 'Access denied. Admin portal only.',
      };
    }

    const isValid = await comparePassword(
      password,
      user.password
    );

    if (!isValid) {
      return {
        success: false,
        message: 'Invalid email or password',
      };
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },

      data: {
        lastLogin: new Date(),
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'ADMIN_LOGIN',
        details: 'Administrator logged into the admin portal',
      },
    });

    const token = generateToken(user.id);

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

      message: 'Admin login successful',
    };

  } catch (error) {
    console.error('Admin login error:', error);

    return {
      success: false,
      message: 'An error occurred during admin login',
    };
  }
};

// ============================================
// Get Current User
// ============================================

export const getCurrentUser = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },

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

    if (!user || !user.isActive) {
      return null;
    }

    return user;

  } catch (error) {
    console.error('Get current user error:', error);

    return null;
  }
};