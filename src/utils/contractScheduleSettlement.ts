import { getInvoiceBillingMonthKey, isActiveInvoice, type InvoiceBillingMonthFields, type InvoiceLifecycleFields } from './invoiceBillingMonth';

export type ScheduleSettlementSource = {
  id?: string;
  status: string;
  due_date: string | null;
  amount: number | null;
  paid_amount?: number | null;
  invoice_id?: string | null;
  installment_number?: number | null;
  payment_number?: string | null;
  reference_number?: string | null;
};
export type ScheduleSettlement = ScheduleSettlementSource & {
  status: 'paid' | 'partially_paid' | 'pending' | 'overdue' | 'review';
  paid_amount: number | null;
  remaining_amount: number | null;
  is_overdue: boolean;
  settlement_review_reason: string | null;
  stored_status: string;
  stored_paid_amount: number | null;
};
type InvoiceEvidence = InvoiceBillingMonthFields & InvoiceLifecycleFields & {
  id: string;
  total_amount: number;
  paid_amount: number;
  invoice_type?: string | null;
  invoice_number?: string | null;
  penalty_id?: string | null;
};

export const contractBusinessDate = (date = new Date()): string => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Qatar', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(date);

export function validScheduleDate(value: string | null | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value)) return null;
  const day = value.slice(0, 10);
  const parsed = new Date(`${day}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day ? day : null;
}
const units = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  const amount = Number(value);
  const result = Math.round(amount * 100);
  return Number.isFinite(amount) && amount >= 0 && Number.isSafeInteger(result)
    && Math.abs(result - amount * 100) < 0.00001 ? result : null;
};

/** Inputs must be company/contract-scoped invoices reconstructed from payment evidence.
 * A month/amount resemblance alone is not an allocation. Never distribute an
 * unlinked receipt or reuse one invoice across multiple installments here.
 */
export function buildScheduleSettlements(
  schedules: ScheduleSettlementSource[], invoices: InvoiceEvidence[], today = contractBusinessDate(),
): ScheduleSettlement[] {
  const active = schedules.filter((row) => !['cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive', 'reversed'].includes(row.status.trim().toLowerCase()));
  const countBy = (values: Array<string | null | undefined>) => {
    const counts = new Map<string, number>();
    for (const value of values) if (value) counts.set(value, (counts.get(value) || 0) + 1);
    return counts;
  };
  const months = countBy(active.map((row) => validScheduleDate(row.due_date)?.slice(0, 7)));
  const scheduleIds = countBy(active.map((row) => row.id));
  const links = countBy(active.map((row) => row.invoice_id));
  const invoiceCounts = countBy(invoices.map((row) => row.id));
  const byInvoice = new Map(invoices.filter(isActiveInvoice).map((row) => [row.id, row]));
  return active.map((row): ScheduleSettlement => {
    const date = validScheduleDate(row.due_date);
    const amount = units(row.amount);
    const invoice = row.invoice_id ? byInvoice.get(row.invoice_id) : undefined;
    const invoiceAmount = invoice ? units(invoice.total_amount) : null;
    const paid = invoice ? units(invoice.paid_amount) : null;
    let reason: string | null = null;
    if (!date) reason = 'تاريخ استحقاق القسط غير صالح.';
    else if (amount === null || amount === 0) reason = 'قيمة القسط غير صالحة أو صفرية.';
    else if (row.id && (scheduleIds.get(row.id) || 0) > 1) reason = 'سجل القسط مكرر في بيانات القراءة.';
    else if ((months.get(date.slice(0, 7)) || 0) > 1) reason = 'أكثر من قسط للشهر نفسه؛ يلزم التحقق من الجدول.';
    else if (!row.invoice_id) {
      // A future installment that has not been invoiced yet is a normal
      // scheduled obligation, not a data-integrity problem. Only a due
      // (or past-due) installment without an invoice needs matching before
      // the claim can be trusted.
      if (date <= today) reason = 'قسط مستحق غير مرتبط بفاتورة؛ أنشئ فاتورة الشهر أو اربط فاتورة موجودة.';
    }
    else if ((links.get(row.invoice_id) || 0) > 1) reason = 'الفاتورة مرتبطة بأكثر من قسط؛ لا يجوز احتساب السداد مرتين.';
    else if (!invoice || invoiceCounts.get(row.invoice_id) !== 1) reason = 'الفاتورة المرتبطة غير متاحة أو غير فعالة أو مكررة.';
    // The rental invoice core writes `service`. It is eligible only through the
    // unique link above AND the matching billing month/amount checks below;
    // the type alone never identifies rent. Explicit traffic evidence wins.
    else if (invoice.penalty_id || invoice.invoice_number?.trim().toUpperCase().startsWith('TV-')
      || (invoice.invoice_type && !['sales', 'rental', 'rent', 'service'].includes(invoice.invoice_type.trim().toLowerCase()))) {
      reason = 'الفاتورة المرتبطة رسوم أو مخالفة وليست فاتورة قسط الإيجار.';
    }
    else if (getInvoiceBillingMonthKey(invoice) !== date.slice(0, 7)) reason = 'شهر الفاتورة لا يطابق شهر القسط.';
    else if (invoiceAmount !== amount || paid === null) reason = 'مبالغ الفاتورة والقسط غير متطابقة أو غير صالحة.';
    else if (paid > amount) reason = 'السداد المخصص للفاتورة يتجاوز قيمة القسط.';
    // An unlinked future installment is a legitimate scheduled obligation:
    // nothing proves settlement yet, but its full amount remains to be paid.
    const unlinkedFuture = reason === null && !row.invoice_id && amount !== null && date !== null && date > today;
    const remaining = reason === null && amount !== null && (paid !== null || unlinkedFuture)
      ? (amount - (paid ?? 0)) / 100
      : null;
    const overdue = remaining !== null && remaining > 0 && Boolean(date && date < today);
    return {
      ...row, due_date: date, stored_status: row.status, stored_paid_amount: row.paid_amount ?? null,
      paid_amount: reason === null && paid !== null ? paid / 100 : null,
      remaining_amount: remaining, is_overdue: overdue, settlement_review_reason: reason,
      status: reason ? 'review' : remaining === 0 ? 'paid' : paid && paid > 0 ? 'partially_paid' : overdue ? 'overdue' : 'pending',
    };
  }).sort((a, b) => (a.due_date || '9999-12-31').localeCompare(b.due_date || '9999-12-31'));
}
