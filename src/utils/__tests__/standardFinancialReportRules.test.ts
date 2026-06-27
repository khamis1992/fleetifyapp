import { describe, expect, it } from "vitest";
import {
  buildBalanceSheetReport,
  evaluateFinancialReportApprovalReadiness,
  buildIncomeStatementReport,
  buildTrialBalanceReport,
} from "../standardFinancialReportRules";

const balancedLines = [
  { accountCode: "1000", accountName: "Cash", accountType: "asset", debit: 1500, credit: 0 },
  { accountCode: "2000", accountName: "Payables", accountType: "liability", debit: 0, credit: 500 },
  { accountCode: "3000", accountName: "Equity", accountType: "equity", debit: 0, credit: 1000 },
];

describe("standardFinancialReportRules", () => {
  it("builds an audit-ready trial balance summary", () => {
    const report = buildTrialBalanceReport(balancedLines);

    expect(report.totalDebit).toBe(1500);
    expect(report.totalCredit).toBe(1500);
    expect(report.isBalanced).toBe(true);
    expect(report.sourceFingerprint).toMatch(/^[a-f0-9]{8}$/);
  });

  it("detects trial balance imbalance", () => {
    const report = buildTrialBalanceReport([
      { accountCode: "1000", accountType: "asset", debit: 100, credit: 0 },
      { accountCode: "2000", accountType: "liability", debit: 0, credit: 80 },
    ]);

    expect(report.isBalanced).toBe(false);
    expect(report.imbalance).toBe(20);
  });

  it("builds a standard income statement from revenue and expense lines", () => {
    const report = buildIncomeStatementReport([
      { accountCode: "4000", accountType: "revenue", debit: 0, credit: 1200 },
      { accountCode: "5000", accountType: "expense", debit: 350, credit: 0 },
    ]);

    expect(report.revenue).toBe(1200);
    expect(report.expenses).toBe(350);
    expect(report.netIncome).toBe(850);
    expect(report.profitMargin).toBe(70.83);
  });

  it("builds a balance sheet using normal account balances", () => {
    const report = buildBalanceSheetReport(balancedLines);

    expect(report.totalAssets).toBe(1500);
    expect(report.totalLiabilities).toBe(500);
    expect(report.totalEquity).toBe(1000);
    expect(report.isBalanced).toBe(true);
  });

  it("flags a balance sheet where assets do not equal liabilities plus equity", () => {
    const report = buildBalanceSheetReport([
      { accountCode: "1000", accountType: "asset", debit: 1500, credit: 0 },
      { accountCode: "3000", accountType: "equity", debit: 0, credit: 1000 },
    ]);

    expect(report.isBalanced).toBe(false);
    expect(report.imbalance).toBe(500);
  });

  it("blocks approval for reports without audit evidence or proper segregation", () => {
    expect(evaluateFinancialReportApprovalReadiness({
      status: "published",
      sourceFingerprint: "",
      imbalance: 0,
      generatedBy: "user-1",
      approverId: "user-2",
    })).toEqual({ canApprove: false, reason: "source_fingerprint_required" });

    expect(evaluateFinancialReportApprovalReadiness({
      status: "published",
      sourceFingerprint: "abc123",
      imbalance: 5,
      generatedBy: "user-1",
      approverId: "user-2",
    })).toEqual({ canApprove: false, reason: "report_imbalanced" });

    expect(evaluateFinancialReportApprovalReadiness({
      status: "published",
      sourceFingerprint: "abc123",
      imbalance: 0,
      generatedBy: "user-1",
      approverId: "user-1",
    })).toEqual({ canApprove: false, reason: "generator_cannot_approve" });
  });
});
