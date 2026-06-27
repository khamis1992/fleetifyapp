import { describe, expect, it } from "vitest";
import {
  buildCashFlowReport,
  buildGeneralLedgerReport,
} from "../ledgerCashFlowReportRules";

describe("ledgerCashFlowReportRules", () => {
  it("builds general ledger running balances in date and entry order", () => {
    const report = buildGeneralLedgerReport(
      [
        {
          id: "2",
          entryDate: "2026-06-02",
          entryNumber: "JE-002",
          accountCode: "1000",
          debit: 50,
          credit: 0,
        },
        {
          id: "1",
          entryDate: "2026-06-01",
          entryNumber: "JE-001",
          accountCode: "1000",
          debit: 100,
          credit: 0,
        },
        {
          id: "3",
          entryDate: "2026-06-02",
          entryNumber: "JE-003",
          accountCode: "1000",
          debit: 0,
          credit: 40,
        },
      ],
      10,
    );

    expect(report.openingBalance).toBe(10);
    expect(report.totalDebit).toBe(150);
    expect(report.totalCredit).toBe(40);
    expect(report.closingBalance).toBe(120);
    expect(report.movements.map((line) => line.id)).toEqual(["1", "2", "3"]);
    expect(report.movements.map((line) => line.runningBalance)).toEqual([110, 160, 120]);
    expect(report.sourceFingerprint).toMatch(/^[a-f0-9]{8}$/);
  });

  it("classifies cash flow lines using explicit categories first", () => {
    const report = buildCashFlowReport(
      [
        { id: "1", accountCode: "4000", accountType: "revenue", amount: 1000, cashFlowCategory: "operating" },
        { id: "2", accountCode: "1600", accountType: "asset", amount: -300 },
        { id: "3", accountCode: "2100", accountType: "liability", amount: 500 },
      ],
      200,
    );

    expect(report.operatingCashFlow).toBe(1000);
    expect(report.investingCashFlow).toBe(-300);
    expect(report.financingCashFlow).toBe(500);
    expect(report.netCashFlow).toBe(1200);
    expect(report.endingCashBalance).toBe(1400);
    expect(report.sourceFingerprint).toMatch(/^[a-f0-9]{8}$/);
  });

  it("defaults unclassified income and expense movements to operating cash flow", () => {
    const report = buildCashFlowReport(
      [
        { id: "1", accountCode: "5000", accountType: "expense", amount: -100 },
        { id: "2", accountCode: "4000", accountType: "income", amount: 250 },
      ],
      0,
    );

    expect(report.operatingCashFlow).toBe(150);
    expect(report.investingCashFlow).toBe(0);
    expect(report.financingCashFlow).toBe(0);
  });
});
