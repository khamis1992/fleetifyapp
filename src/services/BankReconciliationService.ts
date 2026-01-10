/**
 * Bank Reconciliation Service
 * 
 * إدارة عملية التسوية البنكية:
 * - استيراد سجلات البنوك (CSV/Excel/Manual)
 * - مطابقة المدفوعات مع السجلات
 * - تحديث reconciliation_status
 * - إدارة الفروقات (discrepancies)
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface BankTransaction {
  id: string;
  companyId: string;
  transactionDate: string;
  amount: number;
  currency: string;
  referenceNumber?: string;
  description?: string;
  accountNumber?: string;
  accountName?: string;
  transactionType: 'credit' | 'debit'; // وديت/مدين
  status: 'pending' | 'matched' | 'discrepancy' | 'cancelled';
  uploadedAt: string;
  uploadedBy?: string;
}

export interface ReconciliationMatch {
  bankTransactionId: string;
  paymentId: string;
  matchType: 'exact' | 'partial' | 'manual';
  confidence: number; // 0-100
  amountDifference: number;
  notes?: string;
  matchedAt: string;
  matchedBy?: string;
}

export interface ReconciliationSummary {
  companyId: string;
  period: {
    startDate: string;
    endDate: string;
  };
  totalBankTransactions: number;
  totalPayments: number;
  matchedTransactions: number;
  unmatchedBankTransactions: number;
  unmatchedPayments: number;
  discrepancies: number;
  totalAmountMatched: number;
  averageConfidence: number;
}

class BankReconciliationService {
  /**
   * استيراد معاملات بنكية من CSV
   */
  async importFromCSV(
    companyId: string,
    csvData: string,
    options: {
      skipFirstRow?: boolean;
      dateColumn?: string;
      amountColumn?: string;
      referenceColumn?: string;
      accountColumn?: string;
    } = {}
  ): Promise<{
    success: boolean;
    importedCount: number;
    errors: string[];
    transactions: BankTransaction[];
  }> {
    try {
      logger.info('Starting bank transactions CSV import', {
        companyId,
        csvLength: csvData.length
      });

      const lines = csvData.split('\n');
      const errors: string[] = [];
      const transactions: BankTransaction[] = [];

      const skipFirst = options.skipFirstRow !== false; // افتراضياً يتخطأ الصف الأول
      const dateCol = options.dateColumn || 'date';
      const amountCol = options.amountColumn || 'amount';
      const refCol = options.referenceColumn || 'reference';
      const acctCol = options.accountColumn || 'account';

      // تحليل الصف الأول للحصول على الأعمدة
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

      logger.info('CSV headers detected', { headers });

      for (let i = skipFirst ? 0 : 1; i < lines.length; i++) {
        try {
          const line = lines[i].trim();
          if (!line) continue;

          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));

          if (values.length < headers.length) {
            errors.push(`السطر ${i + 1}: عدد الأعمدة غير كاف`);
            continue;
          }

          // إنشاء كائن المعاملة
          const dateStr = this.getValue(headers, values, dateCol);
          const amountStr = this.getValue(headers, values, amountCol);
          const referenceStr = this.getValue(headers, values, refCol);
          const accountStr = this.getValue(headers, values, acctCol);

          // التحقق من البيانات
          const amount = parseFloat(amountStr);
          const transactionDate = this.parseDate(dateStr);

          if (!amount || isNaN(amount)) {
            errors.push(`السطر ${i + 1}: المبلغ غير صحيح (${amountStr})`);
            continue;
          }

          if (!transactionDate) {
            errors.push(`السطر ${i + 1}: التاريخ غير صحيح (${dateStr})`);
            continue;
          }

          const transaction: Omit<BankTransaction, 'id' | 'companyId' | 'uploadedAt' | 'status'> = {
            transactionDate: transactionDate.toISOString(),
            amount,
            currency: 'QAR',
            referenceNumber: referenceStr || undefined,
            description: values[headers.indexOf('description')]?.trim(),
            accountNumber: accountStr || undefined,
            accountName: values[headers.indexOf('account_name')]?.trim(),
            transactionType: amount >= 0 ? 'credit' : 'debit',
            uploadedBy: undefined // سيتم تعيينه لاحقاً
          };

          transactions.push(transaction);

        } catch (lineError) {
          errors.push(`السطر ${i + 1}: ${lineError instanceof Error ? lineError.message : 'خطأ غير معروف'}`);
        }
      }

      if (errors.length > 0) {
        logger.warn('Bank import has errors', { errorCount: errors.length });
        return {
          success: false,
          importedCount: 0,
          errors,
          transactions: []
        };
      }

      // حفظ المعاملات
      if (transactions.length > 0) {
        const { data: savedTransactions } = await supabase
          .from('bank_transactions')
          .insert(transactions.map(t => ({
            company_id: companyId,
            ...t,
            uploaded_at: new Date().toISOString(),
            status: 'pending'
          })))
          .select('id');

        logger.info('Bank transactions imported', {
          companyId,
          count: savedTransactions.length,
          firstId: savedTransactions[0].id,
          lastId: savedTransactions[savedTransactions.length - 1].id
        });

        return {
          success: true,
          importedCount: savedTransactions.length,
          errors: [],
          transactions: savedTransactions
        };
      }

      logger.warn('No valid bank transactions to import', { companyId });
      return {
        success: true,
        importedCount: 0,
        errors: [],
        transactions: []
      };
    } catch (error) {
      logger.error('Failed to import bank transactions', { companyId, error });
      return {
        success: false,
        importedCount: 0,
        errors: [error instanceof Error ? error.message : 'خطأ غير معروف'],
        transactions: []
      };
    }
  }

  /**
   * مطابقة المعاملات البنكية بالمدفوعات تلقائياً
   */
  async autoMatch(
    companyId: string,
    options: {
      minConfidence?: number; // 0-100
      maxAgeDays?: number; // لا تطابق معاملات أقدم من X يوم
      matchBy?: 'amount' | 'reference' | 'date' | 'combined'; // طريقة المطابقة
    } = {}
  ): Promise<{
    matches: ReconciliationMatch[];
    errors: string[];
  }> {
    try {
      logger.info('Starting automatic bank reconciliation', { companyId, options });

      const minConfidence = options.minConfidence || 70;
      const maxAgeDate = options.maxAgeDays 
        ? new Date(Date.now() - options.maxAgeDays * 24 * 60 * 60 * 1000)
        : undefined;

      // جلب المعاملات البنكية المعلقة
      const { data: bankTransactions } = await supabase
        .from('bank_transactions')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'pending')
        .order('transaction_date', { ascending: false });

      if (!bankTransactions || bankTransactions.length === 0) {
        logger.info('No pending bank transactions to match', { companyId });
        return {
          matches: [],
          errors: ['لا توجد معاملات بنكية معلقة']
        };
      }

      // تطبيق فilters التاريخ
      const filteredBankTransactions = maxAgeDate
        ? bankTransactions.filter(bt => new Date(bt.transactionDate) >= maxAgeDate)
        : bankTransactions;

      logger.info('Bank transactions loaded', {
        companyId,
        total: bankTransactions.length,
        filtered: filteredBankTransactions.length
      });

      // جلب المدفوعات
      const { data: payments } = await supabase
        .from('payments')
        .select('id, payment_number, payment_date, amount, invoice_id, contract_id, customer_id')
        .eq('company_id', companyId)
        .eq('payment_status', 'completed')
        .order('payment_date', { ascending: false });

      const matches: ReconciliationMatch[] = [];

      // مطابقة حسب الاستراتيجية
      for (const bankTx of filteredBankTransactions) {
        const paymentMatches = this.findMatchingPayments(
          bankTx,
          payments,
          options.matchBy || 'combined'
        );

        for (const paymentMatch of paymentMatches) {
          if (paymentMatch.confidence >= minConfidence) {
            matches.push({
              bankTransactionId: bankTx.id,
              paymentId: paymentMatch.paymentId,
              matchType: paymentMatch.matchType,
              confidence: paymentMatch.confidence,
              amountDifference: paymentMatch.amountDifference,
              matchedAt: new Date().toISOString()
            });
          }
        }
      }

      logger.info('Automatic reconciliation completed', {
        companyId,
        matchesCount: matches.length,
        strategy: options.matchBy
      });

      return {
        matches,
        errors: []
      };
    } catch (error) {
      logger.error('Failed automatic reconciliation', { companyId, error });
      return {
        matches: [],
        errors: [error instanceof Error ? error.message : 'خطأ غير معروف']
      };
    }
  }

  /**
   * البحث عن مدفوعات مطابقة لمعاملة بنكية
   */
  private findMatchingPayments(
    bankTx: BankTransaction,
    payments: any[],
    matchBy: string
  ): Array<{
    paymentId: string;
    matchType: 'exact' | 'partial' | 'manual';
    confidence: number;
    amountDifference: number;
  }> {
    const matches = [];

    if (matchBy === 'reference' || matchBy === 'combined') {
      // مطابقة بالرقم المرجع
      if (bankTx.referenceNumber) {
        for (const payment of payments) {
          const paymentRef = payment.reference_number || payment.agreement_number;
          
          if (paymentRef) {
            const confidence = paymentRef.toLowerCase() === bankTx.referenceNumber.toLowerCase() ? 100 : 80;
            matches.push({
              paymentId: payment.id,
              matchType: confidence === 100 ? 'exact' : 'manual',
              confidence,
              amountDifference: payment.amount - bankTx.amount
            });
          }
        }
      }
    }

    if (matchBy === 'amount' || matchBy === 'combined') {
      // مطابقة بالمبلغ (تسامح ±5%)
      const amountTolerance = Math.abs(bankTx.amount) * 0.05;

      for (const payment of payments) {
        const amountDiff = Math.abs(payment.amount - bankTx.amount);
        
        if (amountDiff <= amountTolerance) {
          const confidence = amountDiff === 0 ? 100 : 90;
          matches.push({
            paymentId: payment.id,
            matchType: confidence === 100 ? 'exact' : 'manual',
            confidence,
            amountDifference: payment.amount - bankTx.amount
          });
        }
      }
    }

    if (matchBy === 'date' || matchBy === 'combined') {
      // مطابقة بالتاريخ (خلال 3 أيام)
      const bankDate = new Date(bankTx.transactionDate);
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

      for (const payment of payments) {
        const paymentDate = new Date(payment.payment_date);
        const dateDiff = Math.abs(bankDate.getTime() - paymentDate.getTime());

        if (dateDiff <= threeDaysMs) {
          // فقط إذا كانت هناك أيضاً تطابق بالمرجع أو المبلغ
          const existingMatch = matches.find(m => m.paymentId === payment.id);
          
          if (!existingMatch) {
            const confidence = 60; // ثقة منخفضة للمطابقة بالتاريخ فقط
            matches.push({
              paymentId: payment.id,
              matchType: 'manual',
              confidence,
              amountDifference: payment.amount - bankTx.amount
            });
          }
        }
      }
    }

    return matches;
  }

  /**
   * تأكيد مطابقة يدوياً
   */
  async confirmMatch(
    bankTransactionId: string,
    paymentId: string,
    userId?: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      logger.info('Confirming bank reconciliation match', {
        bankTransactionId,
        paymentId
      });

      // تحديث حالة المعاملة البنكية
      const { error: bankError } = await supabase
        .from('bank_transactions')
        .update({
          status: 'matched',
          updated_at: new Date().toISOString()
        })
        .eq('id', bankTransactionId);

      if (bankError) {
        throw bankError;
      }

      // تحديث حالة الدفعة
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          reconciliation_status: 'matched',
          linked_confidence: 100,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (paymentError) {
        throw paymentError;
      }

      // إنشاء سجل المطابقة
      await supabase
        .from('reconciliation_matches')
        .insert({
          company_id: userId ? await this.getCompanyId(userId) : 'unknown',
          bank_transaction_id: bankTransactionId,
          payment_id: paymentId,
          match_type: 'manual',
          confidence: 100,
          matched_at: new Date().toISOString(),
          matched_by: userId
        });

      logger.info('Bank reconciliation match confirmed', {
        bankTransactionId,
        paymentId
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to confirm match', {
        bankTransactionId,
        paymentId,
        error
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'خطأ غير معروف'
      };
    }
  }

  /**
   * إنشاء فروق (discrepancy)
   */
  async createDiscrepancy(
    bankTransactionId: string,
    paymentId: string,
    options: {
      notes?: string;
      resolvedAs?: 'bank_correct' | 'payment_correct' | 'adjustment';
      userId?: string;
    } = {}
  ): Promise<{
    success: boolean;
    discrepancyId?: string;
    error?: string;
  }> {
    try {
      logger.info('Creating bank reconciliation discrepancy', {
        bankTransactionId,
        paymentId,
        options
      });

      // الحصول على تفاصيل المعاملة والدفعة
      const { data: bankTx } = await supabase
        .from('bank_transactions')
        .select('*')
        .eq('id', bankTransactionId)
        .single();

      const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (!bankTx || !payment) {
        return {
          success: false,
          error: 'المعاملة أو الدفعة غير موجودة'
        };
      }

      // تحديث الحالات إلى discrepancy
      await supabase
        .from('bank_transactions')
        .update({ status: 'discrepancy' })
        .eq('id', bankTransactionId);

      await supabase
        .from('payments')
        .update({ reconciliation_status: 'discrepancy' })
        .eq('id', paymentId);

      // إنشاء سجل الفرق
      const { data: discrepancy } = await supabase
        .from('reconciliation_discrepancies')
        .insert({
          company_id: bankTx.company_id,
          bank_transaction_id: bankTransactionId,
          payment_id: paymentId,
          amount_difference: payment.amount - bankTx.amount,
          bank_amount: bankTx.amount,
          payment_amount: payment.amount,
          notes: options.notes || 'فروق في المبلغ',
          resolved_as: options.resolvedAs,
          status: 'open',
          created_by: options.userId,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      logger.info('Bank discrepancy created', {
        discrepancyId: discrepancy.id,
        amountDifference: payment.amount - bankTx.amount
      });

      return {
        success: true,
        discrepancyId: discrepancy.id
      };
    } catch (error) {
      logger.error('Failed to create discrepancy', {
        bankTransactionId,
        paymentId,
        error
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'خطأ غير معروف'
      };
    }
  }

  /**
   * الحصول على ملخص التسوية
   */
  async getReconciliationSummary(
    companyId: string,
    options: {
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<ReconciliationSummary> {
    try {
      logger.info('Calculating reconciliation summary', { companyId, options });

      // تعيين نطاق التاريخ
      const startDate = options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = options.endDate || new Date().toISOString();

      // جلب المعاملات البنكية
      const { data: bankTransactions } = await supabase
        .from('bank_transactions')
        .select('id, transaction_date, amount, status')
        .eq('company_id', companyId)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate);

      // جلب المدفوعات
      const { data: payments } = await supabase
        .from('payments')
        .select('id, payment_date, amount, reconciliation_status, linked_confidence')
        .eq('company_id', companyId)
        .gte('payment_date', startDate)
        .lte('payment_date', endDate)
        .eq('payment_status', 'completed');

      // جلب المطابقات
      const { data: matches } = await supabase
        .from('reconciliation_matches')
        .select('id, matched_at')
        .eq('company_id', companyId)
        .gte('matched_at', startDate)
        .lte('matched_at', endDate);

      const matchedCount = matches?.length || 0;
      const totalMatchedAmount = matches?.reduce((sum, m) => {
        // لا يمكن الحصول على المبلغ من matches بدون join
        return sum; // يلزم تحديث الاستعلام
      }, 0) || 0;

      // الفروقات
      const { data: discrepancies } = await supabase
        .from('reconciliation_discrepancies')
        .select('id')
        .eq('company_id', companyId)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      const summary: ReconciliationSummary = {
        companyId,
        period: { startDate, endDate },
        totalBankTransactions: bankTransactions?.length || 0,
        totalPayments: payments?.length || 0,
        matchedTransactions: matchedCount,
        unmatchedBankTransactions: bankTransactions?.filter(bt => bt.status === 'pending').length || 0,
        unmatchedPayments: payments?.filter(p => p.reconciliation_status === 'unmatched').length || 0,
        discrepancies: discrepancies?.length || 0,
        totalAmountMatched: totalMatchedAmount,
        averageConfidence: matches?.length > 0 
          ? matches.reduce((sum, m) => sum + (m.confidence || 0), 0) / matches.length 
          : 0
      };

      logger.info('Reconciliation summary calculated', {
        companyId,
        ...summary
      });

      return summary;
    } catch (error) {
      logger.error('Failed to calculate reconciliation summary', { companyId, error });
      throw error;
    }
  }

  /**
   * حل الفروق (resolve discrepancy)
   */
  async resolveDiscrepancy(
    discrepancyId: string,
    options: {
      resolution?: string;
      correctedBankAmount?: number;
      correctedPaymentAmount?: number;
      userId?: string;
    } = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Resolving reconciliation discrepancy', { discrepancyId, options });

      // تحديث حالة الفرق إلى resolved
      const { error: updateError } = await supabase
        .from('reconciliation_discrepancies')
        .update({
          status: 'resolved',
          resolution: options.resolution || 'تم الحل',
          corrected_bank_amount: options.correctedBankAmount,
          corrected_payment_amount: options.correctedPaymentAmount,
          resolved_at: new Date().toISOString(),
          resolved_by: options.userId
        })
        .eq('id', discrepancyId);

      if (updateError) {
        throw updateError;
      }

      logger.info('Discrepancy resolved', { discrepancyId });
      return { success: true };
    } catch (error) {
      logger.error('Failed to resolve discrepancy', { discrepancyId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'خطأ غير معروف'
      };
    }
  }

  /**
   * Helper: استخراج قيمة من CSV
   */
  private getValue(headers: string[], values: string[], columnName: string): string {
    const index = headers.findIndex(h => 
      h.toLowerCase().replace(/\s/g, '') === columnName.toLowerCase().replace(/\s/g, '')
    );
    return index >= 0 && index < values.length ? values[index] : '';
  }

  /**
   * Helper: تحليل تاريخ
   */
  private parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    // دعم تنسيقات مختلفة
    const formats = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
      /^\d{4}-\d{2}$/, // YYYYMMDD
    ];

    for (const format of formats) {
      if (format.test(dateStr)) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    return null;
  }

  /**
   * Helper: الحصول على company_id من user
   */
  private async getCompanyId(userId: string): Promise<string> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', userId)
      .single();

    return profile?.company_id || '';
  }
}

// Export singleton instance
export const bankReconciliationService = new BankReconciliationService();
