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
  invoice_type?: string | null;
  penalty_id?: string | null;
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

export interface LegalClaimBreakdown {
  legal_extension_rent_amount?: number | string | null;
  extension_start_date?: string | null;
  rent_cutoff_date?: string | null;
}

export interface LegalClaimProjection {
  rows: OverdueInvoice[];
  summary: FinancialClaimSourceSummary;
}

const toNumber = (value: number | null | undefined) => Number(value || 0);
const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const monthKey = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})/.exec(value);
  return match ? `${match[1]}-${match[2]}` : null;
};

const invoiceOutstanding = (invoice: InvoiceClaimRow): number => {
  if (invoice.balance_due != null) return Math.max(0, toNumber(invoice.balance_due));
  return Math.max(0, toNumber(invoice.total_amount) - toNumber(invoice.paid_amount));
};

const excludedStatuses = new Set([
  'cancelled',
  'canceled',
  'void',
  'voided',
  'reversed',
  'deleted',
]);
const isExcludedStatus = (value: string | null | undefined) =>
  excludedStatuses.has((value || '').trim().toLowerCase());

const isRentalInvoice = (invoice: InvoiceClaimRow) => (
  invoice.penalty_id == null
  && invoice.invoice_type?.trim().toLowerCase() === 'sales'
);

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
    .filter(isRentalInvoice)
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
      legalAccrualCount: 0,
      legalAccrualAmount: 0,
      totalCount: rows.length,
      outstandingTotal: rows.reduce(
        (sum, row) => sum + Math.max(0, toNumber(row.total_amount) - toNumber(row.paid_amount)),
        0,
      ),
      asOfDate,
    },
  };
}

export function resolveLegalClaimCutoffDate(
  asOfDate: string,
  breakdown: LegalClaimBreakdown | null,
): string {
  const cutoff = breakdown?.rent_cutoff_date;
  return typeof cutoff === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(cutoff)
    ? (cutoff < asOfDate ? cutoff : asOfDate)
    : asOfDate;
}

/** يضيف الأجرة الممتدة قانونياً كسطر مستقل، بلا تحويلها إلى فاتورة محاسبية. */
export function appendLegalAccrualToProjection(
  projection: LegalClaimProjection,
  breakdown: LegalClaimBreakdown | null,
  asOfDate: string,
): LegalClaimProjection {
  const amount = Math.max(0, Number(breakdown?.legal_extension_rent_amount || 0));
  if (amount <= 0) return projection;

  const startDate = breakdown?.extension_start_date || asOfDate;
  const cutoffDate = breakdown?.rent_cutoff_date || asOfDate;
  const accrualRow: OverdueInvoice = {
    id: `legal-accrual:${startDate}:${cutoffDate}`,
    invoice_number: `أجرة تعاقدية مستمرة حتى ${cutoffDate}`,
    due_date: startDate,
    total_amount: amount,
    paid_amount: 0,
    source: 'legal_accrual',
    source_reference: 'calculate_legal_claim_breakdown_v3',
    invoice_month: startDate,
  };
  const rows = [...projection.rows, accrualRow]
    .sort((left, right) => left.due_date.localeCompare(right.due_date));

  return {
    rows,
    summary: {
      ...projection.summary,
      mode: projection.summary.mode === 'none' ? 'legal_accrual' : 'composite',
      legalAccrualCount: 1,
      legalAccrualAmount: amount,
      totalCount: rows.length,
      outstandingTotal: roundCurrency(projection.summary.outstandingTotal + amount),
    },
  };
}

interface LegalClaimBreakdownRpcResult {
  data: unknown;
  error: { message: string } | null;
}

type LegalClaimBreakdownRpc = (
  fn: 'calculate_legal_claim_statement_v4' | 'calculate_legal_claim_breakdown_v3' | 'calculate_legal_claim_breakdown_v2',
  args: {
    p_company_id: string;
    p_contract_id: string;
    p_as_of_date: string;
    p_claim_scope?: string;
    p_excluded_invoice_ids?: string[];
  },
) => PromiseLike<LegalClaimBreakdownRpcResult>;

const isMissingRpcError = (message: string) => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('calculate_legal_claim_statement_v4')
    || normalized.includes('calculate_legal_claim_breakdown_v3')
  )
    && (normalized.includes('does not exist') || normalized.includes('schema cache'));
};

export async function loadLegalClaimProjection(
  contractId: string,
  companyId: string,
  asOfDate = getQatarBusinessDate(),
): Promise<LegalClaimProjection> {
  const callLegalClaimBreakdown: LegalClaimBreakdownRpc = (functionName, args) => (
    supabase.rpc as unknown as (
      name: string,
      parameters: Record<string, unknown>,
    ) => PromiseLike<LegalClaimBreakdownRpcResult>
  )(functionName, args);
  const loadBreakdown = async () => {
    const args = {
      p_company_id: companyId,
      p_contract_id: contractId,
      p_as_of_date: asOfDate,
    };
    const v4 = await callLegalClaimBreakdown('calculate_legal_claim_statement_v4', {
      ...args,
      // Empty means: derive the frozen scope from the latest non-cancelled case.
      p_claim_scope: '',
      p_excluded_invoice_ids: [],
    });
    if (!v4.error || !isMissingRpcError(v4.error.message)) return v4;
    const v3 = await callLegalClaimBreakdown('calculate_legal_claim_breakdown_v3', args);
    if (!v3.error || !isMissingRpcError(v3.error.message)) return v3;
    return callLegalClaimBreakdown('calculate_legal_claim_breakdown_v2', args);
  };
  const [invoiceResult, scheduleResult, breakdownResult] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, invoice_number, due_date, invoice_month, total_amount, paid_amount, balance_due, payment_status, status, invoice_type, penalty_id')
      .eq('contract_id', contractId)
      .eq('company_id', companyId)
      .lte('due_date', asOfDate),
    supabase
      .from('contract_payment_schedules')
      .select('id, installment_number, due_date, amount, paid_amount, invoice_id, status')
      .eq('contract_id', contractId)
      .eq('company_id', companyId)
      .lte('due_date', asOfDate),
    loadBreakdown(),
  ]);

  if (invoiceResult.error) throw invoiceResult.error;
  if (scheduleResult.error) throw scheduleResult.error;
  if (breakdownResult.error) throw breakdownResult.error;

  const breakdown = (breakdownResult.data || null) as LegalClaimBreakdown | null;
  const claimCutoffDate = resolveLegalClaimCutoffDate(asOfDate, breakdown);
  const projection = resolveLegalClaimProjection(
    (invoiceResult.data || []) as InvoiceClaimRow[],
    (scheduleResult.data || []) as PaymentScheduleClaimRow[],
    claimCutoffDate,
  );
  return appendLegalAccrualToProjection(
    projection,
    breakdown,
    asOfDate,
  );
}
