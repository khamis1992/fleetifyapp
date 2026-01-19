/**
 * Payment System Enums
 * 
 * Type-safe enums for payment system to ensure consistency
 * and prevent data entry errors.
 */

/**
 * Payment Methods
 * How payments are received
 */
export enum PaymentMethod {
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  CHECK = 'check',
  ONLINE_PAYMENT = 'online_payment',
  MOBILE_WALLET = 'mobile_wallet',
  ELECTRONIC_TRANSFER = 'electronic_transfer',
  CRYPTOCURRENCY = 'cryptocurrency'
}

/**
 * Payment Types
 * Categorization of payment purposes
 */
export enum PaymentType {
  RENTAL_INCOME = 'rental_income',
  SECURITY_DEPOSIT = 'security_deposit',
  DAMAGE_FEE = 'damage_fee',
  LATE_FEE = 'late_fee',
  FINE = 'fine',
  REFUND = 'refund',
  MAINTENANCE_FEE = 'maintenance_fee',
  UTILITY_PAYMENT = 'utility_payment',
  INSURANCE_PAYMENT = 'insurance_payment',
  SERVICE_CHARGE = 'service_charge',
  OTHER = 'other'
}

/**
 * Payment Status
 * High-level status of payment
 */
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  VOIDED = 'voided',
  REVERSED = 'reversed'
}

/**
 * Processing Status
 * Detailed status of payment processing
 */
export enum ProcessingStatus {
  NEW = 'new',
  PROCESSING = 'processing',
  AWAITING_APPROVAL = 'awaiting_approval',
  AWAITING_BATCH = 'awaiting_batch',
  RETRYING = 'retrying',
  MANUAL_REVIEW = 'manual_review',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * Transaction Type
 * Direction of payment flow
 */
export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer',
  REFUND = 'refund',
  ADJUSTMENT = 'adjustment'
}

/**
 * Allocation Status
 * Status of payment allocation to invoices/contracts
 */
export enum AllocationStatus {
  UNALLOCATED = 'unallocated',
  PARTIALLY_ALLOCATED = 'partially_allocated',
  FULLY_ALLOCATED = 'fully_allocated'
}

/**
 * Reconciliation Status
 * Status of bank reconciliation
 */
export enum ReconciliationStatus {
  UNRECONCILED = 'unreconciled',
  PARTIALLY_RECONCILED = 'partially_reconciled',
  RECONCILED = 'reconciled'
}

/**
 * Late Fine Status
 * Status of late fee application
 */
export enum LateFineStatus {
  NOT_APPLICABLE = 'not_applicable',
  PENDING = 'pending',
  APPLIED = 'applied',
  WAIVED = 'waived',
  CANCELLED = 'cancelled'
}

/**
 * Invoice Type
 * Type of invoice document
 */
export enum InvoiceType {
  INVOICE = 'invoice',
  CREDIT_NOTE = 'credit_note',
  DEBIT_NOTE = 'debit_note',
  RECEIPT = 'receipt'
}

/**
 * Invoice Status
 * Status of invoice lifecycle
 */
export enum InvoiceStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  SENT = 'sent',
  PARTIAL = 'partial',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
  VOIDED = 'voided'
}

/**
 * Priority Levels
 * For queue processing and notifications
 */
export enum Priority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 8,
  CRITICAL = 10,
  URGENT = 20
}

/**
 * Payment Channels
 * Where payment originated from
 */
export enum PaymentChannel {
  WEB = 'web',
  MOBILE_APP = 'mobile_app',
  API = 'api',
  BATCH_IMPORT = 'batch_import',
  RECURRING_PAYMENT = 'recurring_payment',
  WALK_IN = 'walk_in'
}

/**
 * Notification Types
 * Types of notifications for payment events
 */
export enum NotificationType {
  PAYMENT_RECEIVED = 'payment_received',
  PAYMENT_FAILED = 'payment_failed',
  PAYMENT_PENDING = 'payment_pending',
  PAYMENT_VOIDED = 'payment_voided',
  PAYMENT_REVERSED = 'payment_reversed',
  LATE_FEE_APPLIED = 'late_fee_applied',
  INVOICE_GENERATED = 'invoice_generated',
  ALLOCATION_UPDATED = 'allocation_updated',
  OVERDUE_ALERT = 'overdue_alert'
}

/**
 * Error Codes
 * Standardized error codes for payment errors
 */
