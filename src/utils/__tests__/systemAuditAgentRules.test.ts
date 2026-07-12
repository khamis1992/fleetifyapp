import { describe, expect, it } from "vitest";
import {
  buildCanonicalContractReceiptContributions,
  buildCanonicalInvoiceReceiptContributions,
  canLinkInvoiceForSchedule,
  canGenerateInvoiceForSchedule,
  dateOnly,
  deriveAttendanceHours,
  deriveFinancialTotals,
  deriveLegalCaseCosts,
  deriveOneToOneScheduleInvoicePlan,
  derivePayrollNet,
  deriveStockOnHand,
  deriveSchedulePaymentState,
  deriveVehicleStatus,
  isInactiveScheduleStatus,
  isDateOutsidePeriod,
  isInvoiceOutsideContractBillingPeriod,
  invoiceConflictsWithMonth,
  invoiceMonthKey,
  maxDaysOverdue,
  normalizeScheduleStatus,
} from "../../../supabase/functions/_shared/system-audit/rules.ts";
import { runDomainWorker } from "../../../supabase/functions/_shared/system-audit/workers.ts";
import type {
  SystemAuditDomain,
  WorkerContext,
} from "../../../supabase/functions/_shared/system-audit/types.ts";

type FixtureRow = Record<string, any>;
type FixtureTables = Record<string, FixtureRow[]>;

function createFixtureSupabase(tables: FixtureTables) {
  return {
    from(table: string) {
      let rows = [...(tables[table] || [])];
      let maximumRows: number | undefined;
      const query: any = {
        select: () => query,
        eq: (field: string, value: unknown) => {
          rows = rows.filter((row) => row[field] === value);
          return query;
        },
        in: (field: string, values: unknown[]) => {
          rows = rows.filter((row) => values.includes(row[field]));
          return query;
        },
        gt: (field: string, value: unknown) => {
          rows = rows.filter((row) => row[field] > value);
          return query;
        },
        order: (field: string, options?: { ascending?: boolean }) => {
          const direction = options?.ascending === false ? -1 : 1;
          rows.sort(
            (left, right) =>
              String(left[field] || "").localeCompare(
                String(right[field] || "")
              ) * direction
          );
          return query;
        },
        limit: (value: number) => {
          maximumRows = value;
          return query;
        },
        then: (
          onFulfilled: (value: unknown) => unknown,
          onRejected: (reason: unknown) => unknown
        ) =>
          Promise.resolve({
            data: maximumRows ? rows.slice(0, maximumRows) : rows,
            error: null,
          }).then(onFulfilled, onRejected),
      };
      return query;
    },
  };
}

function createWorkerContext(
  domain: SystemAuditDomain,
  tables: FixtureTables
): WorkerContext {
  return {
    supabase: createFixtureSupabase(tables),
    now: new Date("2026-07-12T12:00:00.000Z"),
    job: {
      id: `job-${domain}`,
      run_id: "run-1",
      company_id: "company-1",
      domain,
      mode: "apply",
      status: "running",
      cursor: null,
      batch_size: 10,
      lease_token: "lease-1",
      settings: null,
      stats: null,
      processed_batches: 0,
    },
  };
}

