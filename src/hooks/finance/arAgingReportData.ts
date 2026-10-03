import { supabase } from '@/integrations/supabase/client';
import { readFinancialPages, requireFinanceCompany } from '@/services/financialReporting';
import { invoiceReportBalance, requireInvoiceReportDate } from '@/services/financialInvoiceReports';

export interface AgingInvoice {
  id: string; company_id: string; customer_id: string | null; invoice_number: string;
  invoice_date: string; due_date: string | null; invoice_type: string;
  status: string | null; payment_status: string | null;
  balance_due: number | null; total_amount: number; paid_amount: number | null;
}
export interface AgingCustomer {
  id: string; company_id: string; first_name: string | null; last_name: string | null;
  first_name_ar: string | null; last_name_ar: string | null; company_name: string | null;
  company_name_ar: string | null; phone: string | null; email: string | null;
}
export interface CustomerAging {
  customer_id: string; customer_name_ar: string; customer_name_en: string;
  customer_phone: string; customer_email: string; total_invoices: number;
  total_outstanding: number; current_amount: number; days_1_30: number;
  days_31_60: number; days_61_90: number; days_90_plus: number;
  max_days_overdue: number; last_payment_date: string | null;
}
export interface PriorityItem extends Omit<CustomerAging, 'current_amount' | 'days_1_30' | 'days_31_60' | 'days_61_90' | 'days_90_plus'> {
  critical_amount: number; high_risk_amount: number; priority_score: number;
  risk_category: string; recommended_action: string;
}
export const AGING_BALANCE_BASIS = 'أرصدة الفواتير الحالية وقت القراءة للفواتير بتاريخ الفاتورة حتى تاريخ القطع؛ أعمار التأخر عند تاريخ القطع، مع استخدام تاريخ الفاتورة عند غياب الاستحقاق. ليست إعادة بناء لرصيد تاريخي أو مصادقة أو تقدير لقابلية التحصيل. الأرصدة الدائنة والمفقودة منفصلة؛ لا تجمع المطالبات القانونية والمخالفات معها.';
const excluded = new Set(['cancelled', 'canceled', 'void', 'voided', 'reversed', 'deleted']);
const isExcluded = (value: string | null) => excluded.has((value || '').trim().toLowerCase());
const cents = (value: number) => {
  const result = Math.round(value * 100);
  if (!Number.isSafeInteger(result)) throw new Error('قيمة مالية خارج نطاق التقرير.');
  return result;
};

