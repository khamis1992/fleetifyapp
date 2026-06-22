/**
 * Journal Entry Generator
 * نظام إنشاء القيود المحاسبية التلقائي
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * أرقام الحسابات المحاسبية الافتراضية
 */
export const DEFAULT_ACCOUNTS = {
  // حسابات الأصول
  ACCOUNTS_RECEIVABLE: '11301', // ذمم العملاء
  CASH: '11151', // البنك/الصندوق
  
  // حسابات الإيرادات
  RENTAL_REVENUE: '41101', // إيرادات التأجير
  
  // حسابات الخصوم
  ACCOUNTS_PAYABLE: '21101', // ذمم الموردين
  
  // حسابات المصروفات
  GENERAL_EXPENSES: '51101', // مصروفات عامة
};

/**
 * أنواع القيود
 */
export type JournalEntryType = 'invoice' | 'payment' | 'receipt' | 'expense';

/**
 * بيانات إنشاء قيد من فاتورة
 */
export interface InvoiceJournalEntryData {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerId: string;
  customerName: string;
  totalAmount: number;
  companyId: string;
  userId: string;
  description?: string;
}

/**
 * إنشاء قيد محاسبي من فاتورة
 * @param data بيانات الفاتورة
 * @returns معرّف القيد المُنشأ
 */
export async function createJournalEntryFromInvoice(
  data: InvoiceJournalEntryData
): Promise<string | null> {
  try {
    console.log('🔄 [JOURNAL_GENERATOR] Creating journal entry for invoice:', data.invoiceNumber);

    // 1. الحصول على معرّفات الحسابات من قاعدة البيانات
    const { data: accounts, error: accountsError } = await supabase
      .from('chart_of_accounts')
      .select('id, account_code, account_name')
      .eq('company_id', data.companyId)
      .in('account_code', [DEFAULT_ACCOUNTS.ACCOUNTS_RECEIVABLE, DEFAULT_ACCOUNTS.RENTAL_REVENUE]);

    if (accountsError) {
      console.error('❌ [JOURNAL_GENERATOR] Error fetching accounts:', accountsError);
      throw accountsError;
    }

    const receivableAccount = accounts?.find(acc => acc.account_code === DEFAULT_ACCOUNTS.ACCOUNTS_RECEIVABLE);
    const revenueAccount = accounts?.find(acc => acc.account_code === DEFAULT_ACCOUNTS.RENTAL_REVENUE);

    if (!receivableAccount || !revenueAccount) {
      console.error('❌ [JOURNAL_GENERATOR] Required accounts not found:', {
        receivableAccount: !!receivableAccount,
        revenueAccount: !!revenueAccount,
        companyId: data.companyId
      });
      throw new Error('الحسابات المحاسبية المطلوبة غير موجودة في دليل الحسابات');
    }

    // 2. إنشاء رقم قيد فريد
    const entryNumber = `JE-INV-${data.invoiceNumber}`;

    // 3. إنشاء القيد الرئيسي
    const { data: journalEntry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        company_id: data.companyId,
        entry_number: entryNumber,
        entry_date: data.invoiceDate,
        entry_type: 'standard',
        status: 'posted', // مُرحّل مباشرة
        description: data.description || `قيد فاتورة ${data.invoiceNumber} - ${data.customerName}`,
        reference_type: 'invoice',
        reference_id: data.invoiceId,
        total_debit: data.totalAmount,
        total_credit: data.totalAmount,
        created_by: data.userId,
        notes: `تم الإنشاء تلقائياً من الفاتورة ${data.invoiceNumber}`
      })
      .select()
      .single();

    if (entryError) {
      console.error('❌ [JOURNAL_GENERATOR] Error creating journal entry:', entryError);
      throw entryError;
    }

    console.log('✅ [JOURNAL_GENERATOR] Journal entry created:', journalEntry.id);

    // 4. إنشاء سطور القيد
    const lines = [
      {
        journal_entry_id: journalEntry.id,
        account_id: receivableAccount.id,
        line_number: 1,
        line_description: `ذمم العميل - ${data.customerName}`,
        debit_amount: data.totalAmount,
        credit_amount: 0,
        reference_type: 'customer',
        reference_id: data.customerId
      },
      {
        journal_entry_id: journalEntry.id,
        account_id: revenueAccount.id,
        line_number: 2,
        line_description: `إيراد تأجير - فاتورة ${data.invoiceNumber}`,
        debit_amount: 0,
        credit_amount: data.totalAmount,
        reference_type: 'invoice',
        reference_id: data.invoiceId
      }
    ];

    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(lines);

    if (linesError) {
      console.error('❌ [JOURNAL_GENERATOR] Error creating journal entry lines:', linesError);
      // محاولة حذف القيد الرئيسي في حالة الفشل
      await supabase
        .from('journal_entries')
        .delete()
        .eq('id', journalEntry.id);
      throw linesError;
    }

    console.log('✅ [JOURNAL_GENERATOR] Journal entry lines created');

    // 5. ربط الفاتورة بالقيد
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ journal_entry_id: journalEntry.id })
      .eq('id', data.invoiceId);

    if (updateError) {
      console.error('❌ [JOURNAL_GENERATOR] Error linking invoice to journal entry:', updateError);
      // نستمر رغم الخطأ لأن القيد تم إنشاؤه
    }

    console.log('✅ [JOURNAL_GENERATOR] Invoice linked to journal entry successfully');

    return journalEntry.id;
  } catch (error) {
    console.error('❌ [JOURNAL_GENERATOR] Failed to create journal entry:', error);
    return null;
  }
}

