export type InvoiceReconciliationInput = {
  totalAmount: number;
  recordedPaidAmount: number;
  recordedBalanceDue: number;
  linkedPaymentAmounts: number[];
};

export type PaymentJournalLinkInput = {
  paymentId: string;
  journalEntryId?: string | null;
  referencedPaymentIds: Set<string>;
  existingJournalEntryIds: Set<string>;
};

export type JournalBalanceInput = {
  totalDebit: number;
  totalCredit: number;
};

const toMoney = (value: number) => Number(Number(value || 0).toFixed(2));

export function reconcileInvoicePaymentState(input: InvoiceReconciliationInput) {
  const linkedPaidAmount = toMoney(input.linkedPaymentAmounts.reduce((sum, amount) => sum + Number(amount || 0), 0));
  const expectedBalanceDue = toMoney(Math.max(Number(input.totalAmount || 0) - linkedPaidAmount, 0));
  const overpaidAmount = toMoney(Math.max(linkedPaidAmount - Number(input.totalAmount || 0), 0));

  const paidMismatch = Math.abs(linkedPaidAmount - Number(input.recordedPaidAmount || 0)) > 0.01;
  const balanceMismatch = Math.abs(expectedBalanceDue - Number(input.recordedBalanceDue || 0)) > 0.01;

  return {
    linkedPaidAmount,
    expectedBalanceDue,
    overpaidAmount,
    isHealthy: !paidMismatch && !balanceMismatch && overpaidAmount <= 0.01,
    paidMismatch,
    balanceMismatch,
    isOverpaid: overpaidAmount > 0.01,
  };
}

export function evaluatePaymentJournalLink(input: PaymentJournalLinkInput) {
  const hasDirectLink = Boolean(input.journalEntryId && input.existingJournalEntryIds.has(input.journalEntryId));
  const hasReferenceLink = input.referencedPaymentIds.has(input.paymentId);

  return {
    hasJournal: hasDirectLink || hasReferenceLink,
    hasDirectLink,
    hasReferenceLink,
    hasBrokenDirectLink: Boolean(input.journalEntryId && !input.existingJournalEntryIds.has(input.journalEntryId)),
  };
}

export function isPostedJournalBalanced(input: JournalBalanceInput) {
  return Math.abs(Number(input.totalDebit || 0) - Number(input.totalCredit || 0)) <= 0.01;
}
