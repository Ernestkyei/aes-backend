// middleware/validation.js
import { z } from 'zod';

// ============================================
// VALIDATE REQUEST BODY
// ============================================
export const validate = (schema) => {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        }));
        
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors,
        });
      }
      next(error);
    }
  };
};

// ============================================
// VALIDATE QUERY PARAMETERS
// ============================================
export const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse(req.query);
      req.query = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        }));
        
        return res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: errors,
        });
      }
      next(error);
    }
  };
};

// ============================================
// VALIDATE URL PARAMETERS
// ============================================
export const validateParams = (schema) => {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse(req.params);
      req.params = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        }));
        
        return res.status(400).json({
          success: false,
          message: 'Invalid parameters',
          errors: errors,
        });
      }
      next(error);
    }
  };
};

// ============================================
// EXPORT ALL
// ============================================
export default {
  validate,
  validateQuery,
  validateParams,
};