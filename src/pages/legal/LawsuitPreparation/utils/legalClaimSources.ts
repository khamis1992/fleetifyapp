import { supabase } from '@/integrations/supabase/client';
import type {
  FinancialClaimSourceSummary,
  OverdueInvoice,
  TrafficViolation,
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

interface StatementRentRow {
  service_period_start?: string | null;
  service_period_end?: string | null;
  service_period_basis?: string | null;
  id: string;
  invoice_number?: string | null;
  installment_number?: number;
  due_date: string;
  invoice_month?: string | null;
  total_amount: number;
  paid_amount: number;
  amount: number;
}

export interface LegalClaimBreakdown {
  service_period_version?: string;
  settlement_source?: string;
  calculation_details?: { retention_start_date?: string | null; retention_end_date?: string | null;
    retention_daily_rate?: number | null; contractual_compensation_units?: number | null };
  traffic_settlement?: { requires_review: boolean; proof_ready: boolean; claim_amount: number; rows: {
    penalty_id: string | null; violation_number: string | null; penalty_date: string | null;
    violation_type?: string | null; location?: string | null;
    disposition: string; outstanding_amount: number | null;
  }[] };
  included_invoices?: StatementRentRow[];
  included_schedules?: StatementRentRow[];
  legal_extension_rent_amount?: number | string | null;
  extension_start_date?: string | null;
  rent_cutoff_date?: string | null;
  /** v4 wraps the amounts instead of returning the v3 breakdown directly. */
  cutoff_date?: string | null;
  total?: number | string | null;
  components?: Partial<Record<'rent_due' | 'legal_extension_rent' | 'contractual_compensation' | 'damages' | 'traffic_violations' | 'retention' | 'security_deposit_deduction', number | string | null>>;
  _breakdown?: LegalClaimBreakdown;
}

export interface LegalClaimProjection {
  rows: OverdueInvoice[];
  trafficViolations?: TrafficViolation[];
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
  'inactive',
]);
const isExcludedStatus = (value: string | null | undefined) =>
  excludedStatuses.has((value || '').trim().toLowerCase());

