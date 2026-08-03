const INACTIVE_PAYMENT_STATUSES = new Set([
  "cancelled",
  "canceled",
  "void",
  "voided",
  "deleted",
  "failed",
  "reversed",
  "refunded",
]);

const INACTIVE_INVOICE_STATUSES = new Set([
  "cancelled",
  "canceled",
  "void",
  "voided",
  "deleted",
  "inactive",
]);

const COMPLETED_PAYMENT_STATUSES = new Set([
  "completed",
  "paid",
  "success",
  "succeeded",
]);
const ACTIVE_CONTRACT_STATUSES = new Set(["active", "under_legal_procedure"]);
const INACTIVE_SCHEDULE_STATUSES = new Set([
  "cancelled",
  "canceled",
  "void",
  "voided",
  "deleted",
  "inactive",
]);
const PROTECTED_VEHICLE_STATUSES = new Set([
  "maintenance",
  "accident",
  "stolen",
  "police_station",
  "out_of_service",
  "reserved_employee",
  "municipality",
]);
export const MONEY_SETTLEMENT_TOLERANCE = 0.01;

export function roundMoney(value: unknown): number {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric)
    ? Math.round((numeric + Number.EPSILON) * 100) / 100
    : 0;
}

export function moneyDiffers(
  left: unknown,
  right: unknown,
  tolerance = 0.01
): boolean {
  return Math.abs(roundMoney(left) - roundMoney(right)) > tolerance;
}

export function normalizeStatus(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function normalizeScheduleStatus(value: unknown): string {
  const status = normalizeStatus(value);
  return status === "partially_paid" ? "partial" : status;
}

export function dateOnly(value: unknown): string {
  const text = String(value || "").trim();
  const isoDate = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDate) return isoDate[1];
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime())
    ? ""
    : parsed.toISOString().slice(0, 10);
}

export function isDateOutsidePeriod(
  value: unknown,
  start: unknown,
  end: unknown
): boolean {
  const date = dateOnly(value);
  const startDate = dateOnly(start);
  const endDate = dateOnly(end);
  return Boolean(
    date && startDate && endDate && (date < startDate || date > endDate)
  );
}

export function isInvoiceOutsideContractBillingPeriod(
  invoice: Record<string, unknown>,
  start: unknown,
  end: unknown
): boolean {
  const startDate = dateOnly(start);
  const endDate = dateOnly(end);
  const startMonth = monthKey(startDate);
  const endMonth = monthKey(endDate);
  if (!startDate || !endDate || !startMonth || !endMonth) return false;

  const invoiceMonth = invoiceMonthKey(invoice);
  return Boolean(
    invoiceMonth && (invoiceMonth < startMonth || invoiceMonth > endMonth)
  );
}

export function invoiceMonthKey(invoice: Record<string, unknown>): string {
  return monthKey(invoice.invoice_month || invoice.invoice_date);
}

export function invoiceConflictsWithMonth(
  invoice: Record<string, unknown>,
  month: string
): boolean {
  return invoiceMonthKey(invoice) === month;
}

export type ScheduleInvoiceLinkAssignment = {
  scheduleId: string;
  oldInvoiceId: string | null;
  newInvoiceId: string | null;
  candidateInvoiceIds: string[];
};

/**
 * Kept as `invoice_date` for compatibility with existing repair payloads.
 * Matching itself is canonical: invoice_month, then legacy invoice_date.
 */
export type BillingDateMode = "invoice_date";

export type ScheduleInvoiceLinkPlan = {
  complete: boolean;
  billingDateMode: BillingDateMode;
  assignments: ScheduleInvoiceLinkAssignment[];
  unmatchedScheduleIds: string[];
};

export function invoiceMatchesBillingMonth(
  invoice: Record<string, unknown>,
  month: string,
  _mode: BillingDateMode
): boolean {
  return invoiceMonthKey(invoice) === month;
}

export function deriveOneToOneScheduleInvoicePlan(
  schedules: Record<string, unknown>[],
  invoices: Record<string, unknown>[],
  preferredMode?: BillingDateMode
): ScheduleInvoiceLinkPlan {
  return derivePlanForBillingDateMode(
    schedules,
    invoices,
    preferredMode || "invoice_date"
  );
}

