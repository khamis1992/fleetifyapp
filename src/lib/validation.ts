/**
 * Input Validation Utilities
 * Uses Zod for comprehensive input validation and sanitization
 */

import { z } from 'zod';
import { securityConfig } from './security';

// Common validation schemas
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .max(securityConfig.validation.maxEmailLength, 'Email is too long')
  .email('Invalid email format')
  .toLowerCase()
  .trim();

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(securityConfig.validation.maxPasswordLength, 'Password is too long')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  );

export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name is too long')
  .regex(/^[a-zA-Z\u0600-\u06FF\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
  .trim();

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
  .optional()
  .nullable();

export const urlSchema = z
  .string()
  .url('Invalid URL format')
  .refine((url) => {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }, 'URL must use HTTP or HTTPS protocol')
  .optional()
  .nullable();

export const numberSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Invalid number format')
  .transform((val) => parseFloat(val));

export const dateSchema = z
  .string()
  .datetime('Invalid date format')
  .transform((val) => new Date(val));

// File validation schema
export const fileSchema = z.instanceof(File).refine(
  (file) => securityConfig.validation.allowedFileTypes.includes(file.type),
  `File type not allowed. Allowed types: ${securityConfig.validation.allowedFileTypes.join(', ')}`
).refine(
  (file) => file.size <= securityConfig.validation.maxFileSize,
  `File size must be less than ${securityConfig.validation.maxFileSize / 1024 / 1024}MB`
);

// Authentication schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema,
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Profile update schema
export const profileUpdateSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema,
  position: z.string().max(100, 'Position is too long').optional(),
  avatar_url: urlSchema,
});

// Contract-related schemas
export const contractCreateSchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID'),
  vehicle_id: z.string().uuid('Invalid vehicle ID'),
  start_date: dateSchema,
  end_date: dateSchema,
  monthly_rental: numberSchema,
  deposit_amount: numberSchema.optional(),
  status: z.enum(['active', 'expired', 'terminated', 'pending']),
  notes: z.string().max(1000, 'Notes are too long').optional(),
}).refine((data) => data.end_date > data.start_date, {
  message: "End date must be after start date",
  path: ["end_date"],
});

// Vehicle-related schemas
export const vehicleCreateSchema = z.object({
  plate_number: z.string()
    .min(1, 'Plate number is required')
    .max(20, 'Plate number is too long')
    .regex(/^[A-Z0-9\s-]+$/, 'Plate number can only contain uppercase letters, numbers, spaces, and hyphens')
    .trim()
    .toUpperCase(),

  make: z.string()
    .min(1, 'Make is required')
    .max(50, 'Make is too long')
    .regex(/^[a-zA-Z0-9\s-]+$/, 'Make can only contain letters, numbers, spaces, and hyphens')
    .trim(),

  model: z.string()
    .min(1, 'Model is required')
    .max(50, 'Model is too long')
    .regex(/^[a-zA-Z0-9\s-]+$/, 'Model can only contain letters, numbers, spaces, and hyphens')
    .trim(),

  year: z.number()
    .min(1900, 'Year must be at least 1900')
    .max(new Date().getFullYear() + 1, 'Year cannot be in the future'),

  color: z.string()
    .max(30, 'Color is too long')
    .regex(/^[a-zA-Z\s]+$/, 'Color can only contain letters and spaces')
    .trim(),

  vin: z.string()
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/, 'Invalid VIN format')
    .optional()
    .nullable(),
});

// Sanitization functions
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') return '';

  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';

  // Remove potentially dangerous characters
  return input
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Control characters
    .replace(/[<>]/g, '') // HTML brackets
    .trim();
}

// Validation helper function
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
} {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: { general: 'Validation failed' } };
  }
}

// Rate limiting wrapper for API calls
export async function withRateLimit<T>(
  identifier: string,
  fn: () => Promise<T>
): Promise<T> {
  const { rateLimiter } = await import('./security');

  if (!rateLimiter.isAllowed(identifier)) {
    throw new Error('Too many requests. Please try again later.');
  }

  return fn();
}

// XSS prevention for dynamic content
export function createSafeHtml(content: string): string {
  const sanitized = sanitizeHtml(content);

  // Additional sanitization for potentially dangerous patterns
  return sanitized
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/<iframe/gi, '')
    .replace(/<object/gi, '')
    .replace(/<embed/gi, '');
}

export default {
  loginSchema,
  registerSchema,
  changePasswordSchema,
  profileUpdateSchema,
  contractCreateSchema,
  vehicleCreateSchema,
  validateInput,
  sanitizeHtml,
  sanitizeInput,
  createSafeHtml,
  withRateLimit,
};