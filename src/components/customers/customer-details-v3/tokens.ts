/**
 * Shared design tokens + business snapshot for the redesigned Customer
 * Details experience ("غرفة قيادة العميل").
 *
 * Same light design language as the contract V3 page:
 * canvas #F6F8FB, cards #FFFFFF, ink #0F172A, borders #E5EAF1
 * signal teal #22C7A1, amber #F59E0B, rose #FB6B7A, indigo #7C83F6, sky #38BDF8.
 *
 * The snapshot is the single source of truth for hero, action bar and pulse.
 */

// ===== Customer / contract status language =====
export interface CustomerStatusMeta {
  label: string;
  dot: string;
  chip: string;
}

export const CUSTOMER_RISK_META: Record<string, CustomerStatusMeta> = {
  danger: {
    label: 'متابعة عاجلة',
    dot: 'bg-[#FB6B7A]',
    chip: 'bg-[#FB6B7A]/10 text-[#BE123C] border-[#FB6B7A]/30',
  },
  warning: {
    label: 'يحتاج متابعة',
    dot: 'bg-[#F59E0B]',
    chip: 'bg-[#F59E0B]/10 text-[#B45309] border-[#F59E0B]/30',
  },
  success: {
    label: 'عميل نشط',
    dot: 'bg-[#22C7A1]',
    chip: 'bg-[#22C7A1]/10 text-[#0E9E7E] border-[#22C7A1]/30',
  },
  neutral: {
    label: 'ملف هادئ',
    dot: 'bg-slate-400',
    chip: 'bg-slate-100 text-slate-600 border-slate-200',
  },
};

export const CONTRACT_STATUS_CHIP_V3: Record<string, { label: string; chip: string }> = {
  active: { label: 'نشط', chip: 'bg-[#22C7A1]/10 text-[#0E9E7E] border-[#22C7A1]/30' },
  draft: { label: 'مسودة', chip: 'bg-slate-100 text-slate-600 border-slate-200' },
  expired: { label: 'منتهي', chip: 'bg-[#F59E0B]/10 text-[#B45309] border-[#F59E0B]/30' },
  suspended: { label: 'معلق', chip: 'bg-[#FB923C]/10 text-[#C2410C] border-[#FB923C]/30' },
  cancelled: { label: 'ملغي', chip: 'bg-[#FB6B7A]/10 text-[#BE123C] border-[#FB6B7A]/30' },
  canceled: { label: 'ملغي', chip: 'bg-[#FB6B7A]/10 text-[#BE123C] border-[#FB6B7A]/30' },
  closed: { label: 'مغلق', chip: 'bg-slate-100 text-slate-600 border-slate-200' },
  completed: { label: 'مكتمل', chip: 'bg-[#22C7A1]/10 text-[#0E9E7E] border-[#22C7A1]/30' },
  terminated: { label: 'موقوف', chip: 'bg-[#FB6B7A]/10 text-[#BE123C] border-[#FB6B7A]/30' },
  under_legal_procedure: { label: 'إجراء قانوني', chip: 'bg-[#7C83F6]/10 text-[#4F46E5] border-[#7C83F6]/30' },
};

export const getContractChipV3 = (status?: string | null) =>
  CONTRACT_STATUS_CHIP_V3[String(status || '').toLowerCase()] || CONTRACT_STATUS_CHIP_V3.draft;

// ===== Renewal opportunity window (days before contract end) =====
export const RENEWAL_WINDOW_DAYS_V3 = 30;

export type RenewalOpportunityV3 = {
  contractId: string;
  contractNumber: string;
  vehicleLabel: string;
  endDate: string;
  daysRemaining: number;
};

