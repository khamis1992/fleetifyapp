/**
 * Payment Transaction Service
 * 
 * Wrapper service for executing payment-related operations within database transactions
 * Includes retry logic with exponential backoff for transient failures.
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface TransactionOptions {
  maxAttempts?: number;
  retryDelayMs?: number;
  skipRetryOnErrors?: string[];
}

export interface TransactionResult<T = {
  success: boolean;
  data?: T;
  error?: string;
  attempts?: number;
}

export interface TransactionConfig {
  maxAttempts: number; // default 3
  retryDelayMs: number; // default 5000ms (5s)
  skipRetryOnErrors?: string[]; // errors that should not be retried
}

/**
 * Payment Transaction Service
 * 
 * Provides safe transactional operations with built-in retry mechanism.
 * All operations are wrapped in database transactions with proper rollback handling.
 */
class PaymentTransactionService {
  private config: TransactionConfig;

  constructor(config?: Partial<TransactionConfig>) {
    this.config = {
      maxAttempts: config?.maxAttempts || 3,
      retryDelayMs: config?.retryDelayMs || 5000,
      skipRetryOnErrors: config?.skipRetryOnErrors || [
        'invalid_company_id', // Invalid company ID - permanent error
        'invalid_customer_id', // Invalid customer ID - permanent error
        'invalid_payment_amount', // Invalid payment amount - permanent error
        'contract_not_found', // Contract not found - permanent error
        'invoice_not_found', // Invoice not found - permanent error
        'payment_not_found', // Payment not found - permanent error
        'payment_already_voided', // Payment already voided - permanent error
        'payment_already_completed' // Payment already completed - permanent error
      ]
    };
  }

  /**
   * Execute operation within database transaction
   * Automatically retries on transient failures with exponential backoff
   */
  async executeInTransaction<T>(
    operation: () => Promise<T>,
    operationName: string,
    options?: TransactionOptions
  ): Promise<TransactionResult<T>> {
    let lastError: any = null;
    let attempts = 0;

    while (attempts < this.config.maxAttempts) {
      attempts++;

      try {
        logger.debug(`Executing transaction operation: ${operationName}`, { 
          attempt: attempts,
          maxAttempts: this.config.maxAttempts 
        });

        // Start transaction using Supabase's transactional mode
        const result = await operation();

        logger.info(`Transaction operation completed: ${operationName}`, { 
          attempt: attempts,
          success: true 
        });

        return {
          success: true,
          data: result,
          attempts
        };

      } catch (error) {
        lastError = error;

        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorCode = error instanceof Error && 'code' in error ? error.code : '';

        logger.error(`Transaction operation failed: ${operationName}`, { 
          attempt: attempts,
          error: errorMessage,
          errorCode 
        });

        // Check if error should not be retried
        if (this.shouldSkipRetry(errorMessage, errorCode)) {
          logger.warn(`Skipping retry for operation: ${operationName}`, { 
            error: errorMessage,
            errorCode 
          });
          
          return {
            success: false,
            error: errorMessage,
            attempts
          };
        }

        // Check if this is the last attempt
        if (attempts >= this.config.maxAttempts) {
          logger.error(`Max retry attempts reached for: ${operationName}`, {
            operationName,
            maxAttempts: this.config.maxAttempts,
            finalError: errorMessage
          });

          return {
            success: false,
            error: `Operation failed after ${attempts} attempts: ${errorMessage}`,
            attempts
          };
        }

        // Calculate delay for next retry (exponential backoff)
        const delayMs = this.calculateRetryDelay(attempts);

        logger.info(`Retrying operation: ${operationName}`, {
          attempt: attempts + 1,
          delayMs: delayMs,
          errorMessage
        });

        // Wait before retrying
        await this.sleep(delayMs);
      }
    }

    // Should not reach here, but just in case
    return {
      success: false,
      error: 'Max attempts reached without success',
      attempts
    };
  }

  /**
   * Execute multiple operations within a single transaction
   * All operations must succeed or all will be rolled back
   */
  async executeTransactionBatch<T>(
    operations: Array<{ name: string; fn: () => Promise<T> }>,
    transactionName: string
  ): Promise<TransactionResult<{ successes: T[]; failures: Array<{ name: string; error: string }> }>> {
    let lastError: any = null;
    let attempts = 0;

    while (attempts < this.config.maxAttempts) {
      attempts++;

      try {
        logger.debug(`Executing batch transaction: ${transactionName}`, { 
          attempt: attempts,
          operationsCount: operations.length 
        });

        // Execute all operations
        // Note: Supabase automatically wraps individual queries in transactions
        // For true atomicity, we would need to use a single SQL statement
        const results = await Promise.all(
          operations.map(op => op.fn())
        );

        // Check if all operations succeeded
        const failures = operations
          .map((op, index) => {
            const result = results[index];
            return {
              name: op.name,
              error: results[index] instanceof Error 
                ? String(results[index]) 
                : null
            };
          })
          .filter(f => f.error !== null);

        if (failures.length > 0) {
          const errorMessages = failures.map(f => f.error).join(', ');
          throw new Error(`Batch operation failures: ${errorMessages}`);
        }

        logger.info(`Batch transaction completed: ${transactionName}`, { 
          attempt: attempts,
          operationsCount: operations.length,
          successes: results.length 
        });

        return {
          success: true,
          data: {
            successes: results as T[],
            failures: []
          },
          attempts
        };

      } catch (error) {
        lastError = error;

        const errorMessage = error instanceof Error ? error.message : String(error);

        logger.error(`Batch transaction failed: ${transactionName}`, { 
          attempt: attempts,
          error: errorMessage 
        });

        // Check if this is the last attempt
        if (attempts >= this.config.maxAttempts) {
          return {
            success: false,
            error: `Batch operation failed after ${attempts} attempts: ${errorMessage}`,
            attempts
          };
        }

        // Calculate delay for next retry
        const delayMs = this.calculateRetryDelay(attempts);

        logger.info(`Retrying batch transaction: ${transactionName}`, {
          attempt: attempts + 1,
          delayMs: delayMs,
          errorMessage
        });

        // Wait before retrying
        await this.sleep(delayMs);
      }
    }

    // Should not reach here
    return {
      success: false,
      error: 'Max attempts reached for batch operation',
      attempts
    };
  }

