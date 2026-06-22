/**
 * Standard Zod validation schemas for Fleetify forms.
 * Use with react-hook-form via @hookform/resolvers/zod.
 *
 * Example:
 * import { useForm } from 'react-hook-form';
 * import { zodResolver } from '@hookform/resolvers/zod';
 * import { customerSchema } from '@/lib/formValidation';
 *
 * const form = useForm({ resolver: zodResolver(customerSchema) });
 */

import { z } from 'zod';

// === Common field schemas ===

export const emailSchema = z
  .string()
  .min(1, 'هذا الحقل مطلوب')
  .email('بريد إلكتروني غير صالح');

export const phoneSchema = z
  .string()
  .min(8, 'رقم الهاتف غير صالح')
  .max(20, 'رقم الهاتف طويل جداً')
  .optional()
  .or(z.literal(''));

export const requiredString = (label = 'هذا الحقل مطلوب') =>
  z.string().min(1, label);

export const optionalString = z.string().optional().or(z.literal(''));

export const amountSchema = z
  .number()
  .min(0, 'المبلغ يجب أن يكون صفر أو أكثر')
  .optional()
  .or(z.nan());

export const dateSchema = z.string().min(1, 'التاريخ مطلوب');

// === Domain schemas ===

export const customerSchema = z.object({
  first_name_ar: requiredString('الاسم الأول مطلوب'),
  last_name_ar: requiredString('الاسم الأخير مطلوب'),
  phone: phoneSchema,
  email: emailSchema.optional().or(z.literal('')),
  id_number: optionalString,
  nationality: optionalString,
  address: optionalString,
});

export const vehicleSchema = z.object({
  plate_number: requiredString('رقم اللوحة مطلوب'),
  make: requiredString('العلامة التجارية مطلوبة'),
  model: requiredString('الموديل مطلوب'),
  year: z.number().min(1990, 'السنة غير صالحة').max(new Date().getFullYear() + 1, 'السنة غير صالحة'),
  daily_rate: amountSchema,
});

export const contractSchema = z.object({
  customer_id: requiredString('العميل مطلوب'),
  vehicle_id: requiredString('المركبة مطلوبة'),
  start_date: dateSchema,
  end_date: dateSchema,
  daily_rate: amountSchema,
}).refine((data) => new Date(data.end_date) > new Date(data.start_date), {
  message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية',
  path: ['end_date'],
});

export const paymentSchema = z.object({
  contract_id: requiredString('العقد مطلوب'),
  amount: z.number().min(0.01, 'المبلغ يجب أن يكون أكبر من صفر'),
  payment_date: dateSchema,
  payment_method: requiredString('طريقة الدفع مطلوبة'),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
export type VehicleFormValues = z.infer<typeof vehicleSchema>;
export type ContractFormValues = z.infer<typeof contractSchema>;
export type PaymentFormValues = z.infer<typeof paymentSchema>;
export type LoginFormValues = z.infer<typeof loginSchema>;
