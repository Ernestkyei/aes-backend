// src/config/rateLimiter.js
import rateLimit from 'express-rate-limit';

// ============================================
// GENERAL RATE LIMITER (Applies to all routes)
// ============================================
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// ACCESS CODE LIMITER (STRICT - For validation)
// This is for APPLICANTS validating their codes
// ============================================
export const accessCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // ONLY 5 attempts per 15 minutes!
  message: {
    success: false,
    message: 'Too many access code attempts. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = req.ip || req.connection.remoteAddress;
    const code = req.body.code || req.params.code || 'unknown';
    return `${ip}-${code}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many access code attempts. Please wait 15 minutes before trying again.',
      retryAfter: Math.ceil(15 * 60),
    });
  }
});

// ============================================
// ADMISSION LETTER DOWNLOAD LIMITER
// For applicants downloading their letters
// ============================================
export const letterDownloadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 downloads per hour per IP
  message: {
    success: false,
    message: 'Too many download attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  }
});

// ============================================
// AUTH LIMITER (For login attempts)
// For BOTH admin and applicant login
// ============================================
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per 15 minutes
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please wait 15 minutes before trying again.',
      retryAfter: Math.ceil(15 * 60),
    });
  }
});

// ============================================
// PAYMENT LIMITER
// For applicants initializing payments
// ============================================
export const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 payment initiations per hour
  message: {
    success: false,
    message: 'Too many payment attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// ADMIN DECISION LIMITER
// For admin making approval/rejection decisions
// This is the MAIN admin action!
// ============================================
export const adminDecisionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 decisions per hour (reasonable for an admin)
  message: {
    success: false,
    message: 'Decision limit reached. Please slow down your review process.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// ADMIN NOTIFICATION LIMITER
// For admin sending decision notifications
// ============================================
export const adminNotificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 notifications per hour
  message: {
    success: false,
    message: 'Notification limit reached. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// API LIMITER (For general API calls)
// ============================================
export const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // 1000 API calls per hour
  message: {
    success: false,
    message: 'API rate limit exceeded. Please slow down your requests.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// EXPORT ALL LIMITERS
// ============================================
export default {
  generalLimiter,
  accessCodeLimiter,
  letterDownloadLimiter,
  authLimiter,
  paymentLimiter,
  adminDecisionLimiter,
  adminNotificationLimiter,
  apiLimiter
};