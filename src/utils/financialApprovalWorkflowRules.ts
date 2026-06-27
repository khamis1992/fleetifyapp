export type FinancialApprovalAction =
  | "invoice_cancel"
  | "payment_cancel"
  | "journal_post"
  | "period_reopen"
  | "budget_override"
  | "bank_reconcile"
  | "report_approve";

export type FinancialApprovalPolicyStep = {
  stepOrder: number;
  role: string;
  minAmount?: number;
  branchScope?: "same_branch" | "any_branch" | "head_office";
  requiredApprovals?: number;
};

export type FinancialApprovalPolicy = {
  id: string;
  action: FinancialApprovalAction;
  minAmount: number;
  maxAmount?: number | null;
  branchId?: string | null;
  currency?: string | null;
  steps: FinancialApprovalPolicyStep[];
};

export type FinancialApprovalRequestInput = {
  action: FinancialApprovalAction;
  amount: number;
  currency?: string | null;
  branchId?: string | null;
  requesterRole?: string | null;
};

export type FinancialApprovalDecision = {
  required: boolean;
  policyId?: string;
  steps: FinancialApprovalPolicyStep[];
  reason: string;
};

const toMoney = (value: number) => Number(Number(value || 0).toFixed(2));

function normalizeCurrency(value?: string | null) {
  return String(value || "QAR").trim().toUpperCase();
}

function policyMatches(policy: FinancialApprovalPolicy, input: FinancialApprovalRequestInput) {
  const amount = toMoney(input.amount);
  const currencyMatches = normalizeCurrency(policy.currency) === normalizeCurrency(input.currency);
  const branchMatches = !policy.branchId || policy.branchId === input.branchId;
  const minimumMatches = amount >= toMoney(policy.minAmount);
  const maximumMatches = policy.maxAmount == null || amount <= toMoney(policy.maxAmount);

  return policy.action === input.action
    && currencyMatches
    && branchMatches
    && minimumMatches
    && maximumMatches;
}

export function resolveFinancialApprovalWorkflow(
  input: FinancialApprovalRequestInput,
  policies: FinancialApprovalPolicy[],
): FinancialApprovalDecision {
  const matchingPolicies = policies
    .filter((policy) => policyMatches(policy, input))
    .sort((left, right) => {
      const leftBranchSpecificity = left.branchId ? 1 : 0;
      const rightBranchSpecificity = right.branchId ? 1 : 0;
      if (leftBranchSpecificity !== rightBranchSpecificity) return rightBranchSpecificity - leftBranchSpecificity;
      return toMoney(right.minAmount) - toMoney(left.minAmount);
    });

  const policy = matchingPolicies[0];
  if (!policy) {
    return {
      required: false,
      steps: [],
      reason: "no_matching_policy",
    };
  }

  const steps = policy.steps
    .filter((step) => step.minAmount == null || toMoney(input.amount) >= toMoney(step.minAmount))
    .sort((left, right) => left.stepOrder - right.stepOrder)
    .map((step) => ({
      ...step,
      requiredApprovals: step.requiredApprovals || 1,
    }));

  if (steps.length === 0) {
    return {
      required: false,
      policyId: policy.id,
      steps: [],
      reason: "policy_has_no_required_steps",
    };
  }

  return {
    required: true,
    policyId: policy.id,
    steps,
    reason: "policy_matched",
  };
}

export function canActorApproveFinancialStep(input: {
  actorRole: string;
  actorBranchId?: string | null;
  requesterId?: string | null;
  actorId?: string | null;
  requestBranchId?: string | null;
  step: FinancialApprovalPolicyStep;
  previousApproverIds?: string[];
}) {
  if (input.actorId && input.requesterId && input.actorId === input.requesterId) {
    return { allowed: false, reason: "requester_cannot_approve" };
  }

  if (input.actorId && input.previousApproverIds?.includes(input.actorId)) {
    return { allowed: false, reason: "duplicate_step_approval" };
  }

  if (input.actorRole !== input.step.role) {
    return { allowed: false, reason: "role_mismatch" };
  }

  if (input.step.branchScope === "same_branch" && input.actorBranchId !== input.requestBranchId) {
    return { allowed: false, reason: "branch_mismatch" };
  }

  if (input.step.branchScope === "head_office" && input.actorBranchId) {
    return { allowed: false, reason: "head_office_required" };
  }

  return { allowed: true, reason: "allowed" };
}
