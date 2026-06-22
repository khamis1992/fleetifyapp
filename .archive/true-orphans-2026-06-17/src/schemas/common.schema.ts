import { z } from 'zod';

// Common validation schemas used across the system

// Contact information schema
export const contactInfoSchema = z.object({
  phone: z.string().min(1, 'رقم الهاتف مطلوب'),
  email: z.string().email('البريد الإلكتروني غير صحيح').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().default('Kuwait'),
});

// Address schema
export const addressSchema = z.object({
  street: z.string().optional(),
  area: z.string().optional(),
  block: z.string().optional(),
  building: z.string().optional(),
  floor: z.string().optional(),
  apartment: z.string().optional(),
  city: z.string().optional(),
  governorate: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().default('Kuwait'),
  is_primary: z.boolean().default(false),
});

// Document schema for attachments
export const documentSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'اسم المستند مطلوب'),
  file_path: z.string().min(1, 'مسار الملف مطلوب'),
  file_type: z.string().optional(),
  file_size: z.number().min(0).optional(),
  description: z.string().optional(),
  document_type: z.enum([
    'national_id',
    'passport',
    'license',
    'contract',
    'invoice',
    'receipt',
    'insurance',
    'registration',
    'other'
  ]).optional(),
  expiry_date: z.date().optional(),
  is_required: z.boolean().default(false),
  uploaded_at: z.date().default(() => new Date()),
  uploaded_by: z.string().uuid().optional(),
});

// Currency schema
export const currencySchema = z.object({
  code: z.enum(['QAR', 'KWD', 'USD', 'EUR', 'SAR', 'AED']).default('QAR'),
  symbol: z.string().optional(),
  exchange_rate: z.number().min(0).default(1),
});

// Audit trail schema
export const auditTrailSchema = z.object({
  created_at: z.date().default(() => new Date()),
  created_by: z.string().uuid(),
  updated_at: z.date().optional(),
  updated_by: z.string().uuid().optional(),
  deleted_at: z.date().optional(),
  deleted_by: z.string().uuid().optional(),
  is_deleted: z.boolean().default(false),
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).optional(),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

// Filter schema for list queries
export const filterSchema = z.object({
  search: z.string().optional(),
  start_date: z.date().optional(),
  end_date: z.date().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  is_active: z.boolean().optional(),
  company_id: z.string().uuid().optional(),
});

// Response schema for API responses
export const apiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.any().optional(),
  error: z.string().optional(),
  errors: z.array(z.string()).optional(),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    pages: z.number(),
  }).optional(),
});

// Validation error schema
export const validationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  code: z.string().optional(),
});

// Date range schema
export const dateRangeSchema = z.object({
  start_date: z.date(),
  end_date: z.date(),
}).refine(
  (data) => data.end_date >= data.start_date,
  {
    message: 'تاريخ النهاية يجب أن يكون بعد أو يساوي تاريخ البداية',
    path: ['end_date']
  }
);

// Money amount schema with currency support
export const moneyAmountSchema = z.object({
  amount: z.number().min(0, 'المبلغ يجب أن يكون موجباً'),
  currency: z.string().default('QAR'),
  exchange_rate: z.number().min(0).default(1),
  base_amount: z.number().min(0).optional(), // Amount in base currency
});

// Status schema for common entity states
export const statusSchema = z.enum([
  'draft',
  'pending',
  'active', 
  'inactive',
  'suspended',
  'cancelled',
  'completed',
  'expired',
  'archived'
]);

// Priority schema
export const prioritySchema = z.enum([
  'low',
  'normal', 
  'high',
  'urgent',
  'critical'
]).default('normal');

// Type exports for common schemas
export type ContactInfo = z.infer<typeof contactInfoSchema>;
export type Address = z.infer<typeof addressSchema>;
export type Document = z.infer<typeof documentSchema>;
export type Currency = z.infer<typeof currencySchema>;
export type AuditTrail = z.infer<typeof auditTrailSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
export type Filter = z.infer<typeof filterSchema>;
export type ApiResponse = z.infer<typeof apiResponseSchema>;
export type ValidationError = z.infer<typeof validationErrorSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;
export type MoneyAmount = z.infer<typeof moneyAmountSchema>;
export type Status = z.infer<typeof statusSchema>;
export type Priority = z.infer<typeof prioritySchema>;