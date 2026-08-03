/**
 * خدمة موحدة لإنشاء الفواتير
 * ==================================
 * هذه الخدمة تضمن:
 * 1. عدم إنشاء فواتير مكررة لنفس الشهر
 * 2. توحيد منطق إنشاء الفواتير في مكان واحد
 * 3. استخدام تاريخ أول الشهر كتاريخ فاتورة/استحقاق للفواتير الشهرية
 * 
 * القاعدة الذهبية: فاتورة واحدة لكل عقد لكل شهر
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import {
  buildInvoiceMonthRangeFilter,
  getInvoiceBillingMonthKey,
  isActiveInvoice,
} from '@/utils/invoiceBillingMonth';

// =====================================================
// Types & Interfaces
// =====================================================

export interface InvoiceCreationResult {
  success: boolean;
  invoice?: {
    id: string;
    invoice_number: string;
    total_amount: number;
    invoice_date: string;
    due_date: string;
    payment_status: string;
  };
  error?: string;
  skipped?: boolean;
  reason?: string;
  existingInvoiceId?: string;
}

export interface CreateMonthlyInvoiceParams {
  companyId: string;
  customerId: string;
  contractId: string;
  contractNumber: string;
  monthlyAmount: number;
  /** Format: YYYY-MM (e.g., "2025-01") - defaults to current month */
  invoiceMonth?: string;
  /** Optional notes */
  notes?: string;
  /** Created by user ID */
  createdBy?: string;
}

export interface FindOrCreateInvoiceParams {
  companyId: string;
  customerId: string;
  contractId: string;
  contractNumber: string;
  monthlyAmount: number;
  paymentDate: string;
  createdBy?: string;
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Get first day of month from a date
 */
const getFirstDayOfMonth = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

/**
 * Get month identifier (YYYY-MM) from a date
 */
const getMonthIdentifier = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Generate unique invoice number
 */
const generateInvoiceNumber = async (companyId: string): Promise<string> => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `INV-${year}${month}`;

  // Get the highest sequence for this month
  const { data: lastInvoice } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('company_id', companyId)
    .like('invoice_number', `${prefix}%`)
    .order('invoice_number', { ascending: false })
    .limit(1);

  let sequence = 1;
  if (lastInvoice && lastInvoice.length > 0) {
    const match = lastInvoice[0].invoice_number.match(/-(\d+)$/);
    if (match) {
      sequence = parseInt(match[1], 10) + 1;
    }
  }

  return `${prefix}-${String(sequence).padStart(5, '0')}`;
};

// =====================================================
// Main Service Class
// =====================================================

class UnifiedInvoiceServiceClass {
  /**
   * البحث عن فاتورة موجودة لعقد في شهر معين
   * 
   * @param contractId - معرف العقد
   * @param invoiceMonth - الشهر بصيغة YYYY-MM
   * @returns الفاتورة الموجودة أو null
   */
  async findExistingInvoice(
    contractId: string,
    invoiceMonth: string
  ): Promise<{
    id: string;
    invoice_number: string;
    total_amount: number;
    balance_due: number;
    payment_status: string;
    invoice_date: string;
    due_date: string;
  } | null> {
    const monthStart = `${invoiceMonth}-01`;
    const monthDate = new Date(`${monthStart}T00:00:00`);
    const nextMonthStart = getFirstDayOfMonth(
      new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1),
    );

