import { describe, expect, it } from "vitest";
import {
  findBestBankStatementMatch,
  normalizeBankAmount,
  normalizeBankReference,
  scoreBankStatementMatch,
} from "../bankReconciliationRules";

describe("bankReconciliationRules", () => {
  it("normalizes references and amounts from imported bank rows", () => {
    expect(normalizeBankReference(" INV-2026 / 001 ")).toBe("inv2026001");
    expect(normalizeBankReference("تحويل رقم 123-أ")).toBe("تحويلرقم123أ");
    expect(normalizeBankAmount("1,250.555")).toBe(1250.56);
  });

  it("auto matches an exact amount, date, bank, and reference", () => {
    const decision = scoreBankStatementMatch(
      {
        bankId: "bank-1",
        statementDate: "2026-06-27",
        amount: 1250,
        referenceNumber: "PAY-001",
      },
      {
        id: "payment-1",
        source: "payment",
        bankId: "bank-1",
        transactionDate: "2026-06-27",
        amount: 1250,
        documentNumber: "PAY-001",
      },
    );

    expect(decision.strength).toBe("exact");
    expect(decision.autoMatch).toBe(true);
    expect(decision.score).toBe(100);
    expect(decision.reasons).toContain("reference_exact");
  });

  it("marks amount and near date matches as strong enough for auto matching", () => {
    const decision = scoreBankStatementMatch(
      {
        bankId: "bank-1",
        statementDate: "2026-06-27",
        amount: 900,
        description: "Customer bank transfer",
      },
      {
        id: "bank-transaction-1",
        source: "bank_transaction",
        bankId: "bank-1",
        transactionDate: "2026-06-25",
        amount: 900,
        description: "Manual treasury transfer",
      },
    );

    expect(decision.strength).toBe("strong");
    expect(decision.autoMatch).toBe(true);
    expect(decision.reasons).toEqual(expect.arrayContaining(["amount_exact", "same_bank", "near_date"]));
  });

  it("keeps low confidence matches manual when only amount and a wide date window match", () => {
    const decision = scoreBankStatementMatch(
      {
        statementDate: "2026-06-27",
        amount: 700,
      },
      {
        id: "payment-2",
        source: "payment",
        transactionDate: "2026-06-21",
        amount: 700,
      },
    );

    expect(decision.strength).toBe("possible");
    expect(decision.autoMatch).toBe(false);
  });

  it("rejects mismatched amounts even when dates and references are close", () => {
    const decision = scoreBankStatementMatch(
      {
        statementDate: "2026-06-27",
        amount: 100,
        referenceNumber: "PAY-009",
      },
      {
        id: "payment-9",
        source: "payment",
        transactionDate: "2026-06-27",
        amount: 130,
        documentNumber: "PAY-009",
      },
    );

    expect(decision.strength).toBe("none");
    expect(decision.autoMatch).toBe(false);
    expect(decision.reasons).toEqual(["amount_mismatch"]);
  });

  it("selects the highest scored candidate", () => {
    const best = findBestBankStatementMatch(
      {
        statementDate: "2026-06-27",
        amount: 500,
        referenceNumber: "REF-2",
      },
      [
        {
          id: "candidate-1",
          source: "payment",
          transactionDate: "2026-06-27",
          amount: 500,
          documentNumber: "REF-1",
        },
        {
          id: "candidate-2",
          source: "payment",
          transactionDate: "2026-06-27",
          amount: 500,
          documentNumber: "REF-2",
        },
      ],
    );

    expect(best?.candidateId).toBe("candidate-2");
    expect(best?.strength).toBe("exact");
  });
});
