import {
  registerStudent,
  login,
  adminLogin,
  verifyPaymentCode,
  getCurrentUser,
} from '../services/authService.js';

export const register = async (req, res) => {
  const result = await registerStudent(req.body);
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.status(201).json(result);
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const result = await login(email, password);
  if (!result.success) {
    return res.status(401).json(result);
  }
  return res.status(200).json(result);
};

export const loginAdmin = async (req, res) => {
  const { email, password } = req.body;
  const result = await adminLogin(email, password);
  if (!result.success) {
    return res.status(401).json(result);
  }
  return res.status(200).json(result);
};

export const verifyPayment = async (req, res) => {
  const { code } = req.body;
  const result = await verifyPaymentCode(req.userId, code);
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.status(200).json(result);
};

export const getMe = async (req, res) => {
  const user = await getCurrentUser(req.userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  return res.status(200).json({ success: true, user });
};