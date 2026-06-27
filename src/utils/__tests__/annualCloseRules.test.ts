import { describe, expect, it } from "vitest";
import {
  buildAnnualClosingEntry,
  buildOpeningBalanceLines,
  calculateAnnualNetIncome,
  isBalancedAnnualEntry,
} from "../annualCloseRules";

describe("annualCloseRules", () => {
  it("calculates annual net income from revenue and expense lines", () => {
    const result = calculateAnnualNetIncome([
      { accountCode: "4000", accountType: "revenue", debit: 0, credit: 5000 },
      { accountCode: "5000", accountType: "expense", debit: 1800, credit: 0 },
    ]);

    expect(result.revenue).toBe(5000);
    expect(result.expenses).toBe(1800);
    expect(result.netIncome).toBe(3200);
  });

  it("builds a balanced closing entry for annual profit", () => {
    const lines = buildAnnualClosingEntry(
      [
        { accountCode: "4000", accountType: "revenue", debit: 0, credit: 5000 },
        { accountCode: "5000", accountType: "expense", debit: 1800, credit: 0 },
      ],
      "3200",
    );

    expect(lines).toEqual([
      {
        accountCode: "4000",
        debit: 5000,
        credit: 0,
        description: "Close revenue account to retained earnings",
      },
      {
        accountCode: "5000",
        debit: 0,
        credit: 1800,
        description: "Close expense account to retained earnings",
      },
      {
        accountCode: "3200",
        debit: 0,
        credit: 3200,
        description: "Transfer annual profit to retained earnings",
      },
    ]);
    expect(isBalancedAnnualEntry(lines).isBalanced).toBe(true);
  });

  it("builds a balanced closing entry for annual loss", () => {
    const lines = buildAnnualClosingEntry(
      [
        { accountCode: "4000", accountType: "revenue", debit: 0, credit: 1000 },
        { accountCode: "5000", accountType: "expense", debit: 1400, credit: 0 },
      ],
      "3200",
    );

    expect(lines.find((line) => line.accountCode === "3200")).toMatchObject({
      debit: 400,
      credit: 0,
    });
    expect(isBalancedAnnualEntry(lines).isBalanced).toBe(true);
  });

  it("carries only balance sheet accounts into the opening entry", () => {
    const lines = buildOpeningBalanceLines([
      { accountCode: "1000", accountType: "asset", debit: 2000, credit: 0 },
      { accountCode: "2000", accountType: "liability", debit: 0, credit: 600 },
      { accountCode: "3000", accountType: "equity", debit: 0, credit: 1400 },
      { accountCode: "4000", accountType: "revenue", debit: 0, credit: 5000 },
    ]);

    expect(lines.map((line) => line.accountCode)).toEqual(["1000", "2000", "3000"]);
    expect(isBalancedAnnualEntry(lines).isBalanced).toBe(true);
  });

  it("reports imbalance in malformed annual entries", () => {
    const result = isBalancedAnnualEntry([
      { accountCode: "1000", debit: 100, credit: 0, description: "test" },
    ]);

    expect(result.isBalanced).toBe(false);
    expect(result.imbalance).toBe(100);
  });
});
