import { supabase } from '@/integrations/supabase/client';
import { financeToday, readFinancialPages, requireFinanceCompany } from '@/services/financialReporting';

export type InvoiceReportKind = 'receivables' | 'payables';
export type InvoiceBalanceSource = 'balance_due' | 'total_amount_minus_paid_amount';

export interface OutstandingInvoiceRow {
  invoice_id: string;
  invoice_number: string;
  amount: number;
  balance_source: InvoiceBalanceSource;
  invoice_date: string;
  due_date: string;
  due_date_source: 'due_date' | 'invoice_date';
  overdue_days: number;
  status: string;
  customer_name: string;
  vendor_name: string;
}

export function requireInvoiceReportDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error('تاريخ قطع التقرير غير صالح؛ استخدم YYYY-MM-DD.');
  }
  return value;
}

/** A recorded zero is authoritative; a missing balance needs both recorded operands. */
export function invoiceReportBalance(invoice: {
  balance_due: number | null;
  total_amount: number;
  paid_amount: number | null;
}): { amount: number; source: InvoiceBalanceSource } {
  if (invoice.balance_due !== null && invoice.balance_due !== undefined) {
    if (!Number.isFinite(invoice.balance_due)) throw new Error('تعذر التحقق من رصيد الفاتورة المسجل.');
    return { amount: invoice.balance_due, source: 'balance_due' };
  }
  if (invoice.paid_amount === null || invoice.paid_amount === undefined || !Number.isFinite(invoice.paid_amount) || !Number.isFinite(invoice.total_amount)) {
    throw new Error('رصيد الفاتورة غير متوفر ولا توجد قيمة سداد مسجلة للتحقق منه.');
  }
  return { amount: Number((invoice.total_amount - invoice.paid_amount).toFixed(2)), source: 'total_amount_minus_paid_amount' };
}

/** Current recorded balances for invoices dated on/before the cutoff, not historical balances. */
export async function readOutstandingInvoiceReport(
  companyId: string,
  kind: InvoiceReportKind,
  asOf = financeToday(),
): Promise<OutstandingInvoiceRow[]> {
  requireFinanceCompany(companyId);
  requireInvoiceReportDate(asOf);
  let expectedCount: number | undefined;
  const invoices = await readFinancialPages(async (from, to) => {
    const result = await supabase.from('invoices').select(`
      id,company_id,invoice_number,invoice_date,due_date,total_amount,paid_amount,balance_due,payment_status,status,invoice_type,
      customers!customer_id(company_id,first_name,last_name,company_name),
      vendors!vendor_id(company_id,vendor_name)
    `, { count: 'exact' })
      .eq('company_id', companyId)
      .eq('customers.company_id', companyId)
      .eq('vendors.company_id', companyId)
      .in('invoice_type', kind === 'payables' ? ['purchase'] : ['sales', 'service'])
      .neq('status', 'cancelled')
      .neq('payment_status', 'cancelled')
      .lte('invoice_date', asOf)
      .order('invoice_date')
      .order('id')
      .range(from, to);
    if (result.error) return result;
    if (result.count === null || !Number.isInteger(result.count) || result.count < 0) {
      throw new Error('تعذر التحقق من عدد الفواتير الكامل.');
    }
    if (expectedCount !== undefined && result.count !== expectedCount) {
      throw new Error('تغير سجل الفواتير أثناء القراءة؛ أعد تحميل التقرير.');
    }
    expectedCount = result.count;
    return result;
  });

  const ids = new Set<string>();
  const rows = invoices.map(invoice => {
    if (invoice.company_id !== companyId || (invoice.customers && invoice.customers.company_id !== companyId) || (invoice.vendors && invoice.vendors.company_id !== companyId)) {
      throw new Error('بيانات الفاتورة لا تخص الشركة المحددة.');
    }
    if (ids.has(invoice.id)) throw new Error('تكرر سجل فاتورة أثناء القراءة؛ أعد تحميل التقرير.');
    ids.add(invoice.id);
    const invoiceDate = requireInvoiceReportDate(invoice.invoice_date);
    const dueDate = requireInvoiceReportDate(invoice.due_date ?? invoiceDate);
    const { amount, source } = invoiceReportBalance(invoice);
    const overdueDays = Math.max(0, Math.round((Date.parse(`${asOf}T00:00:00Z`) - Date.parse(`${dueDate}T00:00:00Z`)) / 86_400_000));
    return {
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      invoice_date: invoiceDate,
      amount,
      balance_source: source,
      due_date: dueDate,
      due_date_source: invoice.due_date == null ? 'invoice_date' as const : 'due_date' as const,
      overdue_days: overdueDays,
      status: amount < 0 ? 'رصيد دائن' : dueDate > asOf ? 'غير مستحق بعد' : overdueDays > 0 ? 'متأخر' : 'مستحق',
      customer_name: invoice.customers?.company_name || `${invoice.customers?.first_name || ''} ${invoice.customers?.last_name || ''}`.trim() || 'عميل غير محدد',
      vendor_name: invoice.vendors?.vendor_name || 'مورد غير محدد',
    };
  });
  // Zero balances are settled, including records whose payment_status is stale.
  return rows.filter(row => row.amount !== 0);
}
