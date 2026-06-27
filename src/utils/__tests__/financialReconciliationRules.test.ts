import { describe, expect, it } from "vitest";
import {
  evaluatePaymentJournalLink,
  isPostedJournalBalanced,
  reconcileInvoicePaymentState,
} from "../financialReconciliationRules";

describe("financial reconciliation rules", () => {
  it("accepts a healthy invoice when linked payments match recorded paid and balance", () => {
    const result = reconcileInvoicePaymentState({
      totalAmount: 1000,
      recordedPaidAmount: 750,
      recordedBalanceDue: 250,
      linkedPaymentAmounts: [500, 250],
    });

    expect(result.isHealthy).toBe(true);
    expect(result.expectedBalanceDue).toBe(250);
  });

  it("detects overpaid invoices even when recorded paid amount matches linked payments", () => {
    const result = reconcileInvoicePaymentState({
      totalAmount: 1000,
      recordedPaidAmount: 1200,
      recordedBalanceDue: 0,
      linkedPaymentAmounts: [800, 400],
    });

    expect(result.isHealthy).toBe(false);
    expect(result.isOverpaid).toBe(true);
    expect(result.overpaidAmount).toBe(200);
  });

  it("accepts payment journal linkage by direct journal_entry_id", () => {
    const result = evaluatePaymentJournalLink({
      paymentId: "pay-1",
      journalEntryId: "je-1",
      referencedPaymentIds: new Set(),
      existingJournalEntryIds: new Set(["je-1"]),
    });

    expect(result.hasJournal).toBe(true);
    expect(result.hasDirectLink).toBe(true);
  });

  it("accepts payment journal linkage by journal reference_id", () => {
    const result = evaluatePaymentJournalLink({
      paymentId: "pay-1",
      journalEntryId: null,
      referencedPaymentIds: new Set(["pay-1"]),
      existingJournalEntryIds: new Set(),
    });

    expect(result.hasJournal).toBe(true);
    expect(result.hasReferenceLink).toBe(true);
  });

  it("detects broken direct journal links", () => {
    const result = evaluatePaymentJournalLink({
      paymentId: "pay-1",
      journalEntryId: "missing-je",
      referencedPaymentIds: new Set(),
      existingJournalEntryIds: new Set(["je-1"]),
    });

    expect(result.hasJournal).toBe(false);
    expect(result.hasBrokenDirectLink).toBe(true);
  });

  it("allows only tiny rounding differences in posted journal balance", () => {
    expect(isPostedJournalBalanced({ totalDebit: 100, totalCredit: 100.004 })).toBe(true);
    expect(isPostedJournalBalanced({ totalDebit: 100, totalCredit: 99.5 })).toBe(false);
  });
});
