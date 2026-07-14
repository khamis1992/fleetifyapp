import { supabase } from "@/integrations/supabase/client";

export type LinkedBankTransaction = {
  id: string;
  payment_id: string | null;
  transaction_number: string;
};

export async function reconcileLinkedBankTransactions(
  transactions: LinkedBankTransaction[],
  reason: string,
): Promise<number> {
  if (transactions.length === 0) {
    throw new Error("اختر معاملات للتسوية");
  }

  const unlinkedTransactions = transactions.filter((transaction) => !transaction.payment_id);
  if (unlinkedTransactions.length > 0) {
    const numbers = unlinkedTransactions
      .slice(0, 3)
      .map((transaction) => transaction.transaction_number)
      .join("، ");
    throw new Error(
      `لا يمكن تسوية حركات غير مرتبطة بدفعات موثقة: ${numbers}. طابقها مع كشف البنك أو راجع مصدرها أولاً.`,
    );
  }

  let reconciledCount = 0;
  for (const transaction of transactions) {
    const paymentId = transaction.payment_id;
    if (!paymentId) {
      throw new Error(`الحركة ${transaction.transaction_number} غير مرتبطة بدفعة موثقة.`);
    }

    const { error } = await supabase.rpc("reconcile_payment_with_bank_transaction", {
      p_payment_id: paymentId,
      p_reason: reason,
      p_bank_transaction_id: transaction.id,
    });

    if (error) {
      const partialResult = reconciledCount > 0
        ? ` تمت تسوية ${reconciledCount} حركة قبل توقف العملية.`
        : "";
      throw new Error(
        `تعذرت تسوية الحركة ${transaction.transaction_number}: ${error.message}.${partialResult}`,
      );
    }

    reconciledCount += 1;
  }

  return reconciledCount;
}
