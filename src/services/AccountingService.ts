/**
 * Accounting Service
 *
 * خدمة المحاسبة الرئيسية:
 * - تحديث أرصدة الحسابات عند المدفوعات
 * - إدارة القيود المحاسبية
 * - حساب الرصيد الحالي للحسابات
 * - تحديث حالات الفواتير والعقود
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { readAccountBalances, readFinancialPages, requireFinanceCompany } from './financialReporting';

export interface AccountBalance {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountLevel: number;
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  currentBalance: number;
  debitTotal: number;
  creditTotal: number;
  lastTransactionDate: string | null;
}

export interface AccountUpdateResult {
  success: boolean;
  previousBalance?: number;
  newBalance?: number;
  error?: string;
}

export interface InvoiceStatusUpdateResult {
  success: boolean;
  previousStatus?: string;
  newStatus?: string;
  paidAmount?: number;
  remainingBalance?: number;
  error?: string;
}

export interface ContractStatusUpdateResult {
  success: boolean;
  previousStatus?: string;
  newStatus?: string;
  totalPaid?: number;
  remainingBalance?: number;
  error?: string;
}

const normalizeAccountType = (value?: string | null) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (normalized === 'assets') return 'asset';
  if (normalized === 'liabilities') return 'liability';
  if (normalized === 'expenses') return 'expense';
  if (normalized === 'income') return 'revenue';
  return normalized;
};

class AccountingService {
  /**
   * تحديث أرصدة الحسابات بعد دفعة
   */
  async updateAccountBalances(
    paymentId: string,
    companyId: string,
    _options: { skipJournalEntryCheck?: boolean } = {}
  ) {
    try {
      requireFinanceCompany(companyId);
      const { data: payment, error } = await supabase
        .from('payments')
        .select('id,journal_entry_id')
        .eq('id', paymentId)
        .eq('company_id', companyId)
        .single();
      if (error) throw error;
      const { data: entries, error: entryError } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('company_id', companyId)
        .eq('reference_type', 'payment')
        .eq('reference_id', paymentId)
        .eq('status', 'posted');
      if (entryError) throw entryError;
      const ids = [
        ...new Set([payment.journal_entry_id, ...(entries || []).map((row) => row.id)].filter(Boolean)),
      ] as string[];
      if (!ids.length) throw new Error('Payment has no posted accounting journal');
      const lines = await readFinancialPages((from, to) =>
        supabase
          .from('journal_entry_lines')
          .select('account_id,journal_entries!inner(company_id,status)', { count: 'exact' })
          .in('journal_entry_id', ids)
          .eq('journal_entries.company_id', companyId)
          .eq('journal_entries.status', 'posted')
          .order('id')
          .range(from, to)
      );
      if (!lines.length) throw new Error('Payment journal has no posted lines');
      return this.updateMultipleAccountBalances(
        lines.map((line) => line.account_id),
        companyId
      );
    } catch (error) {
      return {
        success: false,
        updatedAccounts: [] as AccountBalance[],
        errors: [error instanceof Error ? error.message : 'Accounting read failed'],
      };
    }
  }

  /**
   * الحصول على رصيد حساب محدد
   */
  async getAccountBalance(accountId: string, companyId?: string) {
    requireFinanceCompany(companyId);
    const account = (await readAccountBalances(companyId)).find((row) => row.account_id === accountId);
    if (!account) throw new Error('Account is not available in the selected company');
    return {
      balance: account.closing_balance,
      debitTotal: account.total_debits,
      creditTotal: account.total_credits,
    };
  }

  /**
   * تحديث أرصدة حسابات متعددة
   */
  async updateMultipleAccountBalances(accountIds: string[], companyId: string) {
    // Database triggers own cached balances. Refreshing them in a browser can
    // overwrite a concurrent posting with an older snapshot.
    const summary = await this.getAccountBalanceSummary(companyId);
    if (!summary.success)
      return {
        success: false,
        updatedAccounts: [] as AccountBalance[],
        errors: [summary.error || 'Accounting read failed'],
      };
    const ids = new Set(accountIds);
    const updatedAccounts = summary.accounts.filter((row) => ids.has(row.accountId));
    const errors = [...ids]
      .filter((id) => !updatedAccounts.some((row) => row.accountId === id))
      .map((id) => 'Account unavailable: ' + id);
    return { success: errors.length === 0, updatedAccounts, errors };
  }

  /**
   * تحديث حالة فاتورة بعد دفع
   */
  async updateInvoicePaymentStatus(
    invoiceId: string,
    paymentId: string,
    _paymentAmount: number,
    companyId?: string
  ): Promise<InvoiceStatusUpdateResult> {
    try {
      requireFinanceCompany(companyId);
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('invoice_id')
        .eq('id', paymentId)
        .eq('company_id', companyId)
        .single();
      if (paymentError) throw paymentError;
      if (payment.invoice_id !== invoiceId) {
        const { data, error } = await supabase
          .from('payment_allocations')
          .select('id')
          .eq('company_id', companyId)
          .eq('payment_id', paymentId)
          .eq('target_id', invoiceId)
          .eq('allocation_type', 'invoice')
          .eq('is_active', true)
          .limit(1);
        if (error) throw error;
        if (!data?.length) throw new Error('Payment is not linked to this invoice');
      }
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select('payment_status,paid_amount,balance_due')
        .eq('id', invoiceId)
        .eq('company_id', companyId)
        .single();
      if (error) throw error;
      // Settlement has already been committed by the payment command. Do not
      // increment it again on retries or status refreshes.
      return {
        success: true,
        previousStatus: invoice.payment_status,
        newStatus: invoice.payment_status,
        paidAmount: invoice.paid_amount ?? 0,
        remainingBalance: invoice.balance_due ?? 0,
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Invoice read failed' };
    }
  }

  /**
   * تحديث حالة عقد بعد دفع
   */
  async updateContractPaymentStatus(
    contractId: string,
    paymentId: string,
    _paymentAmount: number,
    companyId?: string
  ): Promise<ContractStatusUpdateResult> {
    try {
      requireFinanceCompany(companyId);
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('contract_id')
        .eq('id', paymentId)
        .eq('company_id', companyId)
        .single();
      if (paymentError) throw paymentError;
      if (payment.contract_id !== contractId) throw new Error('Payment is not linked to this contract');
      const { data: contract, error } = await supabase
        .from('contracts')
        .select('total_paid,balance_due')
        .eq('id', contractId)
        .eq('company_id', companyId)
        .single();
      if (error) throw error;
      return {
        success: true,
        totalPaid: contract.total_paid ?? 0,
        remainingBalance: contract.balance_due ?? 0,
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Contract read failed' };
    }
  }

  /**
   * الحصول على ملخص أرصدة الحسابات
   */
  async getAccountBalanceSummary(
    companyId: string,
    options: { accountType?: string; accountLevel?: number; startDate?: string; endDate?: string } = {}
  ) {
    try {
      requireFinanceCompany(companyId);
      if (options.startDate && options.endDate && options.startDate > options.endDate)
        throw new Error('Invalid reporting date range');
      const closing = await readAccountBalances(companyId, options.endDate, options.accountType);
      let opening: Awaited<ReturnType<typeof readAccountBalances>> = [];
      if (options.startDate) {
        const date = new Date(options.startDate + 'T00:00:00Z');
        date.setUTCDate(date.getUTCDate() - 1);
        opening = await readAccountBalances(companyId, date.toISOString().slice(0, 10), options.accountType);
      }
      const levels = await readFinancialPages((from, to) =>
        supabase
          .from('chart_of_accounts')
          .select('id,account_level', { count: 'exact' })
          .eq('company_id', companyId)
          .order('id')
          .range(from, to)
      );
      const accounts: AccountBalance[] = closing
        .map((row) => {
          const prior = opening.find((item) => item.account_id === row.account_id);
          return {
            accountId: row.account_id,
            accountCode: row.account_code,
            accountName: row.account_name,
            accountLevel: levels.find((item) => item.id === row.account_id)?.account_level ?? 0,
            accountType: normalizeAccountType(row.account_type) as AccountBalance['accountType'],
            currentBalance: row.closing_balance,
            debitTotal: row.total_debits - (prior?.total_debits ?? 0),
            creditTotal: row.total_credits - (prior?.total_credits ?? 0),
            lastTransactionDate: null,
          };
        })
        .filter((row) => !options.accountLevel || row.accountLevel >= options.accountLevel);
      const totalDebit = accounts.reduce((sum, row) => sum + row.debitTotal, 0);
      const totalCredit = accounts.reduce((sum, row) => sum + row.creditTotal, 0);
      return { success: true, accounts, totalDebit, totalCredit, totalBalance: totalCredit - totalDebit };
    } catch (error) {
      return {
        success: false,
        accounts: [] as AccountBalance[],
        totalDebit: 0,
        totalCredit: 0,
        totalBalance: 0,
        error: error instanceof Error ? error.message : 'Accounting read failed',
      };
    }
  }

  /**
   * تحرير قيد محاسبي (إنشاء قيد عكسي)
   */
  async reverseJournalEntry(
    journalEntryId: string,
    reversalReason: string,
    userId?: string,
    companyId?: string
  ): Promise<{
    success: boolean;
    reversalEntryId?: string;
    error?: string;
  }> {
    try {
      requireFinanceCompany(companyId);
      const { error: scopeError } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('id', journalEntryId)
        .eq('company_id', companyId)
        .single();
      if (scopeError) throw scopeError;
      logger.info('Reversing journal entry', { journalEntryId, reversalReason });

      const normalizedReason = reversalReason.trim();
      if (!normalizedReason) {
        return { success: false, error: 'سبب عكس القيد مطلوب' };
      }

      const actorId = userId || (await supabase.auth.getUser()).data.user?.id;
      if (!actorId) {
        return { success: false, error: 'يجب تسجيل الدخول قبل عكس القيد' };
      }

      const { data: reversalEntryId, error: reversalError } = await supabase.rpc('reverse_journal_entry', {
        entry_id: journalEntryId,
        reversal_reason: normalizedReason,
        reversed_by_user: actorId,
      });

      if (reversalError || !reversalEntryId) {
        throw reversalError || new Error('فشل في إنشاء القيد العكسي');
      }

      logger.info('Journal entry reversed', {
        originalEntryId: journalEntryId,
        reversalEntryId,
        reversalReason: normalizedReason,
        companyId,
      });

      return {
        success: true,
        reversalEntryId,
      };
    } catch (error) {
      logger.error('Failed to reverse journal entry', { journalEntryId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'خطأ غير معروف',
      };
    }
  }
}

// Export singleton instance
export const accountingService = new AccountingService();
