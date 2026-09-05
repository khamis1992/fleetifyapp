import {
  getInvoiceBillingMonthKey,
  getInvoiceDisplayLabel,
  isActiveInvoice,
} from '@/utils/invoiceBillingMonth';

export type InstallmentLedgerInvoice = {
  id: string;
  invoice_number: string;
  invoice_month?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  total_amount?: number | null;
  paid_amount?: number | null;
  balance_due?: number | null;
  status?: string | null;
  payment_status?: string | null;
  invoice_type?: string | null;
  penalty_id?: string | null;
};

export type InstallmentLedgerPayment = {
  id: string;
  amount: number;
  payment_date: string;
  payment_status: string;
  transaction_type?: string | null;
  payment_method: string;
  payment_number?: string | null;
  reference_number?: string | null;
  notes?: string | null;
  invoice_id?: string | null;
  created_by_name?: string | null;
};

export type InstallmentLedgerAllocation = {
  id: string;
  payment_id: string;
  target_id: string;
  allocation_type: string;
  amount: number;
  is_active: boolean;
  allocated_date?: string | null;
};

export type InstallmentContribution = {
  id: string;
  invoiceId: string;
  payment: InstallmentLedgerPayment;
  amount: number;
  isActive: boolean;
  source: 'allocation' | 'direct';
};

export type InstallmentLedgerStatus = 'paid' | 'partial' | 'overdue' | 'unpaid' | 'cancelled' | 'review';

export type InstallmentLedgerGroup = {
  id: string;
  category: 'rent' | 'charge';
  monthKey: string | null;
  label: string;
  invoices: InstallmentLedgerInvoice[];
  contributions: InstallmentContribution[];
  totalAmount: number;
  paidAmount: number;
  tracedPaidAmount: number;
  untracedPaidAmount: number;
  remainingAmount: number;
  receiptCount: number;
  dueDate: string | null;
  latestPaymentDate: string | null;
  status: InstallmentLedgerStatus;
  isOverdue: boolean;
};

export type ContractInstallmentLedger = {
  rentGroups: InstallmentLedgerGroup[];
  chargeGroups: InstallmentLedgerGroup[];
  unmatchedPayments: InstallmentLedgerPayment[];
};

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export const isCompletedInstallmentPayment = (payment: Pick<InstallmentLedgerPayment, 'payment_status' | 'transaction_type'>) =>
  ['completed', 'paid', 'success', 'succeeded'].includes(String(payment.payment_status || '').trim().toLowerCase())
  && String(payment.transaction_type || 'receipt').trim().toLowerCase() === 'receipt';

const isChargeInvoice = (invoice: InstallmentLedgerInvoice) => {
  const number = invoice.invoice_number.trim().toUpperCase();
  const type = invoice.invoice_type?.trim().toLowerCase();
  return Boolean(invoice.penalty_id) || number.startsWith('TV-') || type === 'service';
};

const getRentLabel = (monthKey: string | null) => {
  if (!monthKey) return 'قسط إيجار غير محدد الشهر';
  const [year, month] = monthKey.split('-');
  return `فاتورة شهر ${Number(month)}/${year}`;
};

const getGroupStatus = ({
  hasActiveInvoices,
  paidAmount,
  remainingAmount,
  dueDate,
  today,
}: {
  hasActiveInvoices: boolean;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string | null;
  today: string;
}): { status: InstallmentLedgerStatus; isOverdue: boolean } => {
  if (!hasActiveInvoices) return { status: 'cancelled', isOverdue: false };
  if (remainingAmount === 0) return { status: 'paid', isOverdue: false };

  const isOverdue = Boolean(dueDate && dueDate.slice(0, 10) < today);
  if (paidAmount > 0) return { status: 'partial', isOverdue };
  if (isOverdue) return { status: 'overdue', isOverdue: true };
  return { status: 'unpaid', isOverdue: false };
};

