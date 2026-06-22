/**
 * Unified Validation Schemas
 * Centralized Zod schemas for consistent validation across the app
 * All error messages are in Arabic
 */

import { z } from 'zod';

// ========== Common Field Validators ==========

/**
 * Required string with minimum length
 */
export const requiredString = (fieldName: string, minLength = 1) =>
  z.string({
    required_error: `${fieldName} مطلوب`,
    invalid_type_error: `${fieldName} يجب أن يكون نصاً`,
  }).min(minLength, `${fieldName} يجب أن يكون ${minLength} أحرف على الأقل`);

/**
 * Optional string
 */
export const optionalString = () => z.string().optional().or(z.literal(''));

/**
 * Email validation
 */
export const email = z
  .string()
  .email('البريد الإلكتروني غير صحيح')
  .optional()
  .or(z.literal(''));

/**
 * Phone number validation (Qatar format)
 */
export const phone = z
  .string()
  .regex(/^(\+974)?[0-9]{8}$/, 'رقم الهاتف غير صحيح')
  .optional()
  .or(z.literal(''));

/**
 * Required phone
 */
export const requiredPhone = z
  .string({ required_error: 'رقم الهاتف مطلوب' })
  .min(8, 'رقم الهاتف يجب أن يكون 8 أرقام على الأقل');

/**
 * National ID validation
 */
export const nationalId = z
  .string()
  .min(5, 'الرقم الشخصي يجب أن يكون 5 أرقام على الأقل')
  .optional()
  .or(z.literal(''));

/**
 * Required national ID
 */
export const requiredNationalId = z
  .string({ required_error: 'الرقم الشخصي مطلوب' })
  .min(5, 'الرقم الشخصي يجب أن يكون 5 أرقام على الأقل');

/**
 * Positive number
 */
export const positiveNumber = (fieldName: string) =>
  z.number({
    required_error: `${fieldName} مطلوب`,
    invalid_type_error: `${fieldName} يجب أن يكون رقماً`,
  }).positive(`${fieldName} يجب أن يكون أكبر من صفر`);

/**
 * Non-negative number
 */
export const nonNegativeNumber = (fieldName: string) =>
  z.number({
    required_error: `${fieldName} مطلوب`,
    invalid_type_error: `${fieldName} يجب أن يكون رقماً`,
  }).min(0, `${fieldName} لا يمكن أن يكون سالباً`);

/**
 * Date string (ISO format)
 */
export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'التاريخ يجب أن يكون بصيغة YYYY-MM-DD');

/**
 * Required date
 */
export const requiredDate = (fieldName: string) =>
  z.string({
    required_error: `${fieldName} مطلوب`,
  }).regex(/^\d{4}-\d{2}-\d{2}$/, 'التاريخ يجب أن يكون بصيغة YYYY-MM-DD');

/**
 * UUID validation
 */
export const uuid = z.string().uuid('المعرف غير صحيح');

/**
 * Optional UUID
 */
export const optionalUuid = z.string().uuid('المعرف غير صحيح').optional().or(z.literal(''));

// ========== Customer Schema ==========

export const customerSchema = z.object({
  full_name: requiredString('اسم العميل', 2),
  full_name_ar: optionalString(),
  phone: requiredPhone,
  email: email,
  national_id: requiredNationalId,
  address: optionalString(),
  city: optionalString(),
  country: z.string().default('Qatar'),
  license_number: optionalString(),
  license_expiry: dateString.optional(),
  status: z.enum(['active', 'inactive', 'blocked']).default('active'),
  notes: optionalString(),
  company_id: uuid,
});

export type CustomerFormData = z.infer<typeof customerSchema>;

// Quick customer (minimal fields)
export const quickCustomerSchema = z.object({
  full_name: requiredString('اسم العميل', 2),
  phone: requiredPhone,
  national_id: requiredNationalId,
});

export type QuickCustomerFormData = z.infer<typeof quickCustomerSchema>;

// ========== Vehicle Schema ==========

export const vehicleSchema = z.object({
  plate_number: requiredString('رقم اللوحة', 2),
  make: requiredString('الشركة المصنعة', 2),
  model: requiredString('الموديل', 1),
  year: z.number()
    .min(1900, 'سنة الصنع غير صحيحة')
    .max(new Date().getFullYear() + 1, 'سنة الصنع غير صحيحة'),
  color: optionalString(),
  vin: optionalString(),
  registration_expiry: dateString.optional(),
  insurance_expiry: dateString.optional(),
  daily_rate: nonNegativeNumber('السعر اليومي').optional(),
  weekly_rate: nonNegativeNumber('السعر الأسبوعي').optional(),
  monthly_rate: nonNegativeNumber('السعر الشهري').optional(),
  status: z.enum(['available', 'rented', 'maintenance', 'reserved', 'sold']).default('available'),
  mileage: nonNegativeNumber('عداد المسافات').optional(),
  fuel_type: z.enum(['petrol', 'diesel', 'electric', 'hybrid']).optional(),
  transmission: z.enum(['automatic', 'manual']).optional(),
  seats: z.number().min(1).max(50).optional(),
  notes: optionalString(),
  company_id: uuid,
});

export type VehicleFormData = z.infer<typeof vehicleSchema>;

// ========== Contract Schema ==========

