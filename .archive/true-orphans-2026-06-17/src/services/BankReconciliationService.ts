/**
 * Bank Reconciliation Service
 * 
 * Service for reconciling bank statements with payments:
 * - Auto-reconciliation using smart matching algorithms
 * - Manual reconciliation for difficult cases
 * - Reconciliation status tracking
 * - Bank statement import and processing
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { ReconciliationStatus } from '@/types/payment-enums';

/**
 * Bank Transaction Type
 * Types of bank transactions
 */
export enum BankTransactionType {
  CREDIT = 'credit',
  DEBIT = 'debit',
  TRANSFER = 'transfer'
}

/**
 * Bank Statement Entry
 * A single entry from a bank statement
 */
export interface BankStatementEntry {
  id: string;
  companyId: string;
  transactionDate: string;
  transactionType: BankTransactionType;
  amount: number;
  currency: string;
  description: string;
  referenceNumber?: string;
  accountNumber?: string;
  customerName?: string;
  customerReference?: string;
  paymentId?: string;
  invoiceId?: string;
  contractId?: string;
  bankId?: string;
  
  // Status
  reconciliationStatus: ReconciliationStatus;
  reconciliationConfidence: number; // 0-100, higher means more confident
  matchedPaymentId?: string;
  reconciledAt?: string;
  reconciledBy?: string;
  notes?: string;
  
  // Metadata
  importedAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Reconciliation Match Result
 * Result of a reconciliation attempt
 */
export interface ReconciliationMatchResult {
  bankStatementId: string;
  paymentId?: string;
  confidence: number;
  matchScore: number;
  matchReasons: string[];
  warnings?: string[];
  isAutoMatched: boolean;
  requiresManualReview: boolean;
}

/**
 * Reconciliation Options
 * Configuration for reconciliation process
 */
export interface ReconciliationOptions {
  companyId: string;
  amountTolerancePercent?: number; // Default: 1%
  dateToleranceDays?: number; // Default: 3 days
  requireExactMatch?: boolean; // If true, only match exact amounts
  requireCustomerMatch?: boolean; // If true, require customer reference
  requireDateMatch?: boolean; // If true, require date match within tolerance
  maxMatchesPerBankEntry?: number; // Limit matches per entry
  userId?: string;
  dryRun?: boolean; // Preview without applying
}

/**
 * Manual Reconciliation Input
 * Input for manual reconciliation
 */
export interface ManualReconciliationInput {
  bankStatementId: string;
  paymentId: string;
  confidence?: number;
  notes?: string;
  userId?: string;
}

/**
 * Bank Reconciliation Statistics
 * Aggregated reconciliation metrics
 */
export interface ReconciliationStats {
  companyId: string;
  totalBankTransactions: number;
  reconciledTransactions: number;
  pendingTransactions: number;
  unmatchedTransactions: number;
  autoMatchedRate: number; // Percentage
  averageMatchConfidence: number;
  totalAmount: number;
  reconciledAmount: number;
  unmatchedAmount: number;
  lastReconciledAt: string;
}

/**
 * Bank Reconciliation Service
 * Main service class
 */
export class BankReconciliationService {
  
