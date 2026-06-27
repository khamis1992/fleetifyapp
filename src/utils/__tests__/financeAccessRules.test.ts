import { describe, expect, it } from "vitest";
import {
  FINANCE_FIELD_PERMISSION_MATRIX,
  FINANCE_PERMISSION_MATRIX,
  FINANCE_PERMISSION_CONFLICT_RULES,
  SEGREGATION_OF_DUTIES_RULES,
  evaluateSegregationOfDuties,
  findFinancePermissionConflicts,
  getFinanceAccessCoverage,
  permissionMatches,
  requiredCriticalFinanceActions,
} from "../financeAccessRules";

describe("financeAccessRules", () => {
  it("covers every required critical finance action", () => {
    const coverage = getFinanceAccessCoverage();

    expect(coverage.missingCriticalActions).toEqual([]);
    expect(coverage.fieldsWithoutKnownAction).toEqual([]);
    expect(coverage.rulesWithoutKnownAction).toEqual([]);
    expect(coverage.conflictRulesWithoutKnownAction).toEqual([]);
    expect(FINANCE_PERMISSION_MATRIX.length).toBeGreaterThanOrEqual(requiredCriticalFinanceActions.length);
  });

  it("maps sensitive fields to granular permissions", () => {
    expect(FINANCE_FIELD_PERMISSION_MATRIX).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entity: "invoice", field: "total_amount", permission: "finance.invoice.edit_amount" }),
        expect.objectContaining({ entity: "payment", field: "amount", permission: "finance.payment.edit_amount" }),
        expect.objectContaining({ entity: "journal_entry", field: "lines", permission: "finance.journal.edit_lines" }),
      ])
    );
  });

  it("honors fallback permissions during the transition to granular roles", () => {
    expect(permissionMatches(["finance.invoices.write"], "finance.invoice.edit_amount")).toBe(true);
    expect(permissionMatches(["finance.payments.write"], "finance.payment.create")).toBe(true);
    expect(permissionMatches(["finance.reports.view"], "finance.payment.create")).toBe(false);
  });

  it("blocks self approval and self posting for protected actions", () => {
    const approval = evaluateSegregationOfDuties({
      action: "finance.journal.approve",
      actorId: "user-1",
      creatorId: "user-1",
    });
    const posting = evaluateSegregationOfDuties({
      action: "finance.journal.post",
      actorId: "user-1",
      creatorId: "user-1",
    });

    expect(approval.allowed).toBe(false);
    expect(posting.allowed).toBe(false);
  });

  it("allows protected actions when the actor is independent", () => {
    const decision = evaluateSegregationOfDuties({
      action: "finance.bank.reconcile",
      actorId: "reviewer",
      creatorId: "importer",
    });

    expect(decision.allowed).toBe(true);
  });

  it("has a separation rule for each high-risk approval family", () => {
    expect(SEGREGATION_OF_DUTIES_RULES.map((rule) => rule.action)).toEqual(
      expect.arrayContaining([
        "finance.invoice.cancel",
        "finance.payment.cancel",
        "finance.journal.approve",
        "finance.journal.post",
        "finance.period.reopen",
        "finance.bank.reconcile",
        "finance.budget.override",
      ])
    );
  });

  it("detects conflicting permission bundles before assigning a finance role", () => {
    const conflicts = findFinancePermissionConflicts([
      "finance.payment.create",
      "finance.payment.cancel",
      "finance.journal.create_draft",
      "finance.journal.post",
    ]);

    expect(conflicts.map((conflict) => conflict.ruleId)).toEqual(
      expect.arrayContaining(["payment_create_cancel_conflict", "journal_create_post_conflict"]),
    );
    expect(conflicts.every((conflict) => conflict.severity === "critical")).toBe(true);
  });

  it("does not flag limited finance roles without conflicting duties", () => {
    expect(findFinancePermissionConflicts([
      "finance.payment.create",
      "finance.audit.view",
    ])).toEqual([]);
    expect(FINANCE_PERMISSION_CONFLICT_RULES.length).toBeGreaterThanOrEqual(7);
  });
});
