/**
 * Bank reconciliation hooks: picture reader plus sync/post commands.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { queryKeys } from "@/utils/queryKeys";
import {
  bankReconciliationErrorMessage,
  postBankTransaction,
  readBankReconciliation,
  syncLedgerToBank,
} from "@/services/bankReconciliation";

export function useBankReconciliation() {
  const { companyId } = useUnifiedCompanyAccess();
  return useQuery({
    queryKey: [...queryKeys.fleetBridge.all, "bank-reconciliation", companyId],
    queryFn: () => {
      if (!companyId) throw new Error("No company access");
      return readBankReconciliation(companyId);
    },
    enabled: Boolean(companyId),
  });
}

export function useSyncLedgerToBank() {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  return useMutation({
    mutationFn: () => {
      if (!companyId) throw new Error("No company access");
      return syncLedgerToBank(companyId);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fleetBridge.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.journalEntries.all });
      toast.success(
        `زُامن الدفتر إلى البنك: ${result.createdTransactions} حركة بقيمة ${result.syncedAmount.toLocaleString("ar-QA")} ر.ق`
      );
    },
    onError: (error) => toast.error(bankReconciliationErrorMessage(error)),
  });
}

export function usePostBankTransaction() {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  return useMutation({
    mutationFn: (input: { transactionId: string; counterpartAccountId: string }) => {
      if (!companyId) throw new Error("No company access");
      return postBankTransaction(companyId, input.transactionId, input.counterpartAccountId);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fleetBridge.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.journalEntries.all });
      queryClient.invalidateQueries({ queryKey: ["accountBalances"] });
      toast.success(
        result.status === "posted"
          ? "رُحّل قيد الحركة البنكية بنجاح"
          : "أُنشئ القيد مسودة (تاريخ الحركة مستقبلي) وسيُرحَّل عند حلوله"
      );
    },
    onError: (error) => toast.error(bankReconciliationErrorMessage(error)),
  });
}
