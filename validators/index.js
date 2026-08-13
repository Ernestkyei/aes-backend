// validators/index.js

// ============================================
// ADMIN LOGIN VALIDATION
// ============================================

export const adminLoginSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .min(1, 'Email is required'),
  
  password: z.string()
    .min(1, 'Password is required'),
});

// ============================================
// VERIFY PAYMENT VALIDATION
// ============================================

export const verifyPaymentSchema = z.object({
  reference: z.string()
    .min(1, 'Payment reference is required'),
  
  amount: z.number()
    .min(0.01, 'Amount must be greater than 0')
    .optional(),
  
  transactionId: z.string()
    .optional(),
});

// ============================================
// UPDATE PROFILE VALIDATION (Optional)
// ============================================

export const updateProfileSchema = z.object({
  firstName: z.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'First name can only contain letters and spaces')
    .optional(),
  
  lastName: z.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Last name can only contain letters and spaces')
    .optional(),
  
  phoneNumber: z.string()
    .regex(/^[0-9]{10,15}$/, 'Phone number must be 10-15 digits')
    .optional(),
});