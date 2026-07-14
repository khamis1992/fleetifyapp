import { beforeEach, describe, expect, it, vi } from "vitest";
import { reconcileLinkedBankTransactions } from "@/utils/bankReconciliationCommands";

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: rpcMock,
  },
}));

describe("reconcileLinkedBankTransactions", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it("rejects the whole selection before writing when a transaction has no linked payment", async () => {
    await expect(
      reconcileLinkedBankTransactions(
        [
          { id: "bank-1", payment_id: "payment-1", transaction_number: "BT-1" },
          { id: "bank-2", payment_id: null, transaction_number: "BT-2" },
        ],
        "test reconciliation",
      ),
    ).rejects.toThrow("BT-2");

    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("uses the audited reconciliation command for every linked transaction", async () => {
    rpcMock.mockResolvedValue({ data: { status: "reconciled" }, error: null });

    const result = await reconcileLinkedBankTransactions(
      [
        { id: "bank-1", payment_id: "payment-1", transaction_number: "BT-1" },
        { id: "bank-2", payment_id: "payment-2", transaction_number: "BT-2" },
      ],
      "test reconciliation",
    );

    expect(result).toBe(2);
    expect(rpcMock).toHaveBeenNthCalledWith(1, "reconcile_payment_with_bank_transaction", {
      p_payment_id: "payment-1",
      p_reason: "test reconciliation",
      p_bank_transaction_id: "bank-1",
    });
    expect(rpcMock).toHaveBeenNthCalledWith(2, "reconcile_payment_with_bank_transaction", {
      p_payment_id: "payment-2",
      p_reason: "test reconciliation",
      p_bank_transaction_id: "bank-2",
    });
  });

  it("reports a partial result and stops after a command failure", async () => {
    rpcMock
      .mockResolvedValueOnce({ data: { status: "reconciled" }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "amount mismatch" } });

    await expect(
      reconcileLinkedBankTransactions(
        [
          { id: "bank-1", payment_id: "payment-1", transaction_number: "BT-1" },
          { id: "bank-2", payment_id: "payment-2", transaction_number: "BT-2" },
          { id: "bank-3", payment_id: "payment-3", transaction_number: "BT-3" },
        ],
        "test reconciliation",
      ),
    ).rejects.toThrow("تمت تسوية 1 حركة");

    expect(rpcMock).toHaveBeenCalledTimes(2);
  });
});
