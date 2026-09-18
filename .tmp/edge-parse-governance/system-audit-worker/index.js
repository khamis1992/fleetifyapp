// supabase/functions/system-audit-worker/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient as createClient2 } from "https://esm.sh/@supabase/supabase-js@2.57.4";

// supabase/functions/_shared/system-audit/rules.ts
var INACTIVE_PAYMENT_STATUSES = /* @__PURE__ */ new Set([
  "cancelled",
  "canceled",
  "void",
  "voided",
  "deleted",
  "failed",
  "reversed",
  "refunded"
]);
var INACTIVE_INVOICE_STATUSES = /* @__PURE__ */ new Set([
  "cancelled",
  "canceled",
  "void",
  "voided",
  "deleted",
  "inactive"
]);
var COMPLETED_PAYMENT_STATUSES = /* @__PURE__ */ new Set([
  "completed",
  "paid",
  "success",
  "succeeded"
]);
var ACTIVE_CONTRACT_STATUSES = /* @__PURE__ */ new Set(["active", "under_legal_procedure"]);
var INACTIVE_SCHEDULE_STATUSES = /* @__PURE__ */ new Set([
  "cancelled",
  "canceled",
  "void",
  "voided",
  "deleted",
  "inactive"
]);
var PROTECTED_VEHICLE_STATUSES = /* @__PURE__ */ new Set([
  "maintenance",
  "accident",
  "stolen",
  "police_station",
  "out_of_service",
  "reserved_employee",
  "municipality"
]);
var MONEY_SETTLEMENT_TOLERANCE = 0.01;
function roundMoney(value) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? Math.round((numeric + Number.EPSILON) * 100) / 100 : 0;
}
function moneyDiffers(left, right, tolerance = 0.01) {
  return Math.abs(roundMoney(left) - roundMoney(right)) > tolerance;
}
function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}
function normalizeScheduleStatus(value) {
  const status = normalizeStatus(value);
  return status === "partially_paid" ? "partial" : status;
}
function dateOnly(value) {
  const text = String(value || "").trim();
  const isoDate = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDate) return isoDate[1];
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}
function isInvoiceOutsideContractBillingPeriod(invoice, start, end) {
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
function invoiceMonthKey(invoice) {
  return monthKey(invoice.invoice_month || invoice.invoice_date);
}
function invoiceConflictsWithMonth(invoice, month) {
  return invoiceMonthKey(invoice) === month;
}
function invoiceMatchesBillingMonth(invoice, month, _mode) {
  return invoiceMonthKey(invoice) === month;
}
function deriveOneToOneScheduleInvoicePlan(schedules, invoices, preferredMode) {
  return derivePlanForBillingDateMode(
    schedules,
    invoices,
    preferredMode || "invoice_date"
  );
}
function derivePlanForBillingDateMode(schedules, invoices, billingDateMode) {
  const orderedSchedules = [...schedules].filter((schedule) => Boolean(schedule?.id)).sort(
    (left, right) => String(left.due_date || "").localeCompare(
      String(right.due_date || "")
    ) || String(left.id).localeCompare(String(right.id))
  );
  const candidateIdsBySchedule = /* @__PURE__ */ new Map();
  for (const schedule of orderedSchedules) {
    const scheduleMonth = monthKey(schedule.due_date);
    const ranked = invoices.filter(
      (invoice) => Boolean(invoice?.id) && invoiceMatchesBillingMonth(invoice, scheduleMonth, billingDateMode)
    ).sort((left, right) => {
      const rank = (invoice) => {
        const isCurrent = invoice.id === schedule.invoice_id;
        return isCurrent ? 0 : 1;
      };
      return rank(left) - rank(right) || String(left.id).localeCompare(String(right.id));
    }).map((invoice) => String(invoice.id));
    candidateIdsBySchedule.set(String(schedule.id), [...new Set(ranked)]);
  }
  const assignmentOrder = [...orderedSchedules].sort((left, right) => {
    const leftCount = candidateIdsBySchedule.get(String(left.id))?.length || 0;
    const rightCount = candidateIdsBySchedule.get(String(right.id))?.length || 0;
    return leftCount - rightCount || String(left.due_date || "").localeCompare(String(right.due_date || "")) || String(left.id).localeCompare(String(right.id));
  });
  const invoiceOwner = /* @__PURE__ */ new Map();
  const scheduleInvoice = /* @__PURE__ */ new Map();
  const assign = (scheduleId, visitedSchedules, visitedInvoices) => {
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
  const unmatchedScheduleIds = [];
  for (const schedule of assignmentOrder) {
    const scheduleId = String(schedule.id);
    if (!assign(scheduleId, /* @__PURE__ */ new Set(), /* @__PURE__ */ new Set())) {
      unmatchedScheduleIds.push(scheduleId);
    }
  }
  const assignments = orderedSchedules.map((schedule) => {
    const scheduleId = String(schedule.id);
    return {
      scheduleId,
      oldInvoiceId: schedule.invoice_id ? String(schedule.invoice_id) : null,
      newInvoiceId: scheduleInvoice.get(scheduleId) || null,
      candidateInvoiceIds: candidateIdsBySchedule.get(scheduleId) || []
    };
  });
  return {
    complete: unmatchedScheduleIds.length === 0 && assignments.every((assignment) => Boolean(assignment.newInvoiceId)),
    billingDateMode,
    assignments,
    unmatchedScheduleIds
  };
}
function isInactivePaymentStatus(value) {
  return INACTIVE_PAYMENT_STATUSES.has(normalizeStatus(value));
}
function isInactiveInvoiceStatus(value) {
  return INACTIVE_INVOICE_STATUSES.has(normalizeStatus(value));
}
function isCompletedPayment(value) {
  return COMPLETED_PAYMENT_STATUSES.has(normalizeStatus(value));
}
function isReceiptPayment(payment) {
  const transactionType = normalizeStatus(
    payment.transaction_type || "receipt"
  );
  return transactionType === "receipt" && isCompletedPayment(payment.payment_status);
}
function paymentStatusFor(total, paid) {
  const normalizedTotal = Math.max(0, roundMoney(total));
  const normalizedPaid = Math.max(0, roundMoney(paid));
  if (normalizedTotal - normalizedPaid <= MONEY_SETTLEMENT_TOLERANCE)
    return "paid";
  return normalizedPaid > 0 ? "partial" : "unpaid";
}
function deriveFinancialTotals(total, payments) {
  const normalizedTotal = Math.max(0, roundMoney(total));
  const paid = roundMoney(
    payments.filter(isReceiptPayment).reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  );
  const balance = roundMoney(Math.max(0, normalizedTotal - paid));
  return {
    paid,
    balance,
    paymentStatus: paymentStatusFor(normalizedTotal, paid)
  };
}
function deriveContractFinancialTotals(contractAmount, payments) {
  const amount = Math.max(0, roundMoney(contractAmount));
  const canonicalPaid = roundMoney(
    payments.filter(isReceiptPayment).reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  );
  const paid = amount > 0.01 ? Math.min(canonicalPaid, amount) : canonicalPaid;
  const balance = roundMoney(Math.max(0, amount - paid));
  const paymentStatus = paid <= 0.01 ? "unpaid" : paid >= amount - 0.01 ? "paid" : "partial";
  return { paid, balance, paymentStatus };
}
function buildCanonicalInvoiceReceiptContributions(payments, allocations) {
  const paymentById = new Map(
    payments.map((payment) => [String(payment.id || ""), payment])
  );
  const activeInvoiceAllocations = allocations.filter(
    (allocation) => allocation.is_active === true && normalizeStatus(allocation.allocation_type) === "invoice"
  );
  const allocatedPaymentIds = new Set(
    allocations.filter((allocation) => allocation.is_active === true).map((allocation) => String(allocation.payment_id || ""))
  );
  const contributions = [];
  for (const allocation of activeInvoiceAllocations) {
    const payment = paymentById.get(String(allocation.payment_id || ""));
    if (!payment) continue;
    contributions.push({
      ...payment,
      invoice_id: allocation.target_id,
      amount: allocation.amount,
      allocation_id: allocation.id,
      allocation_source: "ledger"
    });
  }
  for (const payment of payments) {
    if (!payment.invoice_id || allocatedPaymentIds.has(String(payment.id || "")))
      continue;
    contributions.push({ ...payment, allocation_source: "legacy_direct" });
  }
  return contributions;
}
function buildCanonicalContractReceiptContributions(contractId, invoices, payments, allocations) {
  const normalizedContractId = String(contractId || "");
  const activeInvoiceIds = new Set(
    invoices.filter(
      (invoice) => String(invoice.contract_id || "") === normalizedContractId && !isInactiveInvoiceStatus(invoice.status) && !isInactiveInvoiceStatus(invoice.payment_status)
    ).map((invoice) => String(invoice.id || ""))
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
  ).filter(
    (contribution) => activeInvoiceIds.has(String(contribution.invoice_id || ""))
  );
  const contractAllocationContributions = activeAllocations.filter(
    (allocation) => normalizeStatus(allocation.allocation_type) === "contract" && String(allocation.target_id || "") === normalizedContractId
  ).flatMap((allocation) => {
    const payment = paymentById.get(String(allocation.payment_id || ""));
    return payment ? [
      {
        ...payment,
        amount: allocation.amount,
        allocation_source: "contract_ledger"
      }
    ] : [];
  });
  const unallocatedContractContributions = payments.filter(
    (payment) => String(payment.contract_id || "") === normalizedContractId && !payment.invoice_id && !activeAllocationPaymentIds.has(String(payment.id || ""))
  );
  return [
    ...invoiceContributions,
    ...contractAllocationContributions,
    ...unallocatedContractContributions
  ];
}
function deriveSchedulePaymentState(amount, paidAmount, dueDate, now) {
  const normalizedAmount = Math.max(0, roundMoney(amount));
  const normalizedPaid = Math.max(
    0,
    Math.min(normalizedAmount, roundMoney(paidAmount))
  );
  const status = normalizedAmount - normalizedPaid <= MONEY_SETTLEMENT_TOLERANCE ? "paid" : normalizedPaid > 0 ? "partial" : dateOnly(dueDate) < now.toISOString().slice(0, 10) ? "overdue" : "pending";
  return { paid: normalizedPaid, status };
}
function isActiveContractStatus(value) {
  return ACTIVE_CONTRACT_STATUSES.has(normalizeStatus(value));
}
function isInactiveScheduleStatus(value) {
  return INACTIVE_SCHEDULE_STATUSES.has(normalizeStatus(value));
}
function canLinkInvoiceForSchedule(input) {
  if (isInactiveScheduleStatus(input.scheduleStatus) || !isActiveContractStatus(input.contractStatus)) {
    return false;
  }
  const dueDate = dateOnly(input.dueDate);
  const startDate = dateOnly(input.contractStartDate);
  const endDate = dateOnly(input.contractEndDate);
  return Boolean(
    dueDate && startDate && endDate && dueDate >= startDate && dueDate <= endDate
  );
}
function canGenerateInvoiceForSchedule(input) {
  if (input.invoiceId || roundMoney(input.amount) <= 0.01) {
    return false;
  }
  return canLinkInvoiceForSchedule(input);
}
function isProtectedVehicleStatus(value) {
  return PROTECTED_VEHICLE_STATUSES.has(normalizeStatus(value));
}
function deriveVehicleStatus(input) {
  if (isProtectedVehicleStatus(input.currentStatus)) return null;
  if (input.hasOpenMaintenance) return "maintenance";
  if (input.hasActiveContract) return "rented";
  if (input.hasActiveReservation) return "street_52";
  if (normalizeStatus(input.currentStatus) === "street_52") return null;
  return input.isActive === false ? "out_of_service" : "available";
}
function deriveStockOnHand(movements) {
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
function deriveLegalCaseCosts(legalCase) {
  return roundMoney(
    Number(legalCase.legal_fees || 0) + Number(legalCase.court_fees || 0) + Number(legalCase.other_expenses || 0)
  );
}
function deriveAttendanceHours(input) {
  const checkIn = parseDate(input.checkIn);
  const checkOut = parseDate(input.checkOut);
  if (!checkIn || !checkOut || checkOut <= checkIn) return null;
  let breakHours = 0;
  const breakStart = parseDate(input.breakStart);
  const breakEnd = parseDate(input.breakEnd);
  if (breakStart && breakEnd && breakEnd > breakStart && breakStart >= checkIn && breakEnd <= checkOut) {
    breakHours = (breakEnd.getTime() - breakStart.getTime()) / 36e5;
  }
  return Math.max(
    0,
    Math.round(
      ((checkOut.getTime() - checkIn.getTime()) / 36e5 - breakHours) * 100
    ) / 100
  );
}
function derivePayrollNet(payroll) {
  return roundMoney(
    Number(payroll.basic_salary || 0) + Number(payroll.allowances || 0) + Number(payroll.overtime_amount || 0) - Number(payroll.deductions || 0) - Number(payroll.tax_amount || 0)
  );
}
function maxDaysOverdue(dueDates, now) {
  const today = /* @__PURE__ */ new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
  let maximum = 0;
  for (const value of dueDates) {
    const due = parseDate(value);
    if (!due || due >= today) continue;
    maximum = Math.max(
      maximum,
      Math.floor((today.getTime() - due.getTime()) / 864e5)
    );
  }
  return maximum;
}
function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function monthKey(value) {
  const text = String(value || "");
  return /^\d{4}-\d{2}/.test(text) ? text.slice(0, 7) : "";
}

// supabase/functions/_shared/system-audit/workers.ts
async function runDomainWorker(context) {
  const workers = {
    contracts: auditContracts,
    accounting: auditAccounting,
    fleet: auditFleet,
    customers: auditCustomers,
    inventory: auditInventory,
    legal: auditLegal,
    employees: auditEmployees
  };
  return await workers[context.job.domain](context);
}
async function auditContracts(context) {
  const page = await loadCompanyPage(
    context,
    "contracts",
    "id,company_id,contract_number,status,monthly_amount,contract_amount,total_paid,balance_due,payment_status,start_date,end_date,contract_date,customer_id,vehicle_id",
    String(context.job.cursor?.lastId || ""),
    Math.min(context.job.batch_size, 100)
  );
  const contractIds = page.rows.map((row) => row.id);
  if (contractIds.length === 0) return pageResult(page, []);
  const [invoices, payments, schedules] = await Promise.all([
    loadByIds(
      context,
      "invoices",
      "id,company_id,contract_id,customer_id,invoice_number,invoice_month,invoice_date,due_date,subtotal,total_amount,paid_amount,balance_due,status,payment_status,journal_entry_id",
      "contract_id",
      contractIds
    ),
    loadByIds(
      context,
      "payments",
      "id,company_id,contract_id,customer_id,invoice_id,amount,payment_date,payment_status,transaction_type,journal_entry_id,payment_number,reference_number,allocation_status",
      "contract_id",
      contractIds
    ),
    loadByIds(
      context,
      "contract_payment_schedules",
      "id,company_id,contract_id,invoice_id,amount,paid_amount,status,paid_date,due_date,installment_number",
      "contract_id",
      contractIds
    )
  ]);
  const invoiceIds = invoices.map((invoice) => invoice.id);
  const contractPaymentIds = payments.map((payment) => payment.id);
  const paymentColumns = "id,company_id,contract_id,customer_id,invoice_id,amount,payment_date,payment_status,transaction_type,journal_entry_id,payment_number,reference_number,allocation_status";
  const [
    allocationsByInvoice,
    allocationsByContract,
    allocationsByContractPayment,
    directInvoicePayments,
    paymentBaseClassifications
  ] = await Promise.all([
    loadByIds(
      context,
      "payment_allocations",
      "id,company_id,payment_id,allocation_type,target_id,amount,is_active,allocation_order",
      "target_id",
      invoiceIds
    ),
    loadByIds(
      context,
      "payment_allocations",
      "id,company_id,payment_id,allocation_type,target_id,amount,is_active,allocation_order",
      "target_id",
      contractIds
    ),
    loadByIds(
      context,
      "payment_allocations",
      "id,company_id,payment_id,allocation_type,target_id,amount,is_active,allocation_order",
      "payment_id",
      contractPaymentIds
    ),
    loadByIds(context, "payments", paymentColumns, "invoice_id", invoiceIds),
    loadByIds(
      context,
      "payment_accounting_classifications",
      "id,payment_id,classification,is_active",
      "payment_id",
      contractPaymentIds
    )
  ]);
  const basePayments = [
    ...new Map(
      [...payments, ...directInvoicePayments].map((row) => [row.id, row])
    ).values()
  ];
  const basePaymentIds = basePayments.map((payment) => payment.id);
  const allocationsByDirectPayment = await loadByIds(
    context,
    "payment_allocations",
    "id,company_id,payment_id,allocation_type,target_id,amount,is_active,allocation_order",
    "payment_id",
    basePaymentIds.filter(
      (paymentId) => !contractPaymentIds.includes(paymentId)
    )
  );
  const allocations = [
    ...new Map(
      [
        ...allocationsByInvoice,
        ...allocationsByContract,
        ...allocationsByContractPayment,
        ...allocationsByDirectPayment
      ].map((row) => [row.id, row])
    ).values()
  ];
  const knownPaymentIds = new Set(basePaymentIds);
  const additionalPaymentIds = allocations.map((allocation) => allocation.payment_id).filter((paymentId) => paymentId && !knownPaymentIds.has(paymentId));
  const additionalPayments = await loadByIds(
    context,
    "payments",
    paymentColumns,
    "id",
    additionalPaymentIds
  );
  const allPayments = [
    ...new Map(
      [...basePayments, ...additionalPayments].map((row) => [row.id, row])
    ).values()
  ];
  const canonicalInvoicePayments = buildCanonicalInvoiceReceiptContributions(
    allPayments,
    allocations
  );
  const activeAllocations = allocations.filter(
    (allocation) => allocation.is_active === true
  );
  const activeAllocationPaymentIds = new Set(
    activeAllocations.map((allocation) => allocation.payment_id)
  );
  const customerAdvancePaymentIds = new Set(
    paymentBaseClassifications.filter(
      (classification) => classification.is_active === true && classification.classification === "customer_advance"
    ).map((classification) => classification.payment_id)
  );
  const invoicesByContract = groupBy(invoices, (row) => row.contract_id);
  const paymentsByContract = groupBy(payments, (row) => row.contract_id);
  const paymentsByInvoice = groupBy(
    canonicalInvoicePayments,
    (row) => row.invoice_id
  );
  const schedulesByContract = groupBy(schedules, (row) => row.contract_id);
  const invoiceById = new Map(invoices.map((invoice) => [invoice.id, invoice]));
  const findings = [];
  for (const contract of page.rows) {
    const contractInvoices = invoicesByContract.get(contract.id) || [];
    const contractPayments = paymentsByContract.get(contract.id) || [];
    const contractSchedules = schedulesByContract.get(contract.id) || [];
    const activeInvoices = contractInvoices.filter(isActiveInvoice);
    const activeSchedules = contractSchedules.filter(
      (schedule) => !isInactiveScheduleStatus(schedule.status)
    );
    const plannedCancellation = /* @__PURE__ */ new Set();
    const automaticCancellation = /* @__PURE__ */ new Set();
    if (isActiveContractStatus(contract.status) && (!contract.start_date || !contract.end_date || contract.end_date < contract.start_date)) {
      findings.push(
        reviewFinding(
          `contract:${contract.id}:invalid-period`,
          "contract.invalid_period",
          "critical",
          "contract",
          contract.id,
          "Contract period is invalid",
          "The contract has missing dates or an end date before its start date.",
          { startDate: contract.start_date, endDate: contract.end_date }
        )
      );
    }
    if (isActiveContractStatus(contract.status) && contract.start_date && contract.end_date && contract.end_date >= contract.start_date && roundMoney(contract.monthly_amount) > 0.01 && activeInvoices.length === 0 && activeSchedules.length === 0) {
      findings.push(
        reviewFinding(
          `contract:${contract.id}:missing-billing-graph`,
          "contract.missing_billing_graph",
          "critical",
          "contract",
          contract.id,
          "Active contract has no invoices or payment schedule",
          "The contract is invisible to schedule-only invoice repair paths. The canonical daily reconciler must create its billing months before payment collection.",
          {
            contractNumber: contract.contract_number,
            startDate: contract.start_date,
            endDate: contract.end_date,
            monthlyAmount: roundMoney(contract.monthly_amount)
          }
        )
      );
    }
    const expectedContract = deriveContractFinancialTotals(
      contract.contract_amount,
      buildCanonicalContractReceiptContributions(
        contract.id,
        activeInvoices,
        allPayments,
        allocations
      )
    );
    if (moneyDiffers(contract.total_paid, expectedContract.paid) || moneyDiffers(contract.balance_due, expectedContract.balance) || normalizeStatus(contract.payment_status) !== expectedContract.paymentStatus) {
      findings.push(
        repairFinding({
          dedupeKey: `contract:${contract.id}:financial-totals`,
          code: "contract.financial_totals_mismatch",
          severity: "high",
          entityType: "contract",
          entityId: contract.id,
          title: "Contract payment totals are stale",
          details: "Stored totals do not match completed receipt payments.",
          evidence: {
            contractAmount: roundMoney(contract.contract_amount),
            storedPaid: roundMoney(contract.total_paid),
            calculatedPaid: expectedContract.paid,
            storedBalance: roundMoney(contract.balance_due),
            calculatedBalance: expectedContract.balance
          },
          command: "contract.recalculate_totals",
          expectedBefore: {
            total_paid: contract.total_paid,
            balance_due: contract.balance_due,
            payment_status: contract.payment_status
          },
          values: {
            total_paid: expectedContract.paid,
            balance_due: expectedContract.balance,
            payment_status: expectedContract.paymentStatus
          }
        })
      );
    }
    const invoicesByMonth = groupBy(activeInvoices, invoiceMonthKey);
    for (const [month, monthlyInvoices] of invoicesByMonth.entries()) {
      if (!month || monthlyInvoices.length < 2) continue;
      const ranked = [...monthlyInvoices].sort(
        (left, right) => invoiceKeepScore(right, paymentsByInvoice) - invoiceKeepScore(left, paymentsByInvoice)
      );
      for (const duplicate of ranked.slice(1)) {
        planSafeInvoiceCancellation({
          findings,
          plannedCancellation,
          automaticCancellation,
          invoice: duplicate,
          invoicePayments: paymentsByInvoice.get(duplicate.id) || [],
          code: "invoice.duplicate_contract_month",
          details: `A second active invoice exists for contract month ${month}.`,
          evidence: {
            month,
            keptInvoiceId: ranked[0].id,
            duplicateInvoiceId: duplicate.id
          }
        });
      }
    }
    for (const invoice of activeInvoices) {
      if (roundMoney(invoice.total_amount) > 0.01) continue;
      findings.push(
        reviewFinding(
          `invoice:${invoice.id}:zero-amount-month-blocker`,
          "invoice.zero_amount_blocks_billing_month",
          "critical",
          "invoice",
          invoice.id,
          "Active zero-amount invoice blocks its billing month",
          "The row is not collectible but reserves the canonical month. The safe generator may repair only a truly empty, unpaid and unposted placeholder; otherwise finance review is required.",
          {
            contractId: contract.id,
            contractNumber: contract.contract_number,
            invoiceNumber: invoice.invoice_number,
            invoiceMonth: invoiceMonthKey(invoice),
            totalAmount: roundMoney(invoice.total_amount),
            balanceDue: roundMoney(invoice.balance_due),
            journalEntryId: invoice.journal_entry_id
          }
        )
      );
    }
    for (const invoice of activeInvoices) {
      if (isInvoiceOutsideContractBillingPeriod(
        invoice,
        contract.start_date,
        contract.end_date
      )) {
        planSafeInvoiceCancellation({
          findings,
          plannedCancellation,
          automaticCancellation,
          invoice,
          invoicePayments: paymentsByInvoice.get(invoice.id) || [],
          code: "invoice.outside_contract_period",
          details: "The canonical invoice billing month is outside the contract period.",
          evidence: {
            invoiceMonth: dateOnly(invoice.invoice_month),
            invoiceDate: dateOnly(invoice.invoice_date),
            invoiceDueDate: dateOnly(invoice.due_date),
            contractStart: contract.start_date,
            contractEnd: contract.end_date
          }
        });
      }
    }
    for (const invoice of activeInvoices) {
      if (automaticCancellation.has(invoice.id)) continue;
      const invoicePayments = paymentsByInvoice.get(invoice.id) || [];
      const expectedInvoice = deriveFinancialTotals(
        invoice.total_amount,
        invoicePayments
      );
      const legacyDirectReceipts = invoicePayments.filter(
        (payment) => payment.allocation_source === "legacy_direct" && isReceiptPayment(payment)
      );
      if (expectedInvoice.paid > roundMoney(invoice.total_amount) + MONEY_SETTLEMENT_TOLERANCE && legacyDirectReceipts.length > 0 && legacyDirectReceipts.every(
        (payment) => !customerAdvancePaymentIds.has(String(payment.id || ""))
      )) {
        findings.push(
          repairFinding({
            dedupeKey: `invoice:${invoice.id}:legacy-overpayment`,
            code: "invoice.legacy_direct_overpayment",
            severity: "critical",
            entityType: "invoice",
            entityId: invoice.id,
            title: "Legacy direct receipts overpay the invoice",
            details: "The direct links can be migrated to capped canonical allocations while only the unapplied remainder is classified as a customer advance.",
            evidence: {
              invoiceTotal: roundMoney(invoice.total_amount),
              calculatedPaid: expectedInvoice.paid,
              excess: roundMoney(
                expectedInvoice.paid - roundMoney(invoice.total_amount)
              ),
              legacyPaymentIds: legacyDirectReceipts.map(
                (payment) => payment.id
              )
            },
            command: "invoice.normalize_legacy_overpayment",
            expectedBefore: {
              paid_amount: invoice.paid_amount,
              balance_due: invoice.balance_due,
              payment_status: invoice.payment_status,
              status: invoice.status
            },
            values: {}
          })
        );
        continue;
      }
      if (moneyDiffers(invoice.paid_amount, expectedInvoice.paid) || moneyDiffers(invoice.balance_due, expectedInvoice.balance) || normalizeStatus(invoice.payment_status) !== expectedInvoice.paymentStatus) {
        findings.push(
          repairFinding({
            dedupeKey: `invoice:${invoice.id}:balance`,
            code: "invoice.balance_mismatch",
            severity: "high",
            entityType: "invoice",
            entityId: invoice.id,
            title: "Invoice balance is stale",
            details: "Stored invoice balance does not match completed receipt payments.",
            evidence: {
              invoiceTotal: roundMoney(invoice.total_amount),
              storedPaid: roundMoney(invoice.paid_amount),
              calculatedPaid: expectedInvoice.paid,
              storedBalance: roundMoney(invoice.balance_due),
              calculatedBalance: expectedInvoice.balance
            },
            command: "invoice.recalculate_balance",
            expectedBefore: {
              paid_amount: invoice.paid_amount,
              balance_due: invoice.balance_due,
              payment_status: invoice.payment_status
            },
            values: {
              paid_amount: expectedInvoice.paid,
              balance_due: expectedInvoice.balance,
              payment_status: expectedInvoice.paymentStatus
            }
          })
        );
      }
    }
    const duplicateDueGroups = [
      ...groupBy(
        activeSchedules,
        (schedule) => dateOnly(schedule.due_date)
      ).entries()
    ].filter(
      ([dueDate, groupedSchedules]) => Boolean(dueDate) && groupedSchedules.length > 1
    );
    const duplicateGroupEvidence = duplicateDueGroups.map(
      ([dueDate, groupedSchedules]) => {
        const canonicalInvoiceIds = [
          ...new Set(
            groupedSchedules.flatMap((schedule) => {
              const invoice = schedule.invoice_id ? invoiceById.get(schedule.invoice_id) : null;
              return invoice && invoice.contract_id === contract.id && isActiveInvoice(invoice) && invoiceConflictsWithMonth(invoice, monthKey2(dueDate)) ? [invoice.id] : [];
            })
          )
        ];
        return {
          dueDate,
          scheduleIds: groupedSchedules.map((schedule) => schedule.id),
          amounts: [
            ...new Set(
              groupedSchedules.map((schedule) => roundMoney(schedule.amount))
            )
          ],
          paidAmounts: [
            ...new Set(
              groupedSchedules.map(
                (schedule) => roundMoney(schedule.paid_amount)
              )
            )
          ],
          statuses: [
            ...new Set(
              groupedSchedules.map(
                (schedule) => normalizeScheduleStatus(schedule.status)
              )
            )
          ],
          canonicalInvoiceIds
        };
      }
    );
    const duplicateGroupsAreSafe = duplicateGroupEvidence.every(
      (group) => group.amounts.length === 1 && group.paidAmounts.length === 1 && group.statuses.length === 1 && group.canonicalInvoiceIds.length === 1
    );
    const activeScheduleTotal = roundMoney(
      activeSchedules.reduce(
        (total, schedule) => total + Number(schedule.amount || 0),
        0
      )
    );
    const duplicateExtraAmount = roundMoney(
      duplicateDueGroups.reduce(
        (total, [, rows]) => total + rows.slice(1).reduce(
          (groupTotal, schedule) => groupTotal + Number(schedule.amount || 0),
          0
        ),
        0
      )
    );
    const retainedScheduleTotal = roundMoney(
      activeScheduleTotal - duplicateExtraAmount
    );
    const contractAmount = roundMoney(contract.contract_amount);
    const retainedScheduleTotalMatchesContract = contractAmount <= 0.01 || Math.abs(retainedScheduleTotal - contractAmount) <= 0.01;
    if (duplicateDueGroups.length > 0) {
      if (duplicateGroupsAreSafe && retainedScheduleTotalMatchesContract) {
        findings.push(
          repairFinding({
            dedupeKey: `contract:${contract.id}:duplicate-schedule-rows`,
            code: "schedule.duplicate_rows",
            severity: "critical",
            entityType: "contract",
            entityId: contract.id,
            title: "Contract has duplicate payment schedule rows",
            details: "Identical same-date schedule rows can be consolidated while retaining the one canonical invoice link.",
            evidence: {
              duplicateGroups: duplicateGroupEvidence,
              activeScheduleCount: activeSchedules.length,
              extraRowCount: duplicateDueGroups.reduce(
                (total, [, rows]) => total + rows.length - 1,
                0
              ),
              activeScheduleTotal,
              retainedScheduleTotal,
              contractAmount
            },
            command: "schedule.consolidate_duplicate_rows",
            expectedBefore: {
              active_schedule_count: activeSchedules.length,
              duplicate_group_count: duplicateDueGroups.length
            },
            values: {}
          })
        );
      } else {
        findings.push(
          reviewFinding(
            `contract:${contract.id}:ambiguous-duplicate-schedule-rows`,
            "schedule.duplicate_rows_ambiguous",
            "critical",
            "contract",
            contract.id,
            "Contract has conflicting duplicate payment schedules",
            retainedScheduleTotalMatchesContract ? "At least one same-date group differs financially or points to multiple canonical invoices." : "Consolidating the duplicate rows would leave a schedule total that differs from the contract amount.",
            {
              duplicateGroups: duplicateGroupEvidence,
              activeScheduleTotal,
              retainedScheduleTotal,
              contractAmount,
              retainedScheduleTotalMatchesContract
            }
          )
        );
      }
    }
    const linkedSchedules = activeSchedules.filter(
      (schedule) => Boolean(schedule.invoice_id)
    );
    const completeLinkPlan = deriveOneToOneScheduleInvoicePlan(
      activeSchedules,
      activeInvoices
    );
    const linkPlan = deriveOneToOneScheduleInvoicePlan(
      linkedSchedules,
      activeInvoices,
      completeLinkPlan.billingDateMode
    );
    const currentInvoiceIds = linkedSchedules.map(
      (schedule) => String(schedule.invoice_id)
    );
    const invalidCurrentLinkIds = linkedSchedules.filter((schedule) => {
      const invoice = invoiceById.get(schedule.invoice_id);
      return !(invoice && invoice.contract_id === contract.id && isActiveInvoice(invoice) && invoiceMatchesBillingMonth(
        invoice,
        monthKey2(schedule.due_date),
        completeLinkPlan.billingDateMode
      ));
    }).map((schedule) => schedule.id);
    const duplicateCurrentInvoiceLinks = new Set(currentInvoiceIds).size !== currentInvoiceIds.length;
    const changedLinkAssignments = linkPlan.assignments.filter(
      (assignment) => assignment.oldInvoiceId !== assignment.newInvoiceId
    );
    const unlinkedScheduleIdsWithCandidates = completeLinkPlan.assignments.filter(
      (assignment) => !assignment.oldInvoiceId && assignment.candidateInvoiceIds.length > 0
    ).map((assignment) => assignment.scheduleId);
    const hasScheduleLinkProblem = invalidCurrentLinkIds.length > 0 || duplicateCurrentInvoiceLinks;
    const hasAnyScheduleLinkProblem = hasScheduleLinkProblem || unlinkedScheduleIdsWithCandidates.length > 0;
    const changedCompleteLinkAssignments = completeLinkPlan.assignments.filter(
      (assignment) => assignment.oldInvoiceId !== assignment.newInvoiceId
    );
    const completeScheduleGraphIsGatewaySafe = activeSchedules.every(
      (schedule) => Number(schedule.amount || 0) > 0.01 && canLinkInvoiceForSchedule({
        scheduleStatus: schedule.status,
        dueDate: schedule.due_date,
        contractStatus: contract.status,
        contractStartDate: contract.start_date,
        contractEndDate: contract.end_date
      })
    );
    const linkedScheduleGraphIsGatewaySafe = linkedSchedules.every(
      (schedule) => Number(schedule.amount || 0) > 0.01 && canLinkInvoiceForSchedule({
        scheduleStatus: schedule.status,
        dueDate: schedule.due_date,
        contractStatus: contract.status,
        contractStartDate: contract.start_date,
        contractEndDate: contract.end_date
      })
    );
    const canRebalanceScheduleLinks = duplicateDueGroups.length === 0 && hasAnyScheduleLinkProblem && completeLinkPlan.complete && completeScheduleGraphIsGatewaySafe && changedCompleteLinkAssignments.length > 0 && changedCompleteLinkAssignments.every((assignment) => {
      const schedule = activeSchedules.find(
        (item) => item.id === assignment.scheduleId
      );
      return Boolean(
        schedule && canLinkInvoiceForSchedule({
          scheduleStatus: schedule.status,
          dueDate: schedule.due_date,
          contractStatus: contract.status,
          contractStartDate: contract.start_date,
          contractEndDate: contract.end_date
        })
      );
    });
    const canRealignScheduleLinks = duplicateDueGroups.length === 0 && hasScheduleLinkProblem && linkPlan.complete && linkedScheduleGraphIsGatewaySafe && changedLinkAssignments.every((assignment) => {
      const schedule = linkedSchedules.find(
        (item) => item.id === assignment.scheduleId
      );
      return Boolean(
        schedule && canLinkInvoiceForSchedule({
          scheduleStatus: schedule.status,
          dueDate: schedule.due_date,
          contractStatus: contract.status,
          contractStartDate: contract.start_date,
          contractEndDate: contract.end_date
        })
      );
    });
    const activeScheduleById = new Map(
      activeSchedules.map((schedule) => [String(schedule.id), schedule])
    );
    const missingInvoiceAmount = roundMoney(
      completeLinkPlan.assignments.reduce((total, assignment) => {
        if (assignment.newInvoiceId) return total;
        const schedule = activeScheduleById.get(assignment.scheduleId);
        return total + Number(schedule?.amount || 0);
      }, 0)
    );
    const activeInvoiceTotal = roundMoney(
      activeInvoices.reduce(
        (total, invoice) => total + Number(invoice.total_amount || 0),
        0
      )
    );
    const projectedInvoiceTotal = roundMoney(
      activeInvoiceTotal + missingInvoiceAmount
    );
    const hasSafeInvoiceGenerationCapacity = missingInvoiceAmount <= 0.01 || contractAmount > 0.01 && projectedInvoiceTotal <= contractAmount + MONEY_SETTLEMENT_TOLERANCE;
    const canRepairScheduleLinksIncrementally = duplicateDueGroups.length === 0 && hasAnyScheduleLinkProblem && !canRebalanceScheduleLinks && !canRealignScheduleLinks && isActiveContractStatus(contract.status) && hasSafeInvoiceGenerationCapacity && completeLinkPlan.assignments.every(
      (assignment) => assignment.candidateInvoiceIds.length <= 1
    ) && activeSchedules.every(
      (schedule) => canLinkInvoiceForSchedule({
        scheduleStatus: schedule.status,
        dueDate: schedule.due_date,
        contractStatus: contract.status,
        contractStartDate: contract.start_date,
        contractEndDate: contract.end_date
      })
    );
    if (duplicateDueGroups.length === 0 && hasAnyScheduleLinkProblem) {
      const evidence = {
        activeScheduleCount: activeSchedules.length,
        activeLinkedScheduleCount: linkedSchedules.length,
        billingDateMode: completeLinkPlan.billingDateMode,
        invalidCurrentLinkIds,
        duplicateCurrentInvoiceLinks,
        unlinkedScheduleIdsWithCandidates,
        changedLinkCount: canRebalanceScheduleLinks ? changedCompleteLinkAssignments.length : changedLinkAssignments.length,
        unmatchedScheduleIds: canRebalanceScheduleLinks ? completeLinkPlan.unmatchedScheduleIds : linkPlan.unmatchedScheduleIds,
        assignments: canRebalanceScheduleLinks ? completeLinkPlan.assignments : linkPlan.assignments,
        activeInvoiceTotal,
        missingInvoiceAmount,
        projectedInvoiceTotal,
        contractAmount,
        hasSafeInvoiceGenerationCapacity,
        completeScheduleGraphIsGatewaySafe,
        linkedScheduleGraphIsGatewaySafe
      };
      if (canRebalanceScheduleLinks) {
        findings.push(
          repairFinding({
            dedupeKey: `contract:${contract.id}:rebalance-schedule-invoice-links`,
            code: "schedule.contract_invoice_links_rebalanced",
            severity: "critical",
            entityType: "contract",
            entityId: contract.id,
            title: "Contract schedule invoice links need rebalancing",
            details: "The complete schedule-to-invoice graph can be matched atomically, including unlinked schedules, without changing invoices or accounting entries.",
            evidence,
            command: "schedule.realign_contract_invoice_links_v3",
            expectedBefore: {
              active_schedule_count: activeSchedules.length,
              active_linked_schedule_count: linkedSchedules.length,
              changed_link_count: changedCompleteLinkAssignments.length
            },
            values: {
              assignments: completeLinkPlan.assignments.map((assignment) => ({
                schedule_id: assignment.scheduleId,
                expected_invoice_id: assignment.oldInvoiceId,
                invoice_id: assignment.newInvoiceId
              }))
            }
          })
        );
      } else if (canRealignScheduleLinks) {
        findings.push(
          repairFinding({
            dedupeKey: `contract:${contract.id}:realign-schedule-invoice-links`,
            code: "schedule.contract_invoice_links_shifted",
            severity: "critical",
            entityType: "contract",
            entityId: contract.id,
            title: "Contract schedule invoice links are shifted",
            details: "The complete one-to-one invoice-link graph can be realigned atomically without changing invoices or accounting entries.",
            evidence,
            command: "schedule.realign_contract_invoice_links_v2",
            expectedBefore: {
              active_schedule_count: activeSchedules.length,
              active_linked_schedule_count: linkedSchedules.length,
              changed_link_count: changedLinkAssignments.length
            },
            values: {
              assignments: linkPlan.assignments.map((assignment) => ({
                schedule_id: assignment.scheduleId,
                expected_invoice_id: assignment.oldInvoiceId,
                invoice_id: assignment.newInvoiceId
              }))
            }
          })
        );
      } else if (!canRepairScheduleLinksIncrementally) {
        findings.push(
          reviewFinding(
            `contract:${contract.id}:schedule-invoice-link-graph-review`,
            "schedule.invoice_link_graph_requires_review",
            "critical",
            "contract",
            contract.id,
            "Contract invoice-link graph is ambiguous",
            "The complete schedule-to-invoice graph has no safe one-to-one matching or is blocked by the contract lifecycle.",
            evidence
          )
        );
      }
    }
    if (duplicateDueGroups.length === 0 && (!hasAnyScheduleLinkProblem || canRepairScheduleLinksIncrementally)) {
      const assignmentByScheduleId = new Map(
        completeLinkPlan.assignments.map((assignment) => [
          assignment.scheduleId,
          assignment
        ])
      );
      const orderedSchedules = [...activeSchedules].sort((left, right) => {
        const priority = (schedule) => {
          const assignment = assignmentByScheduleId.get(String(schedule.id));
          const currentIsWrong = Boolean(schedule.invoice_id) && assignment?.oldInvoiceId !== assignment?.newInvoiceId;
          if (currentIsWrong && assignment?.candidateInvoiceIds.length === 0)
            return 0;
          if (currentIsWrong) return 1;
          if (!schedule.invoice_id && assignment?.candidateInvoiceIds.length === 1)
            return 2;
          if (!schedule.invoice_id) return 3;
          return 4;
        };
        return priority(left) - priority(right) || String(right.due_date || "").localeCompare(
          String(left.due_date || "")
        ) || String(left.id).localeCompare(String(right.id));
      });
      for (const schedule of orderedSchedules) {
        const scheduleMonth = monthKey2(schedule.due_date);
        const candidates = activeInvoices.filter(
          (invoice) => invoiceMatchesBillingMonth(
            invoice,
            scheduleMonth,
            completeLinkPlan.billingDateMode
          )
        );
        const linkedInvoice = schedule.invoice_id ? invoiceById.get(schedule.invoice_id) : null;
        const linkedIsActive = linkedInvoice && linkedInvoice.contract_id === contract.id && isActiveInvoice(linkedInvoice);
        const linkedMatches = Boolean(
          linkedIsActive && invoiceMatchesBillingMonth(
            linkedInvoice,
            scheduleMonth,
            completeLinkPlan.billingDateMode
          )
        );
        const candidate = candidates.length === 1 ? candidates[0] : null;
        const candidateCanUseGenericLink = Boolean(candidate);
        const canAutoLinkInvoice = canLinkInvoiceForSchedule({
          scheduleStatus: schedule.status,
          dueDate: schedule.due_date,
          contractStatus: contract.status,
          contractStartDate: contract.start_date,
          contractEndDate: contract.end_date
        });
        if (!linkedMatches && schedule.invoice_id) {
          const evidence = {
            invoiceId: schedule.invoice_id,
            contractId: contract.id,
            scheduleMonth,
            linkedInvoiceLoaded: Boolean(linkedInvoice),
            linkedInvoiceContractId: linkedInvoice?.contract_id || null,
            linkedInvoiceMonth: linkedInvoice ? invoiceMonthKey(linkedInvoice) : null,
            linkedInvoiceDateMonth: linkedInvoice ? monthKey2(linkedInvoice.invoice_date) : null,
            linkedInvoiceDueMonth: linkedInvoice ? monthKey2(linkedInvoice.due_date) : null,
            linkedInvoiceStatus: linkedInvoice?.status || null,
            candidateInvoiceIds: candidates.map((candidate2) => candidate2.id)
          };
          if (canAutoLinkInvoice) {
            findings.push(
              repairFinding({
                dedupeKey: `schedule:${schedule.id}:repair-existing-invoice-link`,
                code: "schedule.stale_invoice_link",
                severity: "high",
                entityType: "contract_payment_schedule",
                entityId: schedule.id,
                title: "Schedule invoice link is stale or points to the wrong billing month",
                details: "The canonical schedule gateway can swap the link or generate the missing billing-month invoice atomically.",
                evidence,
                command: "schedule.repair_invoice_link",
                expectedBefore: { invoice_id: schedule.invoice_id },
                values: {
                  billing_date_mode: completeLinkPlan.billingDateMode
                }
              })
            );
          } else {
            findings.push(
              reviewFinding(
                `schedule:${schedule.id}:existing-invoice-link-review`,
                "schedule.existing_invoice_link_mismatch",
                "high",
                "contract_payment_schedule",
                schedule.id,
                "Schedule has an existing invoice link that cannot be trusted",
                "The contract lifecycle does not permit an automatic invoice-link swap.",
                evidence
              )
            );
          }
        } else if (!linkedMatches && candidates.length > 1) {
          findings.push(
            reviewFinding(
              `schedule:${schedule.id}:ambiguous-invoice-link`,
              "schedule.ambiguous_invoice_link",
              "high",
              "contract_payment_schedule",
              schedule.id,
              "Schedule has multiple invoice candidates",
              "The link cannot be selected safely until duplicate invoices are resolved.",
              {
                candidateInvoiceIds: candidates.map(
                  (candidate2) => candidate2.id
                ),
                month: scheduleMonth
              }
            )
          );
        } else if (!linkedMatches && candidate && !canAutoLinkInvoice) {
          findings.push(
            reviewFinding(
              `schedule:${schedule.id}:inactive-contract-invoice-link-review`,
              "schedule.invoice_link_requires_active_contract",
              "high",
              "contract_payment_schedule",
              schedule.id,
              "Schedule invoice link requires an active contract period",
              "The invoice candidate is unambiguous, but automatic linking is blocked because the contract or schedule is inactive or the due date is outside the contract period.",
              {
                invoiceId: candidate.id,
                scheduleStatus: schedule.status,
                scheduleDueDate: schedule.due_date,
                contractStatus: contract.status,
                contractStartDate: contract.start_date,
                contractEndDate: contract.end_date
              }
            )
          );
        } else if (!linkedMatches && candidate) {
          findings.push(
            repairFinding({
              dedupeKey: `schedule:${schedule.id}:invoice-link`,
              code: "schedule.invoice_link_mismatch",
              severity: "high",
              entityType: "contract_payment_schedule",
              entityId: schedule.id,
              title: "Schedule invoice link is incorrect",
              details: "Exactly one active same-contract same-month invoice can be linked safely.",
              evidence: {
                oldInvoiceId: schedule.invoice_id,
                newInvoiceId: candidate.id,
                month: scheduleMonth
              },
              command: "schedule.link_invoice_by_billing_month",
              expectedBefore: { invoice_id: schedule.invoice_id },
              values: {
                billing_date_mode: completeLinkPlan.billingDateMode
              }
            })
          );
        } else if (!linkedMatches && canGenerateInvoiceForSchedule({
          invoiceId: schedule.invoice_id,
          scheduleStatus: schedule.status,
          amount: schedule.amount,
          dueDate: schedule.due_date,
          contractStatus: contract.status,
          contractStartDate: contract.start_date,
          contractEndDate: contract.end_date
        })) {
          findings.push(
            repairFinding({
              dedupeKey: `schedule:${schedule.id}:missing-invoice`,
              code: "schedule.missing_invoice",
              severity: "high",
              entityType: "contract_payment_schedule",
              entityId: schedule.id,
              title: "Schedule has no invoice",
              details: "The active contract schedule month has no active invoice.",
              evidence: {
                contractId: contract.id,
                dueDate: schedule.due_date,
                amount: roundMoney(schedule.amount)
              },
              command: "contract.generate_missing_invoice",
              expectedBefore: { invoice_id: schedule.invoice_id },
              values: { billing_date_mode: "invoice_date" }
            })
          );
        }
        const effectiveInvoice = linkedMatches ? linkedInvoice : candidateCanUseGenericLink ? candidate : null;
        if (effectiveInvoice) {
          const invoicePayments = paymentsByInvoice.get(effectiveInvoice.id) || [];
          if (moneyDiffers(effectiveInvoice.total_amount, schedule.amount)) {
            const hasFinancialImpact = Boolean(effectiveInvoice.journal_entry_id) || Math.abs(Number(effectiveInvoice.paid_amount || 0)) > 0.01 || invoicePayments.some(
              (payment) => !isInactivePaymentStatus(payment.payment_status)
            );
            if (hasFinancialImpact) {
              const linkedActiveSchedules = activeSchedules.filter(
                (item) => item.invoice_id === effectiveInvoice.id
              );
              if (linkedActiveSchedules.length === 1 && roundMoney(effectiveInvoice.total_amount) > 0.01) {
                findings.push(
                  repairFinding({
                    dedupeKey: `schedule:${schedule.id}:amount-from-financial-invoice`,
                    code: "schedule.amount_mismatch_with_financial_invoice",
                    severity: "critical",
                    entityType: "contract_payment_schedule",
                    entityId: schedule.id,
                    title: "Schedule amount differs from its posted invoice",
                    details: "The non-ledger schedule can be synchronized from its one financially authoritative invoice.",
                    evidence: {
                      invoiceId: effectiveInvoice.id,
                      invoiceAmount: roundMoney(effectiveInvoice.total_amount),
                      scheduleAmount: roundMoney(schedule.amount)
                    },
                    command: "schedule.sync_amount_from_invoice",
                    expectedBefore: {
                      amount: schedule.amount,
                      paid_amount: schedule.paid_amount,
                      status: schedule.status,
                      paid_date: schedule.paid_date,
                      invoice_id: schedule.invoice_id
                    },
                    values: {}
                  })
                );
              } else {
                findings.push(
                  reviewFinding(
                    `invoice:${effectiveInvoice.id}:schedule-amount-review`,
                    "invoice.schedule_amount_mismatch_with_financial_impact",
                    "critical",
                    "invoice",
                    effectiveInvoice.id,
                    "Invoice amount differs from its schedule",
                    "The invoice is linked to multiple schedules or has a non-positive amount, so the source cannot be selected automatically.",
                    {
                      invoiceAmount: roundMoney(effectiveInvoice.total_amount),
                      scheduleAmount: roundMoney(schedule.amount),
                      scheduleId: schedule.id,
                      activeScheduleCount: linkedActiveSchedules.length
                    }
                  )
                );
              }
            } else {
              const scheduleAmount = Math.max(0, roundMoney(schedule.amount));
              findings.push(
                reviewFinding(
                  `invoice:${effectiveInvoice.id}:schedule-amount-review`,
                  scheduleAmount <= 0.01 ? "invoice.zero_schedule_amount_requires_review" : "invoice.schedule_amount_mismatch_requires_review",
                  scheduleAmount <= 0.01 ? "high" : "critical",
                  "invoice",
                  effectiveInvoice.id,
                  scheduleAmount <= 0.01 ? "Invoice is linked to a zero-value schedule" : "Invoice amount differs from its schedule",
                  "Invoice amounts are never repriced in place by the agent. A reference journal may exist even when invoice.journal_entry_id is null, so finance must use the canonical cancel-and-reissue or adjustment workflow.",
                  {
                    invoiceAmount: roundMoney(effectiveInvoice.total_amount),
                    scheduleAmount,
                    scheduleId: schedule.id
                  }
                )
              );
            }
          }
          const paid = roundMoney(
            invoicePayments.filter((payment) => isCompletedPayment(payment.payment_status)).reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
          );
          const expectedSchedule = deriveSchedulePaymentState(
            schedule.amount,
            paid,
            schedule.due_date,
            context.now
          );
          const latestPaidDate = latestDate(
            invoicePayments.filter((payment) => isCompletedPayment(payment.payment_status)).map((payment) => payment.payment_date)
          );
          const expectedPaidDate = expectedSchedule.status === "paid" ? latestPaidDate : null;
          if (moneyDiffers(schedule.paid_amount, expectedSchedule.paid) || normalizeScheduleStatus(schedule.status) !== normalizeScheduleStatus(expectedSchedule.status) || (schedule.paid_date || null) !== expectedPaidDate) {
            findings.push(
              repairFinding({
                dedupeKey: `schedule:${schedule.id}:payment-state`,
                code: "schedule.payment_state_mismatch",
                severity: "medium",
                entityType: "contract_payment_schedule",
                entityId: schedule.id,
                title: "Schedule payment state is stale",
                details: "Paid amount and schedule status do not match the linked invoice receipts.",
                evidence: {
                  invoiceId: effectiveInvoice.id,
                  calculatedPaid: expectedSchedule.paid,
                  calculatedStatus: expectedSchedule.status
                },
                command: "schedule.sync_payment_state",
                expectedBefore: {
                  paid_amount: schedule.paid_amount,
                  status: schedule.status,
                  paid_date: schedule.paid_date
                },
                values: {
                  paid_amount: expectedSchedule.paid,
                  status: expectedSchedule.status,
                  paid_date: expectedPaidDate
                }
              })
            );
          }
        }
      }
    }
    const possibleDuplicatePayments = groupBy(
      contractPayments.filter(
        (payment) => isCompletedPayment(payment.payment_status)
      ),
      (payment) => `${roundMoney(payment.amount)}:${payment.payment_date || ""}:${payment.reference_number || "no-reference"}`
    );
    for (const [signature, duplicates] of possibleDuplicatePayments.entries()) {
      if (duplicates.length < 2) continue;
      findings.push(
        reviewFinding(
          `contract:${contract.id}:duplicate-payment:${signature}`,
          "payment.possible_duplicate",
          "critical",
          "contract",
          contract.id,
          "Contract has possible duplicate payments",
          "Receipts and bank references must be checked before reversal.",
          {
            paymentIds: duplicates.map((payment) => payment.id),
            count: duplicates.length,
            amount: roundMoney(duplicates[0].amount),
            paymentDate: duplicates[0].payment_date
          }
        )
      );
    }
    for (const payment of contractPayments) {
      const hasActiveAllocation = activeAllocationPaymentIds.has(payment.id);
      if (isReceiptPayment(payment) && !payment.invoice_id && !hasActiveAllocation && payment.payment_date) {
        const paymentMonth = monthKey2(payment.payment_date);
        const candidates = activeInvoices.filter((invoice) => {
          const paid = deriveFinancialTotals(
            invoice.total_amount,
            paymentsByInvoice.get(invoice.id) || []
          ).paid;
          const remaining = Math.max(
            0,
            roundMoney(invoice.total_amount) - paid
          );
          return invoiceMonthKey(invoice) === paymentMonth && (!invoice.customer_id || invoice.customer_id === payment.customer_id) && remaining > 0.01 && remaining >= Number(payment.amount || 0) - 0.01;
        });
        if (candidates.length === 1) {
          findings.push(
            repairFinding({
              dedupeKey: `payment:${payment.id}:invoice-link`,
              code: "payment.completed_unlinked_clear_invoice",
              severity: "high",
              entityType: "payment",
              entityId: payment.id,
              title: "Completed receipt has one clear invoice allocation",
              details: "The canonical allocation workflow can link the receipt and post its accounting reclassification atomically.",
              evidence: {
                candidateInvoiceId: candidates[0].id,
                paymentMonth,
                amount: roundMoney(payment.amount)
              },
              command: "payment.link_clear_invoice",
              expectedBefore: {
                invoice_id: payment.invoice_id,
                journal_entry_id: payment.journal_entry_id,
                allocation_status: payment.allocation_status
              },
              values: { invoice_id: candidates[0].id }
            })
          );
        } else if (candidates.length === 0) {
          if (!customerAdvancePaymentIds.has(payment.id))
            findings.push(
              repairFinding({
                dedupeKey: `payment:${payment.id}:classify-customer-advance`,
                code: "payment.completed_unlinked_customer_advance",
                severity: "high",
                entityType: "payment",
                entityId: payment.id,
                title: "Completed receipt is an unallocated customer advance",
                details: "The receipt has no invoice candidate and can be classified in the mapped customer-advance account without changing its historical payment date.",
                evidence: {
                  contractId: contract.id,
                  candidateCount: 0,
                  paymentMonth,
                  amount: roundMoney(payment.amount)
                },
                command: "payment.classify_customer_advance",
                expectedBefore: {
                  invoice_id: payment.invoice_id,
                  journal_entry_id: payment.journal_entry_id,
                  allocation_status: payment.allocation_status
                },
                values: {}
              })
            );
        } else {
          findings.push(
            reviewFinding(
              `payment:${payment.id}:invoice-link-review`,
              "payment.completed_unlinked_ambiguous",
              "high",
              "payment",
              payment.id,
              "Completed receipt has no unambiguous invoice allocation",
              "The receipt remains a customer advance until one invoice can be selected without guessing.",
              {
                candidateCount: candidates.length,
                candidateInvoiceIds: candidates.map(
                  (candidate) => candidate.id
                ),
                paymentMonth,
                amount: roundMoney(payment.amount)
              }
            )
          );
        }
      }
    }
  }
  return pageResult(page, findings);
}
function planSafeInvoiceCancellation(input) {
  if (input.plannedCancellation.has(input.invoice.id)) return;
  const hasFinancialImpact = Boolean(input.invoice.journal_entry_id) || Math.abs(Number(input.invoice.total_amount || 0)) > 0.01 || Math.abs(Number(input.invoice.paid_amount || 0)) > 0.01 || Math.abs(Number(input.invoice.balance_due || 0)) > 0.01 || input.invoicePayments.some(
    (payment) => !isInactivePaymentStatus(payment.payment_status)
  );
  input.plannedCancellation.add(input.invoice.id);
  if (hasFinancialImpact) {
    input.findings.push(
      reviewFinding(
        `invoice:${input.invoice.id}:${input.code}:review`,
        input.code,
        "critical",
        "invoice",
        input.invoice.id,
        "Invoice requires reversal review",
        input.details,
        {
          ...input.evidence,
          hasJournal: Boolean(input.invoice.journal_entry_id),
          paidAmount: roundMoney(input.invoice.paid_amount)
        }
      )
    );
    return;
  }
  input.automaticCancellation.add(input.invoice.id);
  input.findings.push(
    repairFinding({
      dedupeKey: `invoice:${input.invoice.id}:${input.code}`,
      code: input.code,
      severity: "high",
      entityType: "invoice",
      entityId: input.invoice.id,
      title: "Zero-impact invoice can be safely cancelled",
      details: input.details,
      evidence: input.evidence,
      command: "invoice.cancel_zero_safe",
      expectedBefore: {
        status: input.invoice.status,
        payment_status: input.invoice.payment_status,
        balance_due: input.invoice.balance_due
      },
      values: {
        status: "cancelled",
        payment_status: "cancelled",
        balance_due: 0
      }
    })
  );
}
async function auditAccounting(context) {
  const cursor = context.job.cursor || {};
  const phase = String(cursor.phase || "journals");
  if (phase === "bank_transactions") {
    return await auditUnreconciledBankTransactions(
      context,
      String(cursor.lastId || "")
    );
  }
  if (phase === "monthly_obligation_payments") {
    return await auditMonthlyObligationPayments(
      context,
      String(cursor.lastId || "")
    );
  }
  if (phase === "rental_receipt_payments") {
    return await auditRentalReceiptPayments(
      context,
      String(cursor.lastId || "")
    );
  }
  if (phase === "traffic_violation_payments") {
    return await auditTrafficViolationPayments(
      context,
      String(cursor.lastId || "")
    );
  }
  if (phase === "vehicle_installment_payments") {
    return await auditVehicleInstallmentPayments(
      context,
      String(cursor.lastId || "")
    );
  }
  if (phase === "journals") {
    const page2 = await loadCompanyPage(
      context,
      "journal_entries",
      "id,company_id,entry_number,entry_date,status,total_debit,total_credit,reference_type,reference_id",
      String(cursor.lastId || "")
    );
    const journalIds2 = page2.rows.map((row) => row.id);
    const lines = await loadByIds(
      context,
      "journal_entry_lines",
      "id,journal_entry_id,debit_amount,credit_amount,line_number,account_id",
      "journal_entry_id",
      journalIds2,
      false
    );
    const linesByJournal = groupBy(lines, (line) => line.journal_entry_id);
    const findings2 = [];
    for (const journal of page2.rows) {
      const journalLines = linesByJournal.get(journal.id) || [];
      const debit = roundMoney(
        journalLines.reduce(
          (sum, line) => sum + Number(line.debit_amount || 0),
          0
        )
      );
      const credit = roundMoney(
        journalLines.reduce(
          (sum, line) => sum + Number(line.credit_amount || 0),
          0
        )
      );
      const balanced = !moneyDiffers(debit, credit);
      const isEmptyDraftPlaceholder = journalLines.length === 0 && ["draft", "pending"].includes(normalizeStatus(journal.status)) && !moneyDiffers(journal.total_debit, 0) && !moneyDiffers(journal.total_credit, 0);
      if (journalLines.length < 2 && !isEmptyDraftPlaceholder) {
        findings2.push(
          reviewFinding(
            `journal:${journal.id}:insufficient-lines`,
            "accounting.journal_insufficient_lines",
            "critical",
            "journal_entry",
            journal.id,
            "Journal entry has fewer than two lines",
            "A valid journal entry requires at least one debit and one credit line.",
            {
              lineCount: journalLines.length,
              storedDebit: journal.total_debit,
              storedCredit: journal.total_credit
            }
          )
        );
      }
      if (!balanced) {
        findings2.push(
          reviewFinding(
            `journal:${journal.id}:unbalanced`,
            "accounting.unbalanced_journal",
            "critical",
            "journal_entry",
            journal.id,
            "Journal entry is unbalanced",
            "The agent will not invent a balancing account or amount.",
            {
              calculatedDebit: debit,
              calculatedCredit: credit,
              difference: roundMoney(debit - credit)
            }
          )
        );
        continue;
      }
      if (moneyDiffers(journal.total_debit, debit) || moneyDiffers(journal.total_credit, credit)) {
        if (["draft", "pending"].includes(normalizeStatus(journal.status))) {
          findings2.push(
            repairFinding({
              dedupeKey: `journal:${journal.id}:stored-totals`,
              code: "accounting.draft_journal_totals_mismatch",
              severity: "high",
              entityType: "journal_entry",
              entityId: journal.id,
              title: "Draft journal totals are stale",
              details: "The balanced line totals do not match the journal header totals.",
              evidence: { calculatedDebit: debit, calculatedCredit: credit },
              command: "accounting.sync_draft_journal_totals",
              expectedBefore: {
                total_debit: journal.total_debit,
                total_credit: journal.total_credit
              },
              values: { total_debit: debit, total_credit: credit }
            })
          );
        } else {
          findings2.push(
            reviewFinding(
              `journal:${journal.id}:posted-totals`,
              "accounting.posted_journal_totals_mismatch",
              "critical",
              "journal_entry",
              journal.id,
              "Posted journal totals do not match its lines",
              "A posted journal must be corrected through an approved reversal.",
              {
                status: journal.status,
                calculatedDebit: debit,
                calculatedCredit: credit
              }
            )
          );
        }
      }
    }
    const nextCursor = page2.hasMore ? { phase: "journals", lastId: page2.nextLastId } : { phase: "payments", lastId: "" };
    return {
      findings: findings2,
      cursor: nextCursor,
      hasMore: page2.hasMore || true,
      scanned: page2.rows.length,
      stats: { journalsScanned: page2.rows.length }
    };
  }
  const page = await loadCompanyPage(
    context,
    "payments",
    "id,company_id,payment_number,payment_date,payment_status,amount,journal_entry_id,contract_id,customer_id,invoice_id,payment_method,transaction_type,bank_id,reconciliation_status,reconciled_at",
    String(cursor.lastId || "")
  );
  const paymentIds = page.rows.map((payment) => payment.id);
  const journalIds = page.rows.map((row) => row.journal_entry_id).filter(Boolean);
  const invoiceIds = page.rows.map((payment) => payment.invoice_id).filter(Boolean);
  const [journals, directInvoices, paymentAllocations, classifications] = await Promise.all([
    loadByIds(
      context,
      "journal_entries",
      "id,company_id,status,entry_date,reference_type,reference_id",
      "id",
      journalIds
    ),
    loadByIds(
      context,
      "invoices",
      "id,company_id,contract_id,customer_id,invoice_number,status,payment_status",
      "id",
      invoiceIds
    ),
    loadByIds(
      context,
      "payment_allocations",
      "id,company_id,payment_id,allocation_type,target_id,amount,is_active,voided_at",
      "payment_id",
      paymentIds
    ),
    loadByIds(
      context,
      "payment_accounting_classifications",
      "id,company_id,payment_id,classification,is_active",
      "payment_id",
      paymentIds
    )
  ]);
  const activeInvoiceAllocations = paymentAllocations.filter(
    (allocation) => allocation.is_active === true && !allocation.voided_at && allocation.allocation_type === "invoice"
  );
  const allocationInvoiceIds = activeInvoiceAllocations.map((allocation) => allocation.target_id).filter(Boolean);
  const allocationInvoices = await loadByIds(
    context,
    "invoices",
    "id,company_id,contract_id,customer_id,invoice_number,status,payment_status",
    "id",
    allocationInvoiceIds
  );
  const invoiceById = new Map(
    [...directInvoices, ...allocationInvoices].map((invoice) => [
      invoice.id,
      invoice
    ])
  );
  const allocationsByPayment = groupBy(
    activeInvoiceAllocations,
    (allocation) => allocation.payment_id
  );
  const classifiedAdvancePaymentIds = new Set(
    classifications.filter(
      (classification) => classification.is_active === true && classification.classification === "customer_advance"
    ).map((classification) => classification.payment_id)
  );
  const journalById = new Map(journals.map((journal) => [journal.id, journal]));
  const bankTransactions = await loadByIds(
    context,
    "bank_transactions",
    "id,company_id,payment_id,bank_id,amount,status,journal_entry_id,reconciled,reconciled_at,reversal_of_transaction_id",
    "payment_id",
    page.rows.map((payment) => payment.id)
  );
  const bankTransactionsByPayment = groupBy(
    bankTransactions,
    (transaction) => transaction.payment_id
  );
  const { data: activeBanks, error: activeBanksError } = await context.supabase.from("banks").select("id").eq("company_id", context.job.company_id).eq("is_active", true).limit(2);
  if (activeBanksError) throw new Error(`banks: ${activeBanksError.message}`);
  const singleActiveBankId = activeBanks?.length === 1 ? String(activeBanks[0].id) : null;
  const findings = [];
  for (const payment of page.rows) {
    if (!isCompletedPayment(payment.payment_status)) continue;
    const directInvoice = payment.invoice_id ? invoiceById.get(payment.invoice_id) : null;
    const activeAllocations = allocationsByPayment.get(payment.id) || [];
    if (payment.invoice_id && !directInvoice) {
      findings.push(
        reviewFinding(
          `payment:${payment.id}:broken-invoice-link`,
          "payment.broken_invoice_link",
          "critical",
          "payment",
          payment.id,
          "Completed payment points to a missing or foreign-company invoice",
          "The invoice relationship must be reconstructed from verified financial evidence.",
          { invoiceId: payment.invoice_id }
        )
      );
    } else if (directInvoice) {
      const contractMismatch = Boolean(payment.contract_id) && Boolean(directInvoice.contract_id) && payment.contract_id !== directInvoice.contract_id;
      const customerMismatch = Boolean(payment.customer_id) && Boolean(directInvoice.customer_id) && payment.customer_id !== directInvoice.customer_id;
      if (contractMismatch || customerMismatch) {
        findings.push(
          reviewFinding(
            `payment:${payment.id}:invoice-identity-mismatch`,
            "payment.invoice_contract_identity_mismatch",
            "critical",
            "payment",
            payment.id,
            "Payment identity does not match its invoice",
            "Company, customer, and contract ownership must agree before the relationship can be corrected.",
            {
              invoiceId: directInvoice.id,
              paymentContractId: payment.contract_id,
              invoiceContractId: directInvoice.contract_id,
              paymentCustomerId: payment.customer_id,
              invoiceCustomerId: directInvoice.customer_id,
              contractMismatch,
              customerMismatch
            }
          )
        );
      } else if (!directInvoice.contract_id && payment.contract_id && (!directInvoice.customer_id || !payment.customer_id || directInvoice.customer_id === payment.customer_id)) {
        findings.push(
          reviewFinding(
            `invoice:${directInvoice.id}:missing-contract-from-payment:${payment.id}`,
            "invoice.missing_contract_with_payment_evidence",
            "high",
            "invoice",
            directInvoice.id,
            "Invoice has no contract but its payment does",
            "The payment provides a contract candidate, but financial staff must confirm that it is the only valid source before relinking the invoice.",
            {
              paymentId: payment.id,
              candidateContractId: payment.contract_id,
              invoiceCustomerId: directInvoice.customer_id,
              paymentCustomerId: payment.customer_id
            }
          )
        );
      }
    }
    for (const allocation of activeAllocations) {
      const allocatedInvoice = invoiceById.get(allocation.target_id);
      if (!allocatedInvoice) {
        findings.push(
          reviewFinding(
            `payment-allocation:${allocation.id}:broken-invoice-target`,
            "payment.allocation_broken_invoice_target",
            "critical",
            "payment_allocation",
            allocation.id,
            "Active payment allocation points to a missing invoice",
            "The append-preserving allocation ledger must be repaired through the canonical allocation workflow.",
            { paymentId: payment.id, targetInvoiceId: allocation.target_id }
          )
        );
        continue;
      }
      const contractMismatch = Boolean(payment.contract_id) && Boolean(allocatedInvoice.contract_id) && payment.contract_id !== allocatedInvoice.contract_id;
      const customerMismatch = Boolean(payment.customer_id) && Boolean(allocatedInvoice.customer_id) && payment.customer_id !== allocatedInvoice.customer_id;
      if (contractMismatch || customerMismatch) {
        findings.push(
          reviewFinding(
            `payment-allocation:${allocation.id}:identity-mismatch`,
            "payment.allocation_contract_identity_mismatch",
            "critical",
            "payment_allocation",
            allocation.id,
            "Payment allocation crosses contract or customer ownership",
            "The active allocation must be voided and replaced only after the intended invoice is verified.",
            {
              paymentId: payment.id,
              invoiceId: allocatedInvoice.id,
              paymentContractId: payment.contract_id,
              invoiceContractId: allocatedInvoice.contract_id,
              paymentCustomerId: payment.customer_id,
              invoiceCustomerId: allocatedInvoice.customer_id,
              contractMismatch,
              customerMismatch
            }
          )
        );
      }
    }
    if (isReceiptPayment(payment) && !payment.invoice_id && activeAllocations.length === 0 && !classifiedAdvancePaymentIds.has(payment.id) && !payment.contract_id) {
      findings.push(
        reviewFinding(
          `payment:${payment.id}:unallocated-without-contract`,
          "payment.completed_unallocated_without_contract",
          "high",
          "payment",
          payment.id,
          "Completed receipt has no allocation or contract context",
          "The receipt may be a customer advance, but it must not be classified or linked without verified customer and accounting evidence.",
          {
            amount: roundMoney(payment.amount),
            paymentDate: payment.payment_date,
            customerId: payment.customer_id
          }
        )
      );
    }
    if (!payment.journal_entry_id) {
      findings.push(
        reviewFinding(
          `payment:${payment.id}:missing-journal`,
          "accounting.completed_payment_missing_journal",
          "critical",
          "payment",
          payment.id,
          "Completed payment has no journal entry",
          "A journal must be created through the payment accounting workflow and remain reversible.",
          {
            amount: roundMoney(payment.amount),
            paymentDate: payment.payment_date
          }
        )
      );
    } else if (!journalById.has(payment.journal_entry_id)) {
      findings.push(
        reviewFinding(
          `payment:${payment.id}:broken-journal-link`,
          "accounting.payment_broken_journal_link",
          "critical",
          "payment",
          payment.id,
          "Payment journal link points to a missing entry",
          "The payment requires journal reconstruction or relinking with accounting approval.",
          { journalEntryId: payment.journal_entry_id }
        )
      );
    }
    if (isBankLikePaymentMethod(payment.payment_method) && isPendingBankReconciliation(payment)) {
      if (!payment.bank_id) {
        findings.push(
          singleActiveBankId ? repairFinding({
            dedupeKey: `payment:${payment.id}:assign-single-active-bank`,
            code: "accounting.bank_payment_assigned_single_active_bank",
            severity: "high",
            entityType: "payment",
            entityId: payment.id,
            title: "Bank payment is missing the company's only active bank",
            details: "The payment can be assigned atomically because the company has exactly one active bank account.",
            evidence: {
              amount: roundMoney(payment.amount),
              paymentDate: payment.payment_date,
              paymentMethod: payment.payment_method,
              hasJournal: Boolean(payment.journal_entry_id),
              activeBankCount: 1
            },
            command: "accounting.assign_single_active_bank",
            expectedBefore: { bank_id: null },
            values: { bank_id: singleActiveBankId }
          }) : reviewFinding(
            `payment:${payment.id}:reconciliation-missing-bank`,
            "accounting.bank_payment_missing_bank_for_reconciliation",
            "high",
            "payment",
            payment.id,
            "Bank payment cannot be reconciled without a bank account",
            "Select the verified receiving bank before matching this payment to a bank statement. The agent will not guess the bank.",
            {
              amount: roundMoney(payment.amount),
              paymentDate: payment.payment_date,
              paymentMethod: payment.payment_method,
              hasJournal: Boolean(payment.journal_entry_id),
              activeBankCount: activeBanks?.length || 0
            }
          )
        );
        continue;
      }
      const originalTransactions = (bankTransactionsByPayment.get(payment.id) || []).filter((transaction2) => !transaction2.reversal_of_transaction_id);
      if (originalTransactions.length === 0) {
        findings.push(
          reviewFinding(
            `payment:${payment.id}:reconciliation-missing-transaction`,
            "accounting.bank_payment_missing_transaction_for_reconciliation",
            "high",
            "payment",
            payment.id,
            "Bank payment has no linked bank transaction",
            "A canonical bank movement must be created or linked through an approved accounting workflow before statement matching.",
            {
              amount: roundMoney(payment.amount),
              paymentDate: payment.payment_date,
              bankId: payment.bank_id,
              journalEntryId: payment.journal_entry_id
            }
          )
        );
        continue;
      }
      if (originalTransactions.length > 1) {
        findings.push(
          reviewFinding(
            `payment:${payment.id}:reconciliation-duplicate-transactions`,
            "accounting.bank_payment_duplicate_transactions",
            "critical",
            "payment",
            payment.id,
            "Bank payment has multiple original bank transactions",
            "Duplicate bank movements must be reviewed and reversed through the approved accounting workflow.",
            { transactionCount: originalTransactions.length }
          )
        );
        continue;
      }
      const transaction = originalTransactions[0];
      const transactionMatches = normalizeStatus(transaction.status) === "completed" && transaction.bank_id === payment.bank_id && !moneyDiffers(transaction.amount, payment.amount) && Boolean(payment.journal_entry_id) && transaction.journal_entry_id === payment.journal_entry_id;
      findings.push(
        reviewFinding(
          `payment:${payment.id}:reconciliation-${transactionMatches ? "awaiting-statement" : "transaction-mismatch"}`,
          transactionMatches ? "accounting.bank_payment_awaiting_statement_match" : "accounting.bank_payment_transaction_mismatch",
          transactionMatches ? "medium" : "critical",
          "payment",
          payment.id,
          transactionMatches ? "Bank payment is ready for statement matching" : "Linked bank transaction does not match the payment",
          transactionMatches ? "Import and match the bank statement line. The approved matching command will reconcile the payment and movement atomically." : "Company, bank, amount, status, and journal linkage must be reviewed before reconciliation.",
          {
            bankTransactionId: transaction.id,
            bankTransactionStatus: transaction.status,
            bankTransactionReconciled: Boolean(
              transaction.reconciled || transaction.reconciled_at
            )
          }
        )
      );
    }
  }
  return {
    findings,
    cursor: page.hasMore ? { phase: "payments", lastId: page.nextLastId } : { phase: "traffic_violation_payments", lastId: "" },
    hasMore: true,
    scanned: page.rows.length,
    stats: { paymentsScanned: page.rows.length }
  };
}
async function auditTrafficViolationPayments(context, lastId) {
  const page = await loadCompanyPage(
    context,
    "traffic_violation_payments",
    "id,company_id,traffic_violation_id,payment_number,payment_date,amount,payment_method,status,journal_entry_id",
    lastId
  );
  const journalIds = page.rows.map((row) => row.journal_entry_id).filter(Boolean);
  const journals = await loadByIds(
    context,
    "journal_entries",
    "id,company_id,status,entry_date,reference_type,reference_id",
    "id",
    journalIds
  );
  const journalById = new Map(journals.map((journal) => [journal.id, journal]));
  const findings = [];
  for (const payment of page.rows) {
    if (normalizeStatus(payment.status) !== "completed") continue;
    if (!payment.journal_entry_id) {
      findings.push(
        repairFinding({
          dedupeKey: `traffic-violation-payment:${payment.id}:missing-journal`,
          code: "accounting.traffic_violation_payment_missing_journal",
          severity: "critical",
          entityType: "traffic_violation_payment",
          entityId: payment.id,
          title: "Completed traffic violation payment has no journal entry",
          details: "The verified company payment can be posted through the traffic-violation accounting gateway.",
          evidence: {
            violationId: payment.traffic_violation_id,
            amount: roundMoney(payment.amount),
            paymentDate: payment.payment_date,
            paymentMethod: payment.payment_method
          },
          command: "traffic_violation_payment.post_missing_journal",
          expectedBefore: {
            status: payment.status,
            journal_entry_id: null
          },
          values: {}
        })
      );
    } else if (!journalById.has(payment.journal_entry_id)) {
      findings.push(
        reviewFinding(
          `traffic-violation-payment:${payment.id}:broken-journal-link`,
          "accounting.traffic_violation_payment_broken_journal_link",
          "critical",
          "traffic_violation_payment",
          payment.id,
          "Traffic violation payment points to a missing journal entry",
          "The missing posted entry must be reconstructed or the payment reversed with accounting approval.",
          {
            violationId: payment.traffic_violation_id,
            journalEntryId: payment.journal_entry_id,
            amount: roundMoney(payment.amount)
          }
        )
      );
    }
  }
  return {
    findings,
    cursor: page.hasMore ? { phase: "traffic_violation_payments", lastId: page.nextLastId } : { phase: "vehicle_installment_payments", lastId: "" },
    hasMore: true,
    scanned: page.rows.length,
    stats: { trafficViolationPaymentsScanned: page.rows.length }
  };
}
async function auditVehicleInstallmentPayments(context, lastId) {
  const page = await loadCompanyPage(
    context,
    "vehicle_installment_schedules",
    "id,company_id,installment_id,installment_number,amount,paid_amount,paid_date,payment_reference,status,journal_entry_id",
    lastId
  );
  const scheduleIds = page.rows.map((row) => row.id);
  const payments = await loadByIds(
    context,
    "vehicle_installment_payments",
    "id,company_id,installment_id,schedule_id,payment_date,amount,principal_amount,interest_amount,payment_method,status,journal_entry_id,reversal_journal_entry_id",
    "schedule_id",
    scheduleIds
  );
  const paymentsBySchedule = groupBy(
    payments,
    (payment) => payment.schedule_id
  );
  const journalIds = payments.flatMap((payment) => [
    payment.journal_entry_id,
    payment.reversal_journal_entry_id
  ]).filter(Boolean);
  const journals = await loadByIds(
    context,
    "journal_entries",
    "id,company_id,status,entry_date,reference_type,reference_id,reversal_entry_id,total_debit,total_credit",
    "id",
    journalIds
  );
  const journalById = new Map(journals.map((journal) => [journal.id, journal]));
  const findings = [];
  for (const schedule of page.rows) {
    const storedPaid = roundMoney(schedule.paid_amount);
    const schedulePayments = paymentsBySchedule.get(schedule.id) || [];
    const completedPayments = schedulePayments.filter(
      (payment) => normalizeStatus(payment.status) === "completed"
    );
    const canonicalPaid = roundMoney(
      completedPayments.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0
      )
    );
    if (storedPaid > 0.01 && schedulePayments.length === 0) {
      findings.push(
        reviewFinding(
          `vehicle-installment-schedule:${schedule.id}:legacy-payment-history`,
          schedule.journal_entry_id ? "accounting.vehicle_installment_legacy_payment_missing_ledger" : "accounting.vehicle_installment_legacy_payment_missing_journal",
          schedule.journal_entry_id ? "high" : "critical",
          "vehicle_installment_schedule",
          schedule.id,
          schedule.journal_entry_id ? "Legacy installment payment has no canonical payment ledger" : "Legacy installment payment has no canonical ledger or journal",
          "Verify the original payment method, date, source document, and account mapping before migration. The agent will not guess historical cash or bank facts.",
          {
            installmentId: schedule.installment_id,
            installmentNumber: schedule.installment_number,
            amount: roundMoney(schedule.amount),
            paidAmount: storedPaid,
            paidDate: schedule.paid_date,
            paymentReference: schedule.payment_reference,
            legacyJournalEntryId: schedule.journal_entry_id
          }
        )
      );
      continue;
    }
    if (moneyDiffers(storedPaid, canonicalPaid)) {
      findings.push(
        reviewFinding(
          `vehicle-installment-schedule:${schedule.id}:payment-total-mismatch`,
          "accounting.vehicle_installment_payment_total_mismatch",
          "critical",
          "vehicle_installment_schedule",
          schedule.id,
          "Installment schedule paid amount differs from its payment ledger",
          "Review payment reversals and source documents before changing the financial balance.",
          {
            installmentId: schedule.installment_id,
            storedPaidAmount: storedPaid,
            canonicalPaidAmount: canonicalPaid,
            completedPaymentCount: completedPayments.length
          }
        )
      );
    }
    for (const payment of completedPayments) {
      const journal = journalById.get(payment.journal_entry_id);
      if (!journal) {
        findings.push(
          reviewFinding(
            `vehicle-installment-payment:${payment.id}:broken-journal`,
            "accounting.vehicle_installment_payment_broken_journal",
            "critical",
            "vehicle_installment_payment",
            payment.id,
            "Installment payment points to a missing journal entry",
            "Reconstruct or reverse the payment through an approved accounting workflow.",
            { journalEntryId: payment.journal_entry_id, amount: payment.amount }
          )
        );
      } else if (normalizeStatus(journal.status) !== "posted" || journal.reversal_entry_id) {
        findings.push(
          reviewFinding(
            `vehicle-installment-payment:${payment.id}:journal-state`,
            "accounting.vehicle_installment_payment_journal_state_mismatch",
            "critical",
            "vehicle_installment_payment",
            payment.id,
            "Completed installment payment is not backed by an active posted journal",
            "Payment and journal state must be reconciled through an approved reversal or restoration workflow.",
            {
              journalEntryId: journal.id,
              journalStatus: journal.status,
              journalReversalEntryId: journal.reversal_entry_id
            }
          )
        );
      }
    }
  }
  return {
    findings,
    cursor: page.hasMore ? { phase: "vehicle_installment_payments", lastId: page.nextLastId } : { phase: "bank_transactions", lastId: "" },
    hasMore: true,
    scanned: page.rows.length,
    stats: { vehicleInstallmentSchedulesScanned: page.rows.length }
  };
}
async function auditUnreconciledBankTransactions(context, lastId) {
  const page = await loadCompanyPage(
    context,
    "bank_transactions",
    "id,company_id,payment_id,bank_id,amount,status,journal_entry_id,reconciled,reconciled_at,reversal_of_transaction_id,transaction_date,transaction_type",
    lastId
  );
  const findings = [];
  for (const transaction of page.rows) {
    if (transaction.reversal_of_transaction_id || normalizeStatus(transaction.status) !== "completed" || transaction.reconciled || transaction.reconciled_at || transaction.payment_id) {
      continue;
    }
    findings.push(
      reviewFinding(
        `bank-transaction:${transaction.id}:unlinked-reconciliation`,
        "accounting.bank_transaction_unlinked_for_reconciliation",
        transaction.journal_entry_id ? "high" : "critical",
        "bank_transaction",
        transaction.id,
        "Completed bank transaction has no linked payment",
        transaction.journal_entry_id ? "Match this movement to verified source documentation or a bank statement. The agent will not invent a payment link." : "The movement also lacks a journal entry and requires accounting reconstruction before reconciliation.",
        {
          amount: roundMoney(transaction.amount),
          transactionDate: transaction.transaction_date,
          transactionType: transaction.transaction_type,
          bankId: transaction.bank_id,
          hasJournal: Boolean(transaction.journal_entry_id)
        }
      )
    );
  }
  if (page.hasMore) {
    return pageResult(
      page,
      findings,
      { phase: "bank_transactions", lastId: page.nextLastId },
      { bankTransactionsScanned: page.rows.length }
    );
  }
  return {
    findings,
    cursor: { phase: "monthly_obligation_payments", lastId: "" },
    hasMore: true,
    scanned: page.rows.length,
    stats: { bankTransactionsScanned: page.rows.length }
  };
}
async function auditMonthlyObligationPayments(context, lastId) {
  const page = await loadCompanyPage(
    context,
    "monthly_obligation_installments",
    "id,company_id,obligation_id,amount,paid_amount,payment_ledger_baseline,status,payment_date,vendor_payment_id,bank_transaction_id,journal_entry_id",
    lastId
  );
  const installmentIds = page.rows.map((row) => row.id);
  const payments = await loadByIds(
    context,
    "monthly_obligation_payments",
    "id,company_id,installment_id,amount,payment_date,bank_id,vendor_payment_id,bank_transaction_id,journal_entry_id,status,reversal_of_payment_id",
    "installment_id",
    installmentIds
  );
  const journalIds = payments.map((payment) => payment.journal_entry_id).filter(Boolean);
  const bankTransactionIds = payments.map((payment) => payment.bank_transaction_id).filter(Boolean);
  const vendorPaymentIds = payments.map((payment) => payment.vendor_payment_id).filter(Boolean);
  const [journals, bankTransactions, vendorPayments] = await Promise.all([
    loadByIds(
      context,
      "journal_entries",
      "id,company_id,status,total_debit,total_credit,reversal_entry_id",
      "id",
      journalIds
    ),
    loadByIds(
      context,
      "bank_transactions",
      "id,company_id,bank_id,amount,status,journal_entry_id,reversal_of_transaction_id",
      "id",
      bankTransactionIds
    ),
    loadByIds(
      context,
      "vendor_payments",
      "id,company_id,amount,status,journal_entry_id",
      "id",
      vendorPaymentIds
    )
  ]);
  const paymentsByInstallment = groupBy(
    payments,
    (payment) => String(payment.installment_id || "")
  );
  const journalById = new Map(journals.map((journal) => [journal.id, journal]));
  const bankTransactionById = new Map(
    bankTransactions.map((transaction) => [transaction.id, transaction])
  );
  const vendorPaymentById = new Map(
    vendorPayments.map((payment) => [payment.id, payment])
  );
  const findings = [];
  for (const installment of page.rows) {
    const installmentPayments = paymentsByInstallment.get(String(installment.id)) || [];
    const completedPayments = installmentPayments.filter(
      (payment) => normalizeStatus(payment.status) === "completed"
    );
    const ledgerPaid = roundMoney(
      Number(installment.payment_ledger_baseline || 0) + completedPayments.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0
      )
    );
    const latestPaymentDate = latestTimestamp(
      completedPayments.map((payment) => payment.payment_date)
    )?.slice(0, 10) || null;
    const expectedStatus = ledgerPaid >= Number(installment.amount || 0) - MONEY_SETTLEMENT_TOLERANCE ? "paid" : ledgerPaid > 0 ? "partial" : null;
    if (expectedStatus && Number(installment.payment_ledger_baseline || 0) <= 0 && (moneyDiffers(installment.paid_amount, ledgerPaid) || normalizeStatus(installment.status) !== expectedStatus || completedPayments.length > 0 && dateOnly(installment.payment_date) !== latestPaymentDate)) {
      findings.push(
        repairFinding({
          dedupeKey: `monthly-obligation-installment:${installment.id}:payment-state`,
          code: "accounting.monthly_obligation_payment_state_mismatch",
          severity: "critical",
          entityType: "monthly_obligation_installment",
          entityId: String(installment.id),
          title: "Monthly obligation installment payment state is stale",
          details: "Stored payment state does not match the canonical payment ledger.",
          evidence: { ledgerPaid, expectedStatus, latestPaymentDate },
          command: "monthly_obligation.sync_payment_state",
          expectedBefore: {
            paid_amount: installment.paid_amount,
            status: installment.status,
            payment_date: installment.payment_date
          },
          values: {}
        })
      );
    }
    if (Number(installment.payment_ledger_baseline || 0) > 0) {
      findings.push(
        reviewFinding(
          `monthly-obligation-installment:${installment.id}:legacy-baseline`,
          "accounting.monthly_obligation_legacy_payment_baseline",
          "high",
          "monthly_obligation_installment",
          String(installment.id),
          "Monthly obligation contains a legacy payment baseline",
          "The historical source, cash account, and principal/interest split must be verified before it can become a canonical payment row.",
          { baseline: roundMoney(installment.payment_ledger_baseline) }
        )
      );
    }
    for (const payment of completedPayments) {
      const journal = journalById.get(payment.journal_entry_id);
      if (!journal || normalizeStatus(journal.status) !== "posted" || journal.reversal_entry_id || moneyDiffers(journal.total_debit, payment.amount) || moneyDiffers(journal.total_credit, payment.amount)) {
        findings.push(
          reviewFinding(
            `monthly-obligation-payment:${payment.id}:journal`,
            "accounting.monthly_obligation_payment_invalid_journal",
            "critical",
            "monthly_obligation_payment",
            String(payment.id),
            "Monthly obligation payment has no valid posted journal",
            "The recorded cash account and source document must be verified before accounting reconstruction.",
            { journalEntryId: payment.journal_entry_id, amount: payment.amount }
          )
        );
      }
      if (payment.bank_id) {
        const transaction = bankTransactionById.get(payment.bank_transaction_id);
        if (!transaction || transaction.bank_id !== payment.bank_id || normalizeStatus(transaction.status) !== "completed" || transaction.reversal_of_transaction_id || transaction.journal_entry_id !== payment.journal_entry_id || moneyDiffers(transaction.amount, payment.amount)) {
          findings.push(
            reviewFinding(
              `monthly-obligation-payment:${payment.id}:bank`,
              "accounting.monthly_obligation_payment_invalid_bank_movement",
              "critical",
              "monthly_obligation_payment",
              String(payment.id),
              "Monthly obligation payment bank movement is missing or inconsistent",
              "The bank movement must be reconciled with the payment and journal before repair.",
              {
                bankId: payment.bank_id,
                bankTransactionId: payment.bank_transaction_id
              }
            )
          );
        }
      }
      if (payment.vendor_payment_id) {
        const vendorPayment = vendorPaymentById.get(payment.vendor_payment_id);
        if (!vendorPayment || normalizeStatus(vendorPayment.status) !== "completed" || vendorPayment.journal_entry_id !== payment.journal_entry_id || moneyDiffers(vendorPayment.amount, payment.amount)) {
          findings.push(
            reviewFinding(
              `monthly-obligation-payment:${payment.id}:vendor`,
              "accounting.monthly_obligation_payment_invalid_vendor_payment",
              "critical",
              "monthly_obligation_payment",
              String(payment.id),
              "Monthly obligation vendor payment is missing or inconsistent",
              "Vendor payment facts must be verified before relinking or reconstruction.",
              { vendorPaymentId: payment.vendor_payment_id }
            )
          );
        }
      }
    }
  }
  if (page.hasMore) {
    return pageResult(
      page,
      findings,
      { phase: "monthly_obligation_payments", lastId: page.nextLastId },
      { monthlyObligationInstallmentsScanned: page.rows.length }
    );
  }
  return {
    findings,
    cursor: { phase: "rental_receipt_payments", lastId: "" },
    hasMore: true,
    scanned: page.rows.length,
    stats: { monthlyObligationInstallmentsScanned: page.rows.length }
  };
}
async function auditRentalReceiptPayments(context, lastId) {
  const page = await loadCompanyPage(
    context,
    "rental_payment_receipts",
    "id,company_id,customer_id,contract_id,payment_date,amount_due,total_paid,pending_balance,payment_status,idempotency_key,canonical_payment_id",
    lastId
  );
  const canonicalReceipts = page.rows.filter(
    (receipt) => receipt.idempotency_key || receipt.canonical_payment_id
  );
  const payments = await loadByIds(
    context,
    "payments",
    "id,company_id,customer_id,contract_id,payment_date,amount,payment_status,transaction_type",
    "id",
    canonicalReceipts.map((receipt) => receipt.canonical_payment_id).filter(Boolean)
  );
  const paymentById = new Map(payments.map((payment) => [payment.id, payment]));
  const findings = [];
  for (const receipt of canonicalReceipts) {
    const payment = paymentById.get(receipt.canonical_payment_id);
    if (!payment) {
      findings.push(
        reviewFinding(
          `rental-receipt:${receipt.id}:canonical-payment`,
          "accounting.rental_receipt_missing_canonical_payment",
          "critical",
          "rental_payment_receipt",
          String(receipt.id),
          "Canonical rental receipt has no linked payment",
          "The original cash or bank evidence must be verified before reconstructing a customer payment.",
          { canonicalPaymentId: receipt.canonical_payment_id }
        )
      );
      continue;
    }
    const paymentMatches = payment.company_id === receipt.company_id && payment.customer_id === receipt.customer_id && payment.contract_id === receipt.contract_id && dateOnly(payment.payment_date) === dateOnly(receipt.payment_date) && !moneyDiffers(payment.amount, receipt.total_paid) && normalizeStatus(payment.payment_status) === "completed" && normalizeStatus(payment.transaction_type || "receipt") === "receipt";
    if (!paymentMatches) {
      findings.push(
        reviewFinding(
          `rental-receipt:${receipt.id}:payment-mismatch`,
          "accounting.rental_receipt_canonical_payment_mismatch",
          "critical",
          "rental_payment_receipt",
          String(receipt.id),
          "Rental receipt and canonical payment disagree",
          "Customer, contract, date, amount, and payment status require source-document review before relinking.",
          { canonicalPaymentId: payment.id }
        )
      );
      continue;
    }
    const expectedPending = roundMoney(
      Math.max(Number(receipt.amount_due || 0) - Number(receipt.total_paid || 0), 0)
    );
    const expectedStatus = expectedPending <= MONEY_SETTLEMENT_TOLERANCE ? "paid" : "partial";
    if (moneyDiffers(receipt.pending_balance, expectedPending) || normalizeStatus(receipt.payment_status) !== expectedStatus) {
      findings.push(
        repairFinding({
          dedupeKey: `rental-receipt:${receipt.id}:payment-state`,
          code: "accounting.rental_receipt_payment_state_mismatch",
          severity: "high",
          entityType: "rental_payment_receipt",
          entityId: String(receipt.id),
          title: "Rental receipt payment state is stale",
          details: "Receipt state does not match its amount due and canonical payment.",
          evidence: { expectedPending, expectedStatus, canonicalPaymentId: payment.id },
          command: "rental_receipt.sync_payment_state",
          expectedBefore: {
            pending_balance: receipt.pending_balance,
            payment_status: receipt.payment_status
          },
          values: {}
        })
      );
    }
  }
  return pageResult(
    page,
    findings,
    { phase: "rental_receipt_payments", lastId: page.nextLastId },
    { rentalReceiptsScanned: page.rows.length }
  );
}
async function auditFleet(context) {
  const page = await loadCompanyPage(
    context,
    "vehicles",
    "id,company_id,plate_number,status,is_active,current_mileage,odometer_reading"
  );
  const vehicleIds = page.rows.map((row) => row.id);
  if (vehicleIds.length === 0) return pageResult(page, []);
  const today = context.now.toISOString().slice(0, 10);
  const [contracts, maintenance, reservations, readings] = await Promise.all([
    loadByIds(
      context,
      "contracts",
      "id,vehicle_id,status,start_date,end_date",
      "vehicle_id",
      vehicleIds
    ),
    loadByIds(
      context,
      "vehicle_maintenance",
      "id,company_id,vehicle_id,status,started_date,completed_date,actual_cost,tax_amount,total_cost_with_tax,expense_recorded,journal_entry_id,payment_method",
      "vehicle_id",
      vehicleIds
    ),
    loadByIds(
      context,
      "vehicle_reservations",
      "id,vehicle_id,status,start_date,end_date,hold_until",
      "vehicle_id",
      vehicleIds
    ),
    loadByIds(
      context,
      "odometer_readings",
      "id,vehicle_id,odometer_reading,reading_date",
      "vehicle_id",
      vehicleIds
    )
  ]);
  const maintenanceIds = maintenance.map((row) => row.id);
  const maintenanceJournals = await loadByIds(
    context,
    "journal_entries",
    "id,company_id,status,entry_date,reference_type,reference_id,reversal_entry_id",
    "reference_id",
    maintenanceIds
  );
  const maintenanceJournalById = new Map(
    maintenanceJournals.map((journal) => [journal.id, journal])
  );
  const maintenanceJournalsByReference = groupBy(
    maintenanceJournals.filter(
      (journal) => normalizeStatus(journal.reference_type) === "maintenance"
    ),
    (journal) => journal.reference_id
  );
  const contractsByVehicle = groupBy(contracts, (row) => row.vehicle_id);
  const maintenanceByVehicle = groupBy(maintenance, (row) => row.vehicle_id);
  const reservationsByVehicle = groupBy(reservations, (row) => row.vehicle_id);
  const readingsByVehicle = groupBy(readings, (row) => row.vehicle_id);
  const findings = [];
  for (const vehicle of page.rows) {
    for (const item of maintenanceByVehicle.get(vehicle.id) || []) {
      if (normalizeStatus(item.status) !== "completed") continue;
      const amount = roundMoney(
        Number(item.total_cost_with_tax || 0) > 0 ? Number(item.total_cost_with_tax) : Number(item.actual_cost || 0) + Number(item.tax_amount || 0)
      );
      if (amount <= 0.01) continue;
      const activeReferenceJournals = (maintenanceJournalsByReference.get(item.id) || []).filter((journal) => normalizeStatus(journal.status) !== "reversed");
      const verifiedReferenceJournals = activeReferenceJournals.filter(
        (journal) => normalizeStatus(journal.status) === "posted" && !journal.reversal_entry_id && !moneyDiffers(journal.total_debit, amount) && !moneyDiffers(journal.total_credit, amount)
      );
      if (activeReferenceJournals.length > 1) {
        findings.push(
          reviewFinding(
            `maintenance:${item.id}:duplicate-journals`,
            "fleet.maintenance_duplicate_active_journals",
            "critical",
            "vehicle_maintenance",
            item.id,
            "Completed maintenance has duplicate active journals",
            "Review and reverse duplicate maintenance journals before changing the maintenance link.",
            {
              amount,
              journalEntryIds: activeReferenceJournals.map(
                (journal) => journal.id
              )
            }
          )
        );
        continue;
      }
      if (!item.journal_entry_id) {
        findings.push(
          verifiedReferenceJournals.length === 1 ? repairFinding({
            dedupeKey: `maintenance:${item.id}:verified-journal-link`,
            code: "fleet.maintenance_verified_journal_unlinked",
            severity: "critical",
            entityType: "vehicle_maintenance",
            entityId: item.id,
            title: "Verified maintenance journal is not linked",
            details: "Exactly one posted, balanced, amount-matched maintenance journal can be linked safely.",
            evidence: {
              amount,
              journalEntryId: verifiedReferenceJournals[0].id
            },
            command: "maintenance.sync_accounting_link",
            expectedBefore: {
              journal_entry_id: null,
              expense_recorded: item.expense_recorded
            },
            values: {
              journal_entry_id: verifiedReferenceJournals[0].id,
              expense_recorded: true
            }
          }) : reviewFinding(
            `maintenance:${item.id}:missing-journal`,
            "fleet.completed_maintenance_missing_journal",
            "critical",
            "vehicle_maintenance",
            item.id,
            "Completed maintenance expense has no journal link",
            "Post the verified actual cost through the canonical maintenance accounting gateway.",
            {
              amount,
              paymentMethod: item.payment_method,
              verifiedCandidateCount: verifiedReferenceJournals.length
            }
          )
        );
        continue;
      }
      const linkedJournal = maintenanceJournalById.get(item.journal_entry_id);
      if (!linkedJournal || linkedJournal.company_id !== item.company_id || normalizeStatus(linkedJournal.reference_type) !== "maintenance" || linkedJournal.reference_id !== item.id || normalizeStatus(linkedJournal.status) !== "posted" || linkedJournal.reversal_entry_id) {
        findings.push(
          reviewFinding(
            `maintenance:${item.id}:invalid-journal`,
            "fleet.maintenance_journal_state_mismatch",
            "critical",
            "vehicle_maintenance",
            item.id,
            "Maintenance is not backed by an active posted journal",
            "Verify the linked entry and use an approved reversal or restoration workflow.",
            {
              amount,
              journalEntryId: item.journal_entry_id,
              journalStatus: linkedJournal?.status || null,
              reversalEntryId: linkedJournal?.reversal_entry_id || null
            }
          )
        );
      } else if (!item.expense_recorded) {
        findings.push(
          repairFinding({
            dedupeKey: `maintenance:${item.id}:expense-flag`,
            code: "fleet.maintenance_expense_flag_stale",
            severity: "high",
            entityType: "vehicle_maintenance",
            entityId: item.id,
            title: "Maintenance journal exists but its expense flag is stale",
            details: "The linked posted journal matches the maintenance amount and reference.",
            evidence: { amount, journalEntryId: item.journal_entry_id },
            command: "maintenance.sync_accounting_link",
            expectedBefore: {
              journal_entry_id: item.journal_entry_id,
              expense_recorded: item.expense_recorded
            },
            values: {
              journal_entry_id: item.journal_entry_id,
              expense_recorded: true
            }
          })
        );
      }
    }
    const hasActiveContract = (contractsByVehicle.get(vehicle.id) || []).some(
      (contract) => isActiveContractStatus(contract.status) && (!contract.start_date || contract.start_date <= today) && (!contract.end_date || contract.end_date >= today)
    );
    const hasOpenMaintenance = (maintenanceByVehicle.get(vehicle.id) || []).some((item) => normalizeStatus(item.status) === "in_progress");
    const hasActiveReservation = (reservationsByVehicle.get(vehicle.id) || []).some((reservation) => {
      const status = normalizeStatus(reservation.status);
      return !["cancelled", "canceled", "completed", "expired"].includes(status) && String(reservation.start_date || "").slice(0, 10) <= today && String(reservation.end_date || "").slice(0, 10) >= today;
    });
    const expectedStatus = deriveVehicleStatus({
      currentStatus: vehicle.status,
      isActive: vehicle.is_active,
      hasActiveContract,
      hasOpenMaintenance,
      hasActiveReservation
    });
    if (expectedStatus && normalizeStatus(vehicle.status) !== expectedStatus) {
      findings.push(
        repairFinding({
          dedupeKey: `vehicle:${vehicle.id}:status`,
          code: "fleet.vehicle_status_mismatch",
          severity: "high",
          entityType: "vehicle",
          entityId: vehicle.id,
          title: "Vehicle operational status is stale",
          details: "Status does not match active contracts, maintenance, and reservations.",
          evidence: {
            currentStatus: vehicle.status,
            expectedStatus,
            hasActiveContract,
            hasOpenMaintenance,
            hasActiveReservation
          },
          command: "vehicle.sync_status",
          expectedBefore: { status: vehicle.status },
          values: { status: expectedStatus }
        })
      );
    }
    const readingValues = (readingsByVehicle.get(vehicle.id) || []).map(
      (reading) => Number(reading.odometer_reading || 0)
    );
    const maximum = Math.max(
      0,
      Number(vehicle.current_mileage || 0),
      Number(vehicle.odometer_reading || 0),
      ...readingValues
    );
    if (moneyDiffers(vehicle.current_mileage, maximum) || moneyDiffers(vehicle.odometer_reading, maximum)) {
      findings.push(
        repairFinding({
          dedupeKey: `vehicle:${vehicle.id}:mileage`,
          code: "fleet.vehicle_mileage_mismatch",
          severity: "medium",
          entityType: "vehicle",
          entityId: vehicle.id,
          title: "Vehicle mileage fields are inconsistent",
          details: "Mileage can be synchronized to the greatest verified reading without decreasing it.",
          evidence: {
            currentMileage: vehicle.current_mileage,
            odometerReading: vehicle.odometer_reading,
            maximumVerified: maximum
          },
          command: "vehicle.sync_mileage",
          expectedBefore: {
            current_mileage: vehicle.current_mileage,
            odometer_reading: vehicle.odometer_reading
          },
          values: { current_mileage: maximum, odometer_reading: maximum }
        })
      );
    }
  }
  return pageResult(page, findings);
}
async function auditCustomers(context) {
  const page = await loadCompanyPage(
    context,
    "customers",
    "id,company_id,customer_code,phone,national_id,is_active,is_blacklisted"
  );
  const customerIds = page.rows.map((row) => row.id);
  if (customerIds.length === 0) return pageResult(page, []);
  const nationalIds = page.rows.map((row) => row.national_id).filter(Boolean);
  const paymentColumns = "id,company_id,customer_id,contract_id,invoice_id,amount,payment_date,payment_status,transaction_type,created_at";
  const [invoices, payments, balances, contracts, duplicateNationalRows] = await Promise.all([
    loadByIds(
      context,
      "invoices",
      "id,customer_id,total_amount,due_date,invoice_date,status,payment_status",
      "customer_id",
      customerIds
    ),
    loadByIds(
      context,
      "payments",
      paymentColumns,
      "customer_id",
      customerIds
    ),
    loadByIds(
      context,
      "customer_balances",
      "id,customer_id,current_balance,overdue_amount,days_overdue,last_payment_amount,last_payment_date",
      "customer_id",
      customerIds
    ),
    loadByIds(
      context,
      "contracts",
      "id,customer_id,status,start_date,end_date",
      "customer_id",
      customerIds
    ),
    nationalIds.length > 0 ? loadByIds(
      context,
      "customers",
      "id,national_id",
      "national_id",
      nationalIds
    ) : Promise.resolve([])
  ]);
  const invoiceIds = invoices.map((invoice) => invoice.id);
  const customerPaymentIds = payments.map((payment) => payment.id);
  const [allocationsByInvoice, allocationsByPayment, directInvoicePayments] = await Promise.all([
    loadByIds(
      context,
      "payment_allocations",
      "id,company_id,payment_id,allocation_type,target_id,amount,is_active,allocation_order",
      "target_id",
      invoiceIds
    ),
    loadByIds(
      context,
      "payment_allocations",
      "id,company_id,payment_id,allocation_type,target_id,amount,is_active,allocation_order",
      "payment_id",
      customerPaymentIds
    ),
    loadByIds(context, "payments", paymentColumns, "invoice_id", invoiceIds)
  ]);
  const basePayments = [
    ...new Map(
      [...payments, ...directInvoicePayments].map((row) => [row.id, row])
    ).values()
  ];
  const basePaymentIds = basePayments.map((payment) => payment.id);
  const allocationsByDirectPayment = await loadByIds(
    context,
    "payment_allocations",
    "id,company_id,payment_id,allocation_type,target_id,amount,is_active,allocation_order",
    "payment_id",
    basePaymentIds.filter(
      (paymentId) => !customerPaymentIds.includes(paymentId)
    )
  );
  const allocations = [
    ...new Map(
      [
        ...allocationsByInvoice,
        ...allocationsByPayment,
        ...allocationsByDirectPayment
      ].map((row) => [row.id, row])
    ).values()
  ];
  const knownPaymentIds = new Set(basePaymentIds);
  const allocationPaymentIds = allocations.map((allocation) => allocation.payment_id).filter((paymentId) => paymentId && !knownPaymentIds.has(paymentId));
  const allocationPayments = await loadByIds(
    context,
    "payments",
    paymentColumns,
    "id",
    allocationPaymentIds
  );
  const allPayments = [
    ...new Map(
      [...basePayments, ...allocationPayments].map((row) => [row.id, row])
    ).values()
  ];
  const canonicalInvoicePayments = buildCanonicalInvoiceReceiptContributions(
    allPayments,
    allocations
  );
  const invoicesByCustomer = groupBy(invoices, (row) => row.customer_id);
  const paymentsByCustomer = groupBy(payments, (row) => row.customer_id);
  const paymentsByInvoice = groupBy(
    canonicalInvoicePayments,
    (row) => row.invoice_id
  );
  const balancesByCustomer = groupBy(balances, (row) => row.customer_id);
  const contractsByCustomer = groupBy(contracts, (row) => row.customer_id);
  const duplicateNationalIds = groupBy(
    duplicateNationalRows.filter((row) => row.national_id),
    (row) => row.national_id
  );
  const findings = [];
  const today = context.now.toISOString().slice(0, 10);
  for (const customer of page.rows) {
    const customerInvoices = (invoicesByCustomer.get(customer.id) || []).filter(
      isActiveInvoice
    );
    const customerPayments = (paymentsByCustomer.get(customer.id) || []).filter(
      isReceiptPayment
    );
    const balanceRows = balancesByCustomer.get(customer.id) || [];
    const activeInvoiceTotal = roundMoney(
      customerInvoices.reduce(
        (sum, invoice) => sum + Number(invoice.total_amount || 0),
        0
      )
    );
    const completedReceipts = roundMoney(
      customerPayments.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0
      )
    );
    const currentBalance = roundMoney(activeInvoiceTotal - completedReceipts);
    const invoiceStates = customerInvoices.map((invoice) => {
      const paid = deriveFinancialTotals(
        invoice.total_amount,
        paymentsByInvoice.get(invoice.id) || []
      ).paid;
      return {
        invoice,
        balance: roundMoney(
          Math.max(0, Number(invoice.total_amount || 0) - paid)
        ),
        dueDate: String(invoice.due_date || invoice.invoice_date || "").slice(
          0,
          10
        )
      };
    });
    const overdueInvoices = invoiceStates.filter(
      (state) => state.dueDate < today && state.balance > 0.01
    );
    const overdueAmount = roundMoney(
      overdueInvoices.reduce((sum, state) => sum + state.balance, 0)
    );
    const daysOverdue = maxDaysOverdue(
      overdueInvoices.map((state) => state.dueDate),
      context.now
    );
    const latestPayment = [...customerPayments].sort((left, right) => {
      const byDate = String(right.payment_date || "").localeCompare(
        String(left.payment_date || "")
      );
      if (byDate !== 0) return byDate;
      const byCreatedAt = String(right.created_at || "").localeCompare(
        String(left.created_at || "")
      );
      return byCreatedAt !== 0 ? byCreatedAt : String(right.id || "").localeCompare(String(left.id || ""));
    })[0];
    if (balanceRows.length === 1) {
      const balance = balanceRows[0];
      if (moneyDiffers(balance.current_balance, currentBalance) || moneyDiffers(balance.overdue_amount, overdueAmount) || Number(balance.days_overdue || 0) !== daysOverdue || moneyDiffers(balance.last_payment_amount, latestPayment?.amount || 0) || (balance.last_payment_date || null) !== (latestPayment?.payment_date || null)) {
        findings.push(
          repairFinding({
            dedupeKey: `customer-balance:${balance.id}:summary`,
            code: "customer.balance_summary_mismatch",
            severity: "high",
            entityType: "customer_balance",
            entityId: balance.id,
            title: "Customer balance summary is stale",
            details: "The summary does not match active invoices and completed receipts.",
            evidence: {
              activeInvoiceTotal,
              completedReceipts,
              currentBalance,
              overdueAmount,
              daysOverdue
            },
            command: "customer.sync_balance",
            expectedBefore: {
              current_balance: balance.current_balance,
              overdue_amount: balance.overdue_amount,
              days_overdue: balance.days_overdue,
              last_payment_amount: balance.last_payment_amount,
              last_payment_date: balance.last_payment_date
            },
            values: {
              current_balance: currentBalance,
              overdue_amount: overdueAmount,
              days_overdue: daysOverdue,
              last_payment_amount: latestPayment?.amount ?? null,
              last_payment_date: latestPayment?.payment_date ?? null
            }
          })
        );
      }
    } else if (balanceRows.length === 0) {
      findings.push(
        repairFinding({
          dedupeKey: `customer:${customer.id}:missing-balance-row`,
          code: "customer.balance_summary_missing",
          severity: "high",
          entityType: "customer",
          entityId: customer.id,
          title: "Customer balance summary is missing",
          details: "A canonical balance summary can be created from invoices and completed receipts.",
          evidence: {
            activeInvoiceTotal,
            completedReceipts,
            currentBalance,
            overdueAmount,
            daysOverdue
          },
          command: "customer.create_balance",
          expectedBefore: { exists: false },
          values: {}
        })
      );
    } else {
      findings.push(
        reviewFinding(
          `customer:${customer.id}:duplicate-balance-rows`,
          "customer.balance_summary_duplicate",
          "high",
          "customer",
          customer.id,
          "Customer has duplicate balance summaries",
          "Duplicate balance rows must be consolidated through the customer-account workflow.",
          {
            balanceRowCount: balanceRows.length,
            calculatedBalance: currentBalance
          }
        )
      );
    }
    if (customer.national_id && (duplicateNationalIds.get(customer.national_id) || []).length > 1) {
      findings.push(
        reviewFinding(
          `customer:${customer.id}:duplicate-national-id`,
          "customer.duplicate_national_id",
          "critical",
          "customer",
          customer.id,
          "Customer national ID is duplicated",
          "Customer records require identity verification before any merge.",
          {
            duplicateCount: (duplicateNationalIds.get(customer.national_id) || []).length
          }
        )
      );
    }
    const hasActiveContract = (contractsByCustomer.get(customer.id) || []).some(
      (contract) => isActiveContractStatus(contract.status)
    );
    if (customer.is_active === false && hasActiveContract) {
      findings.push(
        reviewFinding(
          `customer:${customer.id}:inactive-active-contract`,
          "customer.inactive_with_active_contract",
          "high",
          "customer",
          customer.id,
          "Inactive customer has an active contract",
          "The customer or contract lifecycle must be confirmed by an employee.",
          { hasActiveContract: true }
        )
      );
    }
  }
  return pageResult(page, findings);
}
async function auditInventory(context) {
  const cursor = context.job.cursor || {};
  const phase = String(cursor.phase || "levels");
  if (phase === "purchase_orders") {
    return auditPurchaseOrders(context);
  }
  if (phase === "levels") {
    const page2 = await loadCompanyPage(
      context,
      "inventory_stock_levels",
      "id,company_id,item_id,warehouse_id,quantity_on_hand,quantity_reserved,quantity_available,last_movement_at",
      String(cursor.lastId || "")
    );
    const itemIds2 = [...new Set(page2.rows.map((row) => row.item_id))];
    const summaries2 = await loadByIds(
      context,
      "inventory_movement_summary",
      "company_id,item_id,warehouse_id,movement_type,total_quantity,last_movement_date",
      "item_id",
      itemIds2,
      true,
      { cursorField: null, orderFields: ["item_id", "warehouse_id", "movement_type"] }
    );
    const summariesByPair2 = groupBy(
      summaries2,
      (row) => `${row.item_id}:${row.warehouse_id}`
    );
    const findings2 = [];
    for (const level of page2.rows) {
      const movements = summariesByPair2.get(`${level.item_id}:${level.warehouse_id}`) || [];
      const onHand = deriveStockOnHand(
        movements.map((movement) => ({
          movement_type: movement.movement_type,
          quantity: movement.total_quantity
        }))
      );
      const available = roundMoney(
        onHand - Number(level.quantity_reserved || 0)
      );
      const lastMovementAt = latestTimestamp(
        movements.map((movement) => movement.last_movement_date)
      );
      const invalidDerivedStock = onHand < 0 || available < 0;
      if (!invalidDerivedStock && (moneyDiffers(level.quantity_on_hand, onHand) || moneyDiffers(level.quantity_available, available) || timestampsDiffer(level.last_movement_at, lastMovementAt))) {
        findings2.push(
          repairFinding({
            dedupeKey: `stock-level:${level.id}:totals`,
            code: "inventory.stock_level_mismatch",
            severity: onHand < 0 ? "critical" : "high",
            entityType: "inventory_stock_level",
            entityId: level.id,
            title: "Inventory stock level is stale",
            details: "Stored stock does not match the movement ledger.",
            evidence: {
              calculatedOnHand: onHand,
              reserved: roundMoney(level.quantity_reserved),
              calculatedAvailable: available
            },
            command: "inventory.sync_stock_level",
            expectedBefore: {
              quantity_on_hand: level.quantity_on_hand,
              quantity_available: level.quantity_available,
              last_movement_at: level.last_movement_at
            },
            values: {
              quantity_on_hand: onHand,
              quantity_available: available,
              last_movement_at: lastMovementAt
            }
          })
        );
      }
      if (invalidDerivedStock) {
        findings2.push(
          reviewFinding(
            `stock-level:${level.id}:negative`,
            "inventory.negative_stock",
            "critical",
            "inventory_stock_level",
            level.id,
            "Inventory ledger produces negative available stock",
            "The underlying movement or reservation must be corrected before the stored stock level can be synchronized.",
            {
              calculatedOnHand: onHand,
              reserved: roundMoney(level.quantity_reserved),
              calculatedAvailable: available
            }
          )
        );
      }
    }
    return {
      findings: findings2,
      cursor: page2.hasMore ? { phase: "levels", lastId: page2.nextLastId } : { phase: "missing", lastId: "" },
      hasMore: true,
      scanned: page2.rows.length,
      stats: { stockLevelsScanned: page2.rows.length }
    };
  }
  const page = await loadCompanyPage(
    context,
    "inventory_movements",
    "id,company_id,item_id,warehouse_id,movement_type,quantity,movement_date",
    String(cursor.lastId || "")
  );
  const pairs = /* @__PURE__ */ new Map();
  for (const movement of page.rows) {
    pairs.set(`${movement.item_id}:${movement.warehouse_id}`, {
      itemId: movement.item_id,
      warehouseId: movement.warehouse_id
    });
  }
  const itemIds = [...new Set([...pairs.values()].map((pair) => pair.itemId))];
  const [levels, summaries] = await Promise.all([
    loadByIds(
      context,
      "inventory_stock_levels",
      "id,item_id,warehouse_id",
      "item_id",
      itemIds
    ),
    loadByIds(
      context,
      "inventory_movement_summary",
      "item_id,warehouse_id,movement_type,total_quantity,last_movement_date",
      "item_id",
      itemIds,
      true,
      { cursorField: null, orderFields: ["item_id", "warehouse_id", "movement_type"] }
    )
  ]);
  const existingPairs = new Set(
    levels.map((level) => `${level.item_id}:${level.warehouse_id}`)
  );
  const summariesByPair = groupBy(
    summaries,
    (row) => `${row.item_id}:${row.warehouse_id}`
  );
  const findings = [];
  for (const [pairKey, pair] of pairs.entries()) {
    if (existingPairs.has(pairKey)) continue;
    const pairSummaries = summariesByPair.get(pairKey) || [];
    const onHand = deriveStockOnHand(
      pairSummaries.map((movement) => ({
        movement_type: movement.movement_type,
        quantity: movement.total_quantity
      }))
    );
    const lastMovementAt = latestTimestamp(
      pairSummaries.map((movement) => movement.last_movement_date)
    );
    if (onHand < 0) {
      findings.push(
        reviewFinding(
          `stock-level:${pairKey}:missing-negative`,
          "inventory.missing_stock_level_negative_ledger",
          "critical",
          "inventory_stock_pair",
          pairKey,
          "Missing stock level has a negative movement balance",
          "The movement ledger must be corrected before a non-negative stock-level row can be created.",
          {
            itemId: pair.itemId,
            warehouseId: pair.warehouseId,
            calculatedOnHand: onHand
          }
        )
      );
    } else {
      findings.push(
        repairFinding({
          dedupeKey: `stock-level:${pairKey}:missing`,
          code: "inventory.missing_stock_level",
          severity: "high",
          entityType: "inventory_stock_pair",
          entityId: pairKey,
          title: "Inventory stock level row is missing",
          details: "Movements exist for an item and warehouse without a derived stock-level row.",
          evidence: {
            itemId: pair.itemId,
            warehouseId: pair.warehouseId,
            calculatedOnHand: onHand
          },
          command: "inventory.create_stock_level",
          expectedBefore: { exists: false },
          values: {
            item_id: pair.itemId,
            warehouse_id: pair.warehouseId,
            quantity_on_hand: onHand,
            quantity_reserved: 0,
            quantity_available: onHand,
            last_movement_at: lastMovementAt
          }
        })
      );
    }
  }
  if (page.hasMore) {
    return pageResult(
      page,
      findings,
      { phase: "missing", lastId: page.nextLastId },
      { movementsScanned: page.rows.length }
    );
  }
  return {
    findings,
    cursor: { phase: "purchase_orders", lastId: "" },
    hasMore: true,
    scanned: page.rows.length,
    stats: { movementsScanned: page.rows.length }
  };
}
async function auditPurchaseOrders(context) {
  const page = await loadCompanyPage(
    context,
    "purchase_orders",
    "id,company_id,order_number,status,subtotal,tax_amount,total_amount,delivery_date",
    String(context.job.cursor?.lastId || "")
  );
  const orderIds = page.rows.map((row) => row.id);
  const [items, receipts] = await Promise.all([
    loadByIds(
      context,
      "purchase_order_items",
      "id,purchase_order_id,inventory_item_id,item_code,quantity,unit_price,total_price,received_quantity",
      "purchase_order_id",
      orderIds,
      false
    ),
    loadByIds(
      context,
      "goods_receipts",
      "id,company_id,purchase_order_id,warehouse_id,journal_entry_id,status,receipt_date,receipt_number",
      "purchase_order_id",
      orderIds
    )
  ]);
  const receiptIds = receipts.map((receipt) => receipt.id);
  const [receiptItems, movements, journals] = await Promise.all([
    loadByIds(
      context,
      "goods_receipt_items",
      "id,goods_receipt_id,purchase_order_item_id,received_quantity",
      "goods_receipt_id",
      receiptIds,
      false
    ),
    loadByIds(
      context,
      "inventory_movements",
      "id,company_id,item_id,warehouse_id,movement_type,quantity,reference_type,reference_id,total_cost",
      "reference_id",
      receiptIds
    ),
    loadByIds(
      context,
      "journal_entries",
      "id,company_id,status,reference_type,reference_id,total_debit,total_credit,reversal_entry_id",
      "reference_id",
      receiptIds
    )
  ]);
  const itemsByOrder = groupBy(
    items,
    (item) => String(item.purchase_order_id || "")
  );
  const receiptsByOrder = groupBy(
    receipts,
    (receipt) => String(receipt.purchase_order_id || "")
  );
  const receiptItemsByReceipt = groupBy(
    receiptItems,
    (item) => String(item.goods_receipt_id || "")
  );
  const movementsByReceipt = groupBy(
    movements.filter(
      (movement) => normalizeStatus(movement.reference_type) === "goods_receipt"
    ),
    (movement) => String(movement.reference_id || "")
  );
  const journalsByReceipt = groupBy(
    journals.filter(
      (journal) => normalizeStatus(journal.reference_type) === "goods_receipt"
    ),
    (journal) => String(journal.reference_id || "")
  );
  const findings = [];
  for (const order of page.rows) {
    const orderItems = itemsByOrder.get(String(order.id)) || [];
    const subtotal = roundMoney(
      orderItems.reduce((sum, item) => sum + Number(item.total_price || 0), 0)
    );
    const total = roundMoney(subtotal + Number(order.tax_amount || 0));
    if (moneyDiffers(order.subtotal, subtotal) || moneyDiffers(order.total_amount, total)) {
      findings.push(
        repairFinding({
          dedupeKey: `purchase-order:${order.id}:totals`,
          code: "inventory.purchase_order_totals_mismatch",
          severity: "high",
          entityType: "purchase_order",
          entityId: String(order.id),
          title: "Purchase order totals do not match its items",
          details: "The stored subtotal or total differs from the purchase-order item ledger.",
          evidence: { calculatedSubtotal: subtotal, calculatedTotal: total },
          command: "purchase_order.sync_totals",
          expectedBefore: {
            subtotal: order.subtotal,
            total_amount: order.total_amount
          },
          values: {}
        })
      );
    }
    const anyReceived = orderItems.some(
      (item) => Number(item.received_quantity || 0) > 0
    );
    const allReceived = orderItems.length > 0 && orderItems.every(
      (item) => Number(item.received_quantity || 0) >= Number(item.quantity || 0)
    );
    const expectedStatus = allReceived ? "received" : anyReceived ? "partially_received" : null;
    if (expectedStatus && normalizeStatus(order.status) !== expectedStatus) {
      findings.push(
        repairFinding({
          dedupeKey: `purchase-order:${order.id}:receipt-status`,
          code: "inventory.purchase_order_receipt_status_mismatch",
          severity: "high",
          entityType: "purchase_order",
          entityId: String(order.id),
          title: "Purchase order receipt status is stale",
          details: "The order status does not match its stored received quantities.",
          evidence: { expectedStatus, anyReceived, allReceived },
          command: "purchase_order.sync_receipt_status",
          expectedBefore: { status: order.status },
          values: {}
        })
      );
    } else if (!anyReceived && ["received", "partially_received"].includes(normalizeStatus(order.status))) {
      findings.push(
        reviewFinding(
          `purchase-order:${order.id}:unsupported-receipt-status`,
          "inventory.purchase_order_status_without_received_quantities",
          "critical",
          "purchase_order",
          String(order.id),
          "Purchase order is marked received without received quantities",
          "The prior lifecycle state cannot be inferred safely and requires review.",
          { status: order.status, itemCount: orderItems.length }
        )
      );
    }
    const completedReceipts = (receiptsByOrder.get(String(order.id)) || []).filter((receipt) => normalizeStatus(receipt.status) === "completed");
    const completedReceiptQuantityByItem = /* @__PURE__ */ new Map();
    for (const receipt of completedReceipts) {
      for (const receiptItem of receiptItemsByReceipt.get(String(receipt.id)) || []) {
        const itemId = String(receiptItem.purchase_order_item_id || "");
        completedReceiptQuantityByItem.set(
          itemId,
          roundMoney(
            (completedReceiptQuantityByItem.get(itemId) || 0) + Number(receiptItem.received_quantity || 0)
          )
        );
      }
    }
    for (const item of orderItems) {
      const receiptQuantity = completedReceiptQuantityByItem.get(String(item.id)) || 0;
      if (moneyDiffers(item.received_quantity, receiptQuantity)) {
        findings.push(
          reviewFinding(
            `purchase-order-item:${item.id}:receipt-ledger`,
            "inventory.purchase_order_received_quantity_conflict",
            "critical",
            "purchase_order_item",
            String(item.id),
            "Purchase order item conflicts with completed goods receipts",
            "The item quantity and receipt ledger disagree; the source document must be reviewed.",
            {
              storedReceivedQuantity: roundMoney(item.received_quantity),
              completedReceiptQuantity: receiptQuantity
            }
          )
        );
      }
    }
    for (const receipt of completedReceipts) {
      const receiptLines = receiptItemsByReceipt.get(String(receipt.id)) || [];
      const receiptMovements = movementsByReceipt.get(String(receipt.id)) || [];
      const receiptJournals = journalsByReceipt.get(String(receipt.id)) || [];
      const activePostedJournals = receiptJournals.filter(
        (journal) => normalizeStatus(journal.status) === "posted" && !journal.reversal_entry_id
      );
      const linkedJournal = activePostedJournals.find(
        (journal) => journal.id === receipt.journal_entry_id
      );
      if (!receipt.warehouse_id) {
        findings.push(
          reviewFinding(
            `goods-receipt:${receipt.id}:warehouse`,
            "inventory.goods_receipt_missing_warehouse",
            "critical",
            "goods_receipt",
            String(receipt.id),
            "Completed goods receipt has no warehouse",
            "A warehouse must be selected before inventory movements can be reconstructed.",
            { receiptNumber: receipt.receipt_number }
          )
        );
      }
      if (activePostedJournals.length !== 1 || !linkedJournal || moneyDiffers(linkedJournal?.total_debit, linkedJournal?.total_credit) || Number(linkedJournal?.total_debit || 0) <= 0) {
        findings.push(
          reviewFinding(
            `goods-receipt:${receipt.id}:journal`,
            "inventory.goods_receipt_invalid_accounting",
            "critical",
            "goods_receipt",
            String(receipt.id),
            "Goods receipt accounting is missing or invalid",
            "The receipt must have exactly one linked, posted, balanced journal entry.",
            {
              journalEntryId: receipt.journal_entry_id,
              activePostedJournalIds: activePostedJournals.map(
                (journal) => journal.id
              )
            }
          )
        );
      }
      for (const receiptLine of receiptLines) {
        const orderItem = orderItems.find(
          (item) => item.id === receiptLine.purchase_order_item_id
        );
        const matchingQuantity = roundMoney(
          receiptMovements.filter(
            (movement) => normalizeStatus(movement.movement_type) === "purchase" && movement.item_id === orderItem?.inventory_item_id && movement.warehouse_id === receipt.warehouse_id
          ).reduce((sum, movement) => sum + Number(movement.quantity || 0), 0)
        );
        if (!orderItem?.inventory_item_id || !receipt.warehouse_id || moneyDiffers(receiptLine.received_quantity, matchingQuantity)) {
          findings.push(
            reviewFinding(
              `goods-receipt-item:${receiptLine.id}:movement`,
              "inventory.goods_receipt_movement_mismatch",
              "critical",
              "goods_receipt_item",
              String(receiptLine.id),
              "Goods receipt line does not match inventory movements",
              "The receipt line, inventory item, warehouse and movement ledger must agree.",
              {
                inventoryItemId: orderItem?.inventory_item_id || null,
                warehouseId: receipt.warehouse_id,
                receivedQuantity: roundMoney(receiptLine.received_quantity),
                movementQuantity: matchingQuantity
              }
            )
          );
        }
      }
    }
  }
  return pageResult(
    page,
    findings,
    { phase: "purchase_orders", lastId: page.nextLastId },
    { purchaseOrdersScanned: page.rows.length }
  );
}
async function auditLegal(context) {
  const page = await loadCompanyPage(
    context,
    "legal_cases",
    "id,company_id,case_number,case_status,client_id,contract_id,total_costs,legal_fees,court_fees,other_expenses,outcome_date,outcome_type"
  );
  const caseIds = page.rows.map((row) => row.id);
  const contractIds = page.rows.map((row) => row.contract_id).filter(Boolean);
  const [contracts, payments, repaymentPlans] = await Promise.all([
    loadByIds(
      context,
      "contracts",
      "id,company_id,customer_id,status",
      "id",
      contractIds
    ),
    loadByIds(
      context,
      "legal_case_payments",
      "id,case_id,amount,payment_status,invoice_id,journal_entry_id,payment_date",
      "case_id",
      caseIds
    ),
    loadByIds(
      context,
      "legal_repayment_plans",
      "id,case_id,company_id,amount,due_date,status",
      "case_id",
      caseIds
    )
  ]);
  const contractById = new Map(
    contracts.map((contract) => [contract.id, contract])
  );
  const paymentsByCase = groupBy(payments, (payment) => payment.case_id);
  const repaymentPlansByCase = groupBy(
    repaymentPlans,
    (plan) => plan.case_id
  );
  const findings = [];
  for (const legalCase of page.rows) {
    const totalCosts = deriveLegalCaseCosts(legalCase);
    if (moneyDiffers(legalCase.total_costs, totalCosts)) {
      findings.push(
        repairFinding({
          dedupeKey: `legal-case:${legalCase.id}:costs`,
          code: "legal.case_costs_mismatch",
          severity: "high",
          entityType: "legal_case",
          entityId: legalCase.id,
          title: "Legal case total costs are stale",
          details: "Total costs do not equal legal fees, court fees, and other expenses.",
          evidence: {
            legalFees: legalCase.legal_fees,
            courtFees: legalCase.court_fees,
            otherExpenses: legalCase.other_expenses,
            calculatedTotal: totalCosts
          },
          command: "legal.sync_case_costs",
          expectedBefore: { total_costs: legalCase.total_costs },
          values: { total_costs: totalCosts }
        })
      );
    }
    if (legalCase.contract_id && !contractById.has(legalCase.contract_id)) {
      findings.push(
        reviewFinding(
          `legal-case:${legalCase.id}:broken-contract-link`,
          "legal.broken_contract_link",
          "critical",
          "legal_case",
          legalCase.id,
          "Legal case points to a missing contract",
          "Legal evidence links must be verified before relinking.",
          { contractId: legalCase.contract_id }
        )
      );
    }
    const contract = legalCase.contract_id ? contractById.get(legalCase.contract_id) : null;
    if (contract && (legalCase.company_id !== contract.company_id || legalCase.client_id && contract.customer_id && legalCase.client_id !== contract.customer_id)) {
      findings.push(
        reviewFinding(
          `legal-case:${legalCase.id}:contract-party-mismatch`,
          "legal.case_contract_party_mismatch",
          "critical",
          "legal_case",
          legalCase.id,
          "Legal case party does not match its contract",
          "The case company and client must match the linked contract before filing or collection continues.",
          {
            contractId: contract.id,
            caseCompanyId: legalCase.company_id,
            contractCompanyId: contract.company_id,
            caseClientId: legalCase.client_id,
            contractCustomerId: contract.customer_id
          }
        )
      );
    }
    if (contract && ["open", "active", "pending", "on_hold", "under_review"].includes(
      normalizeStatus(legalCase.case_status)
    ) && normalizeStatus(contract.status) !== "under_legal_procedure") {
      findings.push(
        repairFinding({
          dedupeKey: `legal-contract:${contract.id}:state`,
          code: "legal.contract_state_mismatch",
          severity: "critical",
          entityType: "contract",
          entityId: contract.id,
          title: "Open legal case is not reflected on its contract",
          details: "The contract status must reflect its non-terminal legal case.",
          evidence: {
            caseId: legalCase.id,
            caseNumber: legalCase.case_number,
            caseStatus: legalCase.case_status,
            contractStatus: contract.status
          },
          command: "legal.sync_contract_state",
          expectedBefore: { status: contract.status },
          values: { status: "under_legal_procedure" }
        })
      );
    }
    if (["closed", "resolved", "won", "lost", "settled"].includes(
      normalizeStatus(legalCase.case_status)
    ) && !legalCase.outcome_date) {
      findings.push(
        reviewFinding(
          `legal-case:${legalCase.id}:missing-outcome`,
          "legal.closed_case_missing_outcome",
          "high",
          "legal_case",
          legalCase.id,
          "Closed legal case has no outcome record",
          "The outcome date and type require legal staff confirmation.",
          {
            caseStatus: legalCase.case_status,
            outcomeType: legalCase.outcome_type
          }
        )
      );
    }
    for (const payment of paymentsByCase.get(legalCase.id) || []) {
      if (!isCompletedPayment(payment.payment_status)) continue;
      if (!payment.invoice_id || !payment.journal_entry_id) {
        findings.push(
          reviewFinding(
            `legal-payment:${payment.id}:financial-links`,
            "legal.completed_payment_missing_financial_link",
            "critical",
            "legal_case_payment",
            payment.id,
            "Completed legal payment is missing accounting links",
            "Invoice and journal links require the legal payment accounting workflow.",
            {
              invoiceId: payment.invoice_id,
              journalEntryId: payment.journal_entry_id,
              amount: roundMoney(payment.amount)
            }
          )
        );
      }
    }
    const completedPaymentCounts = /* @__PURE__ */ new Map();
    for (const payment of paymentsByCase.get(legalCase.id) || []) {
      if (!isCompletedPayment(payment.payment_status)) continue;
      const amountKey = roundMoney(payment.amount).toFixed(2);
      completedPaymentCounts.set(
        amountKey,
        (completedPaymentCounts.get(amountKey) || 0) + 1
      );
    }
    const paidPlans = (repaymentPlansByCase.get(legalCase.id) || []).filter((plan) => normalizeStatus(plan.status) === "paid").sort(
      (left, right) => String(left.due_date || "").localeCompare(String(right.due_date || "")) || String(left.id).localeCompare(String(right.id))
    );
    for (const plan of paidPlans) {
      const amountKey = roundMoney(plan.amount).toFixed(2);
      const availableEvidence = completedPaymentCounts.get(amountKey) || 0;
      if (availableEvidence > 0) {
        completedPaymentCounts.set(amountKey, availableEvidence - 1);
        continue;
      }
      findings.push(
        repairFinding({
          dedupeKey: `legal-repayment:${plan.id}:unsupported-paid`,
          code: "legal.repayment_paid_without_payment",
          severity: "critical",
          entityType: "legal_repayment_plan",
          entityId: plan.id,
          title: "Repayment installment is paid without payment evidence",
          details: "No completed legal payment with the same case and amount supports this paid status.",
          evidence: {
            caseId: legalCase.id,
            amount: roundMoney(plan.amount),
            dueDate: plan.due_date
          },
          command: "legal.reset_unsupported_repayment",
          expectedBefore: { status: plan.status },
          values: {
            status: String(plan.due_date || "") < context.now.toISOString().slice(0, 10) ? "overdue" : "pending"
          }
        })
      );
    }
  }
  return pageResult(page, findings);
}
async function auditEmployees(context) {
  const page = await loadCompanyPage(
    context,
    "employees",
    "id,company_id,employee_number,is_active,account_status,termination_date,basic_salary,allowances"
  );
  const employeeIds = page.rows.map((row) => row.id);
  if (employeeIds.length === 0) return pageResult(page, []);
  const [attendance, leaveBalances, leaveRequests, payrollRows] = await Promise.all([
    loadByIds(
      context,
      "attendance_records",
      "id,employee_id,attendance_date,check_in_time,check_out_time,break_start_time,break_end_time,total_hours,is_approved",
      "employee_id",
      employeeIds,
      false
    ),
    loadByIds(
      context,
      "leave_balances",
      "id,employee_id,leave_type_id,year,total_days,used_days,remaining_days",
      "employee_id",
      employeeIds,
      false
    ),
    loadByIds(
      context,
      "leave_requests",
      "id,employee_id,leave_type_id,start_date,end_date,total_days,status",
      "employee_id",
      employeeIds,
      false
    ),
    loadByIds(
      context,
      "payroll",
      "id,employee_id,payroll_number,status,payroll_date,payment_method,basic_salary,allowances,overtime_amount,deductions,tax_amount,net_amount,journal_entry_id",
      "employee_id",
      employeeIds
    )
  ]);
  const payrollIds = payrollRows.map((row) => row.id);
  const payrollJournals = await loadByIds(
    context,
    "journal_entries",
    "id,company_id,status,entry_date,reference_type,reference_id,total_debit,total_credit,reversal_entry_id,created_at",
    "reference_id",
    payrollIds
  );
  const payrollJournalLines = await loadByIds(
    context,
    "journal_entry_lines",
    "id,journal_entry_id,debit_amount,credit_amount,line_number",
    "journal_entry_id",
    payrollJournals.map((row) => row.id),
    false
  );
  const attendanceByEmployee = groupBy(attendance, (row) => row.employee_id);
  const balancesByEmployee = groupBy(leaveBalances, (row) => row.employee_id);
  const requestsByEmployee = groupBy(leaveRequests, (row) => row.employee_id);
  const payrollByEmployee = groupBy(payrollRows, (row) => row.employee_id);
  const journalsByPayroll = groupBy(
    payrollJournals,
    (row) => `${row.reference_type}:${row.reference_id}`
  );
  const linesByJournal = groupBy(
    payrollJournalLines,
    (row) => row.journal_entry_id
  );
  const findings = [];
  const today = context.now.toISOString().slice(0, 10);
  for (const employee of page.rows) {
    if (employee.is_active !== false && employee.termination_date && employee.termination_date <= today) {
      findings.push(
        repairFinding({
          dedupeKey: `employee:${employee.id}:active-status`,
          code: "employee.terminated_still_active",
          severity: "high",
          entityType: "employee",
          entityId: employee.id,
          title: "Terminated employee remains active",
          details: "Termination date has passed, so access-related employee state can be deactivated.",
          evidence: { terminationDate: employee.termination_date },
          command: "employee.sync_active_status",
          expectedBefore: {
            is_active: employee.is_active,
            account_status: employee.account_status
          },
          values: { is_active: false, account_status: "inactive" }
        })
      );
    }
    for (const record of attendanceByEmployee.get(employee.id) || []) {
      if (record.is_approved || !record.check_in_time || !record.check_out_time)
        continue;
      const totalHours = deriveAttendanceHours({
        checkIn: combineDateTime(record.attendance_date, record.check_in_time),
        checkOut: combineDateTime(
          record.attendance_date,
          record.check_out_time
        ),
        breakStart: combineDateTime(
          record.attendance_date,
          record.break_start_time
        ),
        breakEnd: combineDateTime(
          record.attendance_date,
          record.break_end_time
        )
      });
      if (totalHours !== null && Math.abs(Number(record.total_hours || 0) - totalHours) > 0.01) {
        findings.push(
          repairFinding({
            dedupeKey: `attendance:${record.id}:hours`,
            code: "employee.attendance_hours_mismatch",
            severity: "medium",
            entityType: "attendance_record",
            entityId: record.id,
            title: "Attendance total hours are stale",
            details: "Unapproved attendance hours can be recalculated from check-in, check-out, and break times.",
            evidence: {
              attendanceDate: record.attendance_date,
              calculatedHours: totalHours
            },
            command: "employee.sync_attendance_hours",
            expectedBefore: { total_hours: record.total_hours },
            values: { total_hours: totalHours }
          })
        );
      }
    }
    const employeeRequests = requestsByEmployee.get(employee.id) || [];
    for (const balance of balancesByEmployee.get(employee.id) || []) {
      const usedDays = roundMoney(
        employeeRequests.filter(
          (request) => normalizeStatus(request.status) === "approved" && request.leave_type_id === balance.leave_type_id && Number(String(request.start_date || "").slice(0, 4)) === Number(balance.year)
        ).reduce((sum, request) => sum + Number(request.total_days || 0), 0)
      );
      const remainingDays = roundMoney(
        Math.max(0, Number(balance.total_days || 0) - usedDays)
      );
      if (moneyDiffers(balance.used_days, usedDays) || moneyDiffers(balance.remaining_days, remainingDays)) {
        findings.push(
          repairFinding({
            dedupeKey: `leave-balance:${balance.id}:totals`,
            code: "employee.leave_balance_mismatch",
            severity: "high",
            entityType: "leave_balance",
            entityId: balance.id,
            title: "Employee leave balance is stale",
            details: "Used and remaining days do not match approved leave requests.",
            evidence: {
              year: balance.year,
              totalDays: balance.total_days,
              calculatedUsed: usedDays,
              calculatedRemaining: remainingDays
            },
            command: "employee.sync_leave_balance",
            expectedBefore: {
              used_days: balance.used_days,
              remaining_days: balance.remaining_days
            },
            values: { used_days: usedDays, remaining_days: remainingDays }
          })
        );
      }
      if (usedDays > Number(balance.total_days || 0)) {
        findings.push(
          reviewFinding(
            `leave-balance:${balance.id}:overused`,
            "employee.leave_balance_overused",
            "high",
            "leave_balance",
            balance.id,
            "Approved leave exceeds the annual balance",
            "The derived balance can be synchronized, but the excess leave requires HR review.",
            { totalDays: balance.total_days, usedDays }
          )
        );
      }
    }
    for (const payroll of payrollByEmployee.get(employee.id) || []) {
      const payrollStatus = normalizeStatus(payroll.status);
      const isFinalized = ["paid", "posted", "approved", "completed"].includes(
        payrollStatus
      );
      const netAmount = derivePayrollNet(payroll);
      if (moneyDiffers(payroll.net_amount, netAmount)) {
        if (netAmount < 0 || payroll.journal_entry_id || isFinalized) {
          findings.push(
            reviewFinding(
              `payroll:${payroll.id}:net-review`,
              netAmount < 0 ? "employee.payroll_negative_net" : "employee.payroll_journal_linked_mismatch",
              "critical",
              "payroll",
              payroll.id,
              netAmount < 0 ? "Payroll components produce a negative net amount" : "Journal-linked payroll net amount is inconsistent",
              netAmount < 0 ? "Deductions and tax require HR review before the payroll can be recalculated." : "The linked journal must be reviewed before changing the payroll amount.",
              {
                calculatedNet: netAmount,
                journalEntryId: payroll.journal_entry_id
              }
            )
          );
        } else {
          findings.push(
            repairFinding({
              dedupeKey: `payroll:${payroll.id}:net`,
              code: "employee.payroll_net_mismatch",
              severity: "high",
              entityType: "payroll",
              entityId: payroll.id,
              title: "Unposted payroll net amount is stale",
              details: "Net amount does not match salary, allowances, overtime, deductions, and tax.",
              evidence: { calculatedNet: netAmount },
              command: "employee.sync_payroll_net",
              expectedBefore: { net_amount: payroll.net_amount },
              values: { net_amount: netAmount }
            })
          );
        }
      }
      if (!isFinalized) continue;
      const grossAmount = roundMoney(
        Number(payroll.basic_salary || 0) + Number(payroll.allowances || 0) + Number(payroll.overtime_amount || 0)
      );
      const activeAccruals = (journalsByPayroll.get(`payroll:${payroll.id}`) || []).filter(isActiveJournal);
      const activePayments = (journalsByPayroll.get(`payroll_payment:${payroll.id}`) || []).filter(isActiveJournal);
      const linkedAccrual = activeAccruals.find(
        (journal) => journal.id === payroll.journal_entry_id
      );
      const validLinkedAccrual = Boolean(
        linkedAccrual && isPostedJournalForAmount(
          linkedAccrual,
          linesByJournal.get(linkedAccrual.id) || [],
          grossAmount
        )
      );
      if (activeAccruals.length > 1) {
        findings.push(
          reviewFinding(
            `payroll:${payroll.id}:duplicate-accruals`,
            "employee.payroll_duplicate_accrual_journals",
            "critical",
            "payroll",
            payroll.id,
            "Payroll has duplicate active accrual journals",
            "The duplicate entries must be compared and reversed through the accounting workflow; the agent will not choose one by assumption.",
            {
              status: payroll.status,
              journalIds: activeAccruals.map((journal) => journal.id)
            }
          )
        );
      } else if (!payroll.journal_entry_id || !linkedAccrual) {
        const candidate = activeAccruals[0];
        const candidateIsValid = Boolean(
          candidate && isPostedJournalForAmount(
            candidate,
            linesByJournal.get(candidate.id) || [],
            grossAmount
          )
        );
        if (payrollStatus === "approved" && (!candidate || candidateIsValid)) {
          findings.push(
            repairFinding({
              dedupeKey: `payroll:${payroll.id}:ensure-accrual`,
              code: "employee.approved_payroll_missing_accrual",
              severity: "critical",
              entityType: "payroll",
              entityId: payroll.id,
              title: "Approved payroll is missing its posted accrual",
              details: "The canonical payroll gateway can create the missing accrual or relink the only verified posted candidate.",
              evidence: {
                status: payroll.status,
                payrollDate: payroll.payroll_date,
                grossAmount,
                journalEntryId: payroll.journal_entry_id,
                candidateJournalId: candidate?.id || null
              },
              command: "payroll.ensure_accrual",
              expectedBefore: {
                status: payroll.status,
                journal_entry_id: payroll.journal_entry_id
              },
              values: {}
            })
          );
        } else {
          findings.push(
            reviewFinding(
              `payroll:${payroll.id}:invalid-accrual-link`,
              "employee.finalized_payroll_invalid_accrual_link",
              "critical",
              "payroll",
              payroll.id,
              "Finalized payroll has no valid linked accrual",
              "The payroll status or existing journal conflicts with the canonical accrual and requires accounting review.",
              {
                status: payroll.status,
                journalEntryId: payroll.journal_entry_id,
                candidateJournalId: candidate?.id || null
              }
            )
          );
        }
      } else if (!validLinkedAccrual) {
        findings.push(
          reviewFinding(
            `payroll:${payroll.id}:invalid-accrual`,
            "employee.payroll_accrual_not_posted_or_unbalanced",
            "critical",
            "payroll",
            payroll.id,
            "Payroll accrual is not a valid posted balanced journal",
            "The linked accrual status, totals, or journal lines do not match the payroll gross amount.",
            {
              status: payroll.status,
              grossAmount,
              journalEntryId: payroll.journal_entry_id,
              journalStatus: linkedAccrual.status,
              journalDebit: linkedAccrual.total_debit,
              journalCredit: linkedAccrual.total_credit
            }
          )
        );
      }
      if (activePayments.length > 1) {
        findings.push(
          reviewFinding(
            `payroll:${payroll.id}:duplicate-payments`,
            "employee.payroll_duplicate_payment_journals",
            "critical",
            "payroll",
            payroll.id,
            "Payroll has duplicate active payment journals",
            "Duplicate salary payments must be verified and reversed through the accounting workflow.",
            { journalIds: activePayments.map((journal) => journal.id) }
          )
        );
      } else if (payrollStatus === "paid" && netAmount > 0) {
        const paymentJournal = activePayments[0];
        if (!paymentJournal && validLinkedAccrual && linkedAccrual) {
          findings.push(
            repairFinding({
              dedupeKey: `payroll:${payroll.id}:ensure-payment`,
              code: "employee.paid_payroll_missing_payment_journal",
              severity: "critical",
              entityType: "payroll",
              entityId: payroll.id,
              title: "Paid payroll is missing its payment journal",
              details: "The canonical payroll gateway can post the missing payment using the recorded method and mapped cash or bank account.",
              evidence: {
                payrollDate: payroll.payroll_date,
                paymentMethod: payroll.payment_method,
                netAmount,
                accrualJournalId: linkedAccrual.id
              },
              command: "payroll.ensure_payment",
              expectedBefore: {
                status: payroll.status,
                journal_entry_id: payroll.journal_entry_id
              },
              values: {}
            })
          );
        } else if (paymentJournal && !isPostedJournalForAmount(
          paymentJournal,
          linesByJournal.get(paymentJournal.id) || [],
          netAmount
        )) {
          findings.push(
            reviewFinding(
              `payroll:${payroll.id}:invalid-payment`,
              "employee.payroll_payment_not_posted_or_unbalanced",
              "critical",
              "payroll",
              payroll.id,
              "Payroll payment journal is not valid",
              "The active payment journal is not posted and balanced for the payroll net amount.",
              {
                netAmount,
                journalId: paymentJournal.id,
                journalStatus: paymentJournal.status,
                journalDebit: paymentJournal.total_debit,
                journalCredit: paymentJournal.total_credit
              }
            )
          );
        }
      } else if (payrollStatus !== "paid" && activePayments.length > 0) {
        findings.push(
          reviewFinding(
            `payroll:${payroll.id}:payment-before-paid`,
            "employee.payroll_payment_journal_before_paid_status",
            "critical",
            "payroll",
            payroll.id,
            "Payroll has a payment journal before paid status",
            "The payment and payroll status chronology must be verified before changing either record.",
            { status: payroll.status, journalId: activePayments[0].id }
          )
        );
      }
    }
  }
  return pageResult(page, findings);
}
async function loadCompanyPage(context, table, columns, lastId = String(context.job.cursor?.lastId || ""), pageSize = context.job.batch_size) {
  let query = context.supabase.from(table).select(columns).eq("company_id", context.job.company_id).order("id", { ascending: true }).limit(pageSize + 1);
  if (lastId) query = query.gt("id", lastId);
  const { data, error } = await query;
  if (error) throw new Error(`${table}: ${error.message}`);
  const received = data || [];
  const rows = received.slice(0, pageSize);
  return {
    rows,
    hasMore: received.length > pageSize,
    nextLastId: rows.at(-1)?.id || lastId
  };
}
async function loadByIds(context, table, columns, field, ids, filterCompany = true, pagination = { cursorField: "id", orderFields: ["id"] }) {
  if (ids.length === 0) return [];
  const uniqueIds = [
    ...new Set(
      ids.filter(
        (value) => value !== null && value !== void 0 && value !== ""
      )
    )
  ];
  const rows = [];
  for (let index = 0; index < uniqueIds.length; index += 20) {
    const idChunk = uniqueIds.slice(index, index + 20);
    if (pagination.cursorField === null) {
      let offset = 0;
      while (true) {
        let query = context.supabase.from(table).select(columns).in(field, idChunk);
        if (filterCompany) query = query.eq("company_id", context.job.company_id);
        for (const orderField of pagination.orderFields) {
          query = query.order(orderField, { ascending: true, nullsFirst: false });
        }
        query = query.range(offset, offset + 499);
        const { data, error } = await query;
        if (error) throw new Error(`${table}: ${error.message}`);
        const page = data || [];
        rows.push(...page);
        if (page.length < 500) break;
        offset += page.length;
      }
      continue;
    }
    let lastId = "";
    while (true) {
      let query = context.supabase.from(table).select(columns).in(field, idChunk).order(pagination.cursorField, { ascending: true }).limit(500);
      if (filterCompany) query = query.eq("company_id", context.job.company_id);
      if (lastId) query = query.gt(pagination.cursorField, lastId);
      const { data, error } = await query;
      if (error) throw new Error(`${table}: ${error.message}`);
      const page = data || [];
      rows.push(...page);
      if (page.length < 500) break;
      const nextLastId = String(page.at(-1)?.[pagination.cursorField] || "");
      if (!nextLastId || nextLastId <= lastId) {
        throw new Error(`${table}: keyset pagination did not advance`);
      }
      lastId = nextLastId;
    }
  }
  return rows;
}
function pageResult(page, findings, cursor = { lastId: page.nextLastId }, stats = {}) {
  return {
    findings,
    cursor,
    hasMore: page.hasMore,
    scanned: page.rows.length,
    stats
  };
}
function repairFinding(input) {
  return {
    dedupeKey: input.dedupeKey,
    code: input.code,
    severity: input.severity,
    entityType: input.entityType,
    entityId: input.entityId,
    title: input.title,
    details: input.details,
    evidence: input.evidence,
    confidence: input.confidence ?? 1,
    repair: {
      command: input.command,
      entityType: input.entityType,
      entityId: input.entityId,
      expectedBefore: input.expectedBefore,
      values: input.values,
      autoApply: true
    }
  };
}
function reviewFinding(dedupeKey, code, severity, entityType, entityId, title, details, evidence) {
  return {
    dedupeKey,
    code,
    severity,
    entityType,
    entityId,
    title,
    details,
    evidence,
    confidence: 1,
    needsAiTriage: true
  };
}
function groupBy(rows, keySelector) {
  const grouped = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const key = keySelector(row);
    if (!key) continue;
    const existing = grouped.get(key);
    if (existing) existing.push(row);
    else grouped.set(key, [row]);
  }
  return grouped;
}
function isActiveInvoice(invoice) {
  return !isInactiveInvoiceStatus(invoice.status) && !isInactiveInvoiceStatus(invoice.payment_status);
}
function isActiveJournal(journal) {
  return normalizeStatus(journal.status) !== "reversed" && !journal.reversal_entry_id;
}
function isPostedJournalForAmount(journal, lines, expectedAmount) {
  const lineDebit = roundMoney(
    lines.reduce((sum, line) => sum + Number(line.debit_amount || 0), 0)
  );
  const lineCredit = roundMoney(
    lines.reduce((sum, line) => sum + Number(line.credit_amount || 0), 0)
  );
  return normalizeStatus(journal.status) === "posted" && lines.length >= 2 && !moneyDiffers(journal.total_debit, expectedAmount) && !moneyDiffers(journal.total_credit, expectedAmount) && !moneyDiffers(lineDebit, expectedAmount) && !moneyDiffers(lineCredit, expectedAmount);
}
var BANK_LIKE_PAYMENT_METHODS = /* @__PURE__ */ new Set([
  "bank_transfer",
  "check",
  "cheque",
  "credit_card",
  "debit_card",
  "card"
]);
function isBankLikePaymentMethod(value) {
  return BANK_LIKE_PAYMENT_METHODS.has(normalizeStatus(value));
}
function isPendingBankReconciliation(payment) {
  return normalizeStatus(payment.reconciliation_status) !== "reconciled" && !payment.reconciled_at;
}
function monthKey2(value) {
  const text = String(value || "");
  return /^\d{4}-\d{2}/.test(text) ? text.slice(0, 7) : "";
}
function invoiceKeepScore(invoice, paymentsByInvoice) {
  let score = 0;
  if (invoice.journal_entry_id) score += 100;
  if ((paymentsByInvoice.get(invoice.id) || []).some(
    (payment) => !isInactivePaymentStatus(payment.payment_status)
  ))
    score += 80;
  if (Number(invoice.paid_amount || 0) > 0) score += 50;
  if (Number(invoice.total_amount || 0) > 0) score += 10;
  return score;
}
function latestDate(values) {
  const dates = values.map((value) => String(value || "")).filter(Boolean).sort();
  return dates.at(-1) || null;
}
function latestTimestamp(values) {
  const latest = latestDate(values);
  if (!latest) return null;
  const parsed = new Date(latest);
  return Number.isNaN(parsed.getTime()) ? latest : parsed.toISOString();
}
function timestampsDiffer(left, right) {
  if (!left && !right) return false;
  const leftTime = new Date(String(left || "")).getTime();
  const rightTime = new Date(String(right || "")).getTime();
  if (Number.isNaN(leftTime) || Number.isNaN(rightTime))
    return String(left || "") !== String(right || "");
  return leftTime !== rightTime;
}
function combineDateTime(date, time) {
  if (!date || !time) return null;
  const timeText = String(time);
  if (timeText.includes("T")) return timeText;
  return `${String(date).slice(0, 10)}T${timeText}`;
}

