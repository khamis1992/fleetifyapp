import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import {
  approveProfessionalBalanceSheet,
  listProfessionalBalanceSheets,
  readProfessionalBalanceSheet,
  saveProfessionalBalanceSheet,
  validateBalanceSheetDates,
  voidProfessionalBalanceSheet,
} from "@/services/professionalBalanceSheet";
import type { BalanceSheetReviewConfirmations } from "@/types/balanceSheet";
import { summarizeFinancialReportError } from "@/utils/financialReportDiagnostics";

export function useProfessionalBalanceSheet(
  asOf: string,
  comparison: string | null
) {
  const { companyId, user, isInitializing, isAuthenticating } =
    useUnifiedCompanyAccess();
  let datesValid = true;
  try {
    validateBalanceSheetDates(asOf, comparison);
  } catch {
    datesValid = false;
  }
  return useQuery({
    queryKey: [
      "professional-balance-sheet",
      companyId,
      user?.id,
      asOf,
      comparison,
    ],
    queryFn: () => readProfessionalBalanceSheet(companyId!, asOf, comparison),
    enabled: Boolean(
      companyId &&
        user?.id &&
        !isInitializing &&
        !isAuthenticating &&
        datesValid
    ),
    retry: false,
    staleTime: 0,
  });
}

export function useSavedBalanceSheets() {
  const { companyId, user, isInitializing, isAuthenticating } =
    useUnifiedCompanyAccess();
  return useQuery({
    queryKey: ["professional-balance-sheet-snapshots", companyId, user?.id],
    queryFn: () => listProfessionalBalanceSheets(companyId!),
    refetchOnWindowFocus: "always",
    enabled: Boolean(
      companyId && user?.id && !isInitializing && !isAuthenticating
    ),
    retry: false,
  });
}

export function useBalanceSheetActions() {
  const { companyId } = useUnifiedCompanyAccess();
  const client = useQueryClient();
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({
        queryKey: ["professional-balance-sheet", companyId],
      }),
      client.invalidateQueries({
        queryKey: ["professional-balance-sheet-snapshots", companyId],
      }),
    ]);
  };
  const save = useMutation({
    retry: false,
    onError: (error) => console.error('Balance sheet save failed', JSON.stringify(summarizeFinancialReportError(error))),
    mutationFn: ({
      asOf,
      comparison,
      notes,
    }: {
      asOf: string;
      comparison: string | null;
      notes: string;
    }) => saveProfessionalBalanceSheet(companyId!, asOf, comparison, notes),
    onSuccess: refresh,
  });
  const approve = useMutation({
    retry: false,
    onError: (error) => console.error('Balance sheet approval failed', JSON.stringify(summarizeFinancialReportError(error))),
    mutationFn: ({
      id,
      notes,
      confirmations,
      selfReviewAcknowledged,
    }: {
      id: string;
      notes: string;
      confirmations: BalanceSheetReviewConfirmations;
      selfReviewAcknowledged?: boolean;
    }) =>
      approveProfessionalBalanceSheet(
        companyId!,
        id,
        notes,
        confirmations,
        Boolean(selfReviewAcknowledged)
      ),
    onSuccess: refresh,
  });
  const voidReport = useMutation({
    retry: false,
    onError: (error) => console.error('Balance sheet void failed', JSON.stringify(summarizeFinancialReportError(error))),
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      voidProfessionalBalanceSheet(companyId!, id, reason),
    onSuccess: refresh,
  });
  return { save, approve, voidReport };
}
