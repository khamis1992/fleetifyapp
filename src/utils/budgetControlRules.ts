export interface BudgetControlInput {
  budgetAmount?: number | null;
  actualAmount?: number | null;
  pendingAmount?: number | null;
}

export type BudgetControlStatus = "no_budget" | "within_budget" | "near_limit" | "exceeded";

export interface BudgetControlDecision {
  status: BudgetControlStatus;
  budgetAmount: number;
  actualAmount: number;
  projectedAmount: number;
  remainingAmount: number;
  utilizationPercent: number;
  blocksPosting: boolean;
}

export function evaluateBudgetControl(input: BudgetControlInput): BudgetControlDecision {
  const budgetAmount = Number(input.budgetAmount || 0);
  const actualAmount = Number(input.actualAmount || 0);
  const pendingAmount = Number(input.pendingAmount || 0);
  const projectedAmount = actualAmount + pendingAmount;
  const remainingAmount = budgetAmount - projectedAmount;
  const utilizationPercent = budgetAmount > 0 ? (projectedAmount / budgetAmount) * 100 : 0;

  if (budgetAmount <= 0) {
    return {
      status: "no_budget",
      budgetAmount,
      actualAmount,
      projectedAmount,
      remainingAmount: 0,
      utilizationPercent: 0,
      blocksPosting: false,
    };
  }

  if (projectedAmount > budgetAmount + 0.01) {
    return {
      status: "exceeded",
      budgetAmount,
      actualAmount,
      projectedAmount,
      remainingAmount,
      utilizationPercent,
      blocksPosting: true,
    };
  }

  if (utilizationPercent >= 90) {
    return {
      status: "near_limit",
      budgetAmount,
      actualAmount,
      projectedAmount,
      remainingAmount,
      utilizationPercent,
      blocksPosting: false,
    };
  }

  return {
    status: "within_budget",
    budgetAmount,
    actualAmount,
    projectedAmount,
    remainingAmount,
    utilizationPercent,
    blocksPosting: false,
  };
}