/** Invoice IDs are counted once. Payment evidence is never joined to invoice amounts. */
export function aggregateArAging(companyId: string, asOf: string, invoices: AgingInvoice[], customers: AgingCustomer[]) {
  requireFinanceCompany(companyId); requireInvoiceReportDate(asOf);
  const customerMap = new Map<string, AgingCustomer>();
  for (const customer of customers) {
    if (customer.company_id !== companyId || customerMap.has(customer.id)) throw new Error('سجل العملاء غير مطابق للشركة أو مكرر.');
    customerMap.set(customer.id, customer);
  }
  const seen = new Set<string>(), groups = new Map<string, CustomerAging>();
  const credits: Array<{ invoice_id: string; invoice_number: string; customer_id: string | null; amount: number }> = [];
  const unknown: Array<{ invoice_id: string; invoice_number: string; reason: string }> = [];
  let overdueDays = 0, overdueCount = 0, highCount = 0, highCents = 0, fallbackDueDates = 0;
  for (const invoice of invoices) {
    if (invoice.company_id !== companyId || seen.has(invoice.id)) throw new Error('سجل الفواتير غير مطابق للشركة أو مكرر.');
    seen.add(invoice.id);
    const invoiceDate = requireInvoiceReportDate(invoice.invoice_date);
    if (invoiceDate > asOf || !['sales', 'service'].includes(invoice.invoice_type) || isExcluded(invoice.status) || isExcluded(invoice.payment_status)) continue;
    let amount: number;
    try { amount = invoiceReportBalance(invoice).amount; }
    catch (error) { unknown.push({ invoice_id: invoice.id, invoice_number: invoice.invoice_number, reason: error instanceof Error ? error.message : 'رصيد غير متوفر' }); continue; }
    if (amount < 0) { credits.push({ invoice_id: invoice.id, invoice_number: invoice.invoice_number, customer_id: invoice.customer_id, amount }); continue; }
    if (amount === 0) continue;
    const dueDate = requireInvoiceReportDate(invoice.due_date ?? invoiceDate);
    if (!invoice.due_date) fallbackDueDates++;
    const days = Math.max(0, Math.round((Date.parse(asOf + 'T00:00:00Z') - Date.parse(dueDate + 'T00:00:00Z')) / 86400000));
    const customer = invoice.customer_id ? customerMap.get(invoice.customer_id) : undefined;
    const key = customer?.id ?? `unmatched:${invoice.customer_id ?? invoice.id}`;
    const row = groups.get(key) ?? {
      customer_id: key,
      customer_name_ar: customer?.company_name_ar || [customer?.first_name_ar, customer?.last_name_ar].filter(Boolean).join(' ') || customer?.company_name || [customer?.first_name, customer?.last_name].filter(Boolean).join(' ') || 'عميل غير مطابق؛ يحتاج مراجعة',
      customer_name_en: customer?.company_name || [customer?.first_name, customer?.last_name].filter(Boolean).join(' ') || '',
      customer_phone: customer?.phone || '', customer_email: customer?.email || '', total_invoices: 0,
      total_outstanding: 0, current_amount: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_90_plus: 0,
      max_days_overdue: 0, last_payment_date: null,
    };
    const bucket = days === 0 ? 'current_amount' : days <= 30 ? 'days_1_30' : days <= 60 ? 'days_31_60' : days <= 90 ? 'days_61_90' : 'days_90_plus';
    row[bucket] = (cents(row[bucket]) + cents(amount)) / 100;
    row.total_outstanding = (cents(row.total_outstanding) + cents(amount)) / 100;
    row.total_invoices++; row.max_days_overdue = Math.max(row.max_days_overdue, days); groups.set(key, row);
    if (days > 0) { overdueDays += days; overdueCount++; }
    if (days > 60) { highCount++; highCents += cents(amount); }
  }
  const customerAging = [...groups.values()].sort((a, b) => b.total_outstanding - a.total_outstanding || a.customer_id.localeCompare(b.customer_id));
  const sum = (key: 'total_outstanding' | 'current_amount' | 'days_1_30' | 'days_31_60' | 'days_61_90' | 'days_90_plus') => customerAging.reduce((total, row) => total + cents(row[key]), 0) / 100;
  const total = sum('total_outstanding');
  const percentage = (value: number) => total > 0 ? value / total * 100 : 0;
  const summary = {
    total_customers_with_ar: customerAging.filter(row => !row.customer_id.startsWith('unmatched:')).length,
    total_outstanding_invoices: customerAging.reduce((n, row) => n + row.total_invoices, 0), total_ar_amount: total,
    current_total: sum('current_amount'), days_1_30_total: sum('days_1_30'), days_31_60_total: sum('days_31_60'), days_61_90_total: sum('days_61_90'), days_90_plus_total: sum('days_90_plus'),
    current_percentage: percentage(sum('current_amount')), days_1_30_percentage: percentage(sum('days_1_30')), days_31_60_percentage: percentage(sum('days_31_60')), days_61_90_percentage: percentage(sum('days_61_90')), days_90_plus_percentage: percentage(sum('days_90_plus')),
    avg_days_overdue: overdueCount ? overdueDays / overdueCount : 0, high_priority_count: highCount, high_priority_amount: highCents / 100,
  };
  const priorityList: PriorityItem[] = customerAging.map(row => ({
    ...row, critical_amount: row.days_90_plus, high_risk_amount: row.days_61_90,
    priority_score: row.max_days_overdue * 0.5 + row.total_outstanding / 1000,
    risk_category: row.max_days_overdue > 90 ? 'critical' : row.max_days_overdue > 60 ? 'high' : row.max_days_overdue > 30 ? 'medium' : 'low',
    recommended_action: row.max_days_overdue > 90 ? 'legal_action' : row.max_days_overdue > 60 ? 'final_notice' : row.max_days_overdue > 30 ? 'follow_up_call' : 'monitor',
  })).sort((a, b) => b.priority_score - a.priority_score || a.customer_id.localeCompare(b.customer_id));
  return { companyId, asOf, summary, customerAging, priorityList, credits, unknown, fallbackDueDates,
    unmatchedCustomers: customerAging.filter(row => row.customer_id.startsWith('unmatched:')).length,
    readInvoiceCount: invoices.length, readCustomerCount: customers.length, balanceBasis: AGING_BALANCE_BASIS };
}

export async function readArAging(companyId: string, asOf: string) {
  requireFinanceCompany(companyId); requireInvoiceReportDate(asOf);
  let invoiceCount: number | undefined, customerCount: number | undefined;
  const invoiceSelect = 'id,company_id,customer_id,invoice_number,invoice_date,due_date,invoice_type,status,payment_status,balance_due,total_amount,paid_amount';
  const customerSelect = 'id,company_id,first_name,last_name,first_name_ar,last_name_ar,company_name,company_name_ar,phone,email';
  const [invoices, customers] = await Promise.all([
    readFinancialPages(async (from, to) => {
      const result = await supabase.from('invoices').select(invoiceSelect, from === 0 ? { count: 'exact' } : undefined).eq('company_id', companyId).lte('invoice_date', asOf).order('id').range(from, to);
      if (from === 0) invoiceCount = result.count ?? undefined;
      if (invoiceCount === undefined) throw new Error('تعذر التحقق من عدد الفواتير.');
      return { ...result, count: invoiceCount };
    }),
    readFinancialPages(async (from, to) => {
      const result = await supabase.from('customers').select(customerSelect, from === 0 ? { count: 'exact' } : undefined).eq('company_id', companyId).order('id').range(from, to);
      if (from === 0) customerCount = result.count ?? undefined;
      if (customerCount === undefined) throw new Error('تعذر التحقق من عدد العملاء.');
      return { ...result, count: customerCount };
    }),
  ]);
  const [finalInvoices, finalCustomers] = await Promise.all([
    supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('company_id', companyId).lte('invoice_date', asOf),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
  ]);
  if (finalInvoices.error || finalCustomers.error || finalInvoices.count !== invoiceCount || finalCustomers.count !== customerCount || invoices.length !== invoiceCount || customers.length !== customerCount) throw new Error('تغيرت سجلات التقرير أو لم تكتمل القراءة؛ أعد التحميل.');
  return aggregateArAging(companyId, asOf, invoices, customers);
}