function derivePlanForBillingDateMode(
  schedules: Record<string, unknown>[],
  invoices: Record<string, unknown>[],
  billingDateMode: BillingDateMode
): ScheduleInvoiceLinkPlan {
  const orderedSchedules = [...schedules]
    .filter((schedule) => Boolean(schedule?.id))
    .sort(
      (left, right) =>
        String(left.due_date || "").localeCompare(
          String(right.due_date || "")
        ) || String(left.id).localeCompare(String(right.id))
    );
  const candidateIdsBySchedule = new Map<string, string[]>();
  for (const schedule of orderedSchedules) {
    const scheduleMonth = monthKey(schedule.due_date);
    const ranked = invoices
      .filter(
        (invoice) =>
          Boolean(invoice?.id) &&
          invoiceMatchesBillingMonth(invoice, scheduleMonth, billingDateMode)
      )
      .sort((left, right) => {
        const rank = (invoice: Record<string, unknown>) => {
          const isCurrent = invoice.id === schedule.invoice_id;
          return isCurrent ? 0 : 1;
        };
        return (
          rank(left) - rank(right) ||
          String(left.id).localeCompare(String(right.id))
        );
      })
      .map((invoice) => String(invoice.id));
    candidateIdsBySchedule.set(String(schedule.id), [...new Set(ranked)]);
  }

  const assignmentOrder = [...orderedSchedules].sort((left, right) => {
    const leftCount = candidateIdsBySchedule.get(String(left.id))?.length || 0;
    const rightCount =
      candidateIdsBySchedule.get(String(right.id))?.length || 0;
    return (
      leftCount - rightCount ||
      String(left.due_date || "").localeCompare(String(right.due_date || "")) ||
      String(left.id).localeCompare(String(right.id))
    );
  });
  const invoiceOwner = new Map<string, string>();
  const scheduleInvoice = new Map<string, string>();

  const assign = (
    scheduleId: string,
    visitedSchedules: Set<string>,
    visitedInvoices: Set<string>
  ): boolean => {
    if (visitedSchedules.has(scheduleId)) return false;
    visitedSchedules.add(scheduleId);
    for (const invoiceId of candidateIdsBySchedule.get(scheduleId) || []) {
      if (visitedInvoices.has(invoiceId)) continue;
      visitedInvoices.add(invoiceId);
      const owner = invoiceOwner.get(invoiceId);
      if (!owner || assign(owner, visitedSchedules, visitedInvoices)) {
        invoiceOwner.set(invoiceId, scheduleId);
        scheduleInvoice.set(scheduleId, invoiceId);
        return true;
      }
    }
    return false;
  };

  const unmatchedScheduleIds: string[] = [];
  for (const schedule of assignmentOrder) {
    const scheduleId = String(schedule.id);
    if (!assign(scheduleId, new Set(), new Set())) {
      unmatchedScheduleIds.push(scheduleId);
    }
  }

  const assignments = orderedSchedules.map((schedule) => {
    const scheduleId = String(schedule.id);
    return {
      scheduleId,
      oldInvoiceId: schedule.invoice_id ? String(schedule.invoice_id) : null,
      newInvoiceId: scheduleInvoice.get(scheduleId) || null,
      candidateInvoiceIds: candidateIdsBySchedule.get(scheduleId) || [],
    };
  });
  return {
    complete:
      unmatchedScheduleIds.length === 0 &&
      assignments.every((assignment) => Boolean(assignment.newInvoiceId)),
    billingDateMode,
    assignments,
    unmatchedScheduleIds,
  };
}

export function isInactivePaymentStatus(value: unknown): boolean {
  return INACTIVE_PAYMENT_STATUSES.has(normalizeStatus(value));
}

export function isInactiveInvoiceStatus(value: unknown): boolean {
  return INACTIVE_INVOICE_STATUSES.has(normalizeStatus(value));
}

export function isCompletedPayment(value: unknown): boolean {
  return COMPLETED_PAYMENT_STATUSES.has(normalizeStatus(value));
}

export function isReceiptPayment(payment: Record<string, unknown>): boolean {
  const transactionType = normalizeStatus(
    payment.transaction_type || "receipt"
  );
  return (
    transactionType === "receipt" && isCompletedPayment(payment.payment_status)
  );
}

export function paymentStatusFor(
  total: unknown,
  paid: unknown
): "unpaid" | "partial" | "paid" {
  const normalizedTotal = Math.max(0, roundMoney(total));
  const normalizedPaid = Math.max(0, roundMoney(paid));
  if (normalizedTotal - normalizedPaid <= MONEY_SETTLEMENT_TOLERANCE)
    return "paid";
  return normalizedPaid > 0 ? "partial" : "unpaid";
}

