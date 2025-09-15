import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface JournalEntryData {
  entryNumber: string;
  entryDate: string;
  description: string;
  totalAmount: number;
  lines: JournalEntryLine[];
  sourceType: 'payment' | 'invoice' | 'contract' | 'manual';
  sourceId?: string;
}

export interface JournalEntryLine {
  accountId: string;
  accountCode?: string;
  accountName?: string;
  debitAmount: number;
  creditAmount: number;
  description: string;
  costCenterId?: string;
}

export interface AccountingIntegrationResult {
  success: boolean;
  journalEntryId?: string;
  journalEntryNumber?: string;
  validationErrors?: string[];
  warnings?: string[];
}

class AccountingIntegration {
  async createJournalEntry(entryData: JournalEntryData, companyId: string): Promise<AccountingIntegrationResult> {
    try {
      logger.debug('Creating journal entry', { entryNumber: entryData.entryNumber });

      // Validate entry data
      const validation = await this.validateJournalEntry(entryData, companyId);
      if (!validation.isValid) {
        return {
          success: false,
          validationErrors: validation.errors
        };
      }

      // Create journal entry header
      const { data: journalEntry, error: headerError } = await supabase
        .from('journal_entries')
        .insert({
          company_id: companyId,
          entry_number: entryData.entryNumber,
          entry_date: entryData.entryDate,
          description: entryData.description,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select('id')
        .single();

      if (headerError) throw headerError;

      // Create journal entry lines
      const lines = entryData.lines.map((line, index) => ({
        journal_entry_id: journalEntry.id,
        line_number: index + 1,
        account_id: line.accountId,
        description: line.description,
        debit_amount: line.debitAmount,
        credit_amount: line.creditAmount,
        cost_center_id: line.costCenterId || null
      }));

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(lines);

      if (linesError) throw linesError;

      // Update account balances (simplified)
      // await this.updateAccountBalances(entryData.lines, companyId);

      logger.info('Journal entry created successfully', { 
        journalEntryId: journalEntry.id,
        entryNumber: entryData.entryNumber
      });

      return {
        success: true,
        journalEntryId: journalEntry.id,
        journalEntryNumber: entryData.entryNumber,
        warnings: validation.warnings
      };
    } catch (error) {
      logger.error('Failed to create journal entry', { error, entryNumber: entryData.entryNumber });
      return {
        success: false,
        validationErrors: [error instanceof Error ? error.message : 'خطأ في إنشاء القيد المحاسبي']
      };
    }
  }

  private async validateJournalEntry(entryData: JournalEntryData, companyId: string) {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if entry number is unique
    const { data: existingEntry } = await supabase
      .from('journal_entries')
      .select('id')
      .eq('company_id', companyId)
      .eq('entry_number', entryData.entryNumber)
      .maybeSingle();

    if (existingEntry) {
      errors.push('رقم القيد المحاسبي موجود مسبقاً');
    }

    // Validate balance (debits = credits)
    const totalDebits = entryData.lines.reduce((sum, line) => sum + line.debitAmount, 0);
    const totalCredits = entryData.lines.reduce((sum, line) => sum + line.creditAmount, 0);
    
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      errors.push('إجمالي المدين لا يساوي إجمالي الدائن');
    }

    // Validate account existence
    const accountIds = entryData.lines.map(line => line.accountId);
    const { data: accounts } = await supabase
      .from('chart_of_accounts')
      .select('id, account_name, is_active')
      .eq('company_id', companyId)
      .in('id', accountIds) as any;

    const foundAccountIds = new Set(accounts?.map(acc => acc.id) || []);
    const missingAccounts = accountIds.filter(id => !foundAccountIds.has(id));
    
    if (missingAccounts.length > 0) {
      errors.push(`حسابات غير موجودة: ${missingAccounts.length} حساب`);
    }

    // Check for inactive accounts
    const inactiveAccounts = accounts?.filter(acc => !acc.is_active) || [];
    if (inactiveAccounts.length > 0) {
      warnings.push(`حسابات غير نشطة: ${inactiveAccounts.map(acc => acc.account_name).join(', ')}`);
    }

    // Validate amounts
    const hasNegativeAmounts = entryData.lines.some(line => 
      line.debitAmount < 0 || line.creditAmount < 0
    );
    
    if (hasNegativeAmounts) {
      errors.push('لا يمكن أن تكون المبالغ سالبة');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private async updateAccountBalances(lines: JournalEntryLine[], companyId: string) {
    for (const line of lines) {
      const balanceChange = line.debitAmount - line.creditAmount;
      
      if (balanceChange !== 0) {
        // Update account balance (simplified version)
        const { error } = await supabase
          .from('chart_of_accounts')
          .update({ 
            current_balance: balanceChange 
          })
          .eq('id', line.accountId);

        if (error) {
          logger.error('Failed to update account balance', { error, accountId: line.accountId });
        }
      }
    }
  }

  async reverseJournalEntry(journalEntryId: string, reason: string): Promise<AccountingIntegrationResult> {
    try {
      // Get original entry
      const { data: originalEntry, error: fetchError } = await supabase
        .from('journal_entries')
        .select(`
          *,
          journal_entry_lines (*)
        `)
        .eq('id', journalEntryId)
        .single();

      if (fetchError) throw fetchError;

      // Create reversal entry
      const reversalEntryNumber = `REV-${originalEntry.entry_number}`;
      const reversalLines: JournalEntryLine[] = originalEntry.journal_entry_lines.map((line: any) => ({
        accountId: line.account_id,
        debitAmount: line.credit_amount, // Swap debits and credits
        creditAmount: line.debit_amount,
        description: `عكس: ${line.description}`,
        costCenterId: line.cost_center_id
      }));

      const reversalData: JournalEntryData = {
        entryNumber: reversalEntryNumber,
        entryDate: new Date().toISOString().split('T')[0],
        description: `عكس قيد: ${originalEntry.description} - السبب: ${reason}`,
        totalAmount: 0, // Will be calculated from lines
        lines: reversalLines,
        sourceType: 'manual',
        sourceId: journalEntryId
      };

      const result = await this.createJournalEntry(reversalData, originalEntry.company_id);

      if (result.success) {
        // Mark original entry as reversed
        await supabase
          .from('journal_entries')
          .update({ 
            status: 'reversed',
            notes: `تم العكس بالقيد رقم: ${reversalEntryNumber}`
          })
          .eq('id', journalEntryId);
      }

      return result;
    } catch (error) {
      logger.error('Failed to reverse journal entry', { error, journalEntryId });
      return {
        success: false,
        validationErrors: [error instanceof Error ? error.message : 'خطأ في عكس القيد المحاسبي']
      };
    }
  }

  async getJournalEntryPreview(sourceType: string, sourceId: string): Promise<JournalEntryData | null> {
    try {
      switch (sourceType) {
        case 'payment':
          return await this.generatePaymentJournalPreview(sourceId);
        case 'invoice':
          return await this.generateInvoiceJournalPreview(sourceId);
        case 'contract':
          return await this.generateContractJournalPreview(sourceId);
        default:
          return null;
      }
    } catch (error) {
      logger.error('Failed to generate journal preview', { error, sourceType, sourceId });
      return null;
    }
  }

  private async generatePaymentJournalPreview(paymentId: string): Promise<JournalEntryData | null> {
      const { data: payment, error } = await supabase
        .from('payments')
        .select(`
          *,
          customers (id, customer_name),
          contracts (id, contract_number)
        `)
        .eq('id', paymentId)
        .single();

    if (error || !payment) return null;

    const entryNumber = `JE-PAY-${new Date().toISOString().slice(0, 10)}-${payment.payment_number}`;
    
    // Get cash account
    const { data: cashAccount } = await supabase
      .from('chart_of_accounts')
      .select('id, account_name, account_code')
      .eq('company_id', payment.company_id)
      .eq('account_type', 'current_assets')
      .ilike('account_name', '%cash%')
      .limit(1)
      .single();

    // Get revenue account
    const { data: revenueAccount } = await supabase
      .from('chart_of_accounts')
      .select('id, account_name, account_code')
      .eq('company_id', payment.company_id)
      .eq('account_type', 'revenue')
      .limit(1)
      .single();

    const lines: JournalEntryLine[] = [];

    if (cashAccount) {
      lines.push({
        accountId: cashAccount.id,
        accountCode: cashAccount.account_code,
        accountName: cashAccount.account_name,
        debitAmount: payment.amount,
        creditAmount: 0,
        description: `دفعة نقدية من ${(payment.customers as any)?.customer_name || 'عميل'}`
      });
    }

    if (revenueAccount) {
      lines.push({
        accountId: revenueAccount.id,
        accountCode: revenueAccount.account_code,
        accountName: revenueAccount.account_name,
        debitAmount: 0,
        creditAmount: payment.amount,
        description: `إيرادات من ${(payment.customers as any)?.customer_name || 'عميل'}`
      });
    }

    return {
      entryNumber,
      entryDate: payment.payment_date,
      description: `دفعة رقم ${payment.payment_number}`,
      totalAmount: payment.amount,
      lines,
      sourceType: 'payment',
      sourceId: paymentId
    };
  }

  private async generateInvoiceJournalPreview(invoiceId: string): Promise<JournalEntryData | null> {
    // Implementation for invoice journal preview
    return null;
  }

  private async generateContractJournalPreview(contractId: string): Promise<JournalEntryData | null> {
    // Implementation for contract journal preview
    return null;
  }
}

export const accountingIntegration = new AccountingIntegration();