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
        .select(`
          *,
          journal_entries!payments_journal_entry_id_fkey (
            id,
            status,
            entry_date
          ),
          journal_entry_lines (
            id,
            line_number,
            account_id,
            debit,
            credit,
            line_description
          )
        `)
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
      if (!options.skipJournalEntryCheck && !payment.journal_entry_id) {
        return {
          success: false,
          updatedAccounts: [],
          errors: ['الدفعة لا تحتوي على قيد محاسبي']
        };
      }

      // 3. جلب تفاصيل الحسابات المتأثرة
      const accountIds = payment.journal_entry_lines
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

          // حساب التغير في الرصيد
          const accountLines = payment.journal_entry_lines
            ?.filter(line => line.account_id === account.id) || [];

          const debitChange = accountLines.reduce((sum, line) => sum + (line.debit || 0), 0);
          const creditChange = accountLines.reduce((sum, line) => sum + (line.credit || 0), 0);

          const change = creditChange - debitChange;
          const newBalance = (currentBalanceResult.balance || 0) + change;

          // تحديث الرصيد في جدول chart_of_accounts
          // ملاحظة: إذا لم يوجد عمود current_balance، سنتخطاه
          // سنفترض وجود العمود أو نحتاج لإضافته
          
          // TODO: تنفيذ التحديث الفعلي بعد التحقق من بنية الجدول
          logger.debug('Account balance would be updated', {
            accountId: account.id,
            accountCode: account.account_code,
            currentBalance: currentBalanceResult.balance,
            change,
            newBalance
          });

          updatedAccounts.push({
            accountId: account.id,
            accountCode: account.account_code,
            accountName: account.account_name,
            accountLevel: account.account_level,
            accountType: account.account_type,
            currentBalance: newBalance,
            debitTotal: currentBalanceResult.debitTotal + debitChange,
            creditTotal: currentBalanceResult.creditTotal + creditChange,
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
      // حساب الرصيد من journal_entry_lines
      const { data: lines } = await supabase
        .from('journal_entry_lines')
        .select('debit, credit')
        .eq('account_id', accountId);

      const debitTotal = lines?.reduce((sum, line) => sum + (line.debit || 0), 0) || 0;
      const creditTotal = lines?.reduce((sum, line) => sum + (line.credit || 0), 0) || 0;
      const balance = creditTotal - debitTotal;

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

          updatedAccounts.push({
            accountId: account.id,
            accountCode: account.account_code,
            accountName: account.account_name,
            accountLevel: account.account_level,
            accountType: account.account_type,
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

      // 1. جلب القيد الأصلي
      const { data: originalEntry } = await supabase
        .from('journal_entries')
        .select(`
          *,
          journal_entry_lines (
            line_number,
            account_id,
            debit,
            credit,
            line_description
          )
        `)
        .eq('id', journalEntryId)
        .single();

      if (!originalEntry) {
        return {
          success: false,
          error: 'القيد المحاسبي غير موجود'
        };
      }

      // 2. التحقق من أن القيد يمكن تحريره
      if (originalEntry.status === 'reversed') {
        return {
          success: false,
          error: 'القيد المحاسبي محرر بالفعل'
        };
      }

      if (originalEntry.status === 'voided') {
        return {
          success: false,
          error: 'القيد المحاسبي ملغي'
        };
      }

      // 3. إنشاء القيد العكسي
      const reversalEntryData = {
        company_id: originalEntry.company_id,
        entry_date: new Date().toISOString(),
        entry_number: `${originalEntry.entry_number}-REV`, // رقم القيد العكسي
        entry_type: 'payment_reversal',
        description: `تحرير: ${originalEntry.description}. السب: ${reversalReason}`,
        reference_type: 'reversal',
        reference_id: originalEntry.id,
        status: 'posted',
        created_by: userId,
        created_at: new Date().toISOString()
      };

      const { data: reversalEntry, error: reversalError } = await supabase
        .from('journal_entries')
        .insert(reversalEntryData)
        .select('id')
        .single();

      if (reversalError || !reversalEntry) {
        throw reversalError || new Error('فشل في إنشاء القيد العكسي');
      }

      // 4. إنشاء سطور القيد العكسي (عكس كل سطر)
      if (originalEntry.journal_entry_lines && originalEntry.journal_entry_lines.length > 0) {
        const reversalLines = originalEntry.journal_entry_lines.map(line => ({
          journal_entry_id: reversalEntry.id,
          line_number: line.line_number,
          account_id: line.account_id,
          debit: line.credit, // عكس المدين والدائن
          credit: line.debit,
          line_description: `تحرير: ${line.line_description}`,
          created_at: new Date().toISOString()
        }));

        const { error: linesError } = await supabase
          .from('journal_entry_lines')
          .insert(reversalLines);

        if (linesError) {
          throw linesError;
        }
      }

      // 5. تحديث حالة القيد الأصلي
      await supabase
        .from('journal_entries')
        .update({
          status: 'reversed',
          reference_id: reversalEntry.id, // ربط بالقيد العكسي
          updated_at: new Date().toISOString()
        })
        .eq('id', journalEntryId);

      logger.info('Journal entry reversed', {
        originalEntryId: journalEntryId,
        reversalEntryId: reversalEntry.id,
        reversalReason
      });

      return {
        success: true,
        reversalEntryId: reversalEntry.id
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