function isRentalInvoice(invoice: InvoiceClaimRow, schedules: PaymentScheduleClaimRow[]) {
  if (invoice.penalty_id != null || invoice.invoice_number?.trim().toUpperCase().startsWith('TV-')) return false;
  const type = invoice.invoice_type?.trim().toLowerCase();
  if (type === 'sales') return true;
  if (type !== 'service') return false;

  // The billing engine emits service invoices. Match the canonical rental reader:
  // one active schedule link with the same amount and billing month.
  const links = schedules.filter(schedule => schedule.invoice_id === invoice.id && !isExcludedStatus(schedule.status));
  const billingMonth = monthKey(invoice.invoice_month || invoice.due_date);
  return links.length === 1 && billingMonth !== null
    && invoice.total_amount != null && links[0].amount === invoice.total_amount
    && monthKey(links[0].due_date) === billingMonth;
}

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
    .filter(invoice => isRentalInvoice(invoice, schedules))
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
  const cutoff = breakdown?.cutoff_date ?? breakdown?.rent_cutoff_date;
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
  const amount = Math.max(0, Number(breakdown?.components?.legal_extension_rent
    ?? breakdown?.legal_extension_rent_amount ?? 0));
  if (amount <= 0) return projection;

  const startDate = breakdown?.extension_start_date || breakdown?._breakdown?.extension_start_date;
  if (!startDate) {
    throw new Error('تعذر تحديد بداية فترة الأجرة الممتدة؛ يلزم استكمال مصدر الحساب قبل اعتماد المطالبة');
  }
  const cutoffDate = breakdown?.cutoff_date || breakdown?.rent_cutoff_date || asOfDate;
  const accrualRow: OverdueInvoice = {
    id: `legal-accrual:${startDate}:${cutoffDate}`,
    invoice_number: `أجرة تعاقدية مستمرة حتى ${cutoffDate}`,
    due_date: startDate,
    total_amount: amount,
    paid_amount: 0,
    source: 'legal_accrual',
    source_reference: 'calculate_legal_claim_breakdown_v3',
    invoice_month: startDate,
    service_period_start: startDate,
    service_period_end: cutoffDate,
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

export function resolveStatementAmounts(statement: LegalClaimBreakdown): NonNullable<FinancialClaimSourceSummary['authoritativeAmounts']> {
  const cents = (value: number | string | null | undefined) => {
    const amount = Number(value), result = Math.round(amount * 100);
    if (value == null || value === '' || !Number.isFinite(amount) || amount < 0 || !Number.isSafeInteger(result)
      || Math.abs(amount * 100 - result) > 0.00001) throw new Error('تعذر التحقق من بنود مبلغ المطالبة');
    return result;
  };
  const c = statement.components;
  const rent = cents(c?.rent_due) + cents(c?.legal_extension_rent);
  const fees = cents(c?.contractual_compensation), damages = cents(c?.damages), traffic = cents(c?.traffic_violations);
  const retention = cents(c?.retention), deposit = cents(c?.security_deposit_deduction), total = cents(statement.total);
  if (Math.max(0,rent + fees + damages + traffic + retention - deposit) !== total) {
    throw new Error('إجمالي المطالبة لا يطابق الأجرة والتعويضات والمخالفات بعد خصم الوديعة');
  }
  return { overdueRent: rent / 100, lateFees: fees / 100, damagesFee: damages / 100, violationsFines: traffic / 100,
    retentionCompensation: retention / 100, securityDepositDeduction: deposit / 100, total: total / 100 };
}

/** Consume one database snapshot; never mix its totals with invoice caches. */
export function resolveStatementRentProjection(statement: LegalClaimBreakdown, asOfDate: string): LegalClaimProjection {
  const fail = () => new Error('تعذر مطابقة تفاصيل الأجرة مع إجمالي المطالبة؛ أعد التحميل أو راجع مصادر السداد');
  if (!Array.isArray(statement.included_invoices) || !Array.isArray(statement.included_schedules)) throw fail();
  const cutoff = resolveLegalClaimCutoffDate(asOfDate, statement);
  const hasServiceCoverage = statement.service_period_version === 'invoice_coverage_v1';
  if (statement.service_period_version && !hasServiceCoverage) throw fail();
  const validDate = (value?: string | null): value is string => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(value + 'T00:00:00Z');
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  };
  const seen = new Set<string>();
  const mapRows = (items: StatementRentRow[], source: 'invoice' | 'payment_schedule'): OverdueInvoice[] => items.map(item => {
    const total = Number(item.total_amount), paid = Number(item.paid_amount), amount = Number(item.amount);
    const id = source + ':' + item.id;
    if (!item.id || seen.has(id) || !/^\d{4}-\d{2}-\d{2}$/.test(item.due_date) || item.due_date > cutoff
      || [item.total_amount, item.paid_amount, item.amount].some(value => value == null)
      || ![total, paid, amount].every(Number.isFinite) || total < 0 || paid < 0 || paid > total || amount <= 0
      || Math.round(total * 100) - Math.round(paid * 100) !== Math.round(amount * 100)) throw fail();
    if (hasServiceCoverage && source === 'invoice'
      && (!validDate(item.service_period_start) || !validDate(item.service_period_end)
        || item.service_period_start > item.service_period_end)) throw fail();
    seen.add(id);
    return { ...(hasServiceCoverage && source === 'invoice' ? {
      service_period_start: item.service_period_start!, service_period_end: item.service_period_end!,
    } : {}), id: source === 'invoice' ? item.id : 'schedule:' + item.id,
      invoice_number: source === 'invoice' ? item.invoice_number ?? null : 'استحقاق تعاقدي رقم ' + (item.installment_number ?? ''),
      due_date: item.due_date, invoice_month: item.invoice_month || item.due_date,
      total_amount: total, paid_amount: paid, source, source_reference: item.id };
  });
  const rows = [...mapRows(statement.included_invoices, 'invoice'), ...mapRows(statement.included_schedules, 'payment_schedule')]
    .sort((a,b) => a.due_date.localeCompare(b.due_date));
  const cents = rows.reduce((sum,row) => sum + Math.round(Number(row.total_amount) * 100) - Math.round(Number(row.paid_amount) * 100),0);
  if (statement.components?.rent_due == null || !Number.isFinite(Number(statement.components.rent_due))
    || cents !== Math.round(Number(statement.components.rent_due) * 100)) throw fail();
  const invoiceCount = statement.included_invoices.length, scheduleCount = statement.included_schedules.length;
  return { rows, summary: { mode: invoiceCount && scheduleCount ? 'hybrid' : invoiceCount ? 'invoices' : scheduleCount ? 'payment_schedules' : 'none',
    invoiceCount, scheduleCount, legalAccrualCount: 0, legalAccrualAmount: 0, totalCount: rows.length,
    outstandingTotal: cents / 100, asOfDate: cutoff } };
}

