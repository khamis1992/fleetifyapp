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
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'assets') return 'asset';
  if (normalized === 'liabilities') return 'liability';
  if (normalized === 'expenses') return 'expense';
  if (normalized === 'income') return 'revenue';
  return normalized;
};

const calculateBalanceByType = (accountType: string | null | undefined, debit: number, credit: number) => {
  const normalizedType = normalizeAccountType(accountType);
  if (['asset', 'expense'].includes(normalizedType)) {
    return debit - credit;
  }
  return credit - debit;
};

class AccountingService {
  /**
   * تحديث أرصدة الحسابات بعد دفعة
   */
  async updateAccountBalances(
    paymentId: string,
    companyId: string,
    options: {
      skipJournalEntryCheck?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    updatedAccounts: AccountBalance[];
    errors: string[];
  }> {
    try {
      logger.info('Updating account balances', { paymentId });

      // 1. جلب الدفعة مع القيد المحاسبي
      const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (!payment) {
        return {
          success: false,
          updatedAccounts: [],
          errors: ['الدفعة غير موجودة']
        };
      }

      // 2. التحقق من وجود قيد محاسبي
      let journalEntryId = payment.journal_entry_id as string | null;

      if (!journalEntryId) {
        const { data: referencedJournalEntry } = await supabase
          .from('journal_entries')
          .select('id')
          .eq('company_id', companyId)
          .eq('reference_type', 'payment')
          .eq('reference_id', paymentId)
          .maybeSingle();

        journalEntryId = referencedJournalEntry?.id || null;
      }

      if (!options.skipJournalEntryCheck && !journalEntryId) {
        return {
          success: false,
          updatedAccounts: [],
          errors: ['Payment has no accounting journal entry']
        };
      }

      const { data: journalEntryLines, error: journalLinesError } = journalEntryId
        ? await supabase
          .from('journal_entry_lines')
          .select('id,line_number,account_id,debit_amount,credit_amount,line_description')
          .eq('journal_entry_id', journalEntryId)
        : { data: [], error: null };

      if (journalLinesError) {
        throw journalLinesError;
      }

      const accountIds = journalEntryLines
        ?.map(line => line.account_id)
        .filter(id => id) as string[] || [];

      if (accountIds.length === 0) {
        return {
          success: true,
          updatedAccounts: [],
          errors: ['لا توجد حسابات للتحديث']
        };
      }

      // 4. جلب الحسابات من جدول chart_of_accounts
      const { data: accounts } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('company_id', companyId)
        .in('id', accountIds);

      if (!accounts || accounts.length === 0) {
        return {
          success: false,
          updatedAccounts: [],
          errors: ['الحسابات غير موجودة']
        };
      }

      // 5. حساب الأرصدة الجديدة
      const updatedAccounts: AccountBalance[] = [];
      const errors: string[] = [];

      for (const account of accounts) {
        try {
          // الحصول على الرصيد الحالي
          const currentBalanceResult = await this.getAccountBalance(account.id);

          // Recalculate the full posted ledger balance, then persist it for screens
          // that read chart_of_accounts.current_balance directly.
          const newBalance = currentBalanceResult.balance || 0;

          const { error: balanceUpdateError } = await supabase
            .from('chart_of_accounts')
            .update({
              current_balance: newBalance,
              updated_at: new Date().toISOString(),
            })
            .eq('id', account.id)
            .eq('company_id', companyId);

          if (balanceUpdateError) {
            throw balanceUpdateError;
          }

          logger.debug('Account balance updated', {
            accountId: account.id,
            accountCode: account.account_code,
            newBalance
          });

          updatedAccounts.push({
            accountId: account.id,
            accountCode: account.account_code,
            accountName: account.account_name,
            accountLevel: account.account_level,
            accountType: normalizeAccountType(account.account_type) as AccountBalance['accountType'],
            currentBalance: newBalance,
            debitTotal: currentBalanceResult.debitTotal,
            creditTotal: currentBalanceResult.creditTotal,
            lastTransactionDate: payment.payment_date
          });

        } catch (error) {
          errors.push(`فشل في تحديث حساب ${account.account_code}: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
        }
      }

      // 6. تحديث حالة الفاتورة المرتبطة
      if (payment.invoice_id && payment.payment_status === 'completed') {
        await this.updateInvoicePaymentStatus(payment.invoice_id, paymentId, payment.amount);
      }

      // 7. تحديث حالة العقد المرتبط
      if (payment.contract_id && payment.payment_status === 'completed') {
        await this.updateContractPaymentStatus(payment.contract_id, paymentId, payment.amount);
      }

      logger.info('Account balances updated', {
        paymentId,
        updatedAccounts: updatedAccounts.length,
        errors: errors.length
      });

      return {
        success: errors.length === 0,
        updatedAccounts,
        errors
      };
    } catch (error) {
      logger.error('Failed to update account balances', { paymentId, error });
      return {
        success: false,
        updatedAccounts: [],
        errors: [error instanceof Error ? error.message : 'خطأ غير معروف']
      };
    }
  }

  /**
   * الحصول على رصيد حساب محدد
   */
  async getAccountBalance(accountId: string): Promise<{
    balance: number;
    debitTotal: number;
    creditTotal: number;
  }> {
    try {
      const { data: account } = await supabase
        .from('chart_of_accounts')
        .select('account_type')
        .eq('id', accountId)
        .maybeSingle();

      // حساب الرصيد من journal_entry_lines
      const { data: lines } = await supabase
        .from('journal_entry_lines')
        .select(`
          debit_amount,
          credit_amount,
          journal_entries!inner(status)
        `)
        .eq('account_id', accountId)
        .eq('journal_entries.status', 'posted');

      const debitTotal = lines?.reduce((sum, line) => sum + (line.debit_amount || 0), 0) || 0;
      const creditTotal = lines?.reduce((sum, line) => sum + (line.credit_amount || 0), 0) || 0;
      const balance = calculateBalanceByType(account?.account_type, debitTotal, creditTotal);

      return {
        balance,
        debitTotal,
        creditTotal
      };
    } catch (error) {
      logger.error('Failed to get account balance', { accountId, error });
      return {
        balance: 0,
        debitTotal: 0,
        creditTotal: 0
      };
    }
  }

  /**
   * تحديث أرصدة حسابات متعددة
   */
  async updateMultipleAccountBalances(
    accountIds: string[],
    companyId: string
  ): Promise<{
    success: boolean;
    updatedAccounts: AccountBalance[];
    errors: string[];
  }> {
    try {
      const updatedAccounts: AccountBalance[] = [];
      const errors: string[] = [];

      for (const accountId of accountIds) {
        try {
          const { data: account } = await supabase
            .from('chart_of_accounts')
            .select('*')
            .eq('id', accountId)
            .eq('company_id', companyId)
            .single();

          if (!account) {
            errors.push(`الحساب ${accountId} غير موجود`);
            continue;
          }

          const balanceResult = await this.getAccountBalance(accountId);

          const { error: balanceUpdateError } = await supabase
            .from('chart_of_accounts')
            .update({
              current_balance: balanceResult.balance,
              updated_at: new Date().toISOString(),
            })
            .eq('id', account.id)
            .eq('company_id', companyId);

          if (balanceUpdateError) {
            throw balanceUpdateError;
          }

          updatedAccounts.push({
            accountId: account.id,
            accountCode: account.account_code,
            accountName: account.account_name,
            accountLevel: account.account_level,
            accountType: normalizeAccountType(account.account_type) as AccountBalance['accountType'],
            currentBalance: balanceResult.balance,
            debitTotal: balanceResult.debitTotal,
            creditTotal: balanceResult.creditTotal,
            lastTransactionDate: null // لا يمكن تحديده بدون معاملة معينة
          });

        } catch (error) {
          errors.push(`فشل في حساب رصيد حساب ${accountId}: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
        }
      }

      return {
        success: errors.length === 0,
        updatedAccounts,
        errors
      };
    } catch (error) {
      logger.error('Failed to update multiple account balances', { accountIds, error });
      return {
        success: false,
        updatedAccounts: [],
        errors: [error instanceof Error ? error.message : 'خطأ غير معروف']
      };
    }
  }

  /**
   * تحديث حالة فاتورة بعد دفع
   */
  async updateInvoicePaymentStatus(
    invoiceId: string,
    paymentId: string,
    paymentAmount: number
  ): Promise<InvoiceStatusUpdateResult> {
    try {
      logger.info('Updating invoice payment status', { invoiceId, paymentId });

      // 1. جلب الفاتورة
      const { data: invoice } = await supabase
        .from('invoices')
        .select(`
          *,
          payments!invoices_payment_id_fkey (
            id,
            amount,
            payment_status
          )
        `)
        .eq('id', invoiceId)
        .single();

      if (!invoice) {
        return {
          success: false,
          error: 'الفاتورة غير موجودة'
        };
      }

      const previousStatus = invoice.payment_status;
      const previousPaidAmount = invoice.paid_amount || 0;
      const previousBalanceDue = invoice.balance_due || invoice.total_amount;

      // 2. حساب المبالغ الجديدة
      const totalPaid = previousPaidAmount + paymentAmount;
      const balanceDue = invoice.total_amount - totalPaid;

      // 3. تحديد الحالة الجديدة
      let newStatus: string;
      if (balanceDue <= 0.01) { // ضمن تسامح صغير للأرقام العشرية
        newStatus = 'paid';
      } else if (totalPaid > 0) {
        newStatus = 'partial';
      } else {
        newStatus = invoice.payment_status; // لا تغيير إذا لم يدفع شيء
      }

      // 4. تحديث الفاتورة
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          paid_amount: totalPaid,
          balance_due: Math.max(0, balanceDue),
          payment_status: newStatus,
          payment_date: newStatus === 'paid' ? new Date().toISOString() : invoice.payment_date,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId);

      if (updateError) {
        throw updateError;
      }

      logger.info('Invoice payment status updated', {
        invoiceId,
        previousStatus,
        newStatus,
        paymentAmount,
        totalPaid,
        balanceDue
      });

      return {
        success: true,
        previousStatus,
        newStatus,
        paidAmount: totalPaid,
        remainingBalance: Math.max(0, balanceDue)
      };
    } catch (error) {
      logger.error('Failed to update invoice payment status', { invoiceId, paymentId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'خطأ غير معروف'
      };
    }
  }

  /**
   * تحديث حالة عقد بعد دفع
   */
  async updateContractPaymentStatus(
    contractId: string,
    paymentId: string,
    paymentAmount: number
  ): Promise<ContractStatusUpdateResult> {
    try {
      logger.info('Updating contract payment status', { contractId, paymentId });

      // 1. جلب العقد
      const { data: contract } = await supabase
        .from('contracts')
        .select(`
          *,
          payments!contracts_payment_id_fkey (
            id,
            amount,
            payment_status
          )
        `)
        .eq('id', contractId)
        .single();

      if (!contract) {
        return {
          success: false,
          error: 'العقد غير موجود'
        };
      }

      const previousTotalPaid = contract.total_paid || 0;

      // 2. حساب المبالغ الجديدة
      const totalPaid = previousTotalPaid + paymentAmount;
      const remainingBalance = contract.contract_amount - totalPaid;

      // 3. تحديث العقد
      const { error: updateError } = await supabase
        .from('contracts')
        .update({
          total_paid: totalPaid,
          remaining_balance: remainingBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', contractId);

      if (updateError) {
        throw updateError;
      }

      logger.info('Contract payment status updated', {
        contractId,
        paymentAmount,
        totalPaid,
        remainingBalance
      });

      return {
        success: true,
        totalPaid,
        remainingBalance
      };
    } catch (error) {
      logger.error('Failed to update contract payment status', { contractId, paymentId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'خطأ غير معروف'
      };
    }
  }

  /**
   * الحصول على ملخص أرصدة الحسابات
   */
  async getAccountBalanceSummary(
    companyId: string,
    options: {
      accountType?: string;
      accountLevel?: number;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<{
    success: boolean;
    accounts: AccountBalance[];
    totalDebit: number;
    totalCredit: number;
    totalBalance: number;
    error?: string;
  }> {
    try {
      let query = supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_header', false) // فقط الحسابات النشطة

      if (options.accountType) {
        query = query.eq('account_type', options.accountType);
      }

      if (options.accountLevel) {
        query = query.gte('account_level', options.accountLevel);
      }

      const { data: accounts } = await query;

      if (!accounts) {
        return {
          success: false,
          accounts: [],
          totalDebit: 0,
          totalCredit: 0,
          totalBalance: 0,
          error: 'لا توجد حسابات'
        };
      }

      // حساب الأرصدة لكل حساب
      const accountBalances: AccountBalance[] = [];
      let totalDebit = 0;
      let totalCredit = 0;

      for (const account of accounts) {
        const balanceResult = await this.getAccountBalance(account.id);
        
        accountBalances.push({
          accountId: account.id,
          accountCode: account.account_code,
          accountName: account.account_name,
          accountLevel: account.account_level,
          accountType: account.account_type,
          currentBalance: balanceResult.balance,
          debitTotal: balanceResult.debitTotal,
          creditTotal: balanceResult.creditTotal,
          lastTransactionDate: null
        });

        totalDebit += balanceResult.debitTotal;
        totalCredit += balanceResult.creditTotal;
      }

      return {
        success: true,
        accounts: accountBalances,
        totalDebit,
        totalCredit,
        totalBalance: totalCredit - totalDebit
      };
    } catch (error) {
      logger.error('Failed to get account balance summary', { companyId, error });
      return {
        success: false,
        accounts: [],
        totalDebit: 0,
        totalCredit: 0,
        totalBalance: 0,
        error: error instanceof Error ? error.message : 'خطأ غير معروف'
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
      logger.info('Reversing journal entry', { journalEntryId, reversalReason });

      const normalizedReason = reversalReason.trim();
      if (!normalizedReason) {
        return { success: false, error: 'سبب عكس القيد مطلوب' };
      }

      const actorId = userId || (await supabase.auth.getUser()).data.user?.id;
      if (!actorId) {
        return { success: false, error: 'يجب تسجيل الدخول قبل عكس القيد' };
      }

      const { data: reversalEntryId, error: reversalError } = await supabase.rpc(
        'reverse_journal_entry',
        {
          entry_id: journalEntryId,
          reversal_reason: normalizedReason,
          reversed_by_user: actorId,
        },
      );

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
        error: error instanceof Error ? error.message : 'خطأ غير معروف'
      };
    }
  }
}

// Export singleton instance
export const accountingService = new AccountingService();
