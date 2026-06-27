export type PeriodReopeningImpactInput = {
  invoicesChanged: number;
  invoiceAmountChanged: number;
  paymentsChanged: number;
  paymentAmountChanged: number;
  journalsChanged: number;
  journalDebitChanged: number;
  journalCreditChanged: number;
};

const toMoney = (value: number) => Number(Number(value || 0).toFixed(2));

export function summarizePeriodReopeningImpact(input: PeriodReopeningImpactInput) {
  const totalDocumentsChanged = input.invoicesChanged + input.paymentsChanged + input.journalsChanged;
  const journalImbalance = toMoney(input.journalDebitChanged - input.journalCreditChanged);
  const netOperationalAmount = toMoney(input.invoiceAmountChanged + input.paymentAmountChanged);
  const hasFinancialImpact =
    totalDocumentsChanged > 0
    || Math.abs(netOperationalAmount) > 0.01
    || Math.abs(journalImbalance) > 0.01;

  return {
    totalDocumentsChanged,
    invoiceAmountChanged: toMoney(input.invoiceAmountChanged),
    paymentAmountChanged: toMoney(input.paymentAmountChanged),
    journalDebitChanged: toMoney(input.journalDebitChanged),
    journalCreditChanged: toMoney(input.journalCreditChanged),
    journalImbalance,
    netOperationalAmount,
    hasFinancialImpact,
    requiresControllerReview: Math.abs(journalImbalance) > 0.01 || totalDocumentsChanged > 20,
  };
}

export function evaluatePeriodReclosureReadiness(input: {
  impactReportGenerated: boolean;
  requiresControllerReview: boolean;
  controllerReviewed: boolean;
}) {
  if (!input.impactReportGenerated) {
    return {
      canClose: false,
      reason: "impact_report_required" as const,
    };
  }

  if (input.requiresControllerReview && !input.controllerReviewed) {
    return {
      canClose: false,
      reason: "controller_review_required" as const,
    };
  }

  return {
    canClose: true,
    reason: "ready_to_close" as const,
  };
}