interface LegalClaimBreakdownRpcResult {
  data: unknown;
  error: { message: string; details?: string; hint?: string } | null;
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

const financialLoadError = (error: { message: string; details?: string; hint?: string }): Error => {
  let message = /[؀-ۿ]/.test(error.message) ? error.message
    : /reconcil/i.test(error.message) ? 'تحتاج الفواتير وتخصيصات الدفعات إلى مطابقة قبل اعتماد المطالبة'
      : 'تعذر تحميل الحساب المالي المعتمد؛ أعد المحاولة أو راجع مالية العقد';
  if (error.hint === 'LEGAL_TRAFFIC_RECONCILIATION_REQUIRED' && error.details) {
    try {
      const detail = JSON.parse(error.details) as { rows?: { disposition?: string; review_reasons?: string[] }[] };
      const reviewRows = Array.isArray(detail.rows) ? detail.rows.filter(row => row.disposition === 'review') : [];
      const reasons = new Set(reviewRows.flatMap(row => Array.isArray(row.review_reasons) ? row.review_reasons : []));
      if (reasons.has('missing_or_mislinked_active_traffic_invoice')) {
        message += ' توجد فواتير مخالفات سابقة ملغاة أو مرتبطة بغير هذا العقد. راجع سبب إلغائها وحدد هل أُلغي استحقاق العميل أم نُقلت إدارة المخالفة إلى قسم المخالفات؛ إلغاء الفاتورة وحده لا يثبت إسقاط المخالفة.';
      }
      if (reasons.has('missing_customer_receipt_evidence')) {
        message += ' توجد مخالفة مسجلة كمسددة أو مسددة جزئياً دون سند قبض مرتبط؛ طابق دفعة العميل قبل اعتماد صافي المخالفة.';
      }
      if (reasons.has('cross_source_violation_conflict') || reasons.has('duplicate_penalty_reference')) {
        message += ' توجد سجلات للمخالفة نفسها تحتاج مطابقة المسؤولية والمبلغ لتجنب التكرار.';
      }
    } catch { /* Keep the original Arabic message if diagnostic details are malformed. */ }
  }
  return new Error(message, { cause: error });
};

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
    if (!v4.error) {
      const statement = v4.data as LegalClaimBreakdown | null;
      if (Number(statement?.components?.legal_extension_rent || 0) > 0
        && !statement?.extension_start_date && !statement?._breakdown?.extension_start_date) {
        // Older deployed v4 exposes the amount but omits its period. Read v3
        // at exactly v4's cutoff and verify agreement before borrowing metadata.
        const detail = await callLegalClaimBreakdown('calculate_legal_claim_breakdown_v3', {
          ...args,
          p_as_of_date: resolveLegalClaimCutoffDate(asOfDate, statement),
        });
        if (detail.error) return detail;
        const breakdown = detail.data as LegalClaimBreakdown | null;
        if (roundCurrency(Number(breakdown?.legal_extension_rent_amount || 0))
          !== roundCurrency(Number(statement?.components?.legal_extension_rent || 0))) {
          throw new Error('تغير حساب الأجرة الممتدة أثناء التحميل؛ أعد تحديث المطالبة');
        }
        return { data: { ...statement, _breakdown: breakdown }, error: null };
      }
      return v4;
    }
    if (!isMissingRpcError(v4.error.message)) return v4;
    const v3 = await callLegalClaimBreakdown('calculate_legal_claim_breakdown_v3', args);
    if (!v3.error || !isMissingRpcError(v3.error.message)) return v3;
    return callLegalClaimBreakdown('calculate_legal_claim_breakdown_v2', args);
  };
  const breakdownResult = await loadBreakdown();
  if (breakdownResult.error) throw financialLoadError(breakdownResult.error);
  const statement = breakdownResult.data as LegalClaimBreakdown | null;
  if (statement?.settlement_source === 'completed_receipt_allocations_v1') {
    const projection = appendLegalAccrualToProjection(resolveStatementRentProjection(statement, asOfDate), statement, asOfDate);
    const traffic = statement.traffic_settlement;
    if (!traffic || traffic.requires_review || !Array.isArray(traffic.rows)) {
      throw new Error('تعذر مطابقة تفاصيل المخالفات مع مطالبة العميل');
    }
    projection.trafficViolations = traffic.rows.filter(row => row.disposition === 'included').map(row => {
      const amount = Number(row.outstanding_amount);
      if (!row.penalty_id || row.outstanding_amount == null || !Number.isFinite(amount) || amount <= 0) {
        throw new Error('تعذر مطابقة مبلغ المخالفة بعد احتساب السداد');
      }
      return { id: row.penalty_id, violation_number: row.violation_number, violation_date: row.penalty_date,
        violation_type: row.violation_type ?? null, location: row.location ?? null, fine_amount: amount, total_amount: amount, status: 'pending' };
    });
    const trafficCents = traffic.proof_ready ? projection.trafficViolations.reduce((sum,row) => sum + Math.round(Number(row.total_amount) * 100),0) : 0;
    if (!Number.isFinite(Number(traffic.claim_amount)) || trafficCents !== Math.round(Number(traffic.claim_amount) * 100)) {
      throw new Error('تفاصيل المخالفات لا تتطابق مع إجمالي المطالبة');
    }
    projection.summary.authoritativeAmounts = resolveStatementAmounts(statement);
    if (Math.round(projection.summary.authoritativeAmounts.overdueRent * 100) !== Math.round(projection.summary.outstandingTotal * 100)
      || Math.round(projection.summary.authoritativeAmounts.violationsFines * 100) !== trafficCents) {
      throw new Error('تفاصيل الأجرة والمخالفات لا تطابق بنود المطالبة المعتمدة');
    }
    const details = statement.calculation_details;
    const units = Number(details?.contractual_compensation_units ?? 0);
    if (!Number.isSafeInteger(units) || units < 0 || (projection.summary.authoritativeAmounts.lateFees > 0 && units <= 0)) {
      throw new Error('تعذر التحقق من وحدات التعويض الاتفاقي');
    }
    projection.summary.authoritativeCompensationUnits = units;
    const retentionAmount = projection.summary.authoritativeAmounts.retentionCompensation;
    projection.summary.authoritativeRetention = { days: 0, amount: 0, from: null, to: null };
    if (retentionAmount > 0) {
      const from = details?.retention_start_date, to = details?.retention_end_date;
      const days = from && to ? (Date.parse(to) - Date.parse(from)) / 86400000 + 1 : NaN;
      const rate = Number(details?.retention_daily_rate);
      if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)
        || !Number.isSafeInteger(days) || days <= 0 || !Number.isFinite(rate) || rate <= 0
        || Math.round(days * rate * 100) !== Math.round(retentionAmount * 100)) {
        throw new Error('تعويض الاحتباس لا يطابق الفترة والسعر اليومي المثبتين');
      }
      projection.summary.authoritativeRetention = { days, amount: retentionAmount, from, to };
    }
    return projection;
  }
  const [invoiceResult, scheduleResult] = await Promise.all([
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
  ]);

  if (invoiceResult.error) throw financialLoadError(invoiceResult.error);
  if (scheduleResult.error) throw financialLoadError(scheduleResult.error);
  if (breakdownResult.error) throw financialLoadError(breakdownResult.error);

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
