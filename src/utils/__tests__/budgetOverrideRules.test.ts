import { describe, expect, it } from "vitest";
import { evaluateBudgetOverride } from "../budgetOverrideRules";

const approvedRequest = {
  id: "approval-1",
  action: "budget_override",
  status: "approved",
  sourceTable: "cost_centers",
  sourceId: "cc-1",
  companyId: "company-1",
  amount: 250,
};

describe("budgetOverrideRules", () => {
  it("allows approved budget override requests for the same cost center and company", () => {
    const decision = evaluateBudgetOverride({
      costCenterId: "cc-1",
      companyId: "company-1",
      projectedOverageAmount: 200,
      overrideRequest: approvedRequest,
    });

    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe("approved_budget_override");
  });

  it("rejects missing or unapproved budget override requests", () => {
    expect(evaluateBudgetOverride({
      costCenterId: "cc-1",
      projectedOverageAmount: 100,
      overrideRequest: null,
    }).reason).toBe("missing_budget_override");

    expect(evaluateBudgetOverride({
      costCenterId: "cc-1",
      projectedOverageAmount: 100,
      overrideRequest: { ...approvedRequest, status: "pending" },
    }).reason).toBe("not_approved");
  });

  it("rejects budget override requests that do not cover the overage", () => {
    const decision = evaluateBudgetOverride({
      costCenterId: "cc-1",
      companyId: "company-1",
      projectedOverageAmount: 300,
      overrideRequest: approvedRequest,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("amount_too_low");
  });

  it("rejects budget override requests for another cost center or company", () => {
    expect(evaluateBudgetOverride({
      costCenterId: "cc-2",
      companyId: "company-1",
      projectedOverageAmount: 100,
      overrideRequest: approvedRequest,
    }).reason).toBe("source_mismatch");

    expect(evaluateBudgetOverride({
      costCenterId: "cc-1",
      companyId: "company-2",
      projectedOverageAmount: 100,
      overrideRequest: approvedRequest,
    }).reason).toBe("company_mismatch");
  });
});