// supabase/functions/_shared/longcat.ts
var LONGCAT_CHAT_COMPLETIONS_URL = Deno.env.get("LONGCAT_CHAT_COMPLETIONS_URL") || "https://api.longcat.chat/openai/v1/chat/completions";
var LONGCAT_MODEL = Deno.env.get("LONGCAT_MODEL") || "LongCat-2.0";
function getLongCatApiKey() {
  return Deno.env.get("LONGCAT_API_KEY") || "";
}
function buildLongCatHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };
}

// supabase/functions/_shared/agent.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
function createServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}
async function authorizeAgent(req, companyId, requireCompanyScope = false) {
  const authHeader = req.headers.get("Authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`) {
    return { userId: null, serviceRole: true };
  }
  if (authHeader) {
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data, error } = await userClient.auth.getUser();
    if (!error && data?.user) {
      if (!companyId) {
        if (requireCompanyScope) throw new Error("Unauthorized");
        return { userId: data.user.id, serviceRole: false };
      }
      const admin = createServiceClient();
      const [{ data: profile }, { data: roles }] = await Promise.all([
        admin.from("profiles").select("company_id,is_active").eq("user_id", data.user.id).maybeSingle(),
        admin.from("user_roles").select("role,company_id").eq("user_id", data.user.id)
      ]);
      const isSuperAdmin = (roles || []).some(
        (role) => role.role === "super_admin"
      );
      const isActiveCompanyMember = profile?.is_active === true && profile.company_id === companyId;
      if (isSuperAdmin || isActiveCompanyMember) {
        return { userId: data.user.id, serviceRole: false };
      }
    }
  }
  throw new Error("Unauthorized");
}
async function authorizeGovernedAgent(req, agentId, companyId) {
  const caller = await authorizeAgent(req, companyId, true);
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  const admin = createServiceClient();
  const { data, error } = await admin.rpc("begin_trusted_agent_invocation_v1", {
    p_agent_id: agentId,
    p_company_id: companyId,
    p_request_id: requestId,
    p_actor_id: caller.userId
  });
  if (error) {
    console.error("Trusted agent policy verification failed", {
      agentId,
      code: error.code || null
    });
    throw new Error("Agent policy verification unavailable");
  }
  if (data !== true) throw new Error("Agent disabled or busy");
  return {
    agentId,
    companyId,
    requestId,
    machine: false,
    governed: true
  };
}
async function authorizeScheduledAgent(req, agentId, companyId) {
  const suppliedAgentId = req.headers.get("x-agent-id") || "";
  const suppliedSecret = req.headers.get("x-agent-secret") || "";
  if (suppliedAgentId || suppliedSecret) {
    if (suppliedAgentId !== agentId || !suppliedSecret) {
      throw new Error("Unauthorized");
    }
    const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
    const admin = createServiceClient();
    const { data, error } = await admin.rpc(
      "verify_scheduled_agent_invocation_v2",
      {
        p_agent_id: agentId,
        p_company_id: companyId || null,
        p_supplied_secret: suppliedSecret,
        p_request_id: requestId
      }
    );
    if (error) {
      console.error("Scheduled agent identity verification failed", {
        agentId,
        code: error.code || null
      });
      throw new Error("Agent identity verification unavailable");
    }
    if (data === true) {
      return {
        agentId,
        companyId: companyId || null,
        requestId,
        machine: true,
        governed: true
      };
    }
    throw new Error("Unauthorized");
  }
  if (!companyId) throw new Error("Unauthorized");
  return authorizeGovernedAgent(req, agentId, companyId);
}

