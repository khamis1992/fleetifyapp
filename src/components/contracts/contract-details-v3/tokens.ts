/**
 * Shared design tokens for the redesigned Contract Details experience.
 * Light theme built on the app's design language:
 * canvas #F6F8FB, cards #FFFFFF, ink #0F172A, muted #94A3B8, borders #E5EAF1
 * signal teal #22C7A1 (health/success), amber #F59E0B (attention),
 * rose #FB6B7A (risk), indigo #7C83F6 (legal/focus), sky #38BDF8 (info).
 */

import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  CreditCard,
  Folder,
  Gauge,
  Receipt,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import type { Contract } from '@/types/contracts';
import type { Invoice } from '@/types/finance.types';
import { getInvoiceBillingMonthKey, isActiveInvoice } from '@/utils/invoiceBillingMonth';
import { analyzeContractBillingPeriod } from '@/utils/contractCalculations';
import type { PaymentApplication } from '@/services/contractPaymentEvidence';
import { buildScheduleSettlements, contractBusinessDate, validScheduleDate, type ScheduleSettlement, type ScheduleSettlementSource } from '@/utils/contractScheduleSettlement';

// ===== Status language =====
export interface ContractStatusMeta {
  label: string;
  dot: string;
  chip: string;
}

export const CONTRACT_STATUS_META: Record<string, ContractStatusMeta> = {
  active: {
    label: 'نشط',
    dot: 'bg-[#22C7A1]',
    chip: 'bg-[#22C7A1]/10 text-[#0E9E7E] border-[#22C7A1]/30',
  },
  draft: {
    label: 'مسودة',
    dot: 'bg-slate-400',
    chip: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  expired: {
    label: 'منتهي',
    dot: 'bg-[#F59E0B]',
    chip: 'bg-[#F59E0B]/10 text-[#B45309] border-[#F59E0B]/30',
  },
  suspended: {
    label: 'معلق',
    dot: 'bg-[#FB923C]',
    chip: 'bg-[#FB923C]/10 text-[#C2410C] border-[#FB923C]/30',
  },
  cancelled: {
    label: 'ملغي',
    dot: 'bg-[#FB6B7A]',
    chip: 'bg-[#FB6B7A]/10 text-[#BE123C] border-[#FB6B7A]/30',
  },
  canceled: {
    label: 'ملغي',
    dot: 'bg-[#FB6B7A]',
    chip: 'bg-[#FB6B7A]/10 text-[#BE123C] border-[#FB6B7A]/30',
  },
  closed: {
    label: 'مغلق',
    dot: 'bg-slate-400',
    chip: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  completed: {
    label: 'مكتمل',
    dot: 'bg-[#22C7A1]',
    chip: 'bg-[#22C7A1]/10 text-[#0E9E7E] border-[#22C7A1]/30',
  },
  terminated: {
    label: 'موقوف',
    dot: 'bg-[#FB6B7A]',
    chip: 'bg-[#FB6B7A]/10 text-[#BE123C] border-[#FB6B7A]/30',
  },
  under_legal_procedure: {
    label: 'إجراء قانوني',
    dot: 'bg-[#7C83F6]',
    chip: 'bg-[#7C83F6]/10 text-[#4F46E5] border-[#7C83F6]/30',
  },
};

export const getContractStatusMetaV3 = (status?: string): ContractStatusMeta =>
  CONTRACT_STATUS_META[String(status || '').toLowerCase()] || CONTRACT_STATUS_META.draft;

export const formatAssignedEmployeeNameV3 = (profile?: Contract['assigned_employee'] | null) => {
  if (!profile) return 'غير معين';
  const arabicName = [profile.first_name_ar, profile.last_name_ar].filter(Boolean).join(' ').trim();
  const englishName = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
  return arabicName || englishName || profile.email || 'غير محدد';
};

// ===== Financial classification helpers =====
export const paidInvoiceStatusesV3 = new Set(['paid', 'completed', 'cleared']);
export const inactiveScheduleStatusesV3 = new Set(['cancelled', 'canceled', 'void', 'voided', 'deleted']);
export const paidScheduleStatusesV3 = new Set(['paid', 'completed', 'cleared']);
export const inactivePaymentStatusesV3 = new Set(['cancelled', 'void', 'deleted', 'failed']);
export const billableContractStatusesV3 = new Set(['active', 'under_legal_procedure']);
export const permanentlyDeletableContractStatusesV3 = new Set([
  'draft',
  'cancelled',
  'canceled',
  'expired',
  'completed',
  'closed',
  'terminated',
]);

export type ContractFinancialPaymentV3 = {
  id: string;
  amount: number | null;
  payment_date: string | null;
  payment_status: string | null;
  payment_method: string | null;
  payment_number?: string | null;
  reference_number?: string | null;
  invoice_id?: string | null;
  contract_id?: string | null;
  notes?: string | null;
  transaction_type?: string | null;
  financial_applications?: PaymentApplication[];
};

export type PaymentScheduleLikeV3 = ScheduleSettlementSource;

export const getInvoiceBalanceV3 = (invoice: Invoice) => {
  const total = Number(invoice.total_amount || 0);
  const paid = Number(invoice.paid_amount || 0);
  const storedBalance = Number(invoice.balance_due ?? total - paid);
  return Math.max(0, storedBalance);
};

export const isActiveFinancialInvoiceV3 = (invoice: Invoice) => isActiveInvoice(invoice);

export const isPaidFinancialInvoiceV3 = (invoice: Invoice) => getInvoiceBalanceV3(invoice) === 0;

export const isActiveScheduleItemV3 = (payment: { status: string }) =>
  !inactiveScheduleStatusesV3.has(String(payment.status || '').trim().toLowerCase());

export const isPaidScheduleItemV3 = (payment: { status: string }) =>
  paidScheduleStatusesV3.has(String(payment.status || '').toLowerCase());

export const isFinanciallyPaidScheduleItemV3 = (payment: ScheduleSettlement) =>
  payment.status === 'paid' && payment.remaining_amount === 0;

export const isActiveFinancialPaymentV3 = (payment: ContractFinancialPaymentV3) =>
  ['completed', 'paid', 'success', 'succeeded'].includes(String(payment.payment_status || '').trim().toLowerCase())
  && String(payment.transaction_type || 'receipt').trim().toLowerCase() === 'receipt';

const effectiveApplications = (payment: ContractFinancialPaymentV3, invoiceIds: Set<string>) =>
  (payment.financial_applications || []).filter((entry) => !entry.invoice_id || invoiceIds.has(entry.invoice_id));
const appliedAmount = (payment: ContractFinancialPaymentV3, invoiceIds: Set<string>) =>
  effectiveApplications(payment, invoiceIds).reduce((sum, entry) => sum + entry.amount, 0);

const moneyUnits = (amount: number) => Math.round(amount * 100);
const roundedMoney = (amount: number) => moneyUnits(amount) / 100;

/** Read model only: never overwrite the source invoice or mint a remainder invoice. */
const invoicesFromPaymentEvidence = (invoices: Invoice[], payments: ContractFinancialPaymentV3[]): Invoice[] => {
  const appliedUnits = new Map<string, number>();
  for (const payment of payments) {
    if (!isActiveFinancialPaymentV3(payment)) continue;
    for (const entry of payment.financial_applications || []) {
      if (entry.invoice_id) appliedUnits.set(entry.invoice_id, (appliedUnits.get(entry.invoice_id) || 0) + moneyUnits(entry.amount));
    }
  }
  return invoices.map((invoice) => {
    const paidUnits = appliedUnits.get(invoice.id) || 0;
    return { ...invoice, paid_amount: paidUnits / 100,
      balance_due: Math.max(0, moneyUnits(Number(invoice.total_amount || 0)) - paidUnits) / 100 };
  });
};

export const getScheduleMonthKeyV3 = (payment: { due_date: string | null }) => {
  const source = payment.due_date;
  if (!source) return 'unknown';
  const dateOnly = String(source).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnly) return `${dateOnly[1]}-${dateOnly[2]}`;
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return String(source).slice(0, 7);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export const getInvoiceMonthKeyV3 = (invoice: Invoice) =>
  getInvoiceBillingMonthKey(invoice) ?? 'unknown';

export const BULK_INVOICE_CANCELLATION_BATCH_SIZE_V3 = 8;

export const chunkInvoicesForCancellationV3 = <T,>(items: T[], size = BULK_INVOICE_CANCELLATION_BATCH_SIZE_V3) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

// ===== Financial snapshot (single source of truth for the whole page) =====
export interface ContractFinancialSnapshot {
  activeInvoices: Invoice[];
  collectibleInvoices: Invoice[];
  invoicesTotal: number;
  outstandingTotal: number;
  dueNowTotal: number;
  activeSchedules: ScheduleSettlement[];
  unpaidSchedules: ScheduleSettlement[];
  schedulesTotal: number;
  unpaidSchedulesTotal: number;
  scheduleDifference: number;
  scheduleMismatch: boolean;
  scheduleReviewNeeded: boolean;
  missingInvoiceMonthsCount: number;
  hasFinancialCoverage: boolean;
  activePaymentsTotal: number;
  invoicePaidTotal: number;
  paidTotal: number;
  paidSource: 'payments' | 'invoices' | 'contract';
  financialReviewRequired: boolean;
  contractTotal: number;
  remainingTotal: number;
  paidSchedulesCount: number;
  totalSchedulesCount: number;
  outOfPeriodSchedulesCount: number;
  outOfPeriodInvoicesCount: number;
  excludedPaymentsCount: number;
  nextSchedule: ScheduleSettlement | undefined;
  openInvoicesCount: number;
}

export type ContractHealthScoreV3 = {
  score: number;
  tone: 'good' | 'watch' | 'risk';
};

export const calculateContractHealthScoreV3 = ({
  snapshot,
  daysRemaining,
  violationsCount,
  contractStatus,
}: {
  snapshot: ContractFinancialSnapshot;
  daysRemaining: number | null;
  violationsCount: number;
  contractStatus?: string | null;
}): ContractHealthScoreV3 => {
  const outstandingRatio = snapshot.contractTotal > 0
    ? Math.min(1, snapshot.remainingTotal / snapshot.contractTotal)
    : 0;
  const missingCoveragePenalty = snapshot.hasFinancialCoverage ? 0 : 20;
  const rawScore = Math.max(
    0,
    Math.min(
      100,
      35 -
        Math.round(outstandingRatio * 35) +
        (daysRemaining !== null && daysRemaining > 30 ? 20 : daysRemaining !== null && daysRemaining >= 0 ? 12 : 4) +
        (violationsCount === 0 ? 15 : Math.max(0, 15 - violationsCount * 4)) +
        (snapshot.scheduleReviewNeeded ? 0 : 15) +
        (contractStatus === 'active' ? 15 : contractStatus === 'under_legal_procedure' ? 5 : 8) -
        missingCoveragePenalty,
    ),
  );

  // A pending financial reconciliation must not receive the "good" (80+) tone.
  const score = snapshot.financialReviewRequired ? Math.min(79, rawScore) : rawScore;
  return {
    score,
    tone: score >= 80 ? 'good' : score >= 55 ? 'watch' : 'risk',
  };
};

export const buildContractFinancialSnapshotV3 = (
  invoices: Invoice[],
  payments: ContractFinancialPaymentV3[],
  paymentSchedules: PaymentScheduleLikeV3[],
  contract?: Pick<
    Contract,
    'contract_amount' | 'total_paid' | 'monthly_amount' | 'start_date' | 'end_date'
  >,
): ContractFinancialSnapshot => {
  const allActiveInvoices = invoices.filter(isActiveFinancialInvoiceV3);
  const allActivePayments = payments.filter(isActiveFinancialPaymentV3);
  const allActiveSchedules = paymentSchedules.filter(isActiveScheduleItemV3);
  const billingPeriod = contract
    ? analyzeContractBillingPeriod({
        startDate: contract.start_date,
        endDate: contract.end_date,
        contractAmount: contract.contract_amount,
        monthlyAmount: contract.monthly_amount,
        invoices: allActiveInvoices,
        schedules: allActiveSchedules,
      })
    : null;
  const isWithinBillingPeriod = (monthKey: string) =>
    !billingPeriod?.billingStartMonth
    || !billingPeriod.billingEndMonth
    || (monthKey >= billingPeriod.billingStartMonth && monthKey <= billingPeriod.billingEndMonth);
  const sourceInvoices = allActiveInvoices.filter((invoice) =>
    isWithinBillingPeriod(getInvoiceMonthKeyV3(invoice)),
  );
  const activeInvoices = invoicesFromPaymentEvidence(sourceInvoices, allActivePayments);
  const activeInvoiceIds = new Set(activeInvoices.map((invoice) => invoice.id));
  const activePayments = allActivePayments.filter(
    (payment) => !payment.financial_applications?.length || effectiveApplications(payment, activeInvoiceIds).length > 0,
  );
  const excludedPaymentsCount = allActivePayments.length - activePayments.length;
  const sourceSchedules = allActiveSchedules.filter((schedule) =>
    !validScheduleDate(schedule.due_date) || isWithinBillingPeriod(getScheduleMonthKeyV3(schedule)),
  );
  const activeSchedules = buildScheduleSettlements(sourceSchedules, activeInvoices);
  const outOfPeriodInvoicesCount = allActiveInvoices.length - activeInvoices.length;
  const outOfPeriodSchedulesCount = allActiveSchedules.length - activeSchedules.length;
  const collectibleInvoices = activeInvoices.filter(
    (invoice) => !isPaidFinancialInvoiceV3(invoice),
  );
  const unpaidSchedules = activeSchedules.filter((payment) => payment.remaining_amount !== null && payment.remaining_amount > 0);
  const invoicesTotal = activeInvoices.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0);
  const outstandingTotal = roundedMoney(collectibleInvoices.reduce((sum, invoice) => sum + getInvoiceBalanceV3(invoice), 0));
  const schedulesTotal = roundedMoney(activeSchedules.reduce((sum, payment) => sum + (Number.isFinite(payment.amount) && Number(payment.amount) > 0 ? Number(payment.amount) : 0), 0));
  const unpaidSchedulesTotal = roundedMoney(unpaidSchedules.reduce((sum, payment) => sum + Number(payment.remaining_amount), 0));
  const scheduleDifference = invoicesTotal - schedulesTotal;
  const missingInvoiceMonthsCount = activeSchedules.filter(
    (schedule) => !schedule.invoice_id || !activeInvoiceIds.has(schedule.invoice_id),
  ).length;
  const hasFinancialCoverage = activeSchedules.length === 0 || missingInvoiceMonthsCount === 0;
  const activePaymentsTotal = Math.round(activePayments.reduce((sum, payment) => sum + appliedAmount(payment, activeInvoiceIds), 0) * 100) / 100;
  const invoicePaidTotal = activeInvoices.reduce((sum, invoice) => sum + Number(invoice.paid_amount || 0), 0);
  const storedPaidTotal = Number(contract?.total_paid || 0);
  const paidSource: ContractFinancialSnapshot['paidSource'] = 'payments';
  const contractTotal = Math.max(
    0,
    Number(contract?.contract_amount || 0) || invoicesTotal || schedulesTotal,
  );
  const paidTotal = contractTotal > 0 ? Math.min(contractTotal, activePaymentsTotal) : activePaymentsTotal;
  const computedByInvoice = new Map(activeInvoices.map((invoice) => [invoice.id, invoice]));
  const financialReviewRequired = activeSchedules.some((schedule) => schedule.status === 'review'
      || moneyUnits(Number(schedule.stored_paid_amount || 0)) !== moneyUnits(Number(schedule.paid_amount || 0))
      || (isPaidScheduleItemV3({ status: schedule.stored_status }) && schedule.status !== 'paid'))
    || allActivePayments.some((payment) => !payment.financial_applications)
    || moneyUnits(storedPaidTotal) !== moneyUnits(paidTotal)
    || sourceInvoices.some((invoice) => {
      const computed = computedByInvoice.get(invoice.id);
      if (!computed) return true;
      const recordedAsPaid = paidInvoiceStatusesV3.has(String(invoice.status || '').trim().toLowerCase())
        || paidInvoiceStatusesV3.has(String(invoice.payment_status || '').trim().toLowerCase());
      return moneyUnits(Number(invoice.paid_amount || 0)) !== moneyUnits(Number(computed.paid_amount))
        || moneyUnits(getInvoiceBalanceV3(invoice)) !== moneyUnits(getInvoiceBalanceV3(computed))
        || (recordedAsPaid && getInvoiceBalanceV3(computed) > 0);
    });
  const remainingTotal = Math.round(Math.max(0, contractTotal - paidTotal) * 100) / 100;
  const todayKey = contractBusinessDate();
  const dueNowTotal = roundedMoney(collectibleInvoices.reduce((sum, invoice) => {
    const dueDate = String(invoice.due_date || '');
    return !dueDate || dueDate <= todayKey ? sum + getInvoiceBalanceV3(invoice) : sum;
  }, 0));
  const nextSchedule = [...unpaidSchedules]
    .sort(
      (a, b) =>
        new Date(a.due_date || '2999-12-31').getTime() - new Date(b.due_date || '2999-12-31').getTime(),
    )[0];

  return {
    activeInvoices,
    collectibleInvoices,
    invoicesTotal,
    outstandingTotal,
    dueNowTotal,
    activeSchedules,
    unpaidSchedules,
    schedulesTotal,
    unpaidSchedulesTotal,
    scheduleDifference,
    scheduleMismatch:
      (activeInvoices.length > 0 || activeSchedules.length > 0)
      && Math.abs(scheduleDifference) > 1,
    scheduleReviewNeeded:
      financialReviewRequired
      || missingInvoiceMonthsCount > 0
      || outOfPeriodSchedulesCount > 0
      || outOfPeriodInvoicesCount > 0
      || excludedPaymentsCount > 0
      || Math.abs(scheduleDifference) > 1
      || (unpaidSchedules.length > collectibleInvoices.length && unpaidSchedulesTotal > outstandingTotal + 1),
    missingInvoiceMonthsCount,
    hasFinancialCoverage,
    activePaymentsTotal,
    invoicePaidTotal,
    paidTotal,
    paidSource,
    financialReviewRequired,
    contractTotal,
    remainingTotal,
    paidSchedulesCount: activeSchedules.filter(isFinanciallyPaidScheduleItemV3).length,
    totalSchedulesCount: activeSchedules.length,
    outOfPeriodSchedulesCount,
    outOfPeriodInvoicesCount,
    excludedPaymentsCount,
    nextSchedule,
    openInvoicesCount: collectibleInvoices.length,
  };
};

// ===== Financial AI diagnosis =====
export interface FinancialDiagnosisIssueV3 {
  title: string;
  detail: string;
  action: string;
  severity: 'danger' | 'warning';
}

export interface FinancialDiagnosisV3 {
  issues: FinancialDiagnosisIssueV3[];
  score: number;
  status: string;
  summary: string;
  tone: 'ok' | 'warning' | 'danger';
  outstandingTotal: number;
  openInvoicesCount: number;
}

export const buildFinancialDiagnosisV3 = ({
  contract,
  invoices,
  payments,
  paymentSchedules,
  formatCurrency,
}: {
  contract: Contract;
  invoices: Invoice[];
  payments: ContractFinancialPaymentV3[];
  paymentSchedules: PaymentScheduleLikeV3[];
  formatCurrency: (amount: number) => string;
}): FinancialDiagnosisV3 => {
  const allActiveInvoices = invoices.filter(isActiveFinancialInvoiceV3);
  const allActivePayments = payments.filter(isActiveFinancialPaymentV3);
  const allActiveSchedules = paymentSchedules.filter(isActiveScheduleItemV3);
  const billingPeriod = analyzeContractBillingPeriod({
    startDate: contract.start_date,
    endDate: contract.end_date,
    contractAmount: contract.contract_amount,
    monthlyAmount: contract.monthly_amount,
    invoices: allActiveInvoices,
    schedules: allActiveSchedules,
  });
  const isWithinBillingPeriod = (monthKey: string) =>
    !billingPeriod.billingStartMonth
    || !billingPeriod.billingEndMonth
    || (monthKey >= billingPeriod.billingStartMonth && monthKey <= billingPeriod.billingEndMonth);
  const activeInvoices = allActiveInvoices.filter((invoice) =>
    isWithinBillingPeriod(getInvoiceMonthKeyV3(invoice)),
  );
  const activeInvoiceIds = new Set(activeInvoices.map((invoice) => invoice.id));
  const activePayments = allActivePayments.filter(
    (payment) => !payment.financial_applications?.length || effectiveApplications(payment, activeInvoiceIds).length > 0,
  );
  const excludedPaymentsCount = allActivePayments.length - activePayments.length;
  const activeSchedules = allActiveSchedules.filter((schedule) =>
    !validScheduleDate(schedule.due_date) || isWithinBillingPeriod(getScheduleMonthKeyV3(schedule)),
  );
  const scheduleSettlements = buildScheduleSettlements(activeSchedules, invoicesFromPaymentEvidence(activeInvoices, activePayments));
  const scheduleSettlementIssues = scheduleSettlements.filter((row) => row.status === 'review'
    || moneyUnits(Number(row.stored_paid_amount || 0)) !== moneyUnits(Number(row.paid_amount || 0))
    || (isPaidScheduleItemV3({ status: row.stored_status }) && row.status !== 'paid'));
  const outOfPeriodRecords =
    (allActiveInvoices.length - activeInvoices.length)
    + (allActiveSchedules.length - activeSchedules.length)
    + excludedPaymentsCount;
  const paymentsByInvoiceId = activePayments.reduce((map, payment) => {
    for (const entry of effectiveApplications(payment, activeInvoiceIds)) {
      if (entry.invoice_id) map.set(entry.invoice_id, (map.get(entry.invoice_id) || 0) + entry.amount);
    }
    return map;
  }, new Map<string, number>());
  const invoicesByMonth = activeInvoices.reduce((map, invoice) => {
    const key = getInvoiceMonthKeyV3(invoice);
    map.set(key, [...(map.get(key) || []), invoice]);
    return map;
  }, new Map<string, Invoice[]>());
  const unlinkedPayments = activePayments.filter((payment) => effectiveApplications(payment, activeInvoiceIds).some((entry) => !entry.invoice_id && entry.amount > 0));
  const invoicePaymentMismatches = activeInvoices.filter((invoice) => {
    const linkedPaid = paymentsByInvoiceId.get(invoice.id) || 0;
    const recordedPaid = Number(invoice.paid_amount || 0);
    return moneyUnits(linkedPaid) !== moneyUnits(recordedPaid);
  });
  const balanceMismatches = activeInvoices.filter((invoice) => {
    const expectedBalance = Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0));
    return moneyUnits(expectedBalance) !== moneyUnits(getInvoiceBalanceV3(invoice));
  });
  const duplicateInvoiceGroups = Array.from(invoicesByMonth.entries()).filter(
    ([, monthInvoices]) => monthInvoices.length > 1,
  );
  const duplicatePayments = activePayments.filter((payment, index, list) => {
    const key = `${payment.payment_date || ''}-${Number(payment.amount || 0).toFixed(2)}-${payment.reference_number || ''}`;
    return (
      list.findIndex(
        (other) =>
          `${other.payment_date || ''}-${Number(other.amount || 0).toFixed(2)}-${other.reference_number || ''}` ===
          key,
      ) !== index
    );
  });
  const openInvoices = invoicesFromPaymentEvidence(activeInvoices, activePayments).filter((invoice) => !isPaidFinancialInvoiceV3(invoice));
  const invoicesTotal = activeInvoices.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0);
  const outstandingTotal = roundedMoney(openInvoices.reduce((sum, invoice) => sum + getInvoiceBalanceV3(invoice), 0));
  const schedulesTotal = activeSchedules.reduce((sum, schedule) => sum + Number(schedule.amount || 0), 0);
  const invoiceMonths = new Set(activeInvoices.map(getInvoiceMonthKeyV3));
  const missingInvoiceMonths = activeSchedules.filter(
    (schedule) => !schedule.invoice_id && !invoiceMonths.has(getScheduleMonthKeyV3(schedule)),
  );
  const contractBalance = Number(contract.balance_due || 0);
  const scheduleDifference = invoicesTotal - schedulesTotal;
  const contractBalanceDifference = contractBalance - outstandingTotal;

  const issues = [
    scheduleSettlementIssues.length > 0 && {
      title: 'حالة تحصيل القسط تحتاج مطابقة',
      detail: `${scheduleSettlementIssues.length} قسط لا يمكن اعتماد حالته المخزنة؛ يلزم مطابقة رابط الفاتورة وسدادها المثبت.`,
      action: 'راجع تفاصيل القسط دون توزيع دفعة أو تغيير العقد بالتخمين.',
      severity: 'danger' as const,
    },
    allActivePayments.some((payment) => !payment.financial_applications) && {
      title: 'توزيع الدفعات غير مكتمل',
      detail: 'تعذر إثبات الجزء المخصص للعقد من بعض الإيصالات؛ لم يُستخدم إجمالي الإيصال كسداد للعقد.',
      action: 'أعد تحميل الدفعات وتخصيصاتها قبل اعتماد الملخص.',
      severity: 'danger' as const,
    },
    unlinkedPayments.length > 0 && {
      title: 'دفعات غير مرتبطة بفواتير',
      detail: `${unlinkedPayments.length} دفعة بإجمالي ${formatCurrency(
        unlinkedPayments.reduce((sum, p) => sum + effectiveApplications(p, activeInvoiceIds).filter((entry) => !entry.invoice_id).reduce((total, entry) => total + entry.amount, 0), 0),
      )} لا ترتبط بأي فاتورة.`,
      action: 'راجع هذه الدفعات واربطها بالفاتورة الصحيحة أو سجلها كدفعة مقدمة.',
      severity: 'warning' as const,
    },
    invoicePaymentMismatches.length > 0 && {
      title: 'فرق بين paid_amount والدفعات المرتبطة',
      detail: `${invoicePaymentMismatches.length} فاتورة لا يطابق مبلغها المدفوع مجموع الدفعات المرتبطة بها.`,
      action: 'أعد احتساب حالة هذه الفواتير أو تحقق من الدفعات الملغاة/المكررة.',
      severity: 'danger' as const,
    },
    balanceMismatches.length > 0 && {
      title: 'رصيد فاتورة غير مطابق للمعادلة',
      detail: `${balanceMismatches.length} فاتورة رصيدها لا يساوي إجمالي الفاتورة ناقص المدفوع.`,
      action: 'حدّث رصيد الفاتورة أو راجع التعديلات اليدوية على المبلغ.',
      severity: 'danger' as const,
    },
    duplicateInvoiceGroups.length > 0 && {
      title: 'احتمال فواتير مكررة لنفس الشهر',
      detail: `${duplicateInvoiceGroups.length} شهر يحتوي على أكثر من فاتورة فعالة لنفس العقد.`,
      action: 'راجع الفواتير الشهرية وألغِ المكرر فقط بعد التأكد من عدم وجود دفعات مرتبطة.',
      severity: 'warning' as const,
    },
    duplicatePayments.length > 0 && {
      title: 'احتمال دفعات مكررة',
      detail: `${duplicatePayments.length} دفعة تتشابه في التاريخ والمبلغ والمرجع.`,
      action: 'راجع أرقام الإيصالات والمراجع البنكية قبل الاعتماد.',
      severity: 'warning' as const,
    },
    missingInvoiceMonths.length > 0 && {
      title: 'أقساط بلا فواتير شهرية',
      detail: `${missingInvoiceMonths.length} شهر في جدول الدفعات لا توجد له فاتورة فعالة.`,
      action: 'صحح تعارض مدة العقد أولاً ثم أنشئ الفواتير الناقصة تلقائياً.',
      severity: 'danger' as const,
    },
    outOfPeriodRecords > 0 && {
      title: 'سجلات مالية خارج مدة العقد',
      detail: `${outOfPeriodRecords} فاتورة أو قسط يقع خارج نافذة الفوترة المعتمدة للعقد.`,
      action: 'راجع تاريخ السجل وانقله إلى الشهر الصحيح أو ألغِه بسجل تدقيق.',
      severity: 'danger' as const,
    },
    Math.abs(contractBalanceDifference) > 1 && {
      title: 'رصيد العقد لا يطابق الفواتير المفتوحة',
      detail: `رصيد العقد ${formatCurrency(contractBalance)} بينما الفواتير المفتوحة ${formatCurrency(
        outstandingTotal,
      )}. الفرق ${formatCurrency(Math.abs(contractBalanceDifference))}.`,
      action: 'راجع تحديث رصيد العقد بعد آخر دفعة أو آخر إلغاء فاتورة.',
      severity: 'danger' as const,
    },
    activeInvoices.length > 0 &&
      activeSchedules.length > 0 &&
      Math.abs(scheduleDifference) > 1 && {
        title: 'جدول الدفعات لا يطابق الفواتير',
        detail: `إجمالي الفواتير ${formatCurrency(invoicesTotal)} وجدول الدفعات ${formatCurrency(schedulesTotal)}.`,
        action: 'أعد توليد جدول الدفعات من الفواتير أو راجع الأشهر الناقصة.',
        severity: 'warning' as const,
      },
  ].filter(Boolean) as FinancialDiagnosisIssueV3[];

  const score = Math.max(
    0,
    Math.min(100, 100 - issues.reduce((sum, issue) => sum + (issue.severity === 'danger' ? 18 : 10), 0)),
  );
  const status = score >= 85 ? 'سليم' : score >= 60 ? 'يحتاج مراجعة' : 'خلل مالي واضح';
  const tone: FinancialDiagnosisV3['tone'] = score >= 85 ? 'ok' : score >= 60 ? 'warning' : 'danger';
  const summary =
    issues[0]?.detail || 'لا توجد فروقات واضحة بين الفواتير والدفعات ورصيد العقد حسب البيانات الحالية.';

  return {
    issues,
    score,
    status,
    summary,
    tone,
    outstandingTotal,
    openInvoicesCount: openInvoices.length,
  };
};

// ===== Tab configuration =====
export const CONTRACT_TAB_ICONS: Record<string, typeof Receipt> = {
  health: ShieldCheck,
  financial: Receipt,
  vehicle: Gauge,
  violations: AlertCircle,
  records: Folder,
};

export const CONTRACT_DETAIL_TAB_VALUES_V3 = new Set([
  'health',
  'financial',
  'vehicle',
  'violations',
  'records',
  // legacy values kept so old links keep working (remapped to records)
  'documents',
  'contract',
]);

export const normalizeContractTabV3 = (tab: string): string =>
  tab === 'documents' || tab === 'contract' ? 'records' : tab;

export const getInitialContractTabV3 = (tab: string | null) => {
  if (!tab) return 'health';
  const normalized = normalizeContractTabV3(tab);
  return CONTRACT_DETAIL_TAB_VALUES_V3.has(normalized) ? normalized : 'health';
};

export const CONTRACT_SEVERITY_ICONS = {
  danger: AlertTriangle,
  warning: AlertTriangle,
  ok: CheckCircle2,
  money: CreditCard,
  legal: Scale,
  risk: AlertCircle,
  renew: Calendar,
  stable: CheckCircle2,
};
