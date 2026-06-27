import { describe, expect, it } from "vitest";
import { evaluatePeriodReclosureReadiness, summarizePeriodReopeningImpact } from "../periodReopeningImpactRules";

describe("periodReopeningImpactRules", () => {
  it("summarizes reopening impact across invoices, payments, and journals", () => {
    const result = summarizePeriodReopeningImpact({
      invoicesChanged: 2,
      invoiceAmountChanged: 500,
      paymentsChanged: 1,
      paymentAmountChanged: -200,
      journalsChanged: 1,
      journalDebitChanged: 300,
      journalCreditChanged: 300,
    });

    expect(result.totalDocumentsChanged).toBe(4);
    expect(result.netOperationalAmount).toBe(300);
    expect(result.journalImbalance).toBe(0);
    expect(result.hasFinancialImpact).toBe(true);
  });

  it("requires controller review when journal changes are imbalanced", () => {
    const result = summarizePeriodReopeningImpact({
      invoicesChanged: 0,
      invoiceAmountChanged: 0,
      paymentsChanged: 0,
      paymentAmountChanged: 0,
      journalsChanged: 1,
      journalDebitChanged: 100,
      journalCreditChanged: 90,
    });

    expect(result.journalImbalance).toBe(10);
    expect(result.requiresControllerReview).toBe(true);
  });

  it("does not flag empty reopening windows", () => {
    const result = summarizePeriodReopeningImpact({
      invoicesChanged: 0,
      invoiceAmountChanged: 0,
      paymentsChanged: 0,
      paymentAmountChanged: 0,
      journalsChanged: 0,
      journalDebitChanged: 0,
      journalCreditChanged: 0,
    });

    expect(result.hasFinancialImpact).toBe(false);
    expect(result.requiresControllerReview).toBe(false);
  });

  it("requires an impact report and controller review before final reclosure", () => {
    expect(evaluatePeriodReclosureReadiness({
      impactReportGenerated: false,
      requiresControllerReview: false,
      controllerReviewed: false,
    })).toEqual({ canClose: false, reason: "impact_report_required" });

    expect(evaluatePeriodReclosureReadiness({
      impactReportGenerated: true,
      requiresControllerReview: true,
      controllerReviewed: false,
    })).toEqual({ canClose: false, reason: "controller_review_required" });

    expect(evaluatePeriodReclosureReadiness({
      impactReportGenerated: true,
      requiresControllerReview: true,
      controllerReviewed: true,
    })).toEqual({ canClose: true, reason: "ready_to_close" });
  });
});