// supabase/functions/_shared/system-audit/runtime.ts
var SYSTEM_AUDIT_WORKER_VERSION = "2026-08-27.55";
var SYSTEM_AUDIT_WORKER_FUNCTION = "system-audit-worker-v12";
var SystemAuditRequestError = class extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = "SystemAuditRequestError";
  }
};
var systemAuditCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-agent-secret"
};
async function authorizeSystemAgent(req, companyId) {
  if (req.headers.get("x-agent-id") || req.headers.get("x-agent-secret")) {
    if (!companyId) {
      throw new SystemAuditRequestError("companyId is required", 400);
    }
    try {
      return await authorizeScheduledAgent(
        req,
        "system-audit-orchestrator",
        companyId
      );
    } catch {
      throw new SystemAuditRequestError(
        "Unauthorized system audit agent request",
        401
      );
    }
  }
  const configuredSecret = Deno.env.get("AUDIT_AGENT_SECRET") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const authorization = req.headers.get("authorization") || "";
  const suppliedSecret = req.headers.get("x-agent-secret") || "";
  if (configuredSecret && suppliedSecret === configuredSecret) return null;
  if (serviceRoleKey && authorization === `Bearer ${serviceRoleKey}`) return null;
  throw new SystemAuditRequestError(
    "Unauthorized system audit agent request",
    401
  );
}
async function readRequestJson(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
function systemAuditJson(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...systemAuditCorsHeaders, "Content-Type": "application/json" }
  });
}
function clampInteger(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(numeric)));
}
function getErrorMessage(error) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown system audit error";
  }
}
function getSystemAuditErrorStatus(error) {
  return error instanceof SystemAuditRequestError ? error.status : 500;
}
function scheduleBackground(promise) {
  const edgeRuntime = globalThis.EdgeRuntime;
  if (edgeRuntime?.waitUntil) edgeRuntime.waitUntil(promise);
}
async function invokeSystemWorker(jobId) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceRoleKey)
    throw new Error("Missing Supabase worker invocation settings");
  const versionQuery = `v=${encodeURIComponent(SYSTEM_AUDIT_WORKER_VERSION)}`;
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const workerUrls = [
    `${supabaseUrl}/functions/v1/${SYSTEM_AUDIT_WORKER_FUNCTION}?${versionQuery}`,
    `https://${projectRef}.functions.supabase.co/${SYSTEM_AUDIT_WORKER_FUNCTION}?${versionQuery}`
  ];
  const requestOptions = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ jobId })
  };
  let lastError = "Unknown worker invocation failure";
  for (let attempt = 0; attempt < 12; attempt += 1) {
    let response;
    try {
      response = await fetch(
        workerUrls[attempt % workerUrls.length],
        requestOptions
      );
    } catch (error) {
      lastError = `Worker ${jobId} request failed: ${getErrorMessage(error)}`;
      if (attempt === 11) break;
      await new Promise(
        (resolve) => setTimeout(resolve, Math.min(1500, 200 * 2 ** attempt))
      );
      continue;
    }
    if (response.ok) return;
    lastError = `Worker ${jobId} returned ${response.status}: ${(await response.text()).slice(0, 500)}`;
    const retryable = response.status === 404 || response.status === 408 || response.status === 429 || response.status >= 500;
    if (!retryable || attempt === 11) break;
    await new Promise(
      (resolve) => setTimeout(resolve, Math.min(1500, 200 * 2 ** attempt))
    );
  }
  throw new Error(lastError);
}
async function triageFindingsWithLongCat(findings) {
  const reviewItems = findings.filter((finding) => finding.needsAiTriage).slice(0, 30);
  const apiKey = getLongCatApiKey();
  if (!apiKey || reviewItems.length === 0) return /* @__PURE__ */ new Map();
  const cases = reviewItems.map((finding, index) => ({
    index,
    code: finding.code,
    severity: finding.severity,
    evidence: sanitizeEvidence(finding.evidence)
  }));
  try {
    const response = await fetch(LONGCAT_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: buildLongCatHeaders(apiKey),
      signal: AbortSignal.timeout(3e4),
      body: JSON.stringify({
        model: LONGCAT_MODEL,
        temperature: 0,
        max_tokens: 1400,
        thinking: { type: "disabled" },
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: 'You triage ERP audit findings. Never propose SQL or a mutation. Return strict JSON: {"decisions":[{"index":0,"priority":1,"category":"accounting|operations|legal|data","reason":"short reason"}]}. Priority is 1 critical through 4 low.'
          },
          { role: "user", content: JSON.stringify({ cases }) }
        ]
      })
    });
    if (!response.ok) {
      console.warn(
        `[system-audit] LongCat triage returned HTTP ${response.status}`
      );
      return /* @__PURE__ */ new Map();
    }
    const body = await response.json();
    const content = String(body?.choices?.[0]?.message?.content || "").replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const jsonContent = content.match(/\{[\s\S]*\}/)?.[0] || content;
    const parsed = JSON.parse(jsonContent);
    const decisions = Array.isArray(parsed?.decisions) ? parsed.decisions : [];
    const result = /* @__PURE__ */ new Map();
    for (const decision of decisions) {
      const index = Number(decision?.index);
      if (!Number.isInteger(index) || index < 0 || index >= reviewItems.length)
        continue;
      result.set(reviewItems[index].dedupeKey, {
        provider: "longcat",
        priority: clampInteger(decision.priority, 1, 4, 2),
        category: ["accounting", "operations", "legal", "data"].includes(
          String(decision.category)
        ) ? String(decision.category) : "data",
        reason: String(decision.reason || "").slice(0, 500)
      });
    }
    return result;
  } catch (error) {
    console.warn(
      `[system-audit] LongCat triage failed: ${getErrorMessage(error).slice(
        0,
        200
      )}`
    );
    return /* @__PURE__ */ new Map();
  }
}
function sanitizeEvidence(value) {
  const sanitized = {};
  for (const [key, item] of Object.entries(value)) {
    if (/name|phone|email|national|plate|reference|notes|description/i.test(key))
      continue;
    if (/id$/i.test(key) || /ids$/i.test(key)) {
      sanitized[key] = Array.isArray(item) ? item.length : Boolean(item);
      continue;
    }
    if (["string", "number", "boolean"].includes(typeof item) || item === null)
      sanitized[key] = item;
  }
  return sanitized;
}