export const buildContractInstallmentLedger = ({
  invoices,
  payments,
  allocations,
  today = new Date().toISOString().slice(0, 10),
}: {
  invoices: InstallmentLedgerInvoice[];
  payments: InstallmentLedgerPayment[];
  allocations: InstallmentLedgerAllocation[];
  today?: string;
}): ContractInstallmentLedger => {
  const invoiceById = new Map(invoices.map((invoice) => [invoice.id, invoice]));
  const paymentById = new Map(payments.map((payment) => [payment.id, payment]));
  const groups = new Map<string, InstallmentLedgerInvoice[]>();

  for (const invoice of invoices) {
    const monthKey = getInvoiceBillingMonthKey(invoice);
    const category = isChargeInvoice(invoice) ? 'charge' : 'rent';
    const groupId = category === 'rent'
      ? `rent:${monthKey || invoice.id}`
      : `charge:${invoice.id}`;
    groups.set(groupId, [...(groups.get(groupId) || []), invoice]);
  }

  const invoiceAllocations = allocations.filter(
    (allocation) => allocation.allocation_type === 'invoice' && invoiceById.has(allocation.target_id),
  );
  const allocatedPaymentIds = new Set(allocations.filter((allocation) => allocation.is_active)
    .map((allocation) => allocation.payment_id));
  const contributionsByInvoiceId = new Map<string, InstallmentContribution[]>();

  for (const allocation of invoiceAllocations) {
    const payment = paymentById.get(allocation.payment_id);
    if (!payment) continue;
    const contribution: InstallmentContribution = {
      id: allocation.id,
      invoiceId: allocation.target_id,
      payment,
      amount: roundMoney(Number(allocation.amount || 0)),
      isActive: allocation.is_active && isActiveInvoice(invoiceById.get(allocation.target_id)!),
      source: 'allocation',
    };
    contributionsByInvoiceId.set(allocation.target_id, [
      ...(contributionsByInvoiceId.get(allocation.target_id) || []),
      contribution,
    ]);
  }

  // Legacy fallback only. A payment with any active allocation must never be
  // counted again through its denormalized payments.invoice_id column.
  for (const payment of payments) {
    if (!payment.invoice_id || !invoiceById.has(payment.invoice_id)) continue;
    if (allocatedPaymentIds.has(payment.id)) continue;
    const contribution: InstallmentContribution = {
      id: `direct:${payment.id}`,
      invoiceId: payment.invoice_id,
      payment,
      amount: roundMoney(Number(payment.amount || 0)),
      isActive: isCompletedInstallmentPayment(payment) && isActiveInvoice(invoiceById.get(payment.invoice_id)!),
      source: 'direct',
    };
    contributionsByInvoiceId.set(payment.invoice_id, [
      ...(contributionsByInvoiceId.get(payment.invoice_id) || []),
      contribution,
    ]);
  }

  const ledgerGroups = Array.from(groups.entries()).map(([id, groupInvoices]): InstallmentLedgerGroup => {
    const category = id.startsWith('rent:') ? 'rent' : 'charge';
    const monthKey = getInvoiceBillingMonthKey(groupInvoices[0]);
    const activeInvoices = groupInvoices.filter(isActiveInvoice);
    const financialInvoices = activeInvoices.length > 0 ? activeInvoices : groupInvoices;
    const activeInvoiceIds = new Set(activeInvoices.map((invoice) => invoice.id));
    const contributions = groupInvoices
      .flatMap((invoice) => contributionsByInvoiceId.get(invoice.id) || [])
      .sort((left, right) => {
        const dateOrder = (right.payment.payment_date || '').localeCompare(left.payment.payment_date || '');
        return dateOrder || left.id.localeCompare(right.id);
      });
    const effectiveContributions = contributions.filter(
      (contribution) => contribution.isActive
        && isCompletedInstallmentPayment(contribution.payment)
        && activeInvoiceIds.has(contribution.invoiceId),
    );
    const tracedPaidAmount = roundMoney(
      effectiveContributions.reduce((sum, contribution) => sum + contribution.amount, 0),
    );
    const recordedPaidAmount = roundMoney(
      activeInvoices.reduce((sum, invoice) => sum + Number(invoice.paid_amount || 0), 0),
    );
    const totalAmount = roundMoney(
      financialInvoices.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0),
    );
    // Cached invoice balances are evidence of a discrepancy, never a second
    // payment source. Compute each invoice before grouping the month so an
    // overpayment cannot silently settle another invoice.
    const paidByInvoice = new Map<string, number>();
    for (const contribution of effectiveContributions) {
      paidByInvoice.set(contribution.invoiceId,
        roundMoney((paidByInvoice.get(contribution.invoiceId) || 0) + contribution.amount));
    }
    const remainingForInvoice = (invoice: InstallmentLedgerInvoice) => roundMoney(
      Math.max(0, Number(invoice.total_amount || 0) - (paidByInvoice.get(invoice.id) || 0)),
    );
    const hasCacheDisagreement = activeInvoices.some((invoice) =>
      roundMoney(Number(invoice.paid_amount || 0)) !== (paidByInvoice.get(invoice.id) || 0));
    const paidAmount = tracedPaidAmount;
    const remainingAmount = roundMoney(activeInvoices.reduce((sum, invoice) => sum + remainingForInvoice(invoice), 0));
    const unpaidInvoices = activeInvoices.filter((invoice) => remainingForInvoice(invoice) > 0);
    const dueDates = (unpaidInvoices.length ? unpaidInvoices : financialInvoices)
      .map((invoice) => invoice.due_date).filter(Boolean) as string[];
    const dueDate = dueDates.sort()[0] || null;
    const latestPaymentDate = effectiveContributions
      .map((contribution) => contribution.payment.payment_date)
      .filter(Boolean)
      .sort()
      .at(-1) || null;
    const receiptCount = new Set(effectiveContributions.map((contribution) => contribution.payment.id)).size;
    const statusMeta = getGroupStatus({
      hasActiveInvoices: activeInvoices.length > 0,
      paidAmount,
      remainingAmount,
      dueDate,
      today,
    });

    return {
      id,
      category,
      monthKey,
      label: category === 'rent'
        ? getRentLabel(monthKey)
        : getInvoiceDisplayLabel(groupInvoices[0]),
      invoices: groupInvoices,
      contributions,
      totalAmount,
      paidAmount,
      tracedPaidAmount,
      untracedPaidAmount: roundMoney(Math.max(0, recordedPaidAmount - tracedPaidAmount)),
      remainingAmount,
      receiptCount,
      dueDate,
      latestPaymentDate,
      status: hasCacheDisagreement ? 'review' : statusMeta.status,
      isOverdue: statusMeta.isOverdue,
    };
  });

  const representedPaymentIds = new Set(
    Array.from(contributionsByInvoiceId.values()).flat()
      .filter((contribution) => contribution.isActive && isCompletedInstallmentPayment(contribution.payment))
      .map((contribution) => contribution.payment.id),
  );
  const unmatchedPayments = payments.filter(
    (payment) => isCompletedInstallmentPayment(payment) && !representedPaymentIds.has(payment.id),
  );
  const sortGroups = (left: InstallmentLedgerGroup, right: InstallmentLedgerGroup) =>
    (left.monthKey || '9999-99').localeCompare(right.monthKey || '9999-99')
      || left.label.localeCompare(right.label, 'ar');

  return {
    rentGroups: ledgerGroups.filter((group) => group.category === 'rent').sort(sortGroups),
    chargeGroups: ledgerGroups.filter((group) => group.category === 'charge').sort(sortGroups),
    unmatchedPayments,
  };
};
