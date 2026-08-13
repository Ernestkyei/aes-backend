// controllers/authController.js
import {
  registerStudent,
  login,
  adminLogin,
  verifyPaymentCode,
  getCurrentUser,
} from '../services/authService.js';

// ============================================
// REGISTER CONTROLLER
// ============================================
export const register = async (req, res) => {
  try {
    const result = await registerStudent(req.body);
    if (!result.success) {
      if (result.message === 'User with this email already exists') {
        return res.status(409).json(result);
      }
      return res.status(400).json(result);
    }
    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message,
    });
  }
};

// ============================================
// USER LOGIN CONTROLLER
// ============================================
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await login(email, password);
    if (!result.success) {
      return res.status(401).json(result);
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message,
    });
  }
};

// ============================================
// ADMIN LOGIN CONTROLLER
// ============================================
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await adminLogin(email, password);
    if (!result.success) {
      return res.status(401).json(result);
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Admin login failed',
      error: error.message,
    });
  }
};

// ============================================
// VERIFY PAYMENT CONTROLLER
// ============================================
export const verifyPayment = async (req, res) => {
  try {
    const { code } = req.body;
    const result = await verifyPaymentCode(req.userId, code);
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message,
    });
  }
};

// ============================================
// GET CURRENT USER CONTROLLER
// ============================================
export const getMe = async (req, res) => {
  try {
    const userId = req.userId; // From auth middleware
    const user = await getCurrentUser(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    
    return res.status(200).json({
      success: true,
      user: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to get user profile',
      error: error.message,
    });
  }
};