export function deriveFinancialTotals(
  total: unknown,
  payments: Array<Record<string, unknown>>
) {
  const normalizedTotal = Math.max(0, roundMoney(total));
  const paid = roundMoney(
    payments
      .filter(isReceiptPayment)
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  );
  const balance = roundMoney(Math.max(0, normalizedTotal - paid));
  return {
    paid,
    balance,
    paymentStatus: paymentStatusFor(normalizedTotal, paid),
  };
}

export function buildCanonicalInvoiceReceiptContributions(
  payments: Array<Record<string, unknown>>,
  allocations: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  const paymentById = new Map(
    payments.map((payment) => [String(payment.id || ""), payment])
  );
  const activeInvoiceAllocations = allocations.filter(
    (allocation) =>
      allocation.is_active === true &&
      normalizeStatus(allocation.allocation_type) === "invoice"
  );
  const allocatedPaymentIds = new Set(
    allocations
      .filter((allocation) => allocation.is_active === true)
      .map((allocation) => String(allocation.payment_id || ""))
  );
  const contributions: Array<Record<string, unknown>> = [];

  for (const allocation of activeInvoiceAllocations) {
    const payment = paymentById.get(String(allocation.payment_id || ""));
    if (!payment) continue;
    contributions.push({
      ...payment,
      invoice_id: allocation.target_id,
      amount: allocation.amount,
      allocation_id: allocation.id,
      allocation_source: "ledger",
    });
  }

  for (const payment of payments) {
    if (
      !payment.invoice_id ||
      allocatedPaymentIds.has(String(payment.id || ""))
    )
      continue;
    contributions.push({ ...payment, allocation_source: "legacy_direct" });
  }

  return contributions;
}

export function buildCanonicalContractReceiptContributions(
  contractId: unknown,
  invoices: Array<Record<string, unknown>>,
  payments: Array<Record<string, unknown>>,
  allocations: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  const normalizedContractId = String(contractId || "");
  const activeInvoiceIds = new Set(
    invoices
      .filter(
        (invoice) =>
          String(invoice.contract_id || "") === normalizedContractId &&
          !isInactiveInvoiceStatus(invoice.status) &&
          !isInactiveInvoiceStatus(invoice.payment_status)
      )
      .map((invoice) => String(invoice.id || ""))
  );
  const activeAllocations = allocations.filter(
    (allocation) => allocation.is_active === true
  );
  const activeAllocationPaymentIds = new Set(
    activeAllocations.map((allocation) => String(allocation.payment_id || ""))
  );
  const paymentById = new Map(
    payments.map((payment) => [String(payment.id || ""), payment])
  );
  const invoiceContributions = buildCanonicalInvoiceReceiptContributions(
    payments,
    allocations
  ).filter((contribution) =>
    activeInvoiceIds.has(String(contribution.invoice_id || ""))
  );
  const contractAllocationContributions = activeAllocations
    .filter(
      (allocation) =>
        normalizeStatus(allocation.allocation_type) === "contract" &&
        String(allocation.target_id || "") === normalizedContractId
    )
    .flatMap((allocation) => {
      const payment = paymentById.get(String(allocation.payment_id || ""));
      return payment
        ? [
            {
              ...payment,
              amount: allocation.amount,
              allocation_source: "contract_ledger",
            },
          ]
        : [];
    });
  const unallocatedContractContributions = payments.filter(
    (payment) =>
      String(payment.contract_id || "") === normalizedContractId &&
      !payment.invoice_id &&
      !activeAllocationPaymentIds.has(String(payment.id || ""))
  );

  return [
    ...invoiceContributions,
    ...contractAllocationContributions,
    ...unallocatedContractContributions,
  ];
}

export function deriveSchedulePaymentState(
  amount: unknown,
  paidAmount: unknown,
  dueDate: unknown,
  now: Date
) {
  const normalizedAmount = Math.max(0, roundMoney(amount));
  const normalizedPaid = Math.max(
    0,
    Math.min(normalizedAmount, roundMoney(paidAmount))
  );
  const status =
    normalizedAmount - normalizedPaid <= MONEY_SETTLEMENT_TOLERANCE
      ? "paid"
      : normalizedPaid > 0
      ? "partial"
      : dateOnly(dueDate) < now.toISOString().slice(0, 10)
      ? "overdue"
      : "pending";
  return { paid: normalizedPaid, status };
}

export function isActiveContractStatus(value: unknown): boolean {
  return ACTIVE_CONTRACT_STATUSES.has(normalizeStatus(value));
}

export function isInactiveScheduleStatus(value: unknown): boolean {
  return INACTIVE_SCHEDULE_STATUSES.has(normalizeStatus(value));
}