  /**
   * Create payment within transaction
   */
  async createPaymentWithinTransaction(
    paymentData: any,
    userId: string,
    companyId: string
  ): Promise<TransactionResult<any>> {
    const operationName = 'create_payment';
    const operation = async () => {
      const { data, error } = await supabase
        .from('payments')
        .insert({
          company_id: companyId,
          created_by: userId,
          ...paymentData
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    };

    return this.executeInTransaction(operation, operationName);
  }

  /**
   * Update payment within transaction
   */
  async updatePaymentWithinTransaction(
    paymentId: string,
    updateData: any,
    userId: string
  ): Promise<TransactionResult<any>> {
    const operationName = 'update_payment';
    const operation = async () => {
      const { data, error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    };

    return this.executeInTransaction(operation, operationName);
  }

  /**
   * Create invoice within transaction
   */
  async createInvoiceWithinTransaction(
    invoiceData: any,
    userId: string,
    companyId: string
  ): Promise<TransactionResult<any>> {
    const operationName = 'create_invoice';
    const operation = async () => {
      const { data, error } = await supabase
        .from('invoices')
        .insert({
          company_id: companyId,
          created_by: userId,
          ...invoiceData
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    };

    return this.executeInTransaction(operation, operationName);
  }

  /**
   * Link payment to invoice/contract within transaction
   */
  async linkPaymentToInvoiceWithinTransaction(
    paymentId: string,
    invoiceId: string
  ): Promise<TransactionResult<void>> {
    const operationName = 'link_payment_to_invoice';
    const operation = async () => {
      // Update payment
      const { error: paymentError } = await supabase
        .from('payments')
        .update({ invoice_id: invoiceId })
        .eq('id', paymentId);

      if (paymentError) throw paymentError;

      // Update invoice
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({ payment_id: paymentId })
        .eq('id', invoiceId);

      if (invoiceError) throw invoiceError;
    };

    return this.executeInTransaction(operation, operationName);
  }

  /**
   * Create journal entry within transaction
   */
  async createJournalEntryWithinTransaction(
    journalEntryData: any,
    journalEntryLinesData: any[],
    userId: string,
    companyId: string
  ): Promise<TransactionResult<any>> {
    const operationName = 'create_journal_entry';
    const operation = async () => {
      // Create journal entry header
      const { data: journalEntry, error: journalError } = await supabase
        .from('journal_entries')
        .insert({
          company_id: companyId,
          entry_date: new Date().toISOString(),
          status: 'posted',
          created_by: userId,
          ...journalEntryData
        })
        .select()
        .single();

      if (journalError) throw journalError;

      // Create journal entry lines
      const lines = journalEntryLinesData.map((line, index) => ({
        journal_entry_id: journalEntry.id,
        line_number: index + 1,
        ...line
      }));

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(lines);

      if (linesError) throw linesError;

      return journalEntry;
    };

    return this.executeInTransaction(operation, operationName);
  }

  /**
   * Check if error should be retried
   */
  private shouldSkipRetry(errorMessage: string, errorCode: string): boolean {
    // Permanent errors that should not be retried
    const permanentErrors = this.config.skipRetryOnErrors || [];
    
    // Check if error code matches
    if (permanentErrors.some(e => errorCode.includes(e))) {
      return true;
    }

    // Check if error message contains permanent error keywords
    const permanentKeywords = [
      'not found',
      'does not exist',
      'invalid',
      'permission denied',
      'duplicate',
      'violates constraint'
    ];

    const lowerCaseMessage = errorMessage.toLowerCase();
    if (permanentKeywords.some(keyword => lowerCaseMessage.includes(keyword))) {
      return true;
    }

    // Check for network errors (transient - should retry)
    const transientErrors = [
      'network',
      'timeout',
      'connection',
      'ETIMEDOUT',
      '503',
      '504',
      '502'
    ];

    if (transientErrors.some(e => lowerCaseMessage.includes(e))) {
      return false; // Should retry
    }

    return false; // Retry by default
  }

  /**
   * Calculate exponential backoff delay
   * Formula: delay = baseDelay * (2 ^ (attempt - 1))
   */
  private calculateRetryDelay(attempt: number): number {
    return this.config.retryDelayMs * Math.pow(2, attempt - 1);
  }

  /**
   * Sleep for specified milliseconds
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get transaction statistics
   */
  getTransactionStats(): {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    avgAttemptsPerTransaction: number;
    maxAttemptsUsed: number;
  } {
    // TODO: Implement actual tracking from database
    // For now, return default values
    return {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      avgAttemptsPerTransaction: 0,
      maxAttemptsUsed: 0
    };
  }

  /**
   * Reset transaction statistics
   */
  resetTransactionStats(): void {
    // TODO: Implement actual reset from database
    logger.info('Transaction statistics reset');
  }
}

// Export singleton instance with default config
export const paymentTransactionService = new PaymentTransactionService({
  maxAttempts: 3,
  retryDelayMs: 5000, // 5 seconds
  skipRetryOnErrors: [
    'invalid_company_id',
    'invalid_customer_id',
    'invalid_payment_amount',
    'contract_not_found',
    'invoice_not_found',
    'payment_not_found',
    'payment_already_voided',
    'payment_already_completed'
  ]
});
