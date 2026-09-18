import { describe, expect, it } from "vitest";
import { isEligibleAccountMapping } from "../accountMappingValidation";
const asset = {
  company_id: "own",
  account_type: "assets",
  balance_type: "debit",
  account_level: 3,
  is_active: true,
  is_header: false,
};
describe("posting account eligibility across departments", () => {
  it("requires the current company and a known account type", () => {
    expect(isEligibleAccountMapping(asset, "assets", "own", "CASH")).toBe(true);
    expect(isEligibleAccountMapping(asset, "assets", "foreign", "CASH")).toBe(
      false
    );
    expect(isEligibleAccountMapping(asset, undefined, "own")).toBe(false);
  });
  it("rejects inactive, header and level-two accounts", () => {
    for (const change of [
      { is_active: false },
      { is_header: true },
      { is_header: null },
      { account_level: 2 },
    ])
      expect(
        isEligibleAccountMapping(
          { ...asset, ...change },
          "assets",
          "own",
          "BANK"
        )
      ).toBe(false);
  });
  it("requires credit revenue for collected late fees, never rental receivables", () => {
    expect(
      isEligibleAccountMapping(asset, "revenue", "own", "LATE_FEE_REVENUE")
    ).toBe(false);
    expect(
      isEligibleAccountMapping(
        { ...asset, account_type: "revenue", balance_type: "credit" },
        "revenue",
        "own",
        "LATE_FEE_REVENUE"
      )
    ).toBe(true);
  });
  it("preserves credit balances for accumulated depreciation contra assets", () => {
    expect(
      isEligibleAccountMapping(
        asset,
        "assets",
        "own",
        "ACCUMULATED_DEPRECIATION"
      )
    ).toBe(false);
    expect(
      isEligibleAccountMapping(
        { ...asset, balance_type: "credit" },
        "assets",
        "own",
        "ACCUMULATED_DEPRECIATION"
      )
    ).toBe(true);
  });
  it("resolves the existing fleet display group to the actual ledger category", () => {
    expect(
      isEligibleAccountMapping(
        asset,
        "Fleet & Vehicle Management",
        "own",
        "VEHICLE_ASSETS"
      )
    ).toBe(true);
    expect(
      isEligibleAccountMapping(
        { ...asset, balance_type: "credit" },
        "Fleet & Vehicle Management",
        "own",
        "ACCUMULATED_DEPRECIATION_VEHICLES"
      )
    ).toBe(true);
    for (const type of ["DEPRECIATION_EXPENSE_VEHICLES", "INSURANCE_EXPENSE"])
      expect(
        isEligibleAccountMapping(
          { ...asset, account_type: "expenses" },
          "Fleet & Vehicle Management",
          "own",
          type
        )
      ).toBe(true);
  });
});
