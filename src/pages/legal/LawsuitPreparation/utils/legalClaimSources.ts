import { supabase } from '@/integrations/supabase/client';
import type {
  FinancialClaimSourceSummary,
  OverdueInvoice,
} from '../store/types';

interface InvoiceClaimRow {
  id: string;
  invoice_number: string | null;
  due_date: string | null;
  invoice_month: string | null;
  total_amount: number | null;
  paid_amount: number | null;
  balance_due: number | null;
  payment_status?: string | null;
  status?: string | null;
}

interface PaymentScheduleClaimRow {
  id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  paid_amount: number | null;
  invoice_id: string | null;
  status: string;
}

export interface LegalClaimProjection {
  rows: OverdueInvoice[];
  summary: FinancialClaimSourceSummary;
}

const toNumber = (value: number | null | undefined) => Number(value || 0);

const monthKey = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})/.exec(value);
  return match ? `${match[1]}-${match[2]}` : null;
};

const invoiceOutstanding = (invoice: InvoiceClaimRow): number => {
  if (invoice.balance_due != null) return Math.max(0, toNumber(invoice.balance_due));
  return Math.max(0, toNumber(invoice.total_amount) - toNumber(invoice.paid_amount));
};

const excludedStatuses = new Set(['cancelled', 'canceled', 'voided', 'reversed']);
const isExcludedStatus = (value: string | null | undefined) =>
  excludedStatuses.has((value || '').trim().toLowerCase());

/** تاريخ يوم العمل القانوني في قطر، بصرف النظر عن منطقة جهاز المشغل. */
export function getQatarBusinessDate(value = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Qatar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/**
 * يبني كشفاً قانونياً واحداً من الفواتير، ثم يسد الأشهر غير المفوترة من جدول
 * الاستحقاقات. لا يسمح أبداً بجمع المصدرين للشهر نفسه ولا بإدخال مبلغ مستقبلي.
 */
export function resolveLegalClaimProjection(
  invoices: InvoiceClaimRow[],
  schedules: PaymentScheduleClaimRow[],
  asOfDate: string,
): LegalClaimProjection {
  const invoiceMonths = new Set<string>();

  const invoiceRows: OverdueInvoice[] = invoices
    .filter((invoice): invoice is InvoiceClaimRow & { due_date: string } => (
      typeof invoice.due_date === 'string' && invoice.due_date <= asOfDate
    ))
    .filter((invoice) => !isExcludedStatus(invoice.status) && !isExcludedStatus(invoice.payment_status))
    .filter((invoice) => invoiceOutstanding(invoice) > 0)
    .map((invoice) => {
      const outstanding = invoiceOutstanding(invoice);
      const total = toNumber(invoice.total_amount);
      const key = monthKey(invoice.invoice_month || invoice.due_date);
      if (key) invoiceMonths.add(key);
      return {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        due_date: invoice.due_date,
        total_amount: total || outstanding,
        paid_amount: total ? Math.max(0, total - outstanding) : 0,
        source: 'invoice' as const,
        source_reference: invoice.id,
        invoice_month: invoice.invoice_month || invoice.due_date,
      };
    });

  const scheduleRows: OverdueInvoice[] = schedules
    .filter((schedule) => schedule.due_date <= asOfDate)
    .filter((schedule) => !isExcludedStatus(schedule.status) && schedule.status !== 'paid')
    .filter((schedule) => !schedule.invoice_id)
    .filter((schedule) => Math.max(0, toNumber(schedule.amount) - toNumber(schedule.paid_amount)) > 0)
    .filter((schedule) => {
      const key = monthKey(schedule.due_date);
      return !key || !invoiceMonths.has(key);
    })
    .map((schedule) => ({
      id: `schedule:${schedule.id}`,
      invoice_number: `استحقاق تعاقدي رقم ${schedule.installment_number}`,
      due_date: schedule.due_date,
      total_amount: toNumber(schedule.amount),
      paid_amount: toNumber(schedule.paid_amount),
      source: 'payment_schedule' as const,
      source_reference: schedule.id,
      invoice_month: schedule.due_date,
    }));

  const rows = [...invoiceRows, ...scheduleRows]
    .sort((left, right) => left.due_date.localeCompare(right.due_date));
  const invoiceCount = invoiceRows.length;
  const scheduleCount = scheduleRows.length;
  const mode: FinancialClaimSourceSummary['mode'] =
    invoiceCount > 0 && scheduleCount > 0
      ? 'hybrid'
      : invoiceCount > 0
        ? 'invoices'
        : scheduleCount > 0
          ? 'payment_schedules'
          : 'none';

  return {
    rows,
    summary: {
      mode,
      invoiceCount,
      scheduleCount,
      totalCount: rows.length,
      outstandingTotal: rows.reduce(
        (sum, row) => sum + Math.max(0, toNumber(row.total_amount) - toNumber(row.paid_amount)),
        0,
      ),
      asOfDate,
    },
  };
}

export async function loadLegalClaimProjection(
  contractId: string,
  companyId: string,
  asOfDate = getQatarBusinessDate(),
): Promise<LegalClaimProjection> {
  const [invoiceResult, scheduleResult] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, invoice_number, due_date, invoice_month, total_amount, paid_amount, balance_due, payment_status, status')
      .eq('contract_id', contractId)
      .eq('company_id', companyId)
      .lte('due_date', asOfDate),
    supabase
      .from('contract_payment_schedules')
      .select('id, installment_number, due_date, amount, paid_amount, invoice_id, status')
      .eq('contract_id', contractId)
      .eq('company_id', companyId)
      .lte('due_date', asOfDate),
  ]);

  if (invoiceResult.error) throw invoiceResult.error;
  if (scheduleResult.error) throw scheduleResult.error;

  return resolveLegalClaimProjection(
    (invoiceResult.data || []) as InvoiceClaimRow[],
    (scheduleResult.data || []) as PaymentScheduleClaimRow[],
    asOfDate,
  );
}
