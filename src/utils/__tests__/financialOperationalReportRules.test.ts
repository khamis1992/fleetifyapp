import { describe, expect, it } from "vitest";
import {
  buildBankReconciliationSummary,
  buildReceivablesAgingReport,
} from "../financialOperationalReportRules";

describe("financialOperationalReportRules", () => {
  it("builds receivables aging buckets from invoice due dates", () => {
    const report = buildReceivablesAgingReport(
      [
        { id: "inv-1", invoiceNumber: "INV-1", dueDate: "2026-06-27", balanceDue: 100 },
        { id: "inv-2", invoiceNumber: "INV-2", dueDate: "2026-06-01", balanceDue: 200 },
        { id: "inv-3", invoiceNumber: "INV-3", dueDate: "2026-04-20", balanceDue: 300 },
        { id: "inv-4", invoiceNumber: "INV-4", dueDate: "2026-02-01", balanceDue: 400 },
      ],
      "2026-06-27",
    );

    expect(report.buckets.current).toBe(100);
    expect(report.buckets["1_30"]).toBe(200);
    expect(report.buckets["61_90"]).toBe(300);
    expect(report.buckets.over_90).toBe(400);
    expect(report.totalOutstanding).toBe(1000);
  });

  it("keeps future invoices in the current aging bucket", () => {
    const report = buildReceivablesAgingReport(
      [{ id: "inv-1", invoiceNumber: "INV-1", dueDate: "2026-07-01", balanceDue: 75 }],
      "2026-06-27",
    );

    expect(report.buckets.current).toBe(75);
    expect(report.lines[0].ageDays).toBe(0);
  });

  it("summarizes bank reconciliation status and rate", () => {
    const report = buildBankReconciliationSummary([
      { id: "line-1", source: "payment", amount: 100, status: "reconciled" },
      { id: "line-2", source: "statement_line", amount: 50, status: "needs_review" },
      { id: "line-3", source: "bank_transaction", amount: 25, status: "unmatched" },
    ]);

    expect(report.summary.reconciled.count).toBe(1);
    expect(report.unreconciledAmount).toBe(75);
    expect(report.reconciliationRate).toBe(57.14);
    expect(report.isHealthy).toBe(false);
  });

  it("marks a fully reconciled bank report as healthy", () => {
    const report = buildBankReconciliationSummary([
      { id: "line-1", source: "payment", amount: 100, status: "reconciled" },
      { id: "line-2", source: "bank_transaction", amount: 200, status: "reconciled" },
    ]);

    expect(report.isHealthy).toBe(true);
    expect(report.reconciliationRate).toBe(100);
  });
});
