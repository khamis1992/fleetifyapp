// نظام التحقق الموحد - ملف التصدير الرئيسي
export * from './customer.schema';
export * from './payment.schema';
export * from './contract.schema';
export * from './common.schema';

// Re-export commonly used schemas for convenience
export {
  createCustomerSchema,
  updateCustomerSchema,
  customerDuplicateCheckSchema,
} from './customer.schema';

export {
  enhancedPaymentSchema,
  unifiedPaymentSchema,
  paymentJournalPreviewSchema,
} from './payment.schema';

export {
  createContractSchema,
  updateContractSchema,
  contractVehicleSchema,
  contractPaymentScheduleSchema,
} from './contract.schema';

export {
  contactInfoSchema,
  addressSchema,
  documentSchema,
  auditTrailSchema,
  paginationSchema,
  filterSchema,
  apiResponseSchema,
  dateRangeSchema,
  moneyAmountSchema,
} from './common.schema';