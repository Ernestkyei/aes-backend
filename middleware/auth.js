// middleware/auth.js
import { verifyToken } from "../services/authService.js";

export const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Check if token exists
    if (!authHeader || !authHeader.startsWith("Bearer")) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no token provided"
      });
    }

    // Extract token
    const token = authHeader.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, invalid token format"
      });
    }

    // Verify token
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, invalid or expired token"
      });
    }

    // Attach user to request
    req.userId = decoded.userId;
    req.user = decoded;
    next();

  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: "Not authorized, authentication failed"
    });
  }
};

// Admin middleware
export const admin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin only."
    });
  }
  next();
};

// Export both middleware
export const authMiddleware = protect;
export const adminMiddleware = admin;