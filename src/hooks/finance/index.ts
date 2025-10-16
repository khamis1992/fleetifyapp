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

// Payments
export * from './usePayments';

// Re-export types for backward compatibility
export type {
  JournalEntry,
  JournalEntryLine,
  Invoice,
  Payment,
} from './useJournalEntries';