describe("system audit agent rules", () => {
  it("derives balances from completed receipt payments only", () => {
    const result = deriveFinancialTotals(1_000, [
      { amount: 300, transaction_type: "receipt", payment_status: "completed" },
      { amount: 200, transaction_type: "receipt", payment_status: "cancelled" },
      { amount: 50, transaction_type: "payment", payment_status: "completed" },
    ]);

    expect(result).toEqual({
      paid: 300,
      balance: 700,
      paymentStatus: "partial",
    });
    expect(
      deriveFinancialTotals(1_000, [
        {
          amount: 999,
          transaction_type: "receipt",
          payment_status: "completed",
        },
      ])
    ).toEqual({ paid: 999, balance: 1, paymentStatus: "partial" });
    expect(
      deriveFinancialTotals(1_000, [
        {
          amount: 999.99,
          transaction_type: "receipt",
          payment_status: "completed",
        },
      ])
    ).toEqual({ paid: 999.99, balance: 0.01, paymentStatus: "paid" });
  });

  it("treats invoice billing months inside the contract as in-period", () => {
    expect(
      isInvoiceOutsideContractBillingPeriod(
        {
          invoice_date: "2026-12-01",
          due_date: "2027-01-01",
        },
        "2025-11-09",
        "2026-12-31"
      )
    ).toBe(false);
    expect(
      isInvoiceOutsideContractBillingPeriod(
        {
          invoice_date: "2023-07-01",
          due_date: "2023-07-01",
        },
        "2023-07-13",
        "2026-07-14"
      )
    ).toBe(false);
    expect(
      isInvoiceOutsideContractBillingPeriod(
        {
          invoice_date: "2023-06-01",
          due_date: "2023-06-01",
        },
        "2023-07-13",
        "2026-07-14"
      )
    ).toBe(true);
  });

  it("uses active allocation amounts without double-counting legacy invoice links", () => {
    const contributions = buildCanonicalInvoiceReceiptContributions(
      [
        {
          id: "payment-1",
          invoice_id: "invoice-old",
          amount: 500,
          transaction_type: "receipt",
          payment_status: "completed",
        },
        {
          id: "payment-2",
          invoice_id: "invoice-2",
          amount: 200,
          transaction_type: "receipt",
          payment_status: "completed",
        },
        {
          id: "payment-3",
          invoice_id: "invoice-3",
          amount: 100,
          transaction_type: "receipt",
          payment_status: "cancelled",
        },
        {
          id: "payment-4",
          invoice_id: "invoice-2",
          amount: 50,
          transaction_type: "receipt",
          payment_status: "completed",
        },
      ],
      [
        {
          id: "allocation-1",
          payment_id: "payment-1",
          allocation_type: "invoice",
          target_id: "invoice-1",
          amount: 300,
          is_active: true,
        },
        {
          id: "allocation-2",
          payment_id: "payment-1",
          allocation_type: "invoice",
          target_id: "invoice-2",
          amount: 200,
          is_active: true,
        },
        {
          id: "allocation-old",
          payment_id: "payment-2",
          allocation_type: "invoice",
          target_id: "invoice-old",
          amount: 200,
          is_active: false,
        },
        {
          id: "contract-allocation",
          payment_id: "payment-4",
          allocation_type: "contract",
          target_id: "contract-1",
          amount: 50,
          is_active: true,
        },
      ]
    );

    expect(
      contributions.map((item) => ({
        paymentId: item.id,
        invoiceId: item.invoice_id,
        amount: item.amount,
        source: item.allocation_source,
      }))
    ).toEqual([
      {
        paymentId: "payment-1",
        invoiceId: "invoice-1",
        amount: 300,
        source: "ledger",
      },
      {
        paymentId: "payment-1",
        invoiceId: "invoice-2",
        amount: 200,
        source: "ledger",
      },
      {
        paymentId: "payment-2",
        invoiceId: "invoice-2",
        amount: 200,
        source: "legacy_direct",
      },
      {
        paymentId: "payment-3",
        invoiceId: "invoice-3",
        amount: 100,
        source: "legacy_direct",
      },
    ]);
    expect(
      deriveFinancialTotals(
        1_000,
        contributions.filter((item) => item.invoice_id === "invoice-2")
      )
    ).toEqual({ paid: 400, balance: 600, paymentStatus: "partial" });
  });

  it("derives contract receipts from invoice, contract, and unallocated sources once", () => {
    const payments = [
      {
        id: "split",
        contract_id: "contract-1",
        invoice_id: "legacy",
        amount: 500,
        transaction_type: "receipt",
        payment_status: "completed",
      },
      {
        id: "direct",
        contract_id: "contract-1",
        invoice_id: "invoice-2",
        amount: 200,
        transaction_type: "receipt",
        payment_status: "completed",
      },
      {
        id: "advance",
        contract_id: "contract-1",
        invoice_id: null,
        amount: 100,
        transaction_type: "receipt",
        payment_status: "completed",
      },
      {
        id: "contract-ledger",
        contract_id: "contract-1",
        invoice_id: "invoice-2",
        amount: 50,
        transaction_type: "receipt",
        payment_status: "completed",
      },
    ];
    const allocations = [
      {
        id: "split-1",
        payment_id: "split",
        allocation_type: "invoice",
        target_id: "invoice-1",
        amount: 300,
        is_active: true,
      },
      {
        id: "split-2",
        payment_id: "split",
        allocation_type: "invoice",
        target_id: "invoice-2",
        amount: 200,
        is_active: true,
      },
      {
        id: "contract-1",
        payment_id: "contract-ledger",
        allocation_type: "contract",
        target_id: "contract-1",
        amount: 50,
        is_active: true,
      },
    ];
    const contributions = buildCanonicalContractReceiptContributions(
      "contract-1",
      [
        { id: "invoice-1", contract_id: "contract-1", status: "pending" },
        { id: "invoice-2", contract_id: "contract-1", status: "paid" },
      ],
      payments,
      allocations
    );

    expect(deriveFinancialTotals(1_000, contributions)).toEqual({
      paid: 850,
      balance: 150,
      paymentStatus: "partial",
    });
  });

  it("uses the database settlement tolerance for schedule states", () => {
    const now = new Date("2026-07-11T12:00:00Z");
    expect(deriveSchedulePaymentState(1_000, 999, "2026-07-01", now)).toEqual({
      paid: 999,
      status: "partial",
    });
    expect(
      deriveSchedulePaymentState(1_000, 999.99, "2026-07-01", now)
    ).toEqual({ paid: 999.99, status: "paid" });
  });

  it("keeps protected vehicle statuses and otherwise applies operational priority", () => {
    expect(
      deriveVehicleStatus({
        currentStatus: "stolen",
        isActive: true,
        hasActiveContract: false,
        hasOpenMaintenance: false,
        hasActiveReservation: false,
      })
    ).toBeNull();

    expect(
      deriveVehicleStatus({
        currentStatus: "rented",
        isActive: true,
        hasActiveContract: true,
        hasOpenMaintenance: true,
        hasActiveReservation: true,
      })
    ).toBe("maintenance");

    expect(
      deriveVehicleStatus({
        currentStatus: "municipality",
        isActive: true,
        hasActiveContract: true,
        hasOpenMaintenance: false,
        hasActiveReservation: false,
      })
    ).toBeNull();

    expect(
      deriveVehicleStatus({
        currentStatus: "street_52",
        isActive: true,
        hasActiveContract: false,
        hasOpenMaintenance: false,
        hasActiveReservation: false,
      })
    ).toBeNull();

    expect(
      deriveVehicleStatus({
        currentStatus: "available",
        isActive: true,
        hasActiveContract: false,
        hasOpenMaintenance: false,
        hasActiveReservation: true,
      })
    ).toBe("street_52");
  });

  it("rebuilds stock from inbound, outbound, and adjustment movements", () => {
    expect(
      deriveStockOnHand([
        { movement_type: "PURCHASE", quantity: 10 },
        { movement_type: "SALE", quantity: 3 },
        { movement_type: "adjustment", quantity: -2 },
        { movement_type: "in", quantity: 1 },
      ])
    ).toBe(6);
  });

  it("calculates attendance after subtracting a valid break", () => {
    expect(
      deriveAttendanceHours({
        checkIn: "2026-07-11T08:00:00Z",
        checkOut: "2026-07-11T17:00:00Z",
        breakStart: "2026-07-11T12:00:00Z",
        breakEnd: "2026-07-11T13:00:00Z",
      })
    ).toBe(8);
  });

  it("derives payroll net and legal case costs", () => {
    expect(
      derivePayrollNet({
        basic_salary: 5_000,
        allowances: 500,
        overtime_amount: 200,
        deductions: 100,
        tax_amount: 50,
      })
    ).toBe(5_550);
    expect(
      deriveLegalCaseCosts({
        legal_fees: 1_000,
        court_fees: 300,
        other_expenses: 50,
      })
    ).toBe(1_350);
  });

  it("returns the maximum overdue age", () => {
    expect(
      maxDaysOverdue(
        ["2026-07-01", "2026-07-05", null],
        new Date("2026-07-11T12:00:00Z")
      )
    ).toBe(10);
  });

  it("never treats cancelled schedules as repairable billing periods", () => {
    expect(isInactiveScheduleStatus("cancelled")).toBe(true);
    expect(isInactiveScheduleStatus("VOID")).toBe(true);
    expect(isInactiveScheduleStatus("pending")).toBe(false);
    expect(isInactiveScheduleStatus("overdue")).toBe(false);
  });

  it("only generates invoices for unlinked active schedules inside an active contract period", () => {
    const eligible = {
      invoiceId: null,
      scheduleStatus: "pending",
      amount: 1_500,
      dueDate: "2026-07-01",
      contractStatus: "active",
      contractStartDate: "2026-01-01",
      contractEndDate: "2026-12-31",
    };
    expect(canGenerateInvoiceForSchedule(eligible)).toBe(true);
    expect(
      canGenerateInvoiceForSchedule({
        ...eligible,
        invoiceId: "existing-invoice",
      })
    ).toBe(false);
    expect(
      canGenerateInvoiceForSchedule({
        ...eligible,
        scheduleStatus: "cancelled",
      })
    ).toBe(false);
    expect(canGenerateInvoiceForSchedule({ ...eligible, amount: 0 })).toBe(
      false
    );
    expect(
      canGenerateInvoiceForSchedule({
        ...eligible,
        contractStatus: "cancelled",
      })
    ).toBe(false);
    expect(
      canGenerateInvoiceForSchedule({ ...eligible, dueDate: "2027-01-01" })
    ).toBe(false);
  });

  it("only links invoices to active schedules inside an active contract period", () => {
    const eligible = {
      scheduleStatus: "pending",
      dueDate: "2026-07-01",
      contractStatus: "active",
      contractStartDate: "2026-01-01",
      contractEndDate: "2026-12-31",
    };
    expect(canLinkInvoiceForSchedule(eligible)).toBe(true);
    expect(
      canLinkInvoiceForSchedule({ ...eligible, scheduleStatus: "cancelled" })
    ).toBe(false);
    expect(
      canLinkInvoiceForSchedule({ ...eligible, contractStatus: "closed" })
    ).toBe(false);
    expect(
      canLinkInvoiceForSchedule({ ...eligible, dueDate: "2027-01-01" })
    ).toBe(false);
    expect(
      canLinkInvoiceForSchedule({ ...eligible, contractEndDate: null })
    ).toBe(false);
  });

  it("treats partial schedule status aliases as the same canonical state", () => {
    expect(normalizeScheduleStatus("partial")).toBe("partial");
    expect(normalizeScheduleStatus("partially_paid")).toBe("partial");
    expect(normalizeScheduleStatus("PAID")).toBe("paid");
  });

  it("uses invoice_date for uniqueness while accepting either billing date", () => {
    const invoice = { invoice_date: "2026-02-01", due_date: "2026-03-01" };
    expect(invoiceMonthKey(invoice)).toBe("2026-02");
    expect(invoiceConflictsWithMonth(invoice, "2026-02")).toBe(true);
    expect(invoiceConflictsWithMonth(invoice, "2026-03")).toBe(true);
    expect(invoiceConflictsWithMonth(invoice, "2026-04")).toBe(false);
  });

  it("derives a complete one-to-one schedule invoice matching across month boundaries", () => {
    const plan = deriveOneToOneScheduleInvoicePlan(
      [
        {
          id: "schedule-april",
          due_date: "2026-04-01",
          invoice_id: "invoice-april",
        },
        {
          id: "schedule-may",
          due_date: "2026-05-01",
          invoice_id: "invoice-april",
        },
      ],
      [
        {
          id: "invoice-april",
          invoice_date: "2026-04-01",
          due_date: "2026-05-01",
        },
        {
          id: "invoice-may",
          invoice_date: "2026-05-01",
          due_date: "2026-06-01",
        },
      ]
    );

    expect(plan.complete).toBe(true);
    expect(plan.assignments).toEqual([
      {
        scheduleId: "schedule-april",
        oldInvoiceId: "invoice-april",
        newInvoiceId: "invoice-april",
        candidateInvoiceIds: ["invoice-april"],
      },
      {
        scheduleId: "schedule-may",
        oldInvoiceId: "invoice-april",
        newInvoiceId: "invoice-may",
        candidateInvoiceIds: ["invoice-april", "invoice-may"],
      },
    ]);
  });

  it("preserves a complete due-month convention when boundary dates require it", () => {
    const plan = deriveOneToOneScheduleInvoicePlan(
      [
        {
          id: "schedule-june",
          due_date: "2027-06-01",
          invoice_id: "invoice-may",
        },
        {
          id: "schedule-july",
          due_date: "2027-07-01",
          invoice_id: "invoice-june",
        },
      ],
      [
        {
          id: "invoice-may",
          invoice_date: "2027-05-01",
          due_date: "2027-06-01",
        },
        {
          id: "invoice-june",
          invoice_date: "2027-06-01",
          due_date: "2027-07-01",
        },
      ]
    );

    expect(plan.complete).toBe(true);
    expect(
      plan.assignments.map((assignment) => assignment.newInvoiceId)
    ).toEqual(["invoice-may", "invoice-june"]);
  });

  it("normalizes timestamps before comparing them with contract dates", () => {
    expect(dateOnly("2026-07-01T23:59:59+03:00")).toBe("2026-07-01");
    expect(
      isDateOutsidePeriod(
        "2026-07-01T23:59:59+03:00",
        "2026-07-01",
        "2026-07-31"
      )
    ).toBe(false);
    expect(isDateOutsidePeriod("2026-08-01", "2026-07-01", "2026-07-31")).toBe(
      true
    );
  });

  it("does not treat a valid historical invoice as invalid only because its contract is cancelled", async () => {
    const result = await runDomainWorker(
      createWorkerContext("contracts", {
        contracts: [
          {
            id: "contract-1",
            company_id: "company-1",
            contract_number: "C-1",
            status: "cancelled",
            contract_amount: 1_000,
            total_paid: 0,
            balance_due: 1_000,
            payment_status: "unpaid",
            start_date: "2026-01-01",
            end_date: "2026-12-31",
            contract_date: "2026-01-01",
            customer_id: "customer-1",
            vehicle_id: "vehicle-1",
          },
        ],
        invoices: [
          {
            id: "invoice-1",
            company_id: "company-1",
            contract_id: "contract-1",
            customer_id: "customer-1",
            invoice_number: "INV-1",
            invoice_date: "2026-02-01",
            due_date: "2026-02-01",
            subtotal: 1_000,
            total_amount: 1_000,
            paid_amount: 0,
            balance_due: 1_000,
            status: "pending",
            payment_status: "unpaid",
            journal_entry_id: null,
          },
        ],
        payments: [],
        contract_payment_schedules: [],
        payment_allocations: [],
      })
    );

    expect(result.findings).toEqual([]);
  });

  it("keeps a same-day payment timestamp inside its contract period", async () => {
    const result = await runDomainWorker(
      createWorkerContext("contracts", {
        contracts: [
          {
            id: "contract-1",
            company_id: "company-1",
            contract_number: "C-1",
            status: "active",
            contract_amount: 0,
            total_paid: 0,
            balance_due: 0,
            payment_status: "paid",
            start_date: "2026-07-01",
            end_date: "2026-07-31",
            contract_date: "2026-07-01",
            customer_id: "customer-1",
            vehicle_id: "vehicle-1",
          },
        ],
        invoices: [],
        payments: [
          {
            id: "payment-1",
            company_id: "company-1",
            contract_id: "contract-1",
            customer_id: "customer-1",
            invoice_id: null,
            amount: 0,
            payment_date: "2026-07-01T23:59:59+03:00",
            payment_status: "pending",
            transaction_type: "receipt",
            journal_entry_id: null,
            payment_number: "PAY-1",
            reference_number: null,
            allocation_status: "unallocated",
          },
        ],
        contract_payment_schedules: [],
        payment_allocations: [],
      })
    );

    expect(result.findings.map((finding) => finding.code)).not.toContain(
      "payment.uncompleted_outside_contract_period"
    );
  });

  it("trusts an existing invoice link when the schedule matches its due month", async () => {
    const result = await runDomainWorker(
      createWorkerContext("contracts", {
        contracts: [
          {
            id: "contract-1",
            company_id: "company-1",
            contract_number: "C-1",
            status: "active",
            contract_amount: 1_000,
            total_paid: 0,
            balance_due: 1_000,
            payment_status: "unpaid",
            start_date: "2026-01-01",
            end_date: "2026-12-31",
            contract_date: "2026-01-01",
            customer_id: "customer-1",
            vehicle_id: "vehicle-1",
          },
        ],
        invoices: [
          {
            id: "invoice-1",
            company_id: "company-1",
            contract_id: "contract-1",
            customer_id: "customer-1",
            invoice_number: "INV-1",
            invoice_date: "2026-07-01",
            due_date: "2026-08-01",
            subtotal: 1_000,
            total_amount: 1_000,
            paid_amount: 0,
            balance_due: 1_000,
            status: "sent",
            payment_status: "unpaid",
            journal_entry_id: null,
          },
        ],
        payments: [],
        contract_payment_schedules: [
          {
            id: "schedule-1",
            company_id: "company-1",
            contract_id: "contract-1",
            invoice_id: "invoice-1",
            amount: 1_000,
            paid_amount: 0,
            status: "pending",
            paid_date: null,
            due_date: "2026-08-01",
            installment_number: 1,
          },
        ],
        payment_allocations: [],
        payment_accounting_classifications: [],
      })
    );

    expect(result.findings.map((finding) => finding.code)).not.toContain(
      "schedule.existing_invoice_link_mismatch"
    );
    expect(result.findings.map((finding) => finding.code)).not.toContain(
      "schedule.stale_invoice_link"
    );
  });

  it("plans one atomic repair for a shifted contract invoice-link chain", async () => {
    const invoice = (id: string, month: string) => ({
      id,
      company_id: "company-1",
      contract_id: "contract-1",
      customer_id: "customer-1",
      invoice_number: `INV-${month}`,
      invoice_date: `${month}-01`,
      due_date: `${month}-01`,
      subtotal: 1_000,
      total_amount: 1_000,
      paid_amount: 0,
      balance_due: 1_000,
      status: "sent",
      payment_status: "unpaid",
      journal_entry_id: null,
    });
    const result = await runDomainWorker(
      createWorkerContext("contracts", {
        contracts: [
          {
            id: "contract-1",
            company_id: "company-1",
            contract_number: "C-1",
            status: "active",
            contract_amount: 2_000,
            total_paid: 0,
            balance_due: 2_000,
            payment_status: "unpaid",
            start_date: "2026-01-01",
            end_date: "2026-12-31",
            contract_date: "2026-01-01",
            customer_id: "customer-1",
            vehicle_id: "vehicle-1",
          },
        ],
        invoices: [
          invoice("invoice-march", "2026-03"),
          invoice("invoice-april", "2026-04"),
          invoice("invoice-may", "2026-05"),
        ],
        payments: [],
        contract_payment_schedules: [
          {
            id: "schedule-april",
            company_id: "company-1",
            contract_id: "contract-1",
            invoice_id: "invoice-march",
            amount: 1_000,
            paid_amount: 0,
            status: "pending",
            paid_date: null,
            due_date: "2026-04-01",
            installment_number: 1,
          },
          {
            id: "schedule-may",
            company_id: "company-1",
            contract_id: "contract-1",
            invoice_id: "invoice-april",
            amount: 1_000,
            paid_amount: 0,
            status: "pending",
            paid_date: null,
            due_date: "2026-05-01",
            installment_number: 2,
          },
        ],
        payment_allocations: [],
        payment_accounting_classifications: [],
      })
    );

    const graphFinding = result.findings.find(
      (finding) => finding.code === "schedule.contract_invoice_links_rebalanced"
    );
    expect(graphFinding?.entityId).toBe("contract-1");
    expect(graphFinding?.repair?.command).toBe(
      "schedule.realign_contract_invoice_links_v3"
    );
    expect(result.findings.map((finding) => finding.code)).not.toContain(
      "schedule.stale_invoice_link"
    );
  });

  it("plans one atomic repair when unlinked schedules belong to a shifted link graph", async () => {
    const invoice = (id: string, month: string) => ({
      id,
      company_id: "company-1",
      contract_id: "contract-1",
      customer_id: "customer-1",
      invoice_number: `INV-${month}`,
      invoice_date: `${month}-01`,
      due_date: `${month}-01`,
      subtotal: 1_000,
      total_amount: 1_000,
      paid_amount: 0,
      balance_due: 1_000,
      status: "sent",
      payment_status: "unpaid",
      journal_entry_id: null,
    });
    const result = await runDomainWorker(
      createWorkerContext("contracts", {
        contracts: [
          {
            id: "contract-1",
            company_id: "company-1",
            contract_number: "C-1",
            status: "active",
            contract_amount: 3_000,
            total_paid: 0,
            balance_due: 3_000,
            payment_status: "unpaid",
            start_date: "2026-01-01",
            end_date: "2026-12-31",
            contract_date: "2026-01-01",
            customer_id: "customer-1",
            vehicle_id: "vehicle-1",
          },
        ],
        invoices: [
          invoice("invoice-january", "2026-01"),
          invoice("invoice-february", "2026-02"),
          invoice("invoice-march", "2026-03"),
        ],
        payments: [],
        contract_payment_schedules: [
          {
            id: "schedule-january",
            company_id: "company-1",
            contract_id: "contract-1",
            invoice_id: null,
            amount: 1_000,
            paid_amount: 0,
            status: "pending",
            paid_date: null,
            due_date: "2026-01-01",
            installment_number: 1,
          },
          {
            id: "schedule-february",
            company_id: "company-1",
            contract_id: "contract-1",
            invoice_id: "invoice-january",
            amount: 1_000,
            paid_amount: 0,
            status: "pending",
            paid_date: null,
            due_date: "2026-02-01",
            installment_number: 2,
          },
          {
            id: "schedule-march",
            company_id: "company-1",
            contract_id: "contract-1",
            invoice_id: "invoice-february",
            amount: 1_000,
            paid_amount: 0,
            status: "pending",
            paid_date: null,
            due_date: "2026-03-01",
            installment_number: 3,
          },
        ],
        payment_allocations: [],
        payment_accounting_classifications: [],
      })
    );

    const graphFinding = result.findings.find(
      (finding) => finding.code === "schedule.contract_invoice_links_rebalanced"
    );
    expect(graphFinding?.entityId).toBe("contract-1");
    expect(graphFinding?.repair?.command).toBe(
      "schedule.realign_contract_invoice_links_v3"
    );
    expect(graphFinding?.repair?.values).toEqual({
      assignments: [
        {
          schedule_id: "schedule-january",
          expected_invoice_id: null,
          invoice_id: "invoice-january",
        },
        {
          schedule_id: "schedule-february",
          expected_invoice_id: "invoice-january",
          invoice_id: "invoice-february",
        },
        {
          schedule_id: "schedule-march",
          expected_invoice_id: "invoice-february",
          invoice_id: "invoice-march",
        },
      ],
    });
    expect(result.findings.map((finding) => finding.code)).not.toContain(
      "schedule.invoice_link_mismatch"
    );
  });

  it("classifies a completed receipt with no invoice candidate as a customer advance", async () => {
    const result = await runDomainWorker(
      createWorkerContext("contracts", {
        contracts: [
          {
            id: "contract-1",
            company_id: "company-1",
            contract_number: "C-1",
            status: "active",
            contract_amount: 1_000,
            total_paid: 500,
            balance_due: 500,
            payment_status: "partial",
            start_date: "2026-01-01",
            end_date: "2026-12-31",
            contract_date: "2026-01-01",
            customer_id: "customer-1",
            vehicle_id: "vehicle-1",
          },
        ],
        invoices: [],
        payments: [
          {
            id: "payment-1",
            company_id: "company-1",
            contract_id: "contract-1",
            customer_id: "customer-1",
            invoice_id: null,
            amount: 500,
            payment_date: "2026-06-01",
            payment_status: "completed",
            transaction_type: "receipt",
            journal_entry_id: "journal-1",
            payment_number: "PAY-1",
            reference_number: null,
            allocation_status: "unallocated",
          },
        ],
        contract_payment_schedules: [],
        payment_allocations: [],
        payment_accounting_classifications: [],
      })
    );

    expect(result.findings).toContainEqual(
      expect.objectContaining({
        code: "payment.completed_unlinked_customer_advance",
        entityId: "payment-1",
        repair: expect.objectContaining({
          command: "payment.classify_customer_advance",
          autoApply: true,
        }),
      })
    );
  });

  it("does not reopen a verified customer-advance classification without an invoice candidate", async () => {
    const result = await runDomainWorker(
      createWorkerContext("contracts", {
        contracts: [
          {
            id: "contract-1",
            company_id: "company-1",
            contract_number: "C-1",
            status: "active",
            contract_amount: 500,
            total_paid: 500,
            balance_due: 0,
            payment_status: "paid",
            start_date: "2026-01-01",
            end_date: "2026-12-31",
            contract_date: "2026-01-01",
            customer_id: "customer-1",
            vehicle_id: "vehicle-1",
          },
        ],
        invoices: [],
        payments: [
          {
            id: "payment-1",
            company_id: "company-1",
            contract_id: "contract-1",
            customer_id: "customer-1",
            invoice_id: null,
            amount: 500,
            payment_date: "2026-06-01",
            payment_status: "completed",
            transaction_type: "receipt",
            journal_entry_id: "journal-1",
            payment_number: "PAY-1",
            reference_number: null,
            allocation_status: "unallocated",
          },
        ],
        contract_payment_schedules: [],
        payment_allocations: [],
        payment_accounting_classifications: [
          {
            company_id: "company-1",
            payment_id: "payment-1",
            classification: "customer_advance",
            is_active: true,
          },
        ],
      })
    );

    expect(result.findings.map((finding) => finding.code)).not.toContain(
      "payment.completed_unlinked_customer_advance"
    );
  });

  it("plans one reversible consolidation for identical active duplicate schedules", async () => {
    const schedule = {
      company_id: "company-1",
      contract_id: "contract-1",
      invoice_id: "invoice-1",
      amount: 1_000,
      paid_amount: 0,
      status: "pending",
      paid_date: null,
      due_date: "2026-08-01",
      installment_number: 1,
    };
    const result = await runDomainWorker(
      createWorkerContext("contracts", {
        contracts: [
          {
            id: "contract-1",
            company_id: "company-1",
            contract_number: "C-1",
            status: "active",
            contract_amount: 1_000,
            total_paid: 0,
            balance_due: 1_000,
            payment_status: "unpaid",
            start_date: "2026-01-01",
            end_date: "2026-12-31",
            contract_date: "2026-01-01",
            customer_id: "customer-1",
            vehicle_id: "vehicle-1",
          },
        ],
        invoices: [
          {
            id: "invoice-1",
            company_id: "company-1",
            contract_id: "contract-1",
            customer_id: "customer-1",
            invoice_number: "INV-1",
            invoice_date: "2026-08-01",
            due_date: "2026-08-01",
            subtotal: 1_000,
            total_amount: 1_000,
            paid_amount: 0,
            balance_due: 1_000,
            status: "sent",
            payment_status: "unpaid",
            journal_entry_id: null,
          },
        ],
        payments: [],
        contract_payment_schedules: [
          { ...schedule, id: "schedule-1" },
          { ...schedule, id: "schedule-2" },
        ],
        payment_allocations: [],
        payment_accounting_classifications: [],
      })
    );

    expect(result.findings).toContainEqual(
      expect.objectContaining({
        code: "schedule.duplicate_rows",
        entityId: "contract-1",
        repair: expect.objectContaining({
          command: "schedule.consolidate_duplicate_rows",
          autoApply: true,
        }),
      })
    );
    expect(
      result.findings.filter(
        (finding) => finding.code === "schedule.duplicate_rows"
      )
    ).toHaveLength(1);
  });

  it("creates an approved repair command when a customer balance summary is missing", async () => {
    const result = await runDomainWorker(
      createWorkerContext("customers", {
        customers: [
          {
            id: "customer-1",
            company_id: "company-1",
            customer_code: "CUS-1",
            phone: null,
            national_id: null,
            is_active: true,
            is_blacklisted: false,
          },
        ],
        invoices: [],
        payments: [],
        customer_balances: [],
        contracts: [],
        payment_allocations: [],
      })
    );

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      code: "customer.balance_summary_missing",
      entityType: "customer",
      entityId: "customer-1",
      repair: {
        command: "customer.create_balance",
        expectedBefore: { exists: false },
        values: {},
        autoApply: true,
      },
    });
  });
});