export enum PaymentError {
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  INVALID_CUSTOMER = 'INVALID_CUSTOMER',
  INVALID_CONTRACT = 'INVALID_CONTRACT',
  DUPLICATE_PAYMENT = 'DUPLICATE_PAYMENT',
  OVERPAYMENT_LIMIT_EXCEEDED = 'OVERPAYMENT_LIMIT_EXCEEDED',
  ALLOCATION_FAILED = 'ALLOCATION_FAILED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHORIZATION_FAILED = 'AUTHORIZATION_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Currency Codes
 * ISO 4217 currency codes
 */
export enum Currency {
  QAR = 'QAR',
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  KWD = 'KWD',
  AED = 'AED',
  SAR = 'SAR'
}

/**
 * Type Guards
 * Helper functions for runtime type checking
 */

export function isPaymentMethod(value: string): value is PaymentMethod {
  return Object.values(PaymentMethod).includes(value as PaymentMethod);
}

export function isPaymentType(value: string): value is PaymentType {
  return Object.values(PaymentType).includes(value as PaymentType);
}

export function isPaymentStatus(value: string): value is PaymentStatus {
  return Object.values(PaymentStatus).includes(value as PaymentStatus);
}

export function isProcessingStatus(value: string): value is ProcessingStatus {
  return Object.values(ProcessingStatus).includes(value as ProcessingStatus);
}

/**
 * Helper function to get enum display name in Arabic
 */
export function getPaymentMethodName(value: PaymentMethod): string {
  const names: Record<PaymentMethod, string> = {
    [PaymentMethod.CASH]: 'نقداً',
    [PaymentMethod.BANK_TRANSFER]: 'تحويل بنكي',
    [PaymentMethod.CREDIT_CARD]: 'بطاقة ائتمان',
    [PaymentMethod.DEBIT_CARD]: 'بطاقة خصم مباشر',
    [PaymentMethod.CHECK]: 'شيك',
    [PaymentMethod.ONLINE_PAYMENT]: 'دفع أونلاين',
    [PaymentMethod.MOBILE_WALLET]: 'محفظة إلكترونية',
    [PaymentMethod.ELECTRONIC_TRANSFER]: 'تحويل إلكتروني',
    [PaymentMethod.CRYPTOCURRENCY]: 'عملة رقمية'
  };
  return names[value] || value;
}

export function getPaymentTypeName(value: PaymentType): string {
  const names: Record<PaymentType, string> = {
    [PaymentType.RENTAL_INCOME]: 'دخل إيجار',
    [PaymentType.SECURITY_DEPOSIT]: 'إيداع أمان',
    [PaymentType.DAMAGE_FEE]: 'رسوم ضرر',
    [PaymentType.LATE_FEE]: 'رسوم تأخير',
    [PaymentType.FINE]: 'غرامة',
    [PaymentType.REFUND]: 'مستردات',
    [PaymentType.MAINTENANCE_FEE]: 'رسوم صيانة',
    [PaymentType.UTILITY_PAYMENT]: 'دفع خدمات',
    [PaymentType.INSURANCE_PAYMENT]: 'دفع تأمين',
    [PaymentType.SERVICE_CHARGE]: 'رسوم خدمة',
    [PaymentType.OTHER]: 'أخرى'
  };
  return names[value] || value;
}

export function getPaymentStatusName(value: PaymentStatus): string {
  const names: Record<PaymentStatus, string> = {
    [PaymentStatus.PENDING]: 'معلق',
    [PaymentStatus.PROCESSING]: 'جاري المعالجة',
    [PaymentStatus.COMPLETED]: 'مكتمل',
    [PaymentStatus.FAILED]: 'فشل',
    [PaymentStatus.CANCELLED]: 'ملغي',
    [PaymentStatus.VOIDED]: 'ملغي',
    [PaymentStatus.REVERSED]: 'مرجوع'
  };
  return names[value] || value;
}

export function getProcessingStatusName(value: ProcessingStatus): string {
  const names: Record<ProcessingStatus, string> = {
    [ProcessingStatus.NEW]: 'جديد',
    [ProcessingStatus.PROCESSING]: 'جاري المعالجة',
    [ProcessingStatus.AWAITING_APPROVAL]: 'بانتظار الموافقة',
    [ProcessingStatus.AWAITING_BATCH]: 'بانتظار الدفععة',
    [ProcessingStatus.RETRYING]: 'إعادة المحاولة',
    [ProcessingStatus.MANUAL_REVIEW]: 'مراجعة يدوية',
    [ProcessingStatus.COMPLETED]: 'مكتمل',
    [ProcessingStatus.FAILED]: 'فشل'
  };
  return names[value] || value;
}