// supabase/functions/system-audit-worker/index.ts
var WORKER_VERSION = "2026-08-27.55";
var JobControlStop = class extends Error {
  constructor(action, controlReason) {
    super(controlReason);
    this.action = action;
    this.controlReason = controlReason;
    this.name = "JobControlStop";
  }
};
var CANONICAL_FINANCE_COMMANDS = /* @__PURE__ */ new Set([
  "contract.recalculate_totals",
  "invoice.recalculate_balance",
  "invoice.cancel_zero_safe",
  "schedule.sync_payment_state",
  "payment.correct_uncompleted_date",
  "payment.link_clear_invoice",
  "accounting.sync_draft_journal_totals"
]);
var CANONICAL_OPERATIONAL_COMMANDS = /* @__PURE__ */ new Set([
  "vehicle.sync_status",
  "vehicle.sync_mileage",
  "customer.sync_balance",
  "inventory.sync_stock_level",
  "inventory.create_stock_level",
  "legal.sync_case_costs",
  "employee.sync_active_status",
  "employee.sync_attendance_hours",
  "employee.sync_leave_balance",
  "employee.sync_payroll_net"
]);
var CONTRACT_SCHEDULE_COMMANDS = /* @__PURE__ */ new Set([
  "schedule.repair_invoice_link",
  "schedule.sync_amount_from_invoice"
]);
var CONTRACT_SCHEDULE_GRAPH_COMMANDS = /* @__PURE__ */ new Set([
  "schedule.realign_contract_invoice_links"
]);
var CONTRACT_SCHEDULE_MATCHING_COMMANDS = /* @__PURE__ */ new Set([
  "schedule.realign_contract_invoice_links_v2",
  "schedule.realign_contract_invoice_links_v3"
]);
var SCHEDULE_INVOICE_LINK_COMMANDS = /* @__PURE__ */ new Set([
  "schedule.link_invoice_by_billing_month"
]);
var PAYMENT_CLASSIFICATION_COMMANDS = /* @__PURE__ */ new Set([
  "payment.classify_customer_advance",
  "payment.link_clear_invoice"
]);
var LEGACY_OVERPAYMENT_COMMANDS = /* @__PURE__ */ new Set([
  "invoice.normalize_legacy_overpayment"
]);
var TRAFFIC_VIOLATION_PAYMENT_COMMANDS = /* @__PURE__ */ new Set([
  "traffic_violation_payment.post_missing_journal"
]);
var PAYROLL_ACCOUNTING_COMMANDS = /* @__PURE__ */ new Set([
  "payroll.ensure_accrual",
  "payroll.ensure_payment"
]);
var PURCHASE_ORDER_COMMANDS = /* @__PURE__ */ new Set([
  "purchase_order.sync_totals",
  "purchase_order.sync_receipt_status"
]);
var MONTHLY_OBLIGATION_COMMANDS = /* @__PURE__ */ new Set([
  "monthly_obligation.sync_payment_state"
]);
var RENTAL_RECEIPT_COMMANDS = /* @__PURE__ */ new Set([
  "rental_receipt.sync_payment_state"
]);
var LEGAL_INTEGRITY_COMMANDS = /* @__PURE__ */ new Set([
  "legal.sync_contract_state",
  "legal.reset_unsupported_repayment"
]);
var MAINTENANCE_INTEGRITY_COMMANDS = /* @__PURE__ */ new Set([
  "maintenance.sync_accounting_link"
]);
var BANK_PAYMENT_INTEGRITY_COMMANDS = /* @__PURE__ */ new Set([
  "accounting.assign_single_active_bank"
]);
serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: systemAuditCorsHeaders });
  let supabase = null;
  let job = null;
  try {
    await authorizeSystemAgent(req);
    const body = await readRequestJson(req);
    if (!body.jobId)
      return systemAuditJson({ ok: false, error: "jobId is required" }, 400);
    supabase = createClient2(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const { data: claimedJob, error: claimError } = await supabase.rpc(
      "system_agent_claim_job",
      {
        p_job_id: body.jobId,
        p_lease_seconds: 300
      }
    );
    if (claimError) throw claimError;
    if (!claimedJob) {
      return systemAuditJson(
        {
          ok: true,
          skipped: true,
          reason: "Job is not dispatchable",
          workerVersion: WORKER_VERSION
        },
        202
      );
    }
    job = claimedJob;
    await assertJobMayContinue(supabase, job);
    const batch = await runDomainWorker({ supabase, job, now: /* @__PURE__ */ new Date() });
    await assertJobMayContinue(supabase, job);
    const findings = dedupeFindings(batch.findings);
    const aiDecisions = job.settings?.includeAiTriage === false || Number(job.processed_batches || 0) > 1 ? /* @__PURE__ */ new Map() : await triageFindingsWithLongCat(findings);
    await assertJobMayContinue(supabase, job);
    const outcome = await persistAndRepairFindings(
      supabase,
      job,
      findings,
      aiDecisions,
      () => assertJobMayContinue(supabase, job)
    );
    await assertJobMayContinue(supabase, job);
    const maxBatches = Number(job.settings?.maxBatches || 0);
    const hasMore = batch.hasMore && (maxBatches <= 0 || Number(job.processed_batches || 0) < maxBatches);
    const stats = accumulateStats(job.stats || {}, {
      scanned: batch.scanned,
      findings: findings.length,
      repaired: outcome.repaired,
      verified: outcome.verified,
      repairFailed: outcome.failed,
      review: outcome.review,
      ...batch.stats || {}
    });
    const { error: finishError } = await supabase.rpc(
      "system_agent_finish_job",
      {
        p_job_id: job.id,
        p_lease_token: job.lease_token,
        p_success: true,
        p_has_more: hasMore,
        p_cursor: batch.cursor,
        p_stats: stats,
        p_error: null
      }
    );
    if (finishError) throw finishError;
    if (hasMore) scheduleBackground(invokeSystemWorker(job.id));
    return systemAuditJson({
      ok: true,
      jobId: job.id,
      domain: job.domain,
      scanned: batch.scanned,
      findings: findings.length,
      repaired: outcome.repaired,
      verified: outcome.verified,
      repairFailed: outcome.failed,
      review: outcome.review,
      hasMore,
      workerVersion: WORKER_VERSION
    });
  } catch (error) {
    const message = getErrorMessage(error);
    if (error instanceof JobControlStop && supabase && job?.id && job.lease_token) {
      const cleanup = error.action === "pause" ? await supabase.rpc("system_agent_finish_job", {
        p_job_id: job.id,
        p_lease_token: job.lease_token,
        p_success: true,
        p_has_more: true,
        p_cursor: job.cursor || {},
        p_stats: job.stats || {},
        p_error: null
      }) : error.action === "cancel" ? await supabase.rpc("system_agent_cancel_claimed_job_v1", {
        p_job_id: job.id,
        p_lease_token: job.lease_token,
        p_reason: error.controlReason
      }) : { error: null };
      return systemAuditJson(
        {
          ok: true,
          skipped: true,
          jobId: job.id,
          reason: error.controlReason,
          controlAction: error.action,
          cleanupError: cleanup.error?.message || null,
          workerVersion: WORKER_VERSION
        },
        202
      );
    }
    if (supabase && job?.id && job.lease_token) {
      await supabase.rpc("system_agent_finish_job", {
        p_job_id: job.id,
        p_lease_token: job.lease_token,
        p_success: false,
        p_has_more: true,
        p_cursor: job.cursor || {},
        p_stats: job.stats || {},
        p_error: message
      });
    }
    return systemAuditJson(
      {
        ok: false,
        jobId: job?.id || null,
        error: message,
        workerVersion: WORKER_VERSION
      },
      getSystemAuditErrorStatus(error)
    );
  }
});
async function persistAndRepairFindings(supabase, job, findings, aiDecisions, assertMayContinue) {
  let repaired = 0;
  let verified = 0;
  let failed = 0;
  const review = findings.filter((finding) => !finding.repair).length;
  const findingRows = findings.map((finding) => {
    const aiDecision = aiDecisions.get(finding.dedupeKey) || null;
    return {
      run_id: job.run_id,
      job_id: job.id,
      company_id: job.company_id,
      domain: job.domain,
      dedupe_key: finding.dedupeKey,
      code: finding.code,
      severity: finding.severity,
      entity_type: finding.entityType,
      entity_id: finding.entityId,
      title: finding.title,
      details: finding.details,
      evidence: finding.evidence,
      confidence: finding.confidence,
      repair_command: finding.repair?.command || null,
      repair_payload: finding.repair ? {
        expectedBefore: finding.repair.expectedBefore,
        values: finding.repair.values
      } : null,
      status: finding.repair ? "planned" : "review",
      ai_decision: aiDecision
    };
  });
  const savedByKey = await persistFindingRows(
    supabase,
    job.run_id,
    findingRows,
    assertMayContinue
  );
  for (const finding of findings) {
    await assertMayContinue();
    const saved = savedByKey.get(finding.dedupeKey);
    if (!saved)
      throw new Error(`Persisted finding was not found: ${finding.dedupeKey}`);
    if (["repaired", "rolled_back", "ignored"].includes(saved.status)) continue;
    if (!finding.repair || !finding.repair.autoApply || job.mode === "dry_run") {
      continue;
    }
    const { error: repairingError } = await supabase.from("system_agent_findings").update({
      status: "repairing",
      error: null,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", saved.id);
    if (repairingError) throw repairingError;
    const repairRpc = finding.repair.command === "customer.create_balance" ? "system_agent_apply_customer_balance_create_repair" : [
      "schedule.repair_invoice_link",
      "schedule.link_invoice_by_billing_month",
      "contract.generate_missing_invoice"
    ].includes(finding.repair.command) ? "system_agent_apply_contract_invoice_billing_month_repair_v9" : finding.repair.command === "schedule.consolidate_duplicate_rows" ? "system_agent_apply_schedule_duplicate_rows_repair_v2" : finding.repair.command === "schedule.realign_contract_invoice_links_v3" ? "system_agent_apply_contract_schedule_matching_repair_v3" : CONTRACT_SCHEDULE_MATCHING_COMMANDS.has(finding.repair.command) ? "system_agent_apply_contract_schedule_matching_repair_v2" : CONTRACT_SCHEDULE_GRAPH_COMMANDS.has(finding.repair.command) ? "system_agent_apply_contract_schedule_graph_repair_v1" : SCHEDULE_INVOICE_LINK_COMMANDS.has(finding.repair.command) ? "system_agent_apply_schedule_invoice_link_repair_v1" : CONTRACT_SCHEDULE_COMMANDS.has(finding.repair.command) ? "system_agent_apply_contract_schedule_repair_v1" : PAYMENT_CLASSIFICATION_COMMANDS.has(finding.repair.command) ? "system_agent_apply_payment_classification_repair_v1" : LEGACY_OVERPAYMENT_COMMANDS.has(finding.repair.command) ? "system_agent_apply_legacy_overpayment_repair_v1" : TRAFFIC_VIOLATION_PAYMENT_COMMANDS.has(finding.repair.command) ? "system_agent_apply_traffic_violation_payment_repair_v1" : PAYROLL_ACCOUNTING_COMMANDS.has(finding.repair.command) ? "system_agent_apply_payroll_repair_v1" : PURCHASE_ORDER_COMMANDS.has(finding.repair.command) ? "system_agent_apply_purchase_order_repair_v1" : MONTHLY_OBLIGATION_COMMANDS.has(finding.repair.command) ? "system_agent_apply_monthly_obligation_repair_v1" : RENTAL_RECEIPT_COMMANDS.has(finding.repair.command) ? "system_agent_apply_rental_receipt_repair_v1" : LEGAL_INTEGRITY_COMMANDS.has(finding.repair.command) ? "system_agent_apply_legal_integrity_repair_v1" : MAINTENANCE_INTEGRITY_COMMANDS.has(finding.repair.command) ? "system_agent_apply_maintenance_integrity_repair_v1" : BANK_PAYMENT_INTEGRITY_COMMANDS.has(finding.repair.command) ? "system_agent_apply_bank_payment_integrity_repair_v1" : finding.repair.command === "schedule.link_invoice" ? "system_agent_apply_contract_invoice_repair_v3" : CANONICAL_FINANCE_COMMANDS.has(finding.repair.command) ? "system_agent_apply_finance_repair" : CANONICAL_OPERATIONAL_COMMANDS.has(finding.repair.command) ? "system_agent_apply_operational_repair" : null;
    if (!repairRpc) {
      failed += 1;
      await supabase.from("system_agent_findings").update({
        status: "failed",
        error: "No canonical repair gateway is registered for this command",
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", saved.id);
      continue;
    }
    await assertMayContinue();
    const { data: repairResult, error: repairError } = await supabase.rpc(
      repairRpc,
      {
        p_run_id: job.run_id,
        p_job_id: job.id,
        p_finding_id: saved.id,
        p_command: finding.repair.command,
        p_company_id: job.company_id,
        p_entity_id: finding.repair.entityId,
        p_expected_before: finding.repair.expectedBefore,
        p_values: finding.repair.values,
        p_metadata: { workerDomain: job.domain }
      }
    );
    if (repairError) {
      failed += 1;
      await supabase.from("system_agent_findings").update({
        status: "failed",
        error: String(repairError.message || repairError).slice(0, 4e3),
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", saved.id);
    } else if (repairResult?.status === "verified_no_change") {
      verified += 1;
    } else if (repairResult?.status === "repaired" || repairResult?.repair_id) {
      repaired += 1;
    } else {
      failed += 1;
      await supabase.from("system_agent_findings").update({
        status: "failed",
        error: "Repair gateway returned no verified outcome",
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", saved.id);
    }
  }
  return { repaired, verified, failed, review };
}
async function persistFindingRows(supabase, runId, rows, assertMayContinue) {
  const savedByKey = /* @__PURE__ */ new Map();
  for (let index = 0; index < rows.length; index += 50) {
    await assertMayContinue();
    const chunk = rows.slice(index, index + 50);
    const { error: insertError } = await supabase.from("system_agent_findings").upsert(chunk, {
      onConflict: "run_id,dedupe_key",
      ignoreDuplicates: true
    });
    if (insertError) throw insertError;
    const keys = chunk.map((row) => String(row.dedupe_key));
    const { data, error: loadError } = await supabase.from("system_agent_findings").select("id,dedupe_key,status").eq("run_id", runId).in("dedupe_key", keys);
    if (loadError) throw loadError;
    for (const saved of data || []) {
      savedByKey.set(saved.dedupe_key, { id: saved.id, status: saved.status });
    }
  }
  return savedByKey;
}
async function assertJobMayContinue(supabase, job) {
  const { data, error } = await supabase.rpc(
    "system_agent_get_job_execution_control_v1",
    {
      p_job_id: job.id,
      p_lease_token: job.lease_token
    }
  );
  if (error) throw error;
  const control = data || {};
  if (control.leaseValid !== true) {
    throw new JobControlStop("lease_invalid", "job_lease_is_no_longer_valid");
  }
  if (control.cancelRequested === true || control.killSwitch === true) {
    throw new JobControlStop(
      "cancel",
      String(control.cancelReason || (control.killSwitch ? "company_kill_switch" : "manual_cancel"))
    );
  }
  if (control.enabled === false || control.paused === true) {
    throw new JobControlStop(
      "pause",
      control.enabled === false ? "company_agent_disabled" : "company_agent_paused"
    );
  }
}
function dedupeFindings(findings) {
  const unique = /* @__PURE__ */ new Map();
  for (const finding of findings) {
    if (!unique.has(finding.dedupeKey)) unique.set(finding.dedupeKey, finding);
  }
  return [...unique.values()];
}
function accumulateStats(current, additions) {
  const result = { ...current };
  for (const [key, value] of Object.entries(additions))
    result[key] = Number(result[key] || 0) + Number(value || 0);
  return result;
}
