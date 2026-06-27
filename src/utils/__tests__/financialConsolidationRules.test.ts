import { describe, expect, it } from "vitest";
import { consolidateTrialBalance, evaluateConsolidationApprovalReadiness } from "../financialConsolidationRules";

describe("financialConsolidationRules", () => {
  it("consolidates trial balance lines by account code across companies", () => {
    const result = consolidateTrialBalance([
      { companyId: "co-1", accountCode: "1100", accountType: "asset", debit: 100, credit: 0 },
      { companyId: "co-2", accountCode: "1100", accountType: "asset", debit: 250, credit: 0 },
      { companyId: "co-1", accountCode: "2100", accountType: "liability", debit: 0, credit: 350 },
    ]);

    expect(result.companyCount).toBe(2);
    expect(result.isBalanced).toBe(true);
    expect(result.lines.find((line) => line.accountCode === "1100")?.debit).toBe(350);
    expect(result.lines.find((line) => line.accountCode === "1100")?.sourceCompanies).toEqual(["co-1", "co-2"]);
  });

  it("converts foreign currency lines into the target currency", () => {
    const result = consolidateTrialBalance(
      [
        { companyId: "co-1", accountCode: "1000", accountType: "asset", debit: 100, credit: 0, currency: "USD" },
        { companyId: "co-1", accountCode: "3000", accountType: "equity", debit: 0, credit: 365, currency: "QAR" },
      ],
      {
        targetCurrency: "QAR",
        currencyRates: [{ fromCurrency: "USD", toCurrency: "QAR", rate: 3.65 }],
      },
    );

    expect(result.isBalanced).toBe(true);
    expect(result.lines.find((line) => line.accountCode === "1000")?.debit).toBe(365);
  });

  it("requires an explicit rate when company currency differs from target currency", () => {
    expect(() =>
      consolidateTrialBalance(
        [{ companyId: "co-1", accountCode: "1000", accountType: "asset", debit: 100, credit: 0, currency: "USD" }],
        { targetCurrency: "QAR" },
      ),
    ).toThrow("Missing consolidation currency rate");
  });

  it("applies intercompany eliminations and keeps an audit reason", () => {
    const result = consolidateTrialBalance(
      [
        { companyId: "co-1", accountCode: "1300", accountType: "asset", debit: 1000, credit: 0 },
        { companyId: "co-2", accountCode: "2300", accountType: "liability", debit: 0, credit: 1000 },
      ],
      {
        eliminations: [
          { accountCode: "1300", credit: 1000, reason: "Eliminate intercompany receivable" },
          { accountCode: "2300", debit: 1000, reason: "Eliminate intercompany payable" },
        ],
      },
    );

    expect(result.isBalanced).toBe(true);
    expect(result.eliminationCount).toBe(2);
    expect(result.lines.find((line) => line.accountCode === "1300")?.balance).toBe(0);
    expect(result.lines.find((line) => line.accountCode === "2300")?.eliminations[0].reason).toContain("payable");
  });

  it("blocks approval when consolidation evidence is incomplete", () => {
    expect(evaluateConsolidationApprovalReadiness({
      status: "calculated",
      imbalance: 0,
      companyCount: 1,
    })).toEqual({ canApprove: false, reason: "multiple_companies_required" });

    expect(evaluateConsolidationApprovalReadiness({
      status: "calculated",
      imbalance: 0,
      companyCount: 2,
      missingCurrencyRates: ["USD->QAR"],
    })).toEqual({ canApprove: false, reason: "missing_currency_rates" });

    expect(evaluateConsolidationApprovalReadiness({
      status: "calculated",
      imbalance: 0,
      companyCount: 2,
      unreviewedEliminationCount: 1,
    })).toEqual({ canApprove: false, reason: "unreviewed_eliminations" });

    expect(evaluateConsolidationApprovalReadiness({
      status: "calculated",
      imbalance: 0,
      companyCount: 2,
      createdBy: "user-1",
      approverId: "user-1",
    })).toEqual({ canApprove: false, reason: "creator_cannot_approve" });
  });
});
