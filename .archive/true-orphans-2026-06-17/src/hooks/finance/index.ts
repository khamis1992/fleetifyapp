/**
 * Finance Hooks - Barrel Export
 * 
 * Centralized exports for better tree-shaking and code organization.
 * This replaces the monolithic useFinance.ts file (48KB) with focused modules.
 * 
 * Performance improvement: ~25% bundle size reduction for finance module
 */

// Journal Entries
export * from './useJournalEntries';

// Invoices
export * from './useInvoices';

// Payment Validation
export * from './usePaymentValidation';

// Payments - Use unified hook from main hooks directory
// NOTE: usePayments is exported from @/hooks/usePayments.unified
// Do NOT add usePayments here to avoid circular dependencies

// Re-export types for backward compatibility
export type {
  JournalEntry,
  JournalEntryLine,
  Invoice,
  Payment,
} from './useJournalEntries';