  /**
   * Import bank statement entries
   */
  async importBankStatement(
    companyId: string,
    entries: Array<{
      transactionDate: string;
      transactionType: BankTransactionType;
      amount: number;
      currency?: string;
      description: string;
      referenceNumber?: string;
      accountNumber?: string;
      customerName?: string;
      customerReference?: string;
    }>,
    userId?: string
  ): Promise<{
    imported: number;
    failed: number;
    errors: string[];
  }> {
    try {
      logger.info('Importing bank statement', {
        companyId,
        entriesCount: entries.length
      });

      const imported: number[] = [];
      const errors: string[] = [];
      const currency = 'QAR'; // Default currency

      for (const entry of entries) {
        try {
          const { error } = await supabase.from('bank_statement_entries').insert({
            company_id: companyId,
            transaction_date: entry.transactionDate,
            transaction_type: entry.transactionType,
            amount: Math.abs(entry.amount),
            currency: entry.currency || currency,
            description: entry.description || '',
            reference_number: entry.referenceNumber || '',
            account_number: entry.accountNumber || '',
            customer_name: entry.customerName || '',
            customer_reference: entry.customerReference || '',
            reconciliation_status: 'unreconciled',
            reconciliation_confidence: 0,
            imported_at: new Date().toISOString(),
            created_by: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

          if (error) {
            errors.push(`Failed to import entry: ${error.message}`);
          } else {
            imported.push(1);
          }
        } catch (error) {
          errors.push(error instanceof Error ? error.message : 'Unknown error');
        }
      }

      logger.info('Bank statement import completed', {
        companyId,
        importedCount: imported.length,
        failedCount: errors.length
      });

      return {
        imported: imported.length,
        failed: errors.length,
        errors
      };

    } catch (error) {
      logger.error('Exception importing bank statement', { companyId, error });
      throw error;
    }
  }

  /**
   * Auto-reconcile bank statements with payments
   * Matches using: amount ±1%, customer reference, date ±3 days
   */
  async autoReconcile(options: ReconciliationOptions): Promise<{
    matches: ReconciliationMatchResult[];
    stats: ReconciliationStats;
  }> {
    try {
      logger.info('Starting auto-reconciliation', {
        companyId: options.companyId,
        amountTolerance: options.amountTolerancePercent,
        dateTolerance: options.dateToleranceDays
      });

      // 1. Get unreconciled bank statements
      const { data: bankStatements, error: bankError } = await supabase
        .from('bank_statement_entries')
        .select('*')
        .eq('company_id', options.companyId)
        .eq('reconciliation_status', 'unreconciled')
        .order('transaction_date', { ascending: false })
        .limit(1000); // Limit for performance

      if (bankError) {
        throw new Error(`Failed to fetch bank statements: ${bankError.message}`);
      }

      if (!bankStatements || bankStatements.length === 0) {
        logger.info('No unreconciled bank statements found', { companyId: options.companyId });
        return {
          matches: [],
          stats: await this.getReconciliationStats(options.companyId)
        };
      }

      // 2. Get payments for matching
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          id,
          payment_number,
          payment_date,
          amount,
          customer_id,
          contract_id,
          invoice_id,
          payment_status,
          agreement_number
        `)
        .eq('company_id', options.companyId)
        .in('payment_status', ['completed', 'processing'])
        .order('payment_date', { ascending: false })
        .limit(1000);

      if (paymentsError) {
        throw new Error(`Failed to fetch payments: ${paymentsError.message}`);
      }

      // 3. Perform matching for each bank statement
      const matches: ReconciliationMatchResult[] = [];
      const matchLimit = options.maxMatchesPerBankEntry || 1;

      for (const bankStmt of bankStatements) {
        // Find matching payments
        const matchingPayments = await this.findMatchingPayments(
          bankStmt,
          payments || [],
          options
        );

        // Apply matches (limit by matchLimit)
        const limitedMatches = matchingPayments.slice(0, matchLimit);

        if (limitedMatches.length > 0) {
          for (const match of limitedMatches) {
            const matchResult: ReconciliationMatchResult = {
              bankStatementId: bankStmt.id,
              paymentId: match.paymentId,
              confidence: match.confidence,
              matchScore: match.score,
              matchReasons: match.reasons,
              warnings: match.warnings,
              isAutoMatched: match.confidence >= 80,
              requiresManualReview: match.confidence < 80
            };

            matches.push(matchResult);

            // Apply reconciliation if confidence is high enough and not dry run
            if (!options.dryRun && matchResult.isAutoMatched) {
              await this.applyReconciliation(
                bankStmt.id,
                match.paymentId,
                matchResult.confidence,
                options.userId
              );
            }
          }
        }
      }

      logger.info('Auto-reconciliation completed', {
        companyId: options.companyId,
        matchesCount: matches.length,
        autoMatchedCount: matches.filter(m => m.isAutoMatched).length,
        manualReviewCount: matches.filter(m => m.requiresManualReview).length
      });

      // 4. Get updated stats
      const stats = await this.getReconciliationStats(options.companyId);

      return {
        matches,
        stats
      };

    } catch (error) {
      logger.error('Exception during auto-reconciliation', {
        companyId: options.companyId,
        error
      });
      throw error;
    }
  }

  /**
   * Find matching payments for a bank statement entry
   * Uses multi-factor matching algorithm
   */
  private async findMatchingPayments(
    bankStmt: BankStatementEntry,
    payments: any[],
    options: ReconciliationOptions
  ): Promise<Array<{
    paymentId: string;
    confidence: number;
    score: number;
    reasons: string[];
    warnings?: string[];
  }>> {
    const matches: Array<{
      paymentId: string;
      confidence: number;
      score: number;
      reasons: string[];
      warnings?: string[];
    }> = [];

    const amountTolerance = (options.amountTolerancePercent || 1) / 100;
    const dateToleranceDays = options.dateToleranceDays || 3;
    const minAmount = bankStmt.amount * (1 - amountTolerance);
    const maxAmount = bankStmt.amount * (1 + amountTolerance);

    for (const payment of payments) {
      let score = 0;
      let reasons: string[] = [];
      let warnings: string[] = [];
      let confidence = 0;

      // Factor 1: Amount match (highest weight: 40)
      if (payment.amount >= minAmount && payment.amount <= maxAmount) {
        const amountDiff = Math.abs(payment.amount - bankStmt.amount);
        const amountDiffPercent = (amountDiff / bankStmt.amount) * 100;
        
        score += 40 * (1 - amountDiffPercent / 100);
        reasons.push(`Amount match: ${amountDiffPercent.toFixed(2)}% difference`);
        
        if (amountDiffPercent > 0.5) {
          warnings.push('Amount difference > 0.5%');
        }
      } else if (options.requireExactMatch) {
        // Skip if amount doesn't match exactly
        continue;
      }

      // Factor 2: Date match (weight: 30)
      if (options.requireDateMatch !== false) {
        const paymentDate = new Date(payment.payment_date);
        const bankDate = new Date(bankStmt.transactionDate);
        const daysDiff = Math.abs((paymentDate.getTime() - bankDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff <= dateToleranceDays) {
          score += 30 * (1 - daysDiff / dateToleranceDays);
          reasons.push(`Date match: ${daysDiff} days difference`);
        } else {
          warnings.push(`Date difference: ${daysDiff} days (outside ${dateToleranceDays} days tolerance)`);
          score -= 20; // Penalty for date mismatch
        }
      }

      // Factor 3: Reference number match (weight: 20)
      if (bankStmt.referenceNumber && payment.agreement_number) {
        const normalizedBankRef = bankStmt.referenceNumber.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normalizedPaymentRef = payment.agreement_number.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        if (normalizedBankRef === normalizedPaymentRef) {
          score += 20;
          reasons.push('Reference number exact match');
        } else if (normalizedBankRef.includes(normalizedPaymentRef) || 
                   normalizedPaymentRef.includes(normalizedBankRef)) {
          score += 10;
          reasons.push('Reference number partial match');
        }
      }

      // Factor 4: Customer reference match (weight: 10)
      if (bankStmt.customerReference && bankStmt.customerReference.length > 0) {
        // This would need payment.customer lookup
        // For now, just note it
        reasons.push('Customer reference present');
      }

      // Calculate confidence (0-100)
      confidence = Math.min(100, Math.max(0, score));

      // Add to matches if score > 50 (minimum threshold)
      if (score > 50) {
        matches.push({
          paymentId: payment.id,
          confidence,
          score,
          reasons,
          warnings: warnings.length > 0 ? warnings : undefined
        });
      }
    }

    // Sort by confidence (highest first)
    matches.sort((a, b) => b.confidence - a.confidence);

    return matches;
  }

  /**
   * Apply reconciliation to database
   */
  private async applyReconciliation(
    bankStatementId: string,
    paymentId: string,
    confidence: number,
    userId?: string
  ): Promise<void> {
    try {
      // Update bank statement entry
      const { error: bankError } = await supabase
        .from('bank_statement_entries')
        .update({
          reconciliation_status: 'reconciled',
          payment_id: paymentId,
          reconciliation_confidence: confidence,
          reconciled_at: new Date().toISOString(),
          reconciled_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', bankStatementId);

      if (bankError) {
        throw bankError;
      }

      // Update payment reconciliation status
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          reconciliation_status: 'reconciled',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (paymentError) {
        throw paymentError;
      }

      logger.info('Reconciliation applied', {
        bankStatementId,
        paymentId,
        confidence
      });

    } catch (error) {
      logger.error('Failed to apply reconciliation', {
        bankStatementId,
        paymentId,
        error
      });
      throw error;
    }
  }

  /**
   * Manual reconciliation
   * Allows manual matching of bank statement to payment
   */
  async manualReconcile(
    input: ManualReconciliationInput
  ): Promise<{
    success: boolean;
    warnings?: string[];
  }> {
    try {
      logger.info('Manual reconciliation', {
        bankStatementId: input.bankStatementId,
        paymentId: input.paymentId
      });

      const warnings: string[] = [];

      // Validate bank statement exists
      const { data: bankStmt, error: bankError } = await supabase
        .from('bank_statement_entries')
        .select('*')
        .eq('id', input.bankStatementId)
        .single();

      if (bankError || !bankStmt) {
        throw new Error('Bank statement entry not found');
      }

      // Validate payment exists
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', input.paymentId)
        .single();

      if (paymentError || !payment) {
        throw new Error('Payment not found');
      }

      // Check if amounts match (within tolerance)
      const amountTolerance = 0.01; // 1% tolerance for manual too
      const amountDiff = Math.abs(payment.amount - bankStmt.amount);
      const amountDiffPercent = (amountDiff / bankStmt.amount) * 100;

      if (amountDiffPercent > amountTolerance) {
        warnings.push(`Amount difference: ${amountDiffPercent.toFixed(2)}%`);
      }

      // Check for duplicate reconciliation
      if (bankStmt.reconciliationStatus === 'reconciled') {
        throw new Error('Bank statement already reconciled');
      }

      if (payment.reconciliationStatus === 'reconciled') {
        throw new Error('Payment already reconciled');
      }

      // Apply reconciliation
      const confidence = input.confidence || (
        amountDiffPercent <= 0.5 ? 100 : // Very close amounts
        amountDiffPercent <= 1 ? 80 :   // Close amounts
        50                                   // Different amounts
      );

      await this.applyReconciliation(
        input.bankStatementId,
        input.paymentId,
        confidence,
        input.userId
      );

      logger.info('Manual reconciliation completed', {
        bankStatementId: input.bankStatementId,
        paymentId: input.paymentId,
        confidence,
        warnings: warnings.length
      });

      return {
        success: true,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      logger.error('Exception during manual reconciliation', {
        bankStatementId: input.bankStatementId,
        paymentId: input.paymentId,
        error
      });
      throw error;
    }
  }

  /**
   * Undo reconciliation
   * Remove reconciliation link
   */
  async undoReconciliation(
    bankStatementId: string,
    reason: string,
    userId?: string
  ): Promise<void> {
    try {
      logger.info('Undoing reconciliation', { bankStatementId });

      // Update bank statement entry
      const { error: bankError, data: bankStmt } = await supabase
        .from('bank_statement_entries')
        .update({
          reconciliation_status: 'unreconciled',
          payment_id: null,
          reconciliation_confidence: 0,
          notes: `Reconciliation undone: ${reason}`,
          reconciled_at: null,
          reconciled_by: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', bankStatementId)
        .select()
        .single();

      if (bankError) {
        throw bankError;
      }

      // Update payment reconciliation status
      if (bankStmt && bankStmt.payment_id) {
        const { error: paymentError } = await supabase
          .from('payments')
          .update({
            reconciliation_status: 'unreconciled',
            updated_at: new Date().toISOString()
          })
          .eq('id', bankStmt.payment_id);

        if (paymentError) {
          throw paymentError;
        }
      }

      logger.info('Reconciliation undone successfully', {
        bankStatementId,
        reason
      });

    } catch (error) {
      logger.error('Exception undoing reconciliation', { bankStatementId, error });
      throw error;
    }
  }

  /**
   * Get reconciliation statistics
   */
  async getReconciliationStats(companyId: string): Promise<ReconciliationStats> {
    try {
      // Get all bank statements for company
      const { data: bankStatements, error: statsError } = await supabase
        .from('bank_statement_entries')
        .select('*')
        .eq('company_id', companyId);

      if (statsError) {
        throw new Error(`Failed to fetch reconciliation stats: ${statsError.message}`);
      }

      if (!bankStatements) {
        return {
          companyId,
          totalBankTransactions: 0,
          reconciledTransactions: 0,
          pendingTransactions: 0,
          unmatchedTransactions: 0,
          autoMatchedRate: 0,
          averageMatchConfidence: 0,
          totalAmount: 0,
          reconciledAmount: 0,
          unmatchedAmount: 0,
          lastReconciledAt: new Date().toISOString()
        };
      }

      // Calculate statistics
      const totalBankTransactions = bankStatements.length;
      const reconciledTransactions = bankStatements.filter(s => 
        s.reconciliationStatus === 'reconciled'
      ).length;
      const pendingTransactions = bankStatements.filter(s => 
        s.reconciliationStatus === 'unreconciled'
      ).length;
      const unmatchedTransactions = bankStatements.filter(s => 
        s.reconciliationStatus === 'unreconciled' && 
        s.payment_id === null
      ).length;

      const totalAmount = bankStatements.reduce((sum, s) => sum + s.amount, 0);
      const reconciledAmount = bankStatements
        .filter(s => s.reconciliationStatus === 'reconciled')
        .reduce((sum, s) => sum + s.amount, 0);
      const unmatchedAmount = totalAmount - reconciledAmount;

      const autoMatchedRate = totalBankTransactions > 0
        ? (reconciledTransactions / totalBankTransactions) * 100
        : 0;

      const averageMatchConfidence = bankStatements
        .filter(s => s.reconciliationStatus === 'reconciled')
        .reduce((sum, s) => sum + (s.reconciliation_confidence || 0), 0) / 
        (reconciledTransactions || 1);

      const lastReconciledAt = bankStatements
        .filter(s => s.reconciliation_status === 'reconciled' && s.reconciled_at)
        .sort((a, b) => new Date(b.reconciled_at!).getTime() - new Date(a.reconciled_at!).getTime())[0]
        ?.reconciled_at || new Date().toISOString();

      return {
        companyId,
        totalBankTransactions,
        reconciledTransactions,
        pendingTransactions,
        unmatchedTransactions,
        autoMatchedRate,
        averageMatchConfidence,
        totalAmount,
        reconciledAmount,
        unmatchedAmount,
        lastReconciledAt
      };

    } catch (error) {
      logger.error('Exception getting reconciliation stats', { companyId, error });
      throw error;
    }
  }

  /**
   * Get unreconciled bank statements
   */
  async getUnreconciledStatements(
    companyId: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<BankStatementEntry[]> {
    try {
      let query = supabase
        .from('bank_statement_entries')
        .select('*')
        .eq('company_id', companyId)
        .eq('reconciliation_status', 'unreconciled')
        .order('transaction_date', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
      }

      const { data: statements, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch unreconciled statements: ${error.message}`);
      }

      return statements || [];

    } catch (error) {
      logger.error('Exception fetching unreconciled statements', { companyId, error });
      throw error;
    }
  }

