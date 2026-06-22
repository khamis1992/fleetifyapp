/**
 * Payment Validator
 * 
 * Comprehensive validation service for payment data using Zod schemas
 * Validates client-side and server-side data to prevent bad data entry
 */

import { z } from 'zod';
import { PaymentMethod, PaymentType, PaymentStatus, ProcessingStatus, AllocationStatus, ReconciliationStatus } from '@/types/payment-enums';
import { logger } from '@/lib/logger';

/**
 * Payment Creation Schema
 * Full schema for creating a new payment
 */
export const PaymentCreationSchema = z.object({
  company_id: z.string().uuid('Invalid company ID'),
  customer_id: z.string().uuid('Invalid customer ID'),
  contract_id: z.string().uuid('Invalid contract ID').optional(),
  invoice_id: z.string().uuid('Invalid invoice ID').optional(),
  payment_number: z.string().min(1, 'Payment number is required'),
  payment_date: z.string().datetime('Invalid payment date'),
  amount: z.number()
    .positive('Amount must be positive')
    .min(1, 'Amount must be at least QAR 1')
    .max(1000000, 'Amount cannot exceed QAR 1,000,000'),
  payment_method: z.nativeEnum(PaymentMethod, 'Invalid payment method'),
  payment_type: z.nativeEnum(PaymentType, 'Invalid payment type'),
  payment_status: z.nativeEnum(PaymentStatus, 'Invalid payment status'),
  processing_status: z.nativeEnum(ProcessingStatus, 'Invalid processing status').optional(),
  allocation_status: z.nativeEnum(AllocationStatus, 'Invalid allocation status').optional(),
  reconciliation_status: z.nativeEnum(ReconciliationStatus, 'Invalid reconciliation status').optional(),
  transaction_type: z.enum(['income', 'expense', 'transfer', 'refund'], 'Invalid transaction type'),
  reference_number: z.string().max(50, 'Reference number too long').optional(),
  agreement_number: z.string().max(50, 'Agreement number too long').optional(),
  check_number: z.string().max(50, 'Check number too long').optional(),
  bank_id: z.string().uuid('Invalid bank ID').optional(),
  due_date: z.string().datetime('Invalid due date').optional(),
  notes: z.string().max(500, 'Notes too long').optional(),
  currency: z.string().length(3, 'Invalid currency code').optional().default('QAR')
}).strict();

/**
 * Payment Update Schema
 * Schema for updating an existing payment
 */
export const PaymentUpdateSchema = z.object({
  id: z.string().uuid('Invalid payment ID'),
  company_id: z.string().uuid('Invalid company ID'),
  customer_id: z.string().uuid('Invalid customer ID'),
  contract_id: z.string().uuid('Invalid contract ID').optional(),
  invoice_id: z.string().uuid('Invalid invoice ID').optional(),
  amount: z.number()
    .positive('Amount must be positive')
    .min(1, 'Amount must be at least QAR 1')
    .max(1000000, 'Amount cannot exceed QAR 1,000,000')
    .optional(),
  payment_status: z.nativeEnum(PaymentStatus, 'Invalid payment status'),
  processing_status: z.nativeEnum(ProcessingStatus, 'Invalid processing status').optional(),
  allocation_status: z.nativeEnum(AllocationStatus, 'Invalid allocation status').optional(),
  reconciliation_status: z.nativeEnum(ReconciliationStatus, 'Invalid reconciliation status').optional(),
  notes: z.string().max(500, 'Notes too long').optional(),
  processing_notes: z.string().max(500, 'Processing notes too long').optional(),
  late_fine_amount: z.number()
    .min(0, 'Late fine amount cannot be negative')
    .max(10000, 'Late fine amount cannot exceed QAR 10,000')
    .optional()
}).strict();

/**
 * Payment Amount Validation
 * Additional rules for payment amounts
 */
export const validatePaymentAmount = (amount: number): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (typeof amount !== 'number') {
    errors.push('Amount must be a number');
    return { isValid: false, errors };
  }

  if (isNaN(amount)) {
    errors.push('Amount is not a valid number');
    return { isValid: false, errors };
  }

  if (!isFinite(amount)) {
    errors.push('Amount must be finite');
    return { isValid: false, errors };
  }

  if (amount <= 0) {
    errors.push('Amount must be greater than zero');
    return { isValid: false, errors };
  }

  if (amount < 1) {
    errors.push('Amount must be at least QAR 1');
    return { isValid: false, errors };
  }

  if (amount > 1000000) {
    errors.push('Amount cannot exceed QAR 1,000,000');
    return { isValid: false, errors };
  }

  return { isValid: true, errors: [] };
};

