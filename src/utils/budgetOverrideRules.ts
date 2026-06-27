export type BudgetOverrideRequest = {
  id: string;
  action: string;
  status: string;
  sourceTable: string;
  sourceId: string;
  amount: number;
  companyId?: string | null;
};

export type BudgetOverrideEvaluationInput = {
  costCenterId: string;
  companyId?: string | null;
  projectedOverageAmount: number;
  overrideRequest?: BudgetOverrideRequest | null;
};

export type BudgetOverrideEvaluation = {
  allowed: boolean;
  reason:
    | "approved_budget_override"
    | "missing_budget_override"
    | "wrong_action"
    | "not_approved"
    | "company_mismatch"
    | "source_mismatch"
    | "amount_too_low";
};

const toMoney = (value: number) => Number(Number(value || 0).toFixed(2));

export function evaluateBudgetOverride(input: BudgetOverrideEvaluationInput): BudgetOverrideEvaluation {
  const request = input.overrideRequest;
  const overageAmount = toMoney(input.projectedOverageAmount);

  if (!request) {
    return { allowed: false, reason: "missing_budget_override" };
  }

  if (request.action !== "budget_override") {
    return { allowed: false, reason: "wrong_action" };
  }

  if (request.status !== "approved") {
    return { allowed: false, reason: "not_approved" };
  }

  if (input.companyId && request.companyId && input.companyId !== request.companyId) {
    return { allowed: false, reason: "company_mismatch" };
  }

  if (request.sourceTable !== "cost_centers" || request.sourceId !== input.costCenterId) {
    return { allowed: false, reason: "source_mismatch" };
  }

  if (toMoney(request.amount) + 0.01 < overageAmount) {
    return { allowed: false, reason: "amount_too_low" };
  }

  return { allowed: true, reason: "approved_budget_override" };
}
