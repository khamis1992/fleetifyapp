import { z } from 'zod';

// Base payment schema
export const basePaymentSchema = z.object({
  payment_number: z.string().min(1, 'رقم الدفعة مطلوب'),
  payment_date: z.string().min(1, 'تاريخ الدفع مطلوب'),
  amount: z.number().min(0.001, 'المبلغ يجب أن يكون أكبر من صفر'),
  payment_method: z.enum(['cash', 'check', 'bank_transfer', 'credit_card', 'debit_card'], {
    required_error: 'طريقة الدفع مطلوبة',
  }),
  reference_number: z.string().optional(),
  check_number: z.string().optional(),
  bank_account: z.string().optional(),
  currency: z.string().default('KWD'),
  notes: z.string().optional(),
});

// Customer payment (receipt) schema
export const customerPaymentSchema = basePaymentSchema.extend({
  customer_id: z.string().uuid('معرف العميل غير صحيح'),
  invoice_id: z.string().uuid().optional(),
  contract_id: z.string().uuid().optional(),
  type: z.literal('receipt'),
});

// Vendor payment schema  
export const vendorPaymentSchema = basePaymentSchema.extend({
  vendor_id: z.string().uuid('معرف المورد غير صحيح'),
  purchase_order_id: z.string().uuid().optional(),
  description: z.string().optional(),
  type: z.literal('payment'),
});

// Invoice payment schema
export const invoicePaymentSchema = basePaymentSchema.extend({
  invoice_id: z.string().uuid('معرف الفاتورة غير صحيح'),
  customer_id: z.string().uuid().optional(),
  vendor_id: z.string().uuid().optional(),
  type: z.enum(['receipt', 'payment']),
});

// Unified payment schema that handles all payment types
export const unifiedPaymentSchema = z.discriminatedUnion('type', [
  customerPaymentSchema,
  vendorPaymentSchema,
  invoicePaymentSchema,
]);

// Enhanced payment schema with additional fields
export const enhancedPaymentSchema = basePaymentSchema.extend({
  cost_center_id: z.string().uuid().optional(),
  bank_id: z.string().uuid().optional(),
  account_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  vendor_id: z.string().uuid().optional(),
  invoice_id: z.string().uuid().optional(),
  contract_id: z.string().uuid().optional(),
  purchase_order_id: z.string().uuid().optional(),
  type: z.enum(['receipt', 'payment']),
  transaction_type: z.enum(['customer_payment', 'vendor_payment', 'invoice_payment']).optional(),
  payment_status: z.enum(['pending', 'completed', 'cancelled']).default('completed'),
});

// Journal entry preview schema for payments
export const paymentJournalPreviewSchema = z.object({
  entry_number: z.string(),
  entry_date: z.string(),
  description: z.string(),
  total_amount: z.number(),
  lines: z.array(z.object({
    line_number: z.number(),
    account_name: z.string(),
    account_code: z.string(),
    cost_center_name: z.string().optional(),
    description: z.string(),
    debit_amount: z.number(),
    credit_amount: z.number(),
  })),
});

// Type exports for payment schemas
export type BasePaymentData = z.infer<typeof basePaymentSchema>;
export type CustomerPaymentData = z.infer<typeof customerPaymentSchema>;
export type VendorPaymentData = z.infer<typeof vendorPaymentSchema>;
export type InvoicePaymentData = z.infer<typeof invoicePaymentSchema>;
export type UnifiedPaymentData = z.infer<typeof unifiedPaymentSchema>;
export type EnhancedPaymentData = z.infer<typeof enhancedPaymentSchema>;
export type PaymentJournalPreview = z.infer<typeof paymentJournalPreviewSchema>;