interface ExpectedContractInvoiceCountInput {
  hasCompleteContractTerm: boolean;
  contractTermMonths: number;
  activeScheduleMonths: number;
  amountBasedInstallments: number;
}

/**
 * A monetary mismatch must not extend a contract beyond its dated term.
 * The amount-based estimate is a fallback only when the term is incomplete.
 */
export const getExpectedContractInvoiceCount = ({
  hasCompleteContractTerm,
  contractTermMonths,
  activeScheduleMonths,
  amountBasedInstallments,
}: ExpectedContractInvoiceCountInput): number => {
  const scheduleExpectation = Math.max(0, activeScheduleMonths);
  const termExpectation = Math.max(0, contractTermMonths);
  const amountExpectation = Math.max(0, amountBasedInstallments);

  return hasCompleteContractTerm
    ? Math.max(scheduleExpectation, termExpectation)
    : Math.max(scheduleExpectation, amountExpectation);
};
