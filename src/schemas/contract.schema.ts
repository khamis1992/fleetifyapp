import { z } from 'zod';

// Base contract schema
export const baseContractSchema = z.object({
  contract_number: z.string().min(1, 'رقم العقد مطلوب'),
  customer_id: z.string().uuid('معرف العميل غير صحيح'),
  start_date: z.date({ required_error: 'تاريخ البداية مطلوب' }),
  end_date: z.date({ required_error: 'تاريخ النهاية مطلوب' }),
  contract_type: z.enum(['rental', 'lease', 'service', 'maintenance'], {
    required_error: 'نوع العقد مطلوب',
  }),
  status: z.enum(['draft', 'under_review', 'active', 'expired', 'cancelled', 'suspended']).default('draft'),
  total_amount: z.number().min(0, 'المبلغ الإجمالي يجب أن يكون موجباً'),
  currency: z.string().default('KWD'),
  payment_terms: z.enum(['monthly', 'quarterly', 'annually', 'one_time']).default('monthly'),
  notes: z.string().optional(),
  terms_and_conditions: z.string().optional(),
});

// Contract creation schema with validation
export const createContractSchema = baseContractSchema.extend({
  vehicles: z.array(z.object({
    vehicle_id: z.string().uuid(),
    daily_rate: z.number().min(0),
    monthly_rate: z.number().min(0),
    deposit_amount: z.number().min(0).optional(),
  })).min(1, 'يجب اختيار مركبة واحدة على الأقل'),
  payment_schedule: z.array(z.object({
    due_date: z.date(),
    amount: z.number().min(0),
    description: z.string().optional(),
    is_deposit: z.boolean().default(false),
  })).optional(),
}).refine(
  (data) => {
    return data.end_date > data.start_date;
  },
  {
    message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية',
    path: ['end_date']
  }
);

// Contract update schema
export const updateContractSchema = baseContractSchema.partial().extend({
  id: z.string().uuid('معرف العقد غير صحيح'),
});

// Contract vehicle schema
export const contractVehicleSchema = z.object({
  id: z.string().uuid().optional(),
  contract_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
  daily_rate: z.number().min(0, 'الأجرة اليومية يجب أن تكون موجبة'),
  monthly_rate: z.number().min(0, 'الأجرة الشهرية يجب أن تكون موجبة'),
  deposit_amount: z.number().min(0, 'مبلغ التأمين يجب أن يكون موجباً').optional(),
  start_date: z.date(),
  end_date: z.date(),
  status: z.enum(['active', 'returned', 'damaged', 'lost']).default('active'),
  mileage_limit: z.number().min(0).optional(),
  excess_mileage_rate: z.number().min(0).optional(),
  notes: z.string().optional(),
});

// Contract payment schedule schema
export const contractPaymentScheduleSchema = z.object({
  id: z.string().uuid().optional(),
  contract_id: z.string().uuid(),
  due_date: z.date(),
  amount: z.number().min(0, 'المبلغ يجب أن يكون موجباً'),
  description: z.string().optional(),
  is_deposit: z.boolean().default(false),
  is_paid: z.boolean().default(false),
  paid_date: z.date().optional(),
  payment_id: z.string().uuid().optional(),
  late_fee: z.number().min(0).optional(),
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).default('pending'),
});

// Contract terms and conditions schema
export const contractTermsSchema = z.object({
  contract_id: z.string().uuid(),
  insurance_required: z.boolean().default(true),
  insurance_amount: z.number().min(0).optional(),
  security_deposit: z.number().min(0).optional(),
  late_fee_percentage: z.number().min(0).max(100).optional(),
  grace_period_days: z.number().min(0).optional(),
  mileage_limit_per_day: z.number().min(0).optional(),
  excess_mileage_fee: z.number().min(0).optional(),
  fuel_policy: z.enum(['full_to_full', 'same_to_same', 'prepaid']).optional(),
  additional_driver_fee: z.number().min(0).optional(),
  cancellation_policy: z.string().optional(),
  damage_policy: z.string().optional(),
  maintenance_responsibility: z.enum(['lessor', 'lessee', 'shared']).default('lessor'),
});

// Type exports for contract schemas
export type BaseContractData = z.infer<typeof baseContractSchema>;
export type CreateContractData = z.infer<typeof createContractSchema>;
export type UpdateContractData = z.infer<typeof updateContractSchema>;
export type ContractVehicleData = z.infer<typeof contractVehicleSchema>;
export type ContractPaymentScheduleData = z.infer<typeof contractPaymentScheduleSchema>;
export type ContractTermsData = z.infer<typeof contractTermsSchema>;