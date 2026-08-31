import { describe, expect, it } from "vitest";
import {
  buildCanonicalContractReceiptContributions,
  buildCanonicalInvoiceReceiptContributions,
  canLinkInvoiceForSchedule,
  canGenerateInvoiceForSchedule,
  dateOnly,
  deriveAttendanceHours,
  deriveContractFinancialTotals,
  deriveFinancialTotals,
  deriveLegalCaseCosts,
  deriveOneToOneScheduleInvoicePlan,
  derivePayrollNet,
  deriveStockOnHand,
  deriveSchedulePaymentState,
  deriveVehicleStatus,
  isInactiveScheduleStatus,
  isInactiveInvoiceStatus,
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

  it("caps contract totals at the contract principal like the canonical recalculation", () => {
    expect(
      deriveContractFinancialTotals(55_500, [
        { amount: 70_900, transaction_type: "receipt", payment_status: "completed" },
      ])
    ).toEqual({ paid: 55_500, balance: 0, paymentStatus: "paid" });

    expect(
      deriveContractFinancialTotals(84_000, [
        { amount: 48_550, transaction_type: "receipt", payment_status: "completed" },
      ])
    ).toEqual({ paid: 48_550, balance: 35_450, paymentStatus: "partial" });

    expect(
      deriveContractFinancialTotals(63_000, [
        { amount: 66_600, transaction_type: "receipt", payment_status: "completed" },
      ])
    ).toEqual({ paid: 63_000, balance: 0, paymentStatus: "paid" });

    expect(deriveContractFinancialTotals(1_750, [])).toEqual({
      paid: 0,
      balance: 1_750,
      paymentStatus: "unpaid",
    });

    // A zero-amount contract reports the full uncapped collection.
    expect(
      deriveContractFinancialTotals(0, [
        { amount: 500, transaction_type: "receipt", payment_status: "completed" },
      ])
    ).toEqual({ paid: 500, balance: 0, paymentStatus: "paid" });
  });

  it("treats invoice billing months inside the contract as in-period", () => {
    expect(
      isInvoiceOutsideContractBillingPeriod(
        {
          invoice_month: "2026-12-01",
          invoice_date: "2027-01-01",
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

    expect(
      deriveVehicleStatus({
        currentStatus: "maintenance",
        isActive: true,
        hasActiveContract: false,
        hasOpenMaintenance: false,
        hasActiveReservation: false,
      })
    ).toBe("available");
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
    expect(isInactiveScheduleStatus("inactive")).toBe(true);
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

  it("uses invoice_month first, then invoice_date, and never due_date", () => {
    const invoice = {
      invoice_month: "2026-02-01",
      invoice_date: "2026-03-01",
      due_date: "2026-04-01",
    };
    expect(invoiceMonthKey(invoice)).toBe("2026-02");
    expect(invoiceConflictsWithMonth(invoice, "2026-02")).toBe(true);
    expect(invoiceConflictsWithMonth(invoice, "2026-03")).toBe(false);
    expect(invoiceConflictsWithMonth(invoice, "2026-04")).toBe(false);
    expect(invoiceMonthKey({ invoice_month: null, invoice_date: "2026-03-15", due_date: "2026-04-01" })).toBe("2026-03");
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
          invoice_month: "2026-04-01",
          invoice_date: "2026-04-01",
          due_date: "2026-05-01",
        },
        {
          id: "invoice-may",
          invoice_month: "2026-05-01",
          invoice_date: "2026-05-01",
          due_date: "2026-06-01",
        },
      ]
    );

    expect(plan.complete).toBe(true);
    expect(plan.billingDateMode).toBe("invoice_date");
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
        candidateInvoiceIds: ["invoice-may"],
      },
    ]);
  });

  it("uses explicit invoice months even when issue and due dates cross boundaries", () => {
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
          invoice_month: "2027-06-01",
          invoice_date: "2027-05-01",
          due_date: "2027-07-01",
        },
        {
          id: "invoice-june",
          invoice_month: "2027-07-01",
          invoice_date: "2027-06-01",
          due_date: "2027-08-01",
        },
      ]
    );

    expect(plan.complete).toBe(true);
    expect(plan.billingDateMode).toBe("invoice_date");
    expect(
      plan.assignments.map((assignment) => assignment.newInvoiceId)
    ).toEqual(["invoice-may", "invoice-june"]);
  });

  it("does not use invoice due dates to fill a missing billing month", () => {
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
        {
          id: "schedule-june",
          due_date: "2026-06-01",
          invoice_id: "invoice-june",
        },
      ],
      [
        {
          id: "invoice-april",
          invoice_date: "2026-04-01",
          due_date: "2026-05-01",
        },
        {
          id: "invoice-june",
          invoice_date: "2026-06-01",
          due_date: "2026-07-01",
        },
      ]
    );

    expect(plan.billingDateMode).toBe("invoice_date");
    expect(plan.complete).toBe(false);
    expect(plan.unmatchedScheduleIds).toEqual(["schedule-may"]);
    expect(
      plan.assignments.find((item) => item.scheduleId === "schedule-may")
        ?.candidateInvoiceIds
    ).toEqual([]);
  });

  it("uses canonical issue-month billing when both conventions are incomplete", () => {
    const plan = deriveOneToOneScheduleInvoicePlan(
      [
        {
          id: "schedule-june",
          due_date: "2026-06-01",
          invoice_id: "invoice-may",
        },
        {
          id: "schedule-july",
          due_date: "2026-07-01",
          invoice_id: "invoice-june",
        },
        { id: "schedule-august", due_date: "2026-08-01", invoice_id: null },
      ],
      [
        {
          id: "invoice-may",
          invoice_date: "2026-05-01",
          due_date: "2026-06-01",
        },
        {
          id: "invoice-june",
          invoice_date: "2026-06-01",
          due_date: "2026-07-01",
        },
        {
          id: "invoice-august",
          invoice_date: "2026-08-01",
          due_date: "2026-09-01",
        },
      ]
    );

    expect(plan.complete).toBe(false);
    expect(plan.billingDateMode).toBe("invoice_date");
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

  it("plans a reversible canonical allocation repair for legacy invoice overpayments", async () => {
    const result = await runDomainWorker(
      createWorkerContext("contracts", {
        contracts: [
          {
            id: "contract-1",
            company_id: "company-1",
            contract_number: "C-1",
            status: "active",
            contract_amount: 1_000,
            total_paid: 1_500,
            balance_due: 0,
            payment_status: "paid",
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
            paid_amount: 1_500,
            balance_due: 0,
            status: "paid",
            payment_status: "paid",
            journal_entry_id: "invoice-journal-1",
          },
        ],
        payments: [
          {
            id: "payment-1",
            company_id: "company-1",
            contract_id: "contract-1",
            customer_id: "customer-1",
            invoice_id: "invoice-1",
            amount: 1_500,
            payment_date: "2026-02-01",
            payment_status: "completed",
            transaction_type: "receipt",
            journal_entry_id: "payment-journal-1",
            payment_number: "PAY-1",
            reference_number: "REF-1",
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
        code: "invoice.legacy_direct_overpayment",
        entityId: "invoice-1",
        repair: expect.objectContaining({
          command: "invoice.normalize_legacy_overpayment",
          autoApply: true,
        }),
      })
    );
    expect(result.findings.map((finding) => finding.code)).not.toContain(
      "invoice.balance_mismatch"
    );
  });

  it("does not flag catch-up monthly payments as duplicates when each settles a different invoice", async () => {
    // Regression guard for the false-positive duplicate detector: a customer
    // paying 23 overdue months with identical clicks produced 23 payments of
    // the same amount on the same date for the SAME contract but for DIFFERENT
    // invoices. Those are legitimate allocations, not duplicates.
    const catchUpInvoices = Array.from({ length: 3 }, (_, index) => ({
      id: `invoice-${index + 1}`,
      company_id: "company-1",
      contract_id: "contract-1",
      customer_id: "customer-1",
      invoice_number: `INV-2026-${String(index + 1).padStart(3, "0")}`,
      invoice_date: "2026-01-01",
      due_date: `2026-0${index + 1}-01`,
      subtotal: 1_800,
      total_amount: 1_800,
      paid_amount: 1_800,
      balance_due: 0,
      status: "paid",
      payment_status: "paid",
      journal_entry_id: `invoice-journal-${index + 1}`,
    }));

    const catchUpPayments = catchUpInvoices.map((invoice, index) => ({
      id: `payment-${index + 1}`,
      company_id: "company-1",
      contract_id: "contract-1",
      customer_id: "customer-1",
      invoice_id: invoice.id,
      amount: 1_800,
      payment_date: "2026-07-25",
      payment_status: "completed",
      transaction_type: "receipt",
      journal_entry_id: `payment-journal-${index + 1}`,
      payment_number: `REC-26-1${String(20 + index).padStart(2, "0")}`,
      reference_number: null,
      allocation_status: "unallocated",
    }));

    const catchUpResult = await runDomainWorker(
      createWorkerContext("contracts", {
        contracts: [
          {
            id: "contract-1",
            company_id: "company-1",
            contract_number: "C-1",
            status: "active",
            contract_amount: 64_800,
            total_paid: 5_400,
            balance_due: 59_400,
            payment_status: "partial",
            start_date: "2026-01-01",
            end_date: "2028-12-31",
            contract_date: "2026-01-01",
            customer_id: "customer-1",
            vehicle_id: "vehicle-1",
          },
        ],
        invoices: catchUpInvoices,
        payments: catchUpPayments,
        contract_payment_schedules: [],
        payment_allocations: [],
        payment_accounting_classifications: [],
      })
    );

    expect(
      catchUpResult.findings.map((finding) => finding.code)
    ).not.toContain("payment.possible_duplicate");

    // The same contract, same date, same amount, SAME invoice twice must
    // still be flagged as a possible duplicate.
    const trueDuplicateResult = await runDomainWorker(
      createWorkerContext("contracts", {
        contracts: [
          {
            id: "contract-1",
            company_id: "company-1",
            contract_number: "C-1",
            status: "active",
            contract_amount: 3_600,
            total_paid: 3_600,
            balance_due: 0,
            payment_status: "paid",
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
            subtotal: 1_800,
            total_amount: 1_800,
            paid_amount: 3_600,
            balance_due: 0,
            status: "paid",
            payment_status: "paid",
            journal_entry_id: "invoice-journal-1",
          },
        ],
        payments: [
          {
            id: "payment-1",
            company_id: "company-1",
            contract_id: "contract-1",
            customer_id: "customer-1",
            invoice_id: "invoice-1",
            amount: 1_800,
            payment_date: "2026-07-25",
            payment_status: "completed",
            transaction_type: "receipt",
            journal_entry_id: "payment-journal-1",
            payment_number: "REC-26-1001",
            reference_number: null,
            allocation_status: "unallocated",
          },
          {
            id: "payment-2",
            company_id: "company-1",
            contract_id: "contract-1",
            customer_id: "customer-1",
            invoice_id: "invoice-1",
            amount: 1_800,
            payment_date: "2026-07-25",
            payment_status: "completed",
            transaction_type: "receipt",
            journal_entry_id: "payment-journal-2",
            payment_number: "REC-26-1002",
            reference_number: null,
            allocation_status: "unallocated",
          },
        ],
        contract_payment_schedules: [],
        payment_allocations: [],
        payment_accounting_classifications: [],
      })
    );

    expect(trueDuplicateResult.findings).toContainEqual(
      expect.objectContaining({
        code: "payment.possible_duplicate",
      })
    );
  });

  it("flags real overpayment with contract details and ignores zero-principal contracts", async () => {
    // A cancelled import with contract_amount = 0 must NOT be reported as
    // overpaid — every receipt on it previously produced a phantom finding.
    const zeroPrincipalResult = await runDomainWorker(
      createWorkerContext("contracts", {
        contracts: [
          {
            id: "contract-1",
            company_id: "company-1",
            contract_number: "CANCELLED-IMPORT",
            status: "cancelled",
            contract_amount: 0,
            total_paid: 4_000,
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
            amount: 4_000,
            payment_date: "2026-06-01",
            payment_status: "completed",
            transaction_type: "receipt",
            journal_entry_id: "payment-journal-1",
            payment_number: "REC-26-1",
            reference_number: null,
            allocation_status: "unallocated",
          },
        ],
        contract_payment_schedules: [],
        payment_allocations: [],
        payment_accounting_classifications: [],
      })
    );

    expect(
      zeroPrincipalResult.findings.map((finding) => finding.code)
    ).not.toContain("contract.possible_overpayment");

    // A real overpayment (receipts exceed principal) must surface with
    // contract number and excess amount for the review queue.
    const overpaidResult = await runDomainWorker(
      createWorkerContext("contracts", {
        contracts: [
          {
            id: "contract-1",
            company_id: "company-1",
            contract_number: "C-ALF-TEST",
            status: "active",
            contract_amount: 55_500,
            total_paid: 55_500,
            balance_due: 0,
            payment_status: "paid",
            start_date: "2026-01-01",
            end_date: "2028-12-31",
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
            amount: 92_260,
            payment_date: "2026-07-01",
            payment_status: "completed",
            transaction_type: "receipt",
            journal_entry_id: "payment-journal-1",
            payment_number: "REC-26-1",
            reference_number: null,
            allocation_status: "unallocated",
          },
        ],
        contract_payment_schedules: [],
        payment_allocations: [],
        payment_accounting_classifications: [],
      })
    );

    expect(overpaidResult.findings).toContainEqual(
      expect.objectContaining({
        code: "contract.possible_overpayment",
        entityType: "contract",
        evidence: expect.objectContaining({
          contractNumber: "C-ALF-TEST",
          excess: 36_760,
        }),
      })
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

  it("trusts an existing link when invoice_month matches despite shifted issue and due dates", async () => {
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
            invoice_month: "2026-08-01",
            invoice_date: "2026-07-01",
            due_date: "2026-09-01",
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

  it("uses the same inactive invoice lifecycle values as the database guard", () => {
    expect(isInactiveInvoiceStatus("cancelled")).toBe(true);
    expect(isInactiveInvoiceStatus("VOIDED")).toBe(true);
    expect(isInactiveInvoiceStatus("deleted")).toBe(true);
    expect(isInactiveInvoiceStatus("inactive")).toBe(true);
    expect(isInactiveInvoiceStatus("failed")).toBe(false);
    expect(isInactiveInvoiceStatus("refunded")).toBe(false);
  });

  it("does not let an August invoice reserve the September schedule month", async () => {
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
          {
            id: "invoice-august",
            company_id: "company-1",
            contract_id: "contract-1",
            customer_id: "customer-1",
            invoice_number: "INV-AUG",
            invoice_month: "2026-08-01",
            invoice_date: "2026-09-01",
            due_date: "2026-09-15",
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
            id: "schedule-august",
            company_id: "company-1",
            contract_id: "contract-1",
            invoice_id: "invoice-august",
            amount: 1_000,
            paid_amount: 0,
            status: "pending",
            paid_date: null,
            due_date: "2026-08-01",
            installment_number: 1,
          },
          {
            id: "schedule-september",
            company_id: "company-1",
            contract_id: "contract-1",
            invoice_id: null,
            amount: 1_000,
            paid_amount: 0,
            status: "pending",
            paid_date: null,
            due_date: "2026-09-01",
            installment_number: 2,
          },
        ],
        payment_allocations: [],
        payment_accounting_classifications: [],
      })
    );

    const septemberFinding = result.findings.find(
      (finding) => finding.entityId === "schedule-september"
    );
    expect(septemberFinding?.code).toBe("schedule.missing_invoice");
    expect(septemberFinding?.repair?.command).toBe(
      "contract.generate_missing_invoice"
    );
    expect(result.findings.map((finding) => finding.code)).not.toContain(
      "schedule.invoice_month_constraint_conflict"
    );
    expect(result.findings.map((finding) => finding.code)).not.toContain(
      "schedule.due_month_invoice_missing"
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

  it("plans an invoice-date repair for a safe legal contract", async () => {
    const result = await runDomainWorker(
      createWorkerContext("contracts", {
        contracts: [
          {
            id: "contract-1",
            company_id: "company-1",
            contract_number: "C-LEGAL-1",
            status: "under_legal_procedure",
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
          {
            id: "invoice-february",
            company_id: "company-1",
            contract_id: "contract-1",
            customer_id: "customer-1",
            invoice_number: "INV-2026-02",
            invoice_date: "2026-02-01",
            due_date: "2026-02-01",
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
            id: "schedule-february",
            company_id: "company-1",
            contract_id: "contract-1",
            invoice_id: "invoice-february",
            amount: 1_000,
            paid_amount: 0,
            status: "pending",
            paid_date: null,
            due_date: "2026-02-01",
            installment_number: 1,
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
            installment_number: 2,
          },
        ],
        payment_allocations: [],
        payment_accounting_classifications: [],
      })
    );

    const repair = result.findings.find(
      (finding) => finding.code === "schedule.stale_invoice_link"
    );
    expect(repair?.entityId).toBe("schedule-march");
    expect(repair?.repair?.command).toBe("schedule.repair_invoice_link");
    expect(repair?.repair?.values).toEqual({
      billing_date_mode: "invoice_date",
    });
    expect(result.findings.map((finding) => finding.code)).not.toContain(
      "schedule.invoice_link_graph_requires_review"
    );
  });

  it("does not overbill a contract under legal procedure", async () => {
    const result = await runDomainWorker(
      createWorkerContext("contracts", {
        contracts: [
          {
            id: "contract-1",
            company_id: "company-1",
            contract_number: "C-LEGAL-2",
            status: "under_legal_procedure",
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
            id: "invoice-february",
            company_id: "company-1",
            contract_id: "contract-1",
            customer_id: "customer-1",
            invoice_number: "INV-2026-02",
            invoice_date: "2026-02-01",
            due_date: "2026-02-01",
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
            id: "schedule-february",
            company_id: "company-1",
            contract_id: "contract-1",
            invoice_id: "invoice-february",
            amount: 1_000,
            paid_amount: 0,
            status: "pending",
            paid_date: null,
            due_date: "2026-02-01",
            installment_number: 1,
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
            installment_number: 2,
          },
        ],
        payment_allocations: [],
        payment_accounting_classifications: [],
      })
    );

    expect(result.findings).toContainEqual(
      expect.objectContaining({
        code: "schedule.invoice_link_graph_requires_review",
      })
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

  it("keeps a full-graph realignment in review when any schedule is outside the contract", async () => {
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
            start_date: "2026-02-01",
            end_date: "2026-12-31",
            contract_date: "2026-02-01",
            customer_id: "customer-1",
            vehicle_id: "vehicle-1",
          },
        ],
        invoices: [
          invoice("invoice-january", "2026-01"),
          invoice("invoice-february", "2026-02"),
        ],
        payments: [],
        contract_payment_schedules: [
          {
            id: "schedule-january",
            company_id: "company-1",
            contract_id: "contract-1",
            invoice_id: "invoice-february",
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
        ],
        payment_allocations: [],
        payment_accounting_classifications: [],
      })
    );

    expect(result.findings).toContainEqual(
      expect.objectContaining({
        code: "schedule.invoice_link_graph_requires_review",
      })
    );
    expect(
      result.findings.find(
        (finding) =>
          finding.code === "schedule.invoice_link_graph_requires_review"
      )?.repair
    ).toBeUndefined();
    expect(result.findings.map((finding) => finding.code)).not.toContain(
      "schedule.contract_invoice_links_rebalanced"
    );
    expect(result.findings.map((finding) => finding.code)).not.toContain(
      "schedule.contract_invoice_links_shifted"
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

  it("keeps duplicate schedules in review when consolidation would change the contract total", async () => {
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
        code: "schedule.duplicate_rows_ambiguous",
      })
    );
    expect(
      result.findings.find(
        (finding) => finding.code === "schedule.duplicate_rows_ambiguous"
      )?.repair
    ).toBeUndefined();
    expect(result.findings.map((finding) => finding.code)).not.toContain(
      "schedule.duplicate_rows"
    );
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

  it("sends a completed bank payment without a bank to human reconciliation review", async () => {
    const context = createWorkerContext("accounting", {
      payments: [
        {
          id: "payment-1",
          company_id: "company-1",
          payment_number: "PAY-1",
          payment_date: "2026-07-01",
          payment_status: "completed",
          amount: 500,
          journal_entry_id: "journal-1",
          payment_method: "bank_transfer",
          bank_id: null,
          reconciliation_status: "pending",
          reconciled_at: null,
        },
      ],
      journal_entries: [
        {
          id: "journal-1",
          company_id: "company-1",
          status: "posted",
          entry_date: "2026-07-01",
          reference_type: "payment",
          reference_id: "payment-1",
        },
      ],
      bank_transactions: [],
    });
    context.job.cursor = { phase: "payments", lastId: "" };

    const result = await runDomainWorker(context);

    expect(result.findings).toContainEqual(
      expect.objectContaining({
        code: "accounting.bank_payment_missing_bank_for_reconciliation",
        entityId: "payment-1",
      })
    );
    expect(result.findings[0].repair).toBeUndefined();
    expect(result.cursor).toEqual({
      phase: "traffic_violation_payments",
      lastId: "",
    });
    expect(result.hasMore).toBe(true);
  });

  it("assigns a missing payment bank only when the company has one active bank", async () => {
    const context = createWorkerContext("accounting", {
      payments: [
        {
          id: "payment-single-bank",
          company_id: "company-1",
          payment_number: "PAY-SINGLE-BANK",
          payment_date: "2026-07-01",
          payment_status: "completed",
          amount: 500,
          journal_entry_id: "journal-single-bank",
          payment_method: "bank_transfer",
          bank_id: null,
          reconciliation_status: "pending",
          reconciled_at: null,
        },
      ],
      journal_entries: [
        {
          id: "journal-single-bank",
          company_id: "company-1",
          status: "posted",
          entry_date: "2026-07-01",
          reference_type: "payment",
          reference_id: "payment-single-bank",
        },
      ],
      bank_transactions: [],
      banks: [
        {
          id: "bank-only",
          company_id: "company-1",
          is_active: true,
        },
      ],
    });
    context.job.cursor = { phase: "payments", lastId: "" };

    const result = await runDomainWorker(context);

    expect(result.findings).toContainEqual(
      expect.objectContaining({
        code: "accounting.bank_payment_assigned_single_active_bank",
        entityId: "payment-single-bank",
        repair: {
          command: "accounting.assign_single_active_bank",
          entityType: "payment",
          entityId: "payment-single-bank",
          expectedBefore: { bank_id: null },
          values: { bank_id: "bank-only" },
          autoApply: true,
        },
      })
    );
  });

  it("does not guess a payment bank when multiple active banks exist", async () => {
    const context = createWorkerContext("accounting", {
      payments: [
        {
          id: "payment-multiple-banks",
          company_id: "company-1",
          payment_number: "PAY-MULTIPLE-BANKS",
          payment_date: "2026-07-01",
          payment_status: "completed",
          amount: 500,
          journal_entry_id: "journal-multiple-banks",
          payment_method: "bank_transfer",
          bank_id: null,
          reconciliation_status: "pending",
          reconciled_at: null,
        },
      ],
      journal_entries: [
        {
          id: "journal-multiple-banks",
          company_id: "company-1",
          status: "posted",
          entry_date: "2026-07-01",
          reference_type: "payment",
          reference_id: "payment-multiple-banks",
        },
      ],
      bank_transactions: [],
      banks: [
        { id: "bank-1", company_id: "company-1", is_active: true },
        { id: "bank-2", company_id: "company-1", is_active: true },
      ],
    });
    context.job.cursor = { phase: "payments", lastId: "" };

    const result = await runDomainWorker(context);
    const finding = result.findings.find(
      (item) => item.entityId === "payment-multiple-banks"
        && item.code === "accounting.bank_payment_missing_bank_for_reconciliation"
    );

    expect(finding).toMatchObject({
      code: "accounting.bank_payment_missing_bank_for_reconciliation",
    });
    expect(finding?.repair).toBeUndefined();
  });

  it("plans the canonical repair for a completed traffic violation payment without a journal", async () => {
    const context = createWorkerContext("accounting", {
      traffic_violation_payments: [
        {
          id: "traffic-payment-1",
          company_id: "company-1",
          traffic_violation_id: "violation-1",
          payment_number: "TVP-1",
          payment_date: "2026-07-01",
          amount: 750,
          payment_method: "cash",
          status: "completed",
          journal_entry_id: null,
        },
      ],
      journal_entries: [],
    });
    context.job.cursor = { phase: "traffic_violation_payments", lastId: "" };

    const result = await runDomainWorker(context);

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      code: "accounting.traffic_violation_payment_missing_journal",
      entityType: "traffic_violation_payment",
      entityId: "traffic-payment-1",
      repair: {
        command: "traffic_violation_payment.post_missing_journal",
        expectedBefore: { status: "completed", journal_entry_id: null },
        values: {},
        autoApply: true,
      },
    });
    expect(result.cursor).toEqual({
      phase: "vehicle_installment_payments",
      lastId: "",
    });
    expect(result.hasMore).toBe(true);
  });

  it("keeps a traffic violation payment with a broken journal link in review", async () => {
    const context = createWorkerContext("accounting", {
      traffic_violation_payments: [
        {
          id: "traffic-payment-2",
          company_id: "company-1",
          traffic_violation_id: "violation-2",
          payment_number: "TVP-2",
          payment_date: "2026-07-02",
          amount: 500,
          payment_method: "bank_transfer",
          status: "completed",
          journal_entry_id: "missing-journal",
        },
      ],
      journal_entries: [],
    });
    context.job.cursor = { phase: "traffic_violation_payments", lastId: "" };

    const result = await runDomainWorker(context);

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      code: "accounting.traffic_violation_payment_broken_journal_link",
      entityType: "traffic_violation_payment",
      entityId: "traffic-payment-2",
    });
    expect(result.findings[0].repair).toBeUndefined();
  });

  it("flags a legacy installment payment without a ledger or journal for review", async () => {
    const context = createWorkerContext("accounting", {
      vehicle_installment_schedules: [
        {
          id: "installment-schedule-1",
          company_id: "company-1",
          installment_id: "installment-1",
          installment_number: 2,
          amount: 1_000,
          paid_amount: 400,
          paid_date: "2026-06-20",
          payment_reference: "legacy-receipt",
          status: "partially_paid",
          journal_entry_id: null,
        },
      ],
      vehicle_installment_payments: [],
      journal_entries: [],
    });
    context.job.cursor = { phase: "vehicle_installment_payments", lastId: "" };

    const result = await runDomainWorker(context);

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      code: "accounting.vehicle_installment_legacy_payment_missing_journal",
      entityType: "vehicle_installment_schedule",
      entityId: "installment-schedule-1",
    });
    expect(result.findings[0].repair).toBeUndefined();
    expect(result.cursor).toEqual({ phase: "bank_transactions", lastId: "" });
  });

  it("flags installment balances that differ from the canonical payment ledger", async () => {
    const context = createWorkerContext("accounting", {
      vehicle_installment_schedules: [
        {
          id: "installment-schedule-2",
          company_id: "company-1",
          installment_id: "installment-2",
          installment_number: 1,
          amount: 1_000,
          paid_amount: 500,
          paid_date: "2026-07-01",
          status: "partially_paid",
          journal_entry_id: "journal-2",
        },
      ],
      vehicle_installment_payments: [
        {
          id: "installment-payment-2",
          company_id: "company-1",
          installment_id: "installment-2",
          schedule_id: "installment-schedule-2",
          payment_date: "2026-07-01",
          amount: 300,
          principal_amount: 280,
          interest_amount: 20,
          payment_method: "bank_transfer",
          status: "completed",
          journal_entry_id: "journal-2",
          reversal_journal_entry_id: null,
        },
      ],
      journal_entries: [
        {
          id: "journal-2",
          company_id: "company-1",
          status: "posted",
          entry_date: "2026-07-01",
          reference_type: "vehicle_installment_payment",
          reference_id: "installment-payment-2",
          reversal_entry_id: null,
        },
      ],
    });
    context.job.cursor = { phase: "vehicle_installment_payments", lastId: "" };

    const result = await runDomainWorker(context);

    expect(result.findings).toContainEqual(
      expect.objectContaining({
        code: "accounting.vehicle_installment_payment_total_mismatch",
        entityId: "installment-schedule-2",
      })
    );
    expect(result.findings[0].repair).toBeUndefined();
  });

  it("flags an unreconciled bank transaction that has no payment source", async () => {
    const context = createWorkerContext("accounting", {
      bank_transactions: [
        {
          id: "bank-transaction-1",
          company_id: "company-1",
          payment_id: null,
          bank_id: "bank-1",
          amount: 2_000,
          status: "completed",
          journal_entry_id: "journal-1",
          reconciled: false,
          reconciled_at: null,
          reversal_of_transaction_id: null,
          transaction_date: "2026-07-01",
          transaction_type: "deposit",
        },
      ],
    });
    context.job.cursor = { phase: "bank_transactions", lastId: "" };

    const result = await runDomainWorker(context);

    expect(result.findings).toContainEqual(
      expect.objectContaining({
        code: "accounting.bank_transaction_unlinked_for_reconciliation",
        entityType: "bank_transaction",
        entityId: "bank-transaction-1",
      })
    );
    expect(result.findings[0].repair).toBeUndefined();
    expect(result.cursor).toEqual({
      phase: "monthly_obligation_payments",
      lastId: "",
    });
    expect(result.hasMore).toBe(true);
  });

  it("plans a monthly-obligation payment-state repair from the canonical ledger", async () => {
    const context = createWorkerContext("accounting", {
      monthly_obligation_installments: [
        {
          id: "monthly-installment-1",
          company_id: "company-1",
          obligation_id: "monthly-obligation-1",
          amount: 1_000,
          paid_amount: 200,
          payment_ledger_baseline: 0,
          status: "partial",
          payment_date: "2026-07-01",
          vendor_payment_id: null,
          bank_transaction_id: null,
          journal_entry_id: null,
        },
      ],
      monthly_obligation_payments: [
        {
          id: "monthly-payment-1",
          company_id: "company-1",
          installment_id: "monthly-installment-1",
          amount: 1_000,
          payment_date: "2026-07-02",
          bank_id: null,
          vendor_payment_id: null,
          bank_transaction_id: null,
          journal_entry_id: "monthly-journal-1",
          status: "completed",
          reversal_of_payment_id: null,
        },
      ],
      journal_entries: [
        {
          id: "monthly-journal-1",
          company_id: "company-1",
          status: "posted",
          total_debit: 1_000,
          total_credit: 1_000,
          reversal_entry_id: null,
        },
      ],
      bank_transactions: [],
      vendor_payments: [],
    });
    context.job.cursor = { phase: "monthly_obligation_payments", lastId: "" };

    const result = await runDomainWorker(context);

    expect(result.findings).toContainEqual(
      expect.objectContaining({
        code: "accounting.monthly_obligation_payment_state_mismatch",
        entityId: "monthly-installment-1",
        repair: expect.objectContaining({
          command: "monthly_obligation.sync_payment_state",
          expectedBefore: {
            paid_amount: 200,
            status: "partial",
            payment_date: "2026-07-01",
          },
          values: {},
          autoApply: true,
        }),
      })
    );
  });

  it("keeps incomplete monthly-obligation accounting evidence in review", async () => {
    const context = createWorkerContext("accounting", {
      monthly_obligation_installments: [
        {
          id: "monthly-installment-2",
          company_id: "company-1",
          obligation_id: "monthly-obligation-2",
          amount: 1_000,
          paid_amount: 300,
          payment_ledger_baseline: 0,
          status: "partial",
          payment_date: "2026-07-03",
          vendor_payment_id: null,
          bank_transaction_id: null,
          journal_entry_id: null,
        },
      ],
      monthly_obligation_payments: [
        {
          id: "monthly-payment-2",
          company_id: "company-1",
          installment_id: "monthly-installment-2",
          amount: 300,
          payment_date: "2026-07-03",
          bank_id: "bank-1",
          vendor_payment_id: null,
          bank_transaction_id: null,
          journal_entry_id: "missing-journal",
          status: "completed",
          reversal_of_payment_id: null,
        },
      ],
      journal_entries: [],
      bank_transactions: [],
      vendor_payments: [],
    });
    context.job.cursor = { phase: "monthly_obligation_payments", lastId: "" };

    const result = await runDomainWorker(context);

    const journalFinding = result.findings.find(
      (finding) =>
        finding.code === "accounting.monthly_obligation_payment_invalid_journal"
    );
    const bankFinding = result.findings.find(
      (finding) =>
        finding.code ===
        "accounting.monthly_obligation_payment_invalid_bank_movement"
    );
    expect(journalFinding?.repair).toBeUndefined();
    expect(bankFinding?.repair).toBeUndefined();
  });

  it("keeps a legacy monthly-obligation baseline out of automatic repair", async () => {
    const context = createWorkerContext("accounting", {
      monthly_obligation_installments: [
        {
          id: "monthly-installment-3",
          company_id: "company-1",
          obligation_id: "monthly-obligation-3",
          amount: 1_000,
          paid_amount: 400,
          payment_ledger_baseline: 400,
          status: "partial",
          payment_date: "2026-06-30",
          vendor_payment_id: null,
          bank_transaction_id: null,
          journal_entry_id: null,
        },
      ],
      monthly_obligation_payments: [],
      journal_entries: [],
      bank_transactions: [],
      vendor_payments: [],
    });
    context.job.cursor = { phase: "monthly_obligation_payments", lastId: "" };

    const result = await runDomainWorker(context);

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      code: "accounting.monthly_obligation_legacy_payment_baseline",
      entityId: "monthly-installment-3",
    });
    expect(result.findings[0].repair).toBeUndefined();
  });

  it("plans a canonical rental-receipt state repair", async () => {
    const context = createWorkerContext("accounting", {
      rental_payment_receipts: [
        {
          id: "rental-receipt-1",
          company_id: "company-1",
          customer_id: "customer-1",
          contract_id: "contract-1",
          payment_date: "2026-07-04",
          amount_due: 1_000,
          total_paid: 600,
          pending_balance: 0,
          payment_status: "paid",
          idempotency_key: "idempotency-1",
          canonical_payment_id: "canonical-payment-1",
        },
      ],
      payments: [
        {
          id: "canonical-payment-1",
          company_id: "company-1",
          customer_id: "customer-1",
          contract_id: "contract-1",
          payment_date: "2026-07-04",
          amount: 600,
          payment_status: "completed",
          transaction_type: "receipt",
        },
      ],
    });
    context.job.cursor = { phase: "rental_receipt_payments", lastId: "" };

    const result = await runDomainWorker(context);

    expect(result.findings).toContainEqual(
      expect.objectContaining({
        code: "accounting.rental_receipt_payment_state_mismatch",
        entityId: "rental-receipt-1",
        repair: expect.objectContaining({
          command: "rental_receipt.sync_payment_state",
          values: {},
          autoApply: true,
        }),
      })
    );
  });

  it("keeps a rental receipt with mismatched payment evidence in review", async () => {
    const context = createWorkerContext("accounting", {
      rental_payment_receipts: [
        {
          id: "rental-receipt-2",
          company_id: "company-1",
          customer_id: "customer-1",
          contract_id: "contract-1",
          payment_date: "2026-07-04",
          amount_due: 1_000,
          total_paid: 600,
          pending_balance: 400,
          payment_status: "partial",
          idempotency_key: "idempotency-2",
          canonical_payment_id: "canonical-payment-2",
        },
      ],
      payments: [
        {
          id: "canonical-payment-2",
          company_id: "company-1",
          customer_id: "customer-1",
          contract_id: "contract-1",
          payment_date: "2026-07-04",
          amount: 500,
          payment_status: "completed",
          transaction_type: "receipt",
        },
      ],
    });
    context.job.cursor = { phase: "rental_receipt_payments", lastId: "" };

    const result = await runDomainWorker(context);

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      code: "accounting.rental_receipt_canonical_payment_mismatch",
      entityId: "rental-receipt-2",
    });
    expect(result.findings[0].repair).toBeUndefined();
  });

  it("flags completed maintenance with actual cost but no journal", async () => {
    const context = createWorkerContext("fleet", {
      vehicles: [
        {
          id: "vehicle-1",
          company_id: "company-1",
          plate_number: "12345",
          status: "available",
          is_active: true,
          current_mileage: 100,
          odometer_reading: 100,
        },
      ],
      vehicle_maintenance: [
        {
          id: "maintenance-1",
          company_id: "company-1",
          vehicle_id: "vehicle-1",
          status: "completed",
          completed_date: "2026-07-01",
          actual_cost: 900,
          tax_amount: 0,
          total_cost_with_tax: 900,
          expense_recorded: false,
          journal_entry_id: null,
          payment_method: "bank_transfer",
        },
      ],
      contracts: [],
      vehicle_reservations: [],
      odometer_readings: [],
      journal_entries: [],
    });

    const result = await runDomainWorker(context);

    expect(result.findings).toContainEqual(
      expect.objectContaining({
        code: "fleet.completed_maintenance_missing_journal",
        entityId: "maintenance-1",
      })
    );
  });

  it("accepts completed maintenance backed by its active posted journal", async () => {
    const context = createWorkerContext("fleet", {
      vehicles: [
        {
          id: "vehicle-2",
          company_id: "company-1",
          plate_number: "67890",
          status: "available",
          is_active: true,
          current_mileage: 200,
          odometer_reading: 200,
        },
      ],
      vehicle_maintenance: [
        {
          id: "maintenance-2",
          company_id: "company-1",
          vehicle_id: "vehicle-2",
          status: "completed",
          completed_date: "2026-07-01",
          actual_cost: 500,
          tax_amount: 0,
          total_cost_with_tax: 500,
          expense_recorded: true,
          journal_entry_id: "maintenance-journal-2",
          payment_method: "cash",
        },
      ],
      contracts: [],
      vehicle_reservations: [],
      odometer_readings: [],
      journal_entries: [
        {
          id: "maintenance-journal-2",
          company_id: "company-1",
          status: "posted",
          entry_date: "2026-07-01",
          reference_type: "maintenance",
          reference_id: "maintenance-2",
          reversal_entry_id: null,
          total_debit: 500,
          total_credit: 500,
        },
      ],
    });

    const result = await runDomainWorker(context);

    expect(result.findings).not.toContainEqual(
      expect.objectContaining({ entityId: "maintenance-2" })
    );
  });

  it("links the one posted amount-matched maintenance journal", async () => {
    const context = createWorkerContext("fleet", {
      vehicles: [
        {
          id: "vehicle-3",
          company_id: "company-1",
          plate_number: "54321",
          status: "available",
          is_active: true,
          current_mileage: 300,
          odometer_reading: 300,
        },
      ],
      vehicle_maintenance: [
        {
          id: "maintenance-3",
          company_id: "company-1",
          vehicle_id: "vehicle-3",
          status: "completed",
          actual_cost: 750,
          tax_amount: 0,
          total_cost_with_tax: 750,
          expense_recorded: false,
          journal_entry_id: null,
          payment_method: "cash",
        },
      ],
      contracts: [],
      vehicle_reservations: [],
      odometer_readings: [],
      journal_entries: [
        {
          id: "maintenance-journal-3",
          company_id: "company-1",
          status: "posted",
          entry_date: "2026-07-01",
          reference_type: "maintenance",
          reference_id: "maintenance-3",
          reversal_entry_id: null,
          total_debit: 750,
          total_credit: 750,
        },
      ],
    });

    const result = await runDomainWorker(context);

    expect(result.findings).toContainEqual(
      expect.objectContaining({
        code: "fleet.maintenance_verified_journal_unlinked",
        repair: expect.objectContaining({
          command: "maintenance.sync_accounting_link",
          values: {
            journal_entry_id: "maintenance-journal-3",
            expense_recorded: true,
          },
        }),
      })
    );
  });

  it("plans a canonical accrual for approved payroll with no journal", async () => {
    const context = createWorkerContext("employees", {
      employees: [
        {
          id: "employee-1",
          company_id: "company-1",
          employee_number: "EMP-1",
          is_active: true,
          account_status: "active",
          termination_date: null,
        },
      ],
      attendance_records: [],
      leave_balances: [],
      leave_requests: [],
      payroll: [
        {
          id: "payroll-1",
          company_id: "company-1",
          employee_id: "employee-1",
          payroll_number: "PR-1",
          status: "approved",
          payroll_date: "2026-07-01",
          payment_method: "bank_transfer",
          basic_salary: 8_000,
          allowances: 1_000,
          overtime_amount: 200,
          deductions: 100,
          tax_amount: 100,
          net_amount: 9_000,
          journal_entry_id: null,
        },
      ],
      journal_entries: [],
      journal_entry_lines: [],
    });

    const result = await runDomainWorker(context);

    expect(result.findings).toContainEqual(
      expect.objectContaining({
        code: "employee.approved_payroll_missing_accrual",
        entityId: "payroll-1",
        repair: expect.objectContaining({ command: "payroll.ensure_accrual" }),
      })
    );
  });

  it("plans a canonical payment journal for paid payroll", async () => {
    const context = createWorkerContext("employees", {
      employees: [
        {
          id: "employee-2",
          company_id: "company-1",
          employee_number: "EMP-2",
          is_active: true,
          account_status: "active",
          termination_date: null,
        },
      ],
      attendance_records: [],
      leave_balances: [],
      leave_requests: [],
      payroll: [
        {
          id: "payroll-2",
          company_id: "company-1",
          employee_id: "employee-2",
          payroll_number: "PR-2",
          status: "paid",
          payroll_date: "2026-07-01",
          payment_method: "cash",
          basic_salary: 5_000,
          allowances: 0,
          overtime_amount: 0,
          deductions: 0,
          tax_amount: 0,
          net_amount: 5_000,
          journal_entry_id: "payroll-accrual-2",
        },
      ],
      journal_entries: [
        {
          id: "payroll-accrual-2",
          company_id: "company-1",
          status: "posted",
          reference_type: "payroll",
          reference_id: "payroll-2",
          total_debit: 5_000,
          total_credit: 5_000,
          reversal_entry_id: null,
          created_at: "2026-07-01T00:00:00Z",
        },
      ],
      journal_entry_lines: [
        {
          id: "line-2a",
          journal_entry_id: "payroll-accrual-2",
          debit_amount: 5_000,
          credit_amount: 0,
          line_number: 1,
        },
        {
          id: "line-2b",
          journal_entry_id: "payroll-accrual-2",
          debit_amount: 0,
          credit_amount: 5_000,
          line_number: 2,
        },
      ],
    });

    const result = await runDomainWorker(context);

    expect(result.findings).toContainEqual(
      expect.objectContaining({
        code: "employee.paid_payroll_missing_payment_journal",
        entityId: "payroll-2",
        repair: expect.objectContaining({ command: "payroll.ensure_payment" }),
      })
    );
  });

  it("sends duplicate payroll accruals to review without a repair", async () => {
    const context = createWorkerContext("employees", {
      employees: [
        {
          id: "employee-3",
          company_id: "company-1",
          employee_number: "EMP-3",
          is_active: true,
          account_status: "active",
          termination_date: null,
        },
      ],
      attendance_records: [],
      leave_balances: [],
      leave_requests: [],
      payroll: [
        {
          id: "payroll-3",
          company_id: "company-1",
          employee_id: "employee-3",
          payroll_number: "PR-3",
          status: "approved",
          payroll_date: "2026-07-01",
          payment_method: "bank_transfer",
          basic_salary: 4_000,
          allowances: 0,
          overtime_amount: 0,
          deductions: 0,
          tax_amount: 0,
          net_amount: 4_000,
          journal_entry_id: "payroll-accrual-3a",
        },
      ],
      journal_entries: [
        {
          id: "payroll-accrual-3a",
          company_id: "company-1",
          status: "posted",
          reference_type: "payroll",
          reference_id: "payroll-3",
          total_debit: 4_000,
          total_credit: 4_000,
          reversal_entry_id: null,
          created_at: "2026-07-01T00:00:00Z",
        },
        {
          id: "payroll-accrual-3b",
          company_id: "company-1",
          status: "posted",
          reference_type: "payroll",
          reference_id: "payroll-3",
          total_debit: 4_000,
          total_credit: 4_000,
          reversal_entry_id: null,
          created_at: "2026-07-01T00:01:00Z",
        },
      ],
      journal_entry_lines: [],
    });

    const result = await runDomainWorker(context);
    const finding = result.findings.find(
      (item) => item.code === "employee.payroll_duplicate_accrual_journals"
    );

    expect(finding).toBeDefined();
    expect(finding?.repair).toBeUndefined();
  });

  it("plans a canonical purchase-order totals repair", async () => {
    const context = createWorkerContext("inventory", {
      purchase_orders: [
        {
          id: "po-1",
          company_id: "company-1",
          order_number: "PO-1",
          status: "draft",
          subtotal: 100,
          tax_amount: 5,
          total_amount: 105,
          delivery_date: null,
        },
      ],
      purchase_order_items: [
        {
          id: "po-item-1",
          purchase_order_id: "po-1",
          inventory_item_id: "item-1",
          item_code: "ITEM-1",
          quantity: 2,
          unit_price: 100,
          total_price: 200,
          received_quantity: 0,
        },
      ],
      goods_receipts: [],
    });
    context.job.cursor = { phase: "purchase_orders", lastId: "" };

    const result = await runDomainWorker(context);

    expect(result.findings).toContainEqual(
      expect.objectContaining({
        code: "inventory.purchase_order_totals_mismatch",
        entityId: "po-1",
        repair: expect.objectContaining({
          command: "purchase_order.sync_totals",
        }),
      })
    );
  });

  it("plans a purchase-order status repair from received quantities", async () => {
    const context = createWorkerContext("inventory", {
      purchase_orders: [
        {
          id: "po-2",
          company_id: "company-1",
          order_number: "PO-2",
          status: "sent_to_vendor",
          subtotal: 200,
          tax_amount: 0,
          total_amount: 200,
          delivery_date: null,
        },
      ],
      purchase_order_items: [
        {
          id: "po-item-2",
          purchase_order_id: "po-2",
          inventory_item_id: "item-2",
          item_code: "ITEM-2",
          quantity: 2,
          unit_price: 100,
          total_price: 200,
          received_quantity: 1,
        },
      ],
      goods_receipts: [],
    });
    context.job.cursor = { phase: "purchase_orders", lastId: "" };

    const result = await runDomainWorker(context);

    expect(result.findings).toContainEqual(
      expect.objectContaining({
        code: "inventory.purchase_order_receipt_status_mismatch",
        entityId: "po-2",
        repair: expect.objectContaining({
          command: "purchase_order.sync_receipt_status",
        }),
      })
    );
  });

  it("keeps missing goods-receipt accounting and movements in review", async () => {
    const context = createWorkerContext("inventory", {
      purchase_orders: [
        {
          id: "po-3",
          company_id: "company-1",
          order_number: "PO-3",
          status: "received",
          subtotal: 100,
          tax_amount: 0,
          total_amount: 100,
          delivery_date: "2026-07-12",
        },
      ],
      purchase_order_items: [
        {
          id: "po-item-3",
          purchase_order_id: "po-3",
          inventory_item_id: "item-3",
          item_code: "ITEM-3",
          quantity: 1,
          unit_price: 100,
          total_price: 100,
          received_quantity: 1,
        },
      ],
      goods_receipts: [
        {
          id: "receipt-3",
          company_id: "company-1",
          purchase_order_id: "po-3",
          warehouse_id: "warehouse-1",
          journal_entry_id: null,
          status: "completed",
          receipt_date: "2026-07-12",
          receipt_number: "GR-3",
        },
      ],
      goods_receipt_items: [
        {
          id: "receipt-item-3",
          goods_receipt_id: "receipt-3",
          purchase_order_item_id: "po-item-3",
          received_quantity: 1,
        },
      ],
      inventory_movements: [],
      journal_entries: [],
    });
    context.job.cursor = { phase: "purchase_orders", lastId: "" };

    const result = await runDomainWorker(context);

    const accountingFinding = result.findings.find(
      (finding) => finding.code === "inventory.goods_receipt_invalid_accounting"
    );
    const movementFinding = result.findings.find(
      (finding) => finding.code === "inventory.goods_receipt_movement_mismatch"
    );
    expect(accountingFinding).toBeDefined();
    expect(accountingFinding?.repair).toBeUndefined();
    expect(movementFinding).toBeDefined();
    expect(movementFinding?.repair).toBeUndefined();
  });

  it("repairs legal contract state and unsupported paid installments", async () => {
    const context = createWorkerContext("legal", {
      legal_cases: [
        {
          id: "case-1",
          company_id: "company-1",
          case_number: "LC-1",
          case_status: "open",
          contract_id: "contract-1",
          total_costs: 0,
          legal_fees: 0,
          court_fees: 0,
          other_expenses: 0,
          outcome_date: null,
          outcome_type: null,
        },
      ],
      contracts: [
        { id: "contract-1", company_id: "company-1", status: "active" },
      ],
      legal_case_payments: [],
      legal_repayment_plans: [
        {
          id: "plan-1",
          case_id: "case-1",
          company_id: "company-1",
          amount: 500,
          due_date: "2026-07-01",
          status: "paid",
        },
      ],
    });

    const result = await runDomainWorker(context);

    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "legal.contract_state_mismatch",
          repair: expect.objectContaining({ command: "legal.sync_contract_state" }),
        }),
        expect.objectContaining({
          code: "legal.repayment_paid_without_payment",
          repair: expect.objectContaining({
            command: "legal.reset_unsupported_repayment",
            values: { status: "overdue" },
          }),
        }),
      ])
    );
  });

  it("matches legal payments to paid installments one-to-one", async () => {
    const context = createWorkerContext("legal", {
      legal_cases: [
        {
          id: "case-2",
          company_id: "company-1",
          case_number: "LC-2",
          case_status: "open",
          contract_id: "contract-2",
          total_costs: 0,
          legal_fees: 0,
          court_fees: 0,
          other_expenses: 0,
          outcome_date: null,
          outcome_type: null,
        },
      ],
      contracts: [
        {
          id: "contract-2",
          company_id: "company-1",
          status: "under_legal_procedure",
        },
      ],
      legal_case_payments: [
        {
          id: "legal-payment-1",
          case_id: "case-2",
          company_id: "company-1",
          amount: 500,
          payment_status: "completed",
          invoice_id: "invoice-1",
          journal_entry_id: "journal-1",
          payment_date: "2026-07-01",
        },
      ],
      legal_repayment_plans: [
        {
          id: "plan-1",
          case_id: "case-2",
          company_id: "company-1",
          amount: 500,
          due_date: "2026-06-01",
          status: "paid",
        },
        {
          id: "plan-2",
          case_id: "case-2",
          company_id: "company-1",
          amount: 500,
          due_date: "2026-07-01",
          status: "paid",
        },
      ],
    });

    const result = await runDomainWorker(context);
    const unsupported = result.findings.filter(
      (finding) => finding.code === "legal.repayment_paid_without_payment"
    );

    expect(unsupported).toHaveLength(1);
    expect(unsupported[0].entityId).toBe("plan-2");
  });
});