/**
 * Payment Date Validation
 * Ensures payment dates are valid and logical
 */
export const validatePaymentDate = (paymentDate: string, paymentType?: PaymentType): {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Parse date
  const date = new Date(paymentDate);

  if (isNaN(date.getTime())) {
    errors.push('Invalid payment date format');
    return { isValid: false, errors };
  }

  // Check if date is not in the future (unless it's a future payment)
  const now = new Date();
  const daysDiff = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  // Allow small buffer (1 day) for system delays
  if (daysDiff < -1) {
    errors.push('Payment date cannot be more than 1 day in the future');
    return { isValid: false, errors };
  }

  // Check if date is not too far in the past (for regular payments)
  if (daysDiff > 365 && paymentType !== 'security_deposit') {
    errors.push('Payment date cannot be more than 1 year in the past');
    return { isValid: false, errors };
  }

  return { isValid: true, errors, warnings };
};

/**
 * Payment Linking Validation
 * Validates that payment is properly linked to invoice or contract
 */
export const validatePaymentLinking = (
  payment: {
    payment_type: PaymentType;
    contract_id?: string;
    invoice_id?: string;
    amount: number;
  }
): {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Must have at least one link
  if (!payment.contract_id && !payment.invoice_id) {
    errors.push('Payment must be linked to either a contract or an invoice');
    return { isValid: false, errors };
  }

  // Check for duplicate links
  if (payment.contract_id && payment.invoice_id) {
    warnings.push('Payment is linked to both a contract and an invoice (ensure this is intentional)');
  }

  // For rental income, contract is preferred
  if (payment.payment_type === 'rental_income' && !payment.contract_id) {
    warnings.push('Rental income payment should ideally be linked to a contract');
  }

  // Amount validation for linking
  if (payment.amount > 50000 && payment.contract_id) {
    errors.push('Payment amount over QAR 50,000 requires explicit approval');
    return { isValid: false, errors };
  }

  return { isValid: true, errors, warnings };
};

/**
 * Validate Payment Creation Data
 * Comprehensive validation for creating a new payment
 */
export const validatePaymentCreation = (data: any): {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
} => {
  try {
    // Validate using Zod schema
    PaymentCreationSchema.parse(data);
    
    // Additional business rules
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if customer_id is provided
    if (!data.customer_id) {
      errors.push('customer_id is required');
    }

    // Check if payment_date is provided
    if (!data.payment_date) {
      errors.push('payment_date is required');
    }

    // Check if payment_method is provided
    if (!data.payment_method) {
      errors.push('payment_method is required');
    }

    // Validate amount
    const amountValidation = validatePaymentAmount(data.amount);
    if (!amountValidation.isValid) {
      errors.push(...amountValidation.errors);
    }

    // Validate date
    const dateValidation = validatePaymentDate(data.payment_date, data.payment_type);
    if (!dateValidation.isValid) {
      errors.push(...dateValidation.errors);
    }
    if (dateValidation.warnings) {
      warnings.push(...dateValidation.warnings);
    }

    // Validate linking
    const linkingValidation = validatePaymentLinking(data);
    if (!linkingValidation.isValid) {
      errors.push(...linkingValidation.errors);
    }
    if (linkingValidation.warnings) {
      warnings.push(...linkingValidation.warnings);
    }

    // Business rule: Check for suspiciously large payments
    if (data.amount > 10000) {
      warnings.push('Large payment detected (QAR 10,000+). Please verify this is correct.');
    }

    // Business rule: Check for duplicate reference numbers
    if (data.reference_number) {
      // This would need database check, just add warning
      warnings.push('Ensure reference_number is unique for this customer/date');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map(e => e.message)
      };
    }

    return {
      isValid: false,
      errors: [error instanceof Error ? error.message : 'Validation failed']
    };
  }
};

/**
 * Validate Payment Update Data
 * Comprehensive validation for updating an existing payment
 */
