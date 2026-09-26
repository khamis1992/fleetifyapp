/**
 * Hooks for automatic BS disclosure notes (إيضاحات).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import {
  listAllFinancialStatementNotes,
  listFinancialStatementNotes,
  upsertFinancialStatementNote,
  type FinancialStatementNote,
} from "@/services/financialStatementNotes";

const keys = {
  all: ["financial-statement-notes"] as const,
  asOf: (companyId: string | undefined, asOf: string) =>
    [...keys.all, companyId, asOf] as const,
  admin: (companyId: string | undefined) => [...keys.all, "admin", companyId] as const,
};

/** Active notes for the BS as-of date (auto section + export). */
export function useFinancialStatementNotes(asOf: string) {
  const { companyId } = useUnifiedCompanyAccess();
  return useQuery({
    queryKey: keys.asOf(companyId ?? undefined, asOf),
    queryFn: () => {
      if (!companyId) throw new Error("No company access");
      return listFinancialStatementNotes(companyId, asOf, { activeOnly: true });
    },
    enabled: Boolean(companyId && asOf),
  });
}

/** Admin list (all dates / inactive included). */
export function useFinancialStatementNotesAdmin() {
  const { companyId } = useUnifiedCompanyAccess();
  return useQuery({
    queryKey: keys.admin(companyId ?? undefined),
    queryFn: () => {
      if (!companyId) throw new Error("No company access");
      return listAllFinancialStatementNotes(companyId);
    },
    enabled: Boolean(companyId),
  });
}

export function useUpsertFinancialStatementNote() {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  return useMutation({
    mutationFn: (
      input: Omit<Parameters<typeof upsertFinancialStatementNote>[0], "companyId">
    ) =>
      upsertFinancialStatementNote({
        ...input,
        companyId: companyId!,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.all });
      toast.success("تم حفظ الإيضاح");
    },
    onError: () => {
      toast.error("تعذر حفظ الإيضاح");
    },
  });
}

export type { FinancialStatementNote };