    const { data: existingInvoices, error } = await supabase
      .from('invoices')
      .select('id, invoice_number, total_amount, balance_due, status, payment_status, invoice_month, invoice_date, due_date')
      .eq('contract_id', contractId)
      .or(buildInvoiceMonthRangeFilter(monthStart, nextMonthStart))
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Error finding existing invoice', { error, contractId, invoiceMonth });
      return null;
    }

    const invoice = existingInvoices?.find(isActiveInvoice);
    if (!invoice) return null;

    return {
      ...invoice,
      balance_due: invoice.balance_due ?? invoice.total_amount,
      due_date: invoice.due_date ?? invoice.invoice_date,
    };
  }

  /**
   * البحث عن فاتورة غير مدفوعة للعقد
   * 
   * @param contractId - معرف العقد
   * @returns أقدم فاتورة غير مدفوعة أو null
   */
  async findUnpaidInvoice(
    contractId: string
  ): Promise<{
    id: string;
    invoice_number: string;
    total_amount: number;
    balance_due: number;
    payment_status: string;
    invoice_date: string;
    due_date: string;
  } | null> {
    const { data: unpaidInvoices, error } = await supabase
      .from('invoices')
      .select('id, invoice_number, total_amount, balance_due, status, payment_status, invoice_month, invoice_date, due_date')
      .eq('contract_id', contractId)
      .in('payment_status', ['unpaid', 'pending', 'partial', 'partially_paid', 'overdue'])
      .order('due_date', { ascending: true });

    if (error) {
      logger.error('Error finding unpaid invoice', { error, contractId });
      return null;
    }

    const invoice = unpaidInvoices?.find(isActiveInvoice);
    if (!invoice) return null;

    return {
      ...invoice,
      balance_due: invoice.balance_due ?? invoice.total_amount,
      due_date: invoice.due_date ?? invoice.invoice_date,
    };
  }

  /**
   * إنشاء فاتورة شهرية جديدة
   * 
   * ⚠️ هذه الدالة تتحقق من وجود فاتورة مسبقاً قبل الإنشاء
   * 
   * @param params - معاملات إنشاء الفاتورة
   * @returns نتيجة الإنشاء
   */
  async createMonthlyInvoice(params: CreateMonthlyInvoiceParams): Promise<InvoiceCreationResult> {
    const {
      companyId,
      customerId,
      contractId,
      contractNumber,
      monthlyAmount,
      invoiceMonth = getMonthIdentifier(new Date()),
      notes,
      createdBy
    } = params;

    try {
      // 1. التحقق من وجود فاتورة للشهر
      const existingInvoice = await this.findExistingInvoice(contractId, invoiceMonth);

      if (existingInvoice) {
        logger.info('Invoice already exists for this month', {
          contractId,
          invoiceMonth,
          existingInvoiceId: existingInvoice.id,
          existingInvoiceNumber: existingInvoice.invoice_number
        });

        return {
          success: false,
          skipped: true,
          reason: `توجد فاتورة مسبقاً لهذا الشهر: ${existingInvoice.invoice_number}`,
          existingInvoiceId: existingInvoice.id,
          invoice: {
            id: existingInvoice.id,
            invoice_number: existingInvoice.invoice_number,
            total_amount: existingInvoice.total_amount,
            invoice_date: existingInvoice.invoice_date,
            due_date: existingInvoice.due_date,
            payment_status: existingInvoice.payment_status
          }
        };
      }

      // 2. إنشاء رقم فاتورة جديد
      const invoiceNumber = await generateInvoiceNumber(companyId);

      // 3. تحديد التواريخ (أول الشهر)
      const invoiceDate = getFirstDayOfMonth(`${invoiceMonth}-01`);
      const dueDate = invoiceDate; // تاريخ الاستحقاق = أول الشهر

      // 4. إنشاء الفاتورة
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          company_id: companyId,
          customer_id: customerId,
          contract_id: contractId,
          invoice_number: invoiceNumber,
          invoice_date: invoiceDate,
          invoice_month: invoiceDate,
          due_date: dueDate,
          total_amount: monthlyAmount,
          subtotal: monthlyAmount,
          tax_amount: 0,
          discount_amount: 0,
          paid_amount: 0,
          balance_due: monthlyAmount,
          status: 'sent',
          payment_status: 'unpaid',
          invoice_type: 'rental',
          notes: notes || `فاتورة إيجار شهرية - ${invoiceMonth} - عقد #${contractNumber}`,
          created_by: createdBy,
          currency: 'QAR'
        })
        .select('id, invoice_number, total_amount, invoice_date, due_date, payment_status')
        .single();

      if (invoiceError) {
        logger.error('Failed to create invoice', { invoiceError, contractId, invoiceMonth });
        return {
          success: false,
          error: `فشل في إنشاء الفاتورة: ${invoiceError.message}`
        };
      }

      logger.info('Invoice created successfully', {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        contractId,
        invoiceMonth
      });

      return {
        success: true,
        invoice: {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          total_amount: invoice.total_amount,
          invoice_date: invoice.invoice_date,
          due_date: invoice.due_date ?? invoice.invoice_date,
          payment_status: invoice.payment_status
        }
      };
    } catch (error: any) {
      logger.error('Exception creating monthly invoice', { error, contractId, invoiceMonth });
      return {
        success: false,
        error: error.message || 'حدث خطأ غير متوقع'
      };
    }
  }

  /**
   * البحث عن فاتورة موجودة أو إنشاء واحدة جديدة
   * 
   * ⚡ هذه الدالة الرئيسية التي يجب استخدامها عند تسجيل الدفعات
   * 
   * المنطق:
   * 1. البحث عن فاتورة غير مدفوعة للعقد (الأقدم أولاً)
   * 2. إذا لم توجد، البحث عن فاتورة للشهر الحالي
   * 3. إذا لم توجد، إنشاء فاتورة جديدة للشهر الحالي
   * 
   * @param params - معاملات البحث/الإنشاء
   * @returns الفاتورة (موجودة أو جديدة)
   */
  async findOrCreateInvoice(params: FindOrCreateInvoiceParams): Promise<InvoiceCreationResult> {
    const {
      companyId,
      customerId,
      contractId,
      contractNumber,
      monthlyAmount,
      paymentDate,
      createdBy
    } = params;

    try {
      // 1. البحث عن فاتورة غير مدفوعة (الأقدم أولاً)
      const unpaidInvoice = await this.findUnpaidInvoice(contractId);

      if (unpaidInvoice) {
        logger.info('Found existing unpaid invoice', {
          contractId,
          invoiceId: unpaidInvoice.id,
          invoiceNumber: unpaidInvoice.invoice_number
        });

        return {
          success: true,
          invoice: {
            id: unpaidInvoice.id,
            invoice_number: unpaidInvoice.invoice_number,
            total_amount: unpaidInvoice.total_amount,
            invoice_date: unpaidInvoice.invoice_date,
            due_date: unpaidInvoice.due_date,
            payment_status: unpaidInvoice.payment_status
          },
          reason: 'تم العثور على فاتورة غير مدفوعة'
        };
      }

      // 2. البحث عن فاتورة للشهر الحالي (حتى لو مدفوعة جزئياً)
      const currentMonth = getMonthIdentifier(paymentDate);
      const existingMonthInvoice = await this.findExistingInvoice(contractId, currentMonth);

      if (existingMonthInvoice) {
        logger.info('Found existing invoice for current month', {
          contractId,
          invoiceMonth: currentMonth,
          invoiceId: existingMonthInvoice.id
        });

        return {
          success: true,
          invoice: {
            id: existingMonthInvoice.id,
            invoice_number: existingMonthInvoice.invoice_number,
            total_amount: existingMonthInvoice.total_amount,
            invoice_date: existingMonthInvoice.invoice_date,
            due_date: existingMonthInvoice.due_date,
            payment_status: existingMonthInvoice.payment_status
          },
          reason: 'تم العثور على فاتورة للشهر الحالي'
        };
      }

      // 3. إنشاء فاتورة جديدة للشهر الحالي
      logger.info('No existing invoice found, creating new one', {
        contractId,
        invoiceMonth: currentMonth
      });

      return await this.createMonthlyInvoice({
        companyId,
        customerId,
        contractId,
        contractNumber,
        monthlyAmount,
        invoiceMonth: currentMonth,
        createdBy
      });
    } catch (error: any) {
      logger.error('Exception in findOrCreateInvoice', { error, contractId });
      return {
        success: false,
        error: error.message || 'حدث خطأ غير متوقع'
      };
    }
  }

  /**
   * دمج فاتورتين مكررتين
   * 
   * @param keepInvoiceId - الفاتورة التي سيتم الاحتفاظ بها
   * @param duplicateInvoiceId - الفاتورة المكررة التي سيتم حذفها
   */
  async mergeDuplicateInvoices(
    keepInvoiceId: string,
    duplicateInvoiceId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: keepInvoice, error: keepInvoiceError } = await supabase
        .from('invoices')
        .select('company_id')
        .eq('id', keepInvoiceId)
        .maybeSingle();

      if (keepInvoiceError || !keepInvoice) {
        throw new Error('الفاتورة الأساسية غير موجودة');
      }

      const { data: authData } = await supabase.auth.getUser();
      const { error: mergeError } = await (supabase as any).rpc(
        'merge_unpaid_duplicate_invoice_atomic',
        {
          p_keep_invoice_id: keepInvoiceId,
          p_duplicate_invoice_id: duplicateInvoiceId,
          p_company_id: keepInvoice.company_id,
          p_reason: 'دمج فاتورة مكررة بعد التحقق من عدم وجود تاريخ مالي',
          p_actor_id: authData.user?.id || null,
        }
      );

      if (mergeError) {
        throw new Error(mergeError.message);
      }

      logger.info('Successfully merged duplicate invoices', {
        keepInvoiceId,
        duplicateInvoiceId
      });

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to merge duplicate invoices', { error, keepInvoiceId, duplicateInvoiceId });
      return {
        success: false,
        error: error.message || 'فشل في دمج الفواتير'
      };
    }
  }

  /**
   * إعادة حساب رصيد الفاتورة بناءً على الدفعات
   */
  async recalculateInvoiceBalance(invoiceId: string): Promise<void> {
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('company_id')
      .eq('id', invoiceId)
      .maybeSingle();

    if (invoiceError || !invoice) {
      throw new Error('الفاتورة غير موجودة');
    }

    const { data: authData } = await supabase.auth.getUser();
    const { error } = await (supabase as any).rpc('repair_invoice_financial_state_atomic', {
      p_invoice_id: invoiceId,
      p_company_id: invoice.company_id,
      p_reason: 'إعادة احتساب رصيد الفاتورة من دفتر تخصيص الدفعات',
      p_actor_id: authData.user?.id || null,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  /**
   * الحصول على تقرير الفواتير المكررة
   */
  async getDuplicateInvoicesReport(companyId: string): Promise<{
    duplicates: Array<{
      contract_id: string;
      contract_number: string;
      invoice_month: string;
      invoices: Array<{
        id: string;
        invoice_number: string;
        invoice_date: string;
        total_amount: number;
        payment_status: string;
      }>;
    }>;
    totalDuplicates: number;
  }> {
    // جلب جميع الفواتير مجمعة حسب العقد والشهر
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        invoice_date,
        invoice_month,
        due_date,
        total_amount,
        payment_status,
        contract_id,
        contracts:contract_id (contract_number)
      `)
      .eq('company_id', companyId)
      .eq('invoice_type', 'rental')
      .neq('status', 'cancelled')
      .not('contract_id', 'is', null)
      .order('due_date', { ascending: true });

    if (error || !invoices) {
      logger.error('Failed to fetch invoices for duplicate report', { error });
      return { duplicates: [], totalDuplicates: 0 };
    }

    // تجميع الفواتير حسب العقد والشهر
    const groupedInvoices = new Map<string, typeof invoices>();

    for (const invoice of invoices) {
      const month = getInvoiceBillingMonthKey(invoice);
      if (!month || !invoice.contract_id) continue;
      const key = `${invoice.contract_id}|${month}`;

      if (!groupedInvoices.has(key)) {
        groupedInvoices.set(key, []);
      }
      groupedInvoices.get(key)!.push(invoice);
    }

    // استخراج المجموعات التي تحتوي على أكثر من فاتورة
    const duplicates: Array<{
      contract_id: string;
      contract_number: string;
      invoice_month: string;
      invoices: Array<{
        id: string;
        invoice_number: string;
        invoice_date: string;
        total_amount: number;
        payment_status: string;
      }>;
    }> = [];

    for (const [key, group] of groupedInvoices) {
      if (group.length > 1) {
        const [contractId, month] = key.split('|');
        const contractNumber = (group[0].contracts as any)?.contract_number || 'N/A';

        duplicates.push({
          contract_id: contractId,
          contract_number: contractNumber,
          invoice_month: month,
          invoices: group.map(inv => ({
            id: inv.id,
            invoice_number: inv.invoice_number,
            invoice_date: inv.invoice_date,
            total_amount: inv.total_amount,
            payment_status: inv.payment_status
          }))
        });
      }
    }

    return {
      duplicates,
      totalDuplicates: duplicates.reduce((sum, d) => sum + d.invoices.length - 1, 0)
    };
  }
}

// Export singleton instance
export const UnifiedInvoiceService = new UnifiedInvoiceServiceClass();