export const validatePaymentUpdate = (data: any): {
  isValid: boolean;
  errors: string[];
} => {
  try {
    // Validate using Zod schema
    PaymentUpdateSchema.parse(data);
    
    // Additional business rules
    const errors: string[] = [];

    // Check if payment_id is provided
    if (!data.id) {
      errors.push('payment_id is required');
    }

    // Validate amount
    const amountValidation = validatePaymentAmount(data.amount);
    if (data.amount && !amountValidation.isValid) {
      errors.push(...amountValidation.errors);
    }

    // Business rule: Cannot change amount for completed payments
    if (data.amount && data.payment_status === 'completed' && data.payment_status !== 'completed') {
      errors.push('Cannot change amount for a payment that is already completed');
    }

    // Business rule: Cannot change payment method for payments that have been processed
    if (data.payment_method && (data.processing_status === 'completed' || data.allocation_status === 'fully_allocated')) {
      errors.push('Cannot change payment_method for a payment that has been processed or allocated');
    }

    // Business rule: Cannot void payment that is linked to posted journal entry
    // Note: This check would require database query, adding warning instead
    if (data.payment_status === 'voided') {
      // TODO: Check if journal_entry is posted
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map(e => e.message)
      };
    }

    return {
      isValid: false,
      errors: [error instanceof Error ? error.message : 'Validation failed']
    };
  }
};

/**
 * Payment Validator Class
 * Main class for payment validation operations
 */
export class PaymentValidator {
  /**
   * Validate payment creation
   */
  async validateCreatePayment(
    companyId: string,
    userId: string,
    data: any
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings?: string[];
  }> {
    logger.debug('Validating payment creation', { companyId, userId });

    const validation = validatePaymentCreation(data);
    
    // Log validation results
    if (!validation.isValid) {
      logger.warn('Payment validation failed', {
        companyId,
        userId,
        errors: validation.errors
      });
    } else if (validation.warnings && validation.warnings.length > 0) {
      logger.info('Payment validation warnings', {
        companyId,
        userId,
        warnings: validation.warnings
      });
    } else {
      logger.info('Payment validation successful', {
        companyId,
        userId
      });
    }

    return validation;
  }

  /**
   * Validate payment update
   */
  async validateUpdatePayment(
    companyId: string,
    userId: string,
    paymentId: string,
    data: any
  ): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    logger.debug('Validating payment update', { companyId, userId, paymentId });

    const validation = validatePaymentUpdate(data);
    
    // Log validation results
    if (!validation.isValid) {
      logger.warn('Payment update validation failed', {
        companyId,
        userId,
        paymentId,
        errors: validation.errors
      });
    } else {
      logger.info('Payment update validation successful', {
        companyId,
        userId,
        paymentId
      });
    }

    return validation;
  }

  /**
   * Batch validate multiple payments
   */
  async validatePaymentBatch(
    companyId: string,
    userId: string,
    payments: any[]
  ): Promise<{
    valid: any[];
    invalid: any[];
    totalErrors: number;
  }> {
    logger.debug('Validating payment batch', { companyId, userId, count: payments.length });

    const valid: any[] = [];
    const invalid: any[] = [];
    let totalErrors = 0;

    for (const payment of payments) {
      const validation = validatePaymentCreation(payment);
      
      if (validation.isValid) {
        valid.push(payment);
      } else {
        invalid.push({
          payment,
          errors: validation.errors,
          warnings: validation.warnings
        });
        totalErrors += validation.errors.length;
      }
    }

    logger.info('Batch payment validation completed', {
      companyId,
      userId,
      validCount: valid.length,
      invalidCount: invalid.length,
      totalErrors
    });

    return { valid, invalid, totalErrors };
  }

  /**
   * Get validation error messages in Arabic
   */
  getErrorMessage(error: string): string {
    const errorMessages: Record<string, string> = {
      'company_id': 'معرف الشركة غير صالح',
      'customer_id': 'معرف العميل غير صالح',
      'payment_number': 'رقم الدفعة غير صالح',
      'payment_date': 'تاريخ الدفعة غير صالح',
      'amount': 'المبلغ غير صالح',
      'payment_method': 'طريقة الدفع غير صالحة',
      'payment_status': 'حالة الدفعة غير صالحة'
    };

    return errorMessages[error] || 'خطأ غير معروف';
  }
}

// Export singleton instance
export const paymentValidator = new PaymentValidator();