  /**
   * Create reconciliation report
   */
  async createReconciliationReport(
    companyId: string,
    userId?: string
  ): Promise<{
    reportId: string;
    stats: ReconciliationStats;
  }> {
    try {
      logger.info('Creating reconciliation report', { companyId });

      const stats = await this.getReconciliationStats(companyId);

      const { data: report, error } = await supabase
        .from('reconciliation_reports')
        .insert({
          company_id: companyId,
          report_date: new Date().toISOString(),
          total_transactions: stats.totalBankTransactions,
          reconciled_transactions: stats.reconciledTransactions,
          pending_transactions: stats.pendingTransactions,
          unmatched_transactions: stats.unmatchedTransactions,
          auto_matched_rate: stats.autoMatchedRate,
          average_confidence: stats.averageMatchConfidence,
          total_amount: stats.totalAmount,
          reconciled_amount: stats.reconciledAmount,
          unmatched_amount: stats.unmatchedAmount,
          created_by: userId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create reconciliation report: ${error.message}`);
      }

      logger.info('Reconciliation report created', {
        companyId,
        reportId: report.id
      });

      return {
        reportId: report.id,
        stats
      };

    } catch (error) {
      logger.error('Exception creating reconciliation report', { companyId, error });
      throw error;
    }
  }
}

// Export singleton instance
export const bankReconciliationService = new BankReconciliationService();