export const contractSchema = z.object({
  contract_number: optionalString(),
  customer_id: uuid,
  vehicle_id: optionalUuid,
  contract_type: z.enum(['daily', 'weekly', 'monthly', 'yearly', 'open']),
  start_date: requiredDate('تاريخ البداية'),
  end_date: requiredDate('تاريخ النهاية'),
  contract_amount: positiveNumber('مبلغ العقد'),
  daily_rate: nonNegativeNumber('السعر اليومي').optional(),
  security_deposit: nonNegativeNumber('مبلغ الضمان').optional(),
  late_fee_per_day: nonNegativeNumber('غرامة التأخير اليومية').optional(),
  km_limit: nonNegativeNumber('حد الكيلومترات').optional(),
  extra_km_fee: nonNegativeNumber('رسوم الكيلومتر الإضافي').optional(),
  payment_method: z.enum(['cash', 'card', 'bank_transfer', 'cheque']).optional(),
  status: z.enum(['draft', 'active', 'completed', 'cancelled', 'expired']).default('draft'),
  notes: optionalString(),
  company_id: uuid,
}).refine(
  (data) => new Date(data.end_date) > new Date(data.start_date),
  {
    message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية',
    path: ['end_date'],
  }
);

export type ContractFormData = z.infer<typeof contractSchema>;

// Quick contract (minimal fields)
export const quickContractSchema = z.object({
  customer_id: uuid,
  vehicle_id: optionalUuid,
  contract_type: z.enum(['daily', 'weekly', 'monthly', 'yearly', 'open']),
  start_date: requiredDate('تاريخ البداية'),
  end_date: requiredDate('تاريخ النهاية'),
  contract_amount: positiveNumber('مبلغ العقد'),
}).refine(
  (data) => new Date(data.end_date) > new Date(data.start_date),
  {
    message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية',
    path: ['end_date'],
  }
);

export type QuickContractFormData = z.infer<typeof quickContractSchema>;

// ========== Invoice Schema ==========

export const invoiceSchema = z.object({
  invoice_number: optionalString(),
  customer_id: uuid,
  contract_id: optionalUuid,
  amount: positiveNumber('المبلغ'),
  tax_amount: nonNegativeNumber('مبلغ الضريبة').default(0),
  discount_amount: nonNegativeNumber('مبلغ الخصم').default(0),
  due_date: requiredDate('تاريخ الاستحقاق'),
  status: z.enum(['draft', 'pending', 'paid', 'partial', 'overdue', 'cancelled']).default('pending'),
  notes: optionalString(),
  company_id: uuid,
});

export type InvoiceFormData = z.infer<typeof invoiceSchema>;

// ========== Payment Schema ==========

export const paymentSchema = z.object({
  invoice_id: optionalUuid,
  customer_id: uuid,
  contract_id: optionalUuid,
  amount: positiveNumber('المبلغ'),
  payment_date: requiredDate('تاريخ الدفع'),
  payment_method: z.enum(['cash', 'card', 'bank_transfer', 'cheque']),
  reference_number: optionalString(),
  notes: optionalString(),
  company_id: uuid,
});

export type PaymentFormData = z.infer<typeof paymentSchema>;

// ========== Employee Schema ==========

export const employeeSchema = z.object({
  first_name: requiredString('الاسم الأول', 2),
  last_name: requiredString('اسم العائلة', 2),
  first_name_ar: optionalString(),
  last_name_ar: optionalString(),
  email: z.string().email('البريد الإلكتروني غير صحيح'),
  phone: requiredPhone,
  national_id: requiredNationalId,
  position: optionalString(),
  department: optionalString(),
  hire_date: requiredDate('تاريخ التعيين'),
  salary: nonNegativeNumber('الراتب').optional(),
  status: z.enum(['active', 'inactive', 'terminated']).default('active'),
  company_id: uuid,
});

export type EmployeeFormData = z.infer<typeof employeeSchema>;

// ========== Company Schema ==========

export const companySchema = z.object({
  name: requiredString('اسم الشركة', 2),
  name_ar: optionalString(),
  business_type: z.enum([
    'car_rental',
    'real_estate',
    'retail',
    'medical',
    'manufacturing',
    'restaurant',
    'logistics',
    'education',
    'consulting',
    'construction',
  ]),
  email: email,
  phone: phone,
  address: optionalString(),
  address_ar: optionalString(),
  city: optionalString(),
  country: z.string().default('Qatar'),
  commercial_register: optionalString(),
  license_number: optionalString(),
  subscription_plan: z.enum(['basic', 'premium', 'enterprise']).default('basic'),
  subscription_status: z.enum(['active', 'inactive', 'suspended']).default('active'),
  currency: z.string().default('QAR'),
});

export type CompanyFormData = z.infer<typeof companySchema>;

// ========== Utility Functions ==========

/**
 * Get validation errors as Arabic messages
 */
export const getValidationErrors = (error: z.ZodError): Record<string, string> => {
  const errors: Record<string, string> = {};
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    errors[path] = err.message;
  });
  return errors;
};

/**
 * Validate data with schema and return result
 */
export const validateWithSchema = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } => {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: getValidationErrors(result.error) };
};

export default {
  // Field validators
  requiredString,
  optionalString,
  email,
  phone,
  requiredPhone,
  nationalId,
  requiredNationalId,
  positiveNumber,
  nonNegativeNumber,
  dateString,
  requiredDate,
  uuid,
  optionalUuid,
  
  // Entity schemas
  customerSchema,
  quickCustomerSchema,
  vehicleSchema,
  contractSchema,
  quickContractSchema,
  invoiceSchema,
  paymentSchema,
  employeeSchema,
  companySchema,
  
  // Utilities
  getValidationErrors,
  validateWithSchema,
};