const daysBetweenV3 = (target: string) =>
  Math.ceil((new Date(target).getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000);

export const getRenewalOpportunitiesV3 = (contracts: any[]): RenewalOpportunityV3[] =>
  contracts
    .filter((contract) => String(contract.status || '').toLowerCase() === 'active' && contract.end_date)
    .map((contract) => {
      const vehicle = contract.vehicle;
      return {
        contractId: contract.id,
        contractNumber: contract.contract_number || contract.id,
        vehicleLabel: [vehicle?.make, vehicle?.model, vehicle?.year].filter(Boolean).join(' ') || 'مركبة غير محددة',
        endDate: contract.end_date,
        daysRemaining: daysBetweenV3(contract.end_date),
      };
    })
    .filter((item) => item.daysRemaining <= RENEWAL_WINDOW_DAYS_V3)
    .sort((left, right) => left.daysRemaining - right.daysRemaining);

// ===== Customer snapshot (single source of truth for the whole page) =====
export interface CustomerSnapshotV3 {
  activeContracts: number;
  totalContracts: number;
  /** مجموع أرصدة الفواتير المفتوحة */
  outstandingTotal: number;
  /** جزء المستحق تجاوز تاريخ استحقاقه */
  dueNowTotal: number;
  openInvoicesCount: number;
  paidTotal: number;
  unpaidViolationsCount: number;
  unpaidViolationsTotal: number;
  violationsCount: number;
  overdueFollowups: number;
  upcomingFollowups: number;
  renewalOpportunities: RenewalOpportunityV3[];
  risk: 'danger' | 'warning' | 'success' | 'neutral';
  riskMeta: CustomerStatusMeta;
  riskHelper: string;
}

const openInvoiceBalanceV3 = (invoice: any) => {
  const total = Number(invoice.total_amount || 0);
  const paid = Number(invoice.paid_amount || 0);
  const storedBalance = Number(invoice.balance_due ?? total - paid);
  return Math.max(0, storedBalance);
};

const isOpenInvoiceV3 = (invoice: any) => {
  const status = String(invoice.status || '').toLowerCase();
  const paymentStatus = String(invoice.payment_status || '').toLowerCase();
  const inactive = new Set(['cancelled', 'canceled', 'void', 'deleted']);
  return !inactive.has(status) && !inactive.has(paymentStatus);
};

export const buildCustomerSnapshotV3 = ({
  contracts,
  invoices,
  trafficViolations,
  scheduledFollowups,
}: {
  contracts: any[];
  invoices: any[];
  trafficViolations: any[];
  scheduledFollowups: any[];
}): CustomerSnapshotV3 => {
  const todayKey = new Date().toISOString().slice(0, 10);

  const activeContracts = contracts.filter(
    (contract) => String(contract.status || '').toLowerCase() === 'active',
  ).length;

  const openInvoices = invoices.filter(isOpenInvoiceV3).filter((invoice) => openInvoiceBalanceV3(invoice) > 1);
  const outstandingTotal = openInvoices.reduce((sum, invoice) => sum + openInvoiceBalanceV3(invoice), 0);
  const dueNowTotal = openInvoices
    .filter((invoice) => !invoice.due_date || String(invoice.due_date) <= todayKey)
    .reduce((sum, invoice) => sum + openInvoiceBalanceV3(invoice), 0);
  const paidTotal = invoices
    .filter(isOpenInvoiceV3)
    .reduce((sum, invoice) => sum + Number(invoice.paid_amount || 0), 0);

  const unpaidViolations = trafficViolations.filter(
    (violation) => !['paid', 'settled', 'waived'].includes(String(violation.status || '').toLowerCase()),
  );
  const unpaidViolationsTotal = unpaidViolations.reduce(
    (sum, violation) => sum + Number(violation.fine_amount || violation.total_amount || 0),
    0,
  );

  const overdueFollowups = scheduledFollowups.filter(
    (followup) => followup.scheduled_date && String(followup.scheduled_date).slice(0, 10) <= todayKey,
  ).length;

  const renewalOpportunities = getRenewalOpportunitiesV3(contracts);

  let risk: CustomerSnapshotV3['risk'] = 'neutral';
  if (dueNowTotal > 1 || unpaidViolationsTotal > 1) risk = 'danger';
  else if (overdueFollowups > 0 || renewalOpportunities.length > 0 || outstandingTotal > 1) risk = 'warning';
  else if (activeContracts > 0) risk = 'success';

  const riskHelper =
    risk === 'danger'
      ? 'توجد مبالغ متأخرة أو مخالفات غير مسددة تحتاج إجراءً الآن.'
      : risk === 'warning'
        ? 'توجد متابعات أو مستحقات قادمة تحتاج ترتيباً.'
        : risk === 'success'
          ? 'العلاقة نشطة ولا توجد متأخرات حرجة.'
          : 'لا توجد عقود نشطة حالياً.';

  return {
    activeContracts,
    totalContracts: contracts.length,
    outstandingTotal,
    dueNowTotal,
    openInvoicesCount: openInvoices.length,
    paidTotal,
    unpaidViolationsCount: unpaidViolations.length,
    unpaidViolationsTotal,
    violationsCount: trafficViolations.length,
    overdueFollowups,
    upcomingFollowups: scheduledFollowups.length,
    renewalOpportunities,
    risk,
    riskMeta: CUSTOMER_RISK_META[risk],
    riskHelper,
  };
};

// ===== Profile completion =====
export interface ProfileCompletionV3 {
  percent: number;
  missing: { label: string; kind: 'field' | 'document' }[];
}

export const buildProfileCompletionV3 = (
  customer: any,
  documentsCount: number,
): ProfileCompletionV3 => {
  const checks: { label: string; kind: 'field' | 'document'; done: boolean }[] = [
    { label: 'رقم الهاتف', kind: 'field', done: Boolean(customer?.phone) },
    { label: 'رقم الهوية', kind: 'field', done: Boolean(customer?.national_id) },
    { label: 'البريد الإلكتروني', kind: 'field', done: Boolean(customer?.email) },
    { label: 'تاريخ الميلاد', kind: 'field', done: Boolean(customer?.date_of_birth) },
    { label: 'مستند واحد على الأقل', kind: 'document', done: documentsCount > 0 },
  ];

  const done = checks.filter((check) => check.done).length;
  return {
    percent: Math.round((done / checks.length) * 100),
    missing: checks.filter((check) => !check.done).map(({ label, kind }) => ({ label, kind })),
  };
};

// ===== Quick CRM log statuses =====
export const QUICK_CALL_STATUSES_V3: { value: 'answered' | 'busy' | 'no_answer'; label: string }[] = [
  { value: 'answered', label: 'ردّ' },
  { value: 'busy', label: 'مشغول' },
  { value: 'no_answer', label: 'لم يرد' },
];

// ===== Tab configuration =====
export const CUSTOMER_DETAIL_TAB_VALUES_V3 = new Set([
  'overview',
  'contracts',
  'financial',
  'violations',
  'records',
]);

// legacy tab values kept so old in-app links keep working
const LEGACY_TAB_MAP_V3: Record<string, string> = {
  'ai-summary': 'overview',
  info: 'records',
  phones: 'records',
  vehicles: 'contracts',
  invoices: 'financial',
  payments: 'financial',
  notes: 'records',
  activity: 'records',
};

export const normalizeCustomerTabV3 = (tab: string): string =>
  LEGACY_TAB_MAP_V3[tab] || tab;

export const getInitialCustomerTabV3 = (tab: string | null) => {
  if (!tab) return 'overview';
  const normalized = normalizeCustomerTabV3(tab);
  return CUSTOMER_DETAIL_TAB_VALUES_V3.has(normalized) ? normalized : 'overview';
};
