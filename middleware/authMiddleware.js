// middleware/auth.js
import { verifyToken } from "../services/authService.js";

export const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // FIX 1: "Bearer" should be a string, not a variable
    if (!authHeader || !authHeader.startsWith("Bearer")) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no token provided"
      });
    }

    // FIX 2: Properly extract token
    const token = authHeader.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, invalid token format"
      });
    }

    // FIX 3: decoded (not decode)
    const decoded = verifyToken(token);

    // FIX 4: if (!decoded) not if (!decode)
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, invalid or expired token"
      });
    }

    // FIX 5: req.userId (not req.useId)
    // FIX 6: decoded.userId (not decoded.useId)
    req.userId = decoded.userId;
    req.user = decoded; // Store full user data
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