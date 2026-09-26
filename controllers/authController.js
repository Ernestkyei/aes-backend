import {
  verifyAccessCode,
  adminLogin,
  getCurrentUser,
} from '../services/authService.js';


// Applicant Access Code Login
export const accessCodeLogin = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Access code is required',
      });
    }

    const result = await verifyAccessCode(code);
    if (!result.success) {
      return res.status(401).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Access code login controller error:', error);

    return res.status(500).json({
      success: false,
      message: 'An error occurred while logging in',
    });
  }
};


// Admin Login
export const adminLoginController = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const result = await adminLogin(email, password);

    if (!result.success) {
      return res.status(401).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Admin login controller error:', error);

    return res.status(500).json({
      success: false,
      message: 'An error occurred during admin login',
    });
  }
};


// Get Current User
export const getMe = async (req, res) => {
  try {
    const user = await getCurrentUser(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Get current user controller error:', error);

    return res.status(500).json({
      success: false,
      message: 'An error occurred while getting current user',
    });
  }
};