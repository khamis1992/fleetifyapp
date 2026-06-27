import { describe, expect, it } from "vitest";
import { evaluateBudgetControl } from "../budgetControlRules";

describe("budgetControlRules", () => {
  it("does not block when no budget is configured", () => {
    const decision = evaluateBudgetControl({ budgetAmount: 0, actualAmount: 500, pendingAmount: 100 });

    expect(decision.status).toBe("no_budget");
    expect(decision.blocksPosting).toBe(false);
  });

  it("allows expenses inside budget", () => {
    const decision = evaluateBudgetControl({ budgetAmount: 1000, actualAmount: 400, pendingAmount: 250 });

    expect(decision.status).toBe("within_budget");
    expect(decision.blocksPosting).toBe(false);
    expect(decision.remainingAmount).toBe(350);
  });

  it("marks budgets near the limit without blocking", () => {
    const decision = evaluateBudgetControl({ budgetAmount: 1000, actualAmount: 850, pendingAmount: 50 });

    expect(decision.status).toBe("near_limit");
    expect(decision.blocksPosting).toBe(false);
  });

  it("blocks postings that exceed budget", () => {
    const decision = evaluateBudgetControl({ budgetAmount: 1000, actualAmount: 900, pendingAmount: 150 });

    expect(decision.status).toBe("exceeded");
    expect(decision.blocksPosting).toBe(true);
    expect(decision.remainingAmount).toBe(-50);
  });
});