export function canLinkInvoiceForSchedule(input: {
  scheduleStatus: unknown;
  dueDate: unknown;
  contractStatus: unknown;
  contractStartDate: unknown;
  contractEndDate: unknown;
}): boolean {
  if (
    isInactiveScheduleStatus(input.scheduleStatus) ||
    !isActiveContractStatus(input.contractStatus)
  ) {
    return false;
  }
  const dueDate = dateOnly(input.dueDate);
  const startDate = dateOnly(input.contractStartDate);
  const endDate = dateOnly(input.contractEndDate);
  return Boolean(
    dueDate &&
      startDate &&
      endDate &&
      dueDate >= startDate &&
      dueDate <= endDate
  );
}

export function canGenerateInvoiceForSchedule(input: {
  invoiceId: unknown;
  scheduleStatus: unknown;
  amount: unknown;
  dueDate: unknown;
  contractStatus: unknown;
  contractStartDate: unknown;
  contractEndDate: unknown;
}): boolean {
  if (input.invoiceId || roundMoney(input.amount) <= 0.01) {
    return false;
  }
  return canLinkInvoiceForSchedule(input);
}

export function isProtectedVehicleStatus(value: unknown): boolean {
  return PROTECTED_VEHICLE_STATUSES.has(normalizeStatus(value));
}

export function deriveVehicleStatus(input: {
  currentStatus: unknown;
  isActive: unknown;
  hasActiveContract: boolean;
  hasOpenMaintenance: boolean;
  hasActiveReservation: boolean;
}): string | null {
  if (isProtectedVehicleStatus(input.currentStatus)) return null;
  if (input.hasOpenMaintenance) return "maintenance";
  if (input.hasActiveContract) return "rented";
  if (input.hasActiveReservation) return "street_52";
  if (normalizeStatus(input.currentStatus) === "street_52") return null;
  return input.isActive === false ? "out_of_service" : "available";
}

export function deriveStockOnHand(
  movements: Array<Record<string, unknown>>
): number {
  return roundMoney(
    movements.reduce((sum, movement) => {
      const type = normalizeStatus(movement.movement_type).toUpperCase();
      const quantity = Number(movement.quantity || 0);
      const absolute = Math.abs(quantity);
      if (["PURCHASE", "TRANSFER_IN", "RETURN", "IN"].includes(type))
        return sum + absolute;
      if (["SALE", "TRANSFER_OUT", "OUT"].includes(type)) return sum - absolute;
      if (type === "ADJUSTMENT") return sum + quantity;
      return sum;
    }, 0)
  );
}

export function deriveLegalCaseCosts(
  legalCase: Record<string, unknown>
): number {
  return roundMoney(
    Number(legalCase.legal_fees || 0) +
      Number(legalCase.court_fees || 0) +
      Number(legalCase.other_expenses || 0)
  );
}

export function deriveAttendanceHours(input: {
  checkIn: unknown;
  checkOut: unknown;
  breakStart?: unknown;
  breakEnd?: unknown;
}): number | null {
  const checkIn = parseDate(input.checkIn);
  const checkOut = parseDate(input.checkOut);
  if (!checkIn || !checkOut || checkOut <= checkIn) return null;

  let breakHours = 0;
  const breakStart = parseDate(input.breakStart);
  const breakEnd = parseDate(input.breakEnd);
  if (
    breakStart &&
    breakEnd &&
    breakEnd > breakStart &&
    breakStart >= checkIn &&
    breakEnd <= checkOut
  ) {
    breakHours = (breakEnd.getTime() - breakStart.getTime()) / 3_600_000;
  }

  return Math.max(
    0,
    Math.round(
      ((checkOut.getTime() - checkIn.getTime()) / 3_600_000 - breakHours) * 100
    ) / 100
  );
}

export function derivePayrollNet(payroll: Record<string, unknown>): number {
  return roundMoney(
    Number(payroll.basic_salary || 0) +
      Number(payroll.allowances || 0) +
      Number(payroll.overtime_amount || 0) -
      Number(payroll.deductions || 0) -
      Number(payroll.tax_amount || 0)
  );
}

export function maxDaysOverdue(dueDates: unknown[], now: Date): number {
  const today = new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
  let maximum = 0;
  for (const value of dueDates) {
    const due = parseDate(value);
    if (!due || due >= today) continue;
    maximum = Math.max(
      maximum,
      Math.floor((today.getTime() - due.getTime()) / 86_400_000)
    );
  }
  return maximum;
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function monthKey(value: unknown): string {
  const text = String(value || "");
  return /^\d{4}-\d{2}/.test(text) ? text.slice(0, 7) : "";
}
