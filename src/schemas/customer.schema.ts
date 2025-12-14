import { z } from 'zod';

// Customer validation schemas
export const baseCustomerSchema = z.object({
  customer_type: z.enum(['individual', 'corporate'], {
    required_error: 'نوع العميل مطلوب',
  }),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  first_name_ar: z.string().optional(),
  last_name_ar: z.string().optional(),
  company_name: z.string().optional(),
  company_name_ar: z.string().optional(),
  phone: z.string().min(1, 'رقم الهاتف مطلوب'),
  email: z.string().email('البريد الإلكتروني غير صحيح').optional().or(z.literal('')),
  national_id: z.string().optional(),
  passport_number: z.string().optional(),
  license_number: z.string().optional(),
  date_of_birth: z.date().optional(),
  national_id_expiry: z.date().optional(),
  license_expiry: z.date().optional(),
  credit_limit: z.number().min(0, 'حد الائتمان يجب أن يكون موجباً').optional(),
  notes: z.string().optional(),
});

// Customer creation schema with enhanced validation
export const createCustomerSchema = baseCustomerSchema.extend({
  customer_code: z.string().optional(),
  force_create: z.boolean().default(false),
  context: z.enum(['standalone', 'contract', 'invoice', 'maintenance']).optional(),
}).refine(
  (data) => {
    if (data.customer_type === 'individual') {
      return data.first_name && data.last_name;
    }
    return data.company_name;
  },
  {
    message: 'البيانات الأساسية مطلوبة حسب نوع العميل',
    path: ['customer_type']
  }
).refine(
  (data) => {
    // Validate that birth date is not in the future and not too old
    if (data.date_of_birth) {
      const today = new Date();
      const birthDate = data.date_of_birth;
      const age = today.getFullYear() - birthDate.getFullYear();
      return birthDate <= today && age <= 120;
    }
    return true;
  },
  {
    message: 'تاريخ الميلاد غير صحيح',
    path: ['date_of_birth']
  }
);

// Customer update schema
export const updateCustomerSchema = baseCustomerSchema.partial().extend({
  id: z.string().uuid('معرف العميل غير صحيح'),
});

// Customer duplicate check data
export const customerDuplicateCheckSchema = z.object({
  customer_type: z.enum(['individual', 'corporate']),
  national_id: z.string().optional(),
  passport_number: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  company_name: z.string().optional(),
});

// Type exports for customer schemas
export type BaseCustomerData = z.infer<typeof baseCustomerSchema>;
export type CreateCustomerData = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerData = z.infer<typeof updateCustomerSchema>;
export type CustomerDuplicateCheckData = z.infer<typeof customerDuplicateCheckSchema>;