/**
 * ربط الفواتير الموجودة بقيود محاسبية (بأثر رجعي)
 * @param companyId معرّف الشركة
 * @param userId معرّف المستخدم المنفذ
 * @param batchSize عدد الفواتير في كل دفعة
 */
export async function linkExistingInvoicesToJournalEntries(
  companyId: string,
  userId: string,
  batchSize: number = 50
): Promise<{
  success: number;
  failed: number;
  skipped: number;
  total: number;
}> {
  console.log('🔄 [JOURNAL_GENERATOR] Starting bulk linking for company:', companyId);

  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    total: 0
  };

  try {
    // جلب جميع الفواتير التي ليس لها قيد محاسبي
    const { data: invoices, error: fetchError } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        invoice_date,
        total_amount,
        customer_id,
        journal_entry_id,
        customers!invoices_customer_id_fkey (
          id,
          first_name,
          last_name,
          company_name
        )
      `)
      .eq('company_id', companyId)
      .is('journal_entry_id', null)
      .order('invoice_date', { ascending: true });

    if (fetchError) {
      console.error('❌ [JOURNAL_GENERATOR] Error fetching invoices:', fetchError);
      throw fetchError;
    }

    results.total = invoices?.length || 0;
    console.log(`📊 [JOURNAL_GENERATOR] Found ${results.total} invoices without journal entries`);

    if (!invoices || invoices.length === 0) {
      console.log('✅ [JOURNAL_GENERATOR] No invoices to process');
      return results;
    }

    // معالجة الفواتير على دفعات
    for (let i = 0; i < invoices.length; i += batchSize) {
      const batch = invoices.slice(i, i + batchSize);
      console.log(`🔄 [JOURNAL_GENERATOR] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(invoices.length / batchSize)}`);

      for (const invoice of batch) {
        try {
          const customerName = invoice.customers?.company_name || 
            `${invoice.customers?.first_name || ''} ${invoice.customers?.last_name || ''}`.trim() ||
            'عميل غير معروف';

          const journalEntryId = await createJournalEntryFromInvoice({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoice_number,
            invoiceDate: invoice.invoice_date,
            customerId: invoice.customer_id,
            customerName,
            totalAmount: invoice.total_amount,
            companyId,
            userId
          });

          if (journalEntryId) {
            results.success++;
            console.log(`✅ Invoice ${invoice.invoice_number} linked successfully`);
          } else {
            results.failed++;
            console.log(`❌ Invoice ${invoice.invoice_number} failed`);
          }
        } catch (error) {
          results.failed++;
          console.error(`❌ Error processing invoice ${invoice.invoice_number}:`, error);
        }
      }

      // انتظار قصير بين الدفعات لتجنب الضغط على قاعدة البيانات
      if (i + batchSize < invoices.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('✅ [JOURNAL_GENERATOR] Bulk linking completed:', results);
    return results;
  } catch (error) {
    console.error('❌ [JOURNAL_GENERATOR] Bulk linking failed:', error);
    return results;
  }
}

/**
 * التحقق من وجود قيد محاسبي لفاتورة
 * @param invoiceId معرّف الفاتورة
 */
export async function checkInvoiceJournalEntry(invoiceId: string): Promise<{
  hasEntry: boolean;
  entryId: string | null;
  entryNumber: string | null;
}> {
  const { data: invoice } = await supabase
    .from('invoices')
    .select(`
      journal_entry_id,
      journal_entries (
        id,
        entry_number,
        status
      )
    `)
    .eq('id', invoiceId)
    .single();

  return {
    hasEntry: !!invoice?.journal_entry_id,
    entryId: invoice?.journal_entry_id || null,
    entryNumber: (invoice as any)?.journal_entries?.entry_number || null
  };
}

