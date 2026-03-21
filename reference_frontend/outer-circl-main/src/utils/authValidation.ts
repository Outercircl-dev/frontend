import { z } from 'zod';

/**
 * Zod schemas for authentication form validation
 * Provides comprehensive input validation to prevent injection attacks
 */

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase(),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password must be less than 128 characters'),
});

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
    .toLowerCase(),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
  gender: z
    .string()
    .min(1, 'Gender selection is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * Sanitize text input to prevent XSS
 * Strips HTML tags and encodes special characters
 */
export const sanitizeText = (input: string): string => {
  if (!input) return '';
  
  // Remove HTML tags
  const withoutTags = input.replace(/<[^>]*>/g, '');
  
  // Encode special characters
  const textarea = document.createElement('textarea');
  textarea.textContent = withoutTags;
  
  return textarea.innerHTML.trim();
};

/**
 * Validate and sanitize email input
 */
export const validateEmail = (email: string): { valid: boolean; sanitized: string; error?: string } => {
  // Create standalone email schema
  const emailSchema = z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase();
  
  const result = emailSchema.safeParse(email);
  
  if (!result.success) {
    return {
      valid: false,
      sanitized: '',
      error: result.error.errors[0]?.message || 'Invalid email',
    };
  }
  
  return {
    valid: true,
    sanitized: result.data,
  };
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string): { valid: boolean; error?: string; strength: 'weak' | 'medium' | 'strong' } => {
  // Create a standalone password schema for validation
  const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number');
  
  const result = passwordSchema.safeParse(password);
  
  if (!result.success) {
    return {
      valid: false,
      error: result.error.errors[0]?.message || 'Invalid password',
      strength: 'weak',
    };
  }
  
  // Check password strength
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const length = password.length;
  
  const criteria = [hasUpperCase, hasLowerCase, hasNumber, hasSpecial].filter(Boolean).length;
  
  if (length >= 12 && criteria >= 3) {
    strength = 'strong';
  } else if (length >= 8 && criteria >= 2) {
    strength = 'medium';
  }
  
  return {
    valid: true,
    strength,
  };
};
