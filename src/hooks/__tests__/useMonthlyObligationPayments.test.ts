import { describe, expect, it } from "vitest";
import { buildMonthlyObligationPaymentRpcArgs } from "@/hooks/useMonthlyObligations";

const paymentInput = {
  installment_id: "installment-1",
  idempotency_key: "11111111-1111-4111-8111-111111111111",
  amount: 250.5,
  payment_date: "2026-07-14",
  bank_id: "bank-1",
  cash_account_id: "account-1",
  reference_number: "REF-1",
  notes: "Partial payment",
};

describe("monthly obligation payment command", () => {
  it("builds one complete atomic RPC request", () => {
    expect(
      buildMonthlyObligationPaymentRpcArgs("company-1", "user-1", paymentInput)
    ).toEqual({
      p_company_id: "company-1",
      p_installment_id: "installment-1",
      p_amount: 250.5,
      p_payment_date: "2026-07-14",
      p_bank_id: "bank-1",
      p_cash_account_id: "account-1",
      p_reference_number: "REF-1",
      p_notes: "Partial payment",
      p_idempotency_key: "11111111-1111-4111-8111-111111111111",
      p_actor_id: "user-1",
    });
  });

  it("keeps the same idempotency key across retries", () => {
    const first = buildMonthlyObligationPaymentRpcArgs(
      "company-1",
      "user-1",
      paymentInput
    );
    const retry = buildMonthlyObligationPaymentRpcArgs(
      "company-1",
      "user-1",
      paymentInput
    );
    expect(retry.p_idempotency_key).toBe(first.p_idempotency_key);
  });

  it.each([
    [{ ...paymentInput, amount: 0 }, "مبلغ السداد"],
    [{ ...paymentInput, payment_date: "2026-02-30" }, "تاريخ السداد"],
    [{ ...paymentInput, cash_account_id: "none" }, "حساب النقد"],
    [{ ...paymentInput, idempotency_key: "" }, "مفتاح منع التكرار"],
  ])("rejects an invalid command", (input, message) => {
    expect(() =>
      buildMonthlyObligationPaymentRpcArgs("company-1", "user-1", input)
    ).toThrow(message);
  });
});
