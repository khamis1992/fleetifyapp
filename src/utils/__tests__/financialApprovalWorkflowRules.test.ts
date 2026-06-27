import { describe, expect, it } from "vitest";
import {
  canActorApproveFinancialStep,
  resolveFinancialApprovalWorkflow,
  type FinancialApprovalPolicy,
} from "../financialApprovalWorkflowRules";

const policies: FinancialApprovalPolicy[] = [
  {
    id: "default-payment-cancel",
    action: "payment_cancel",
    minAmount: 1000,
    currency: "QAR",
    steps: [
      { stepOrder: 1, role: "branch_manager", branchScope: "same_branch" },
      { stepOrder: 2, role: "finance_controller", minAmount: 5000, branchScope: "any_branch" },
    ],
  },
  {
    id: "branch-payment-cancel",
    action: "payment_cancel",
    minAmount: 500,
    maxAmount: 4000,
    branchId: "branch-1",
    currency: "QAR",
    steps: [{ stepOrder: 1, role: "branch_manager", branchScope: "same_branch" }],
  },
  {
    id: "period-reopen",
    action: "period_reopen",
    minAmount: 0,
    currency: "QAR",
    steps: [
      { stepOrder: 1, role: "finance_controller", branchScope: "any_branch" },
      { stepOrder: 2, role: "cfo", branchScope: "head_office" },
    ],
  },
];

describe("financialApprovalWorkflowRules", () => {
  it("does not require approval when no policy matches the action and amount", () => {
    const decision = resolveFinancialApprovalWorkflow(
      { action: "payment_cancel", amount: 100, currency: "QAR", branchId: "branch-1" },
      policies,
    );

    expect(decision.required).toBe(false);
    expect(decision.reason).toBe("no_matching_policy");
  });

  it("prefers a branch-specific policy over a default policy", () => {
    const decision = resolveFinancialApprovalWorkflow(
      { action: "payment_cancel", amount: 2000, currency: "QAR", branchId: "branch-1" },
      policies,
    );

    expect(decision.required).toBe(true);
    expect(decision.policyId).toBe("branch-payment-cancel");
    expect(decision.steps).toHaveLength(1);
  });

  it("adds higher amount approval stages when thresholds are crossed", () => {
    const decision = resolveFinancialApprovalWorkflow(
      { action: "payment_cancel", amount: 7000, currency: "QAR", branchId: "branch-2" },
      policies,
    );

    expect(decision.required).toBe(true);
    expect(decision.policyId).toBe("default-payment-cancel");
    expect(decision.steps.map((step) => step.role)).toEqual(["branch_manager", "finance_controller"]);
  });

  it("prevents requesters from approving their own step", () => {
    const decision = canActorApproveFinancialStep({
      actorId: "user-1",
      requesterId: "user-1",
      actorRole: "branch_manager",
      actorBranchId: "branch-1",
      requestBranchId: "branch-1",
      step: { stepOrder: 1, role: "branch_manager", branchScope: "same_branch" },
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("requester_cannot_approve");
  });

  it("enforces same branch approval scope", () => {
    const decision = canActorApproveFinancialStep({
      actorId: "approver",
      requesterId: "requester",
      actorRole: "branch_manager",
      actorBranchId: "branch-2",
      requestBranchId: "branch-1",
      step: { stepOrder: 1, role: "branch_manager", branchScope: "same_branch" },
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("branch_mismatch");
  });

  it("prevents the same actor from approving the same step twice", () => {
    const decision = canActorApproveFinancialStep({
      actorId: "approver",
      requesterId: "requester",
      actorRole: "finance_controller",
      actorBranchId: "branch-1",
      requestBranchId: "branch-1",
      previousApproverIds: ["approver"],
      step: { stepOrder: 2, role: "finance_controller", branchScope: "any_branch", requiredApprovals: 2 },
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("duplicate_step_approval");
  });

  it("allows the right independent approver for the right branch", () => {
    const decision = canActorApproveFinancialStep({
      actorId: "approver",
      requesterId: "requester",
      actorRole: "branch_manager",
      actorBranchId: "branch-1",
      requestBranchId: "branch-1",
      step: { stepOrder: 1, role: "branch_manager", branchScope: "same_branch" },
    });

    expect(decision.allowed).toBe(true);
  });
});
