/**
 * Fleet-to-ledger bridge hooks.
 * Candidates + negative-balance explanations reads, acknowledged journal posting,
 * and chart-subtype application for mapped bridge accounts.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { useFinanceAccessGuard } from "@/hooks/finance/useFinanceAccessGuard";
import { queryKeys } from "@/utils/queryKeys";
import type { BridgeEntryDraft } from "@/components/finance/fleetBridge/buildFleetBridgeDrafts";
import {
  fleetBridgeErrorMessage,
  readFleetBridgeCandidates,
  readNegativeExplanations,
  upsertNegativeExplanation,
} from "@/services/fleetBridge";

export function useFleetBridgeCandidates(asOf: string) {
  const { companyId } = useUnifiedCompanyAccess();
  return useQuery({
    queryKey: queryKeys.fleetBridge.candidates(companyId ?? undefined, asOf),
    queryFn: () => {
      if (!companyId) throw new Error("No company access");
      return readFleetBridgeCandidates(companyId, asOf);
    },
    enabled: Boolean(companyId && asOf),
    staleTime: 30_000,
  });
}

export function useNegativeExplanations(asOf: string) {
  const { companyId } = useUnifiedCompanyAccess();
  return useQuery({
    queryKey: queryKeys.fleetBridge.negativeExplanations(companyId ?? undefined, asOf),
    queryFn: () => {
      if (!companyId) throw new Error("No company access");
      return readNegativeExplanations(companyId, asOf);
    },
    enabled: Boolean(companyId && asOf),
  });
}

export function useUpsertNegativeExplanation(asOf: string) {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  return useMutation({
    mutationFn: (input: { accountId: string; explanation: string }) =>
      upsertNegativeExplanation({
        companyId: companyId!,
        accountId: input.accountId,
        asOf,
        explanation: input.explanation,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fleetBridge.all });
      toast.success("حُفظ تفسير الرصيد السالب");
    },
    onError: (error) => {
      toast.error(fleetBridgeErrorMessage(error));
    },
  });
}

/**
 * All default account types with their current company mapping state — powers
 * the unmapped-types checklist in the bridge page.
 */
export function useAccountMappingChecklist() {
  const { companyId } = useUnifiedCompanyAccess();
  return useQuery({
    queryKey: [...queryKeys.fleetBridge.all, "mapping-checklist", companyId],
    queryFn: async () => {
      if (!companyId) throw new Error("No company access");
      const { data: types, error: typesError } = await supabase
        .from("default_account_types")
        .select("id, type_code, type_name, type_name_ar, account_category")
        .order("type_code");
      if (typesError) throw typesError;
      const { data: mappings, error: mappingsError } = await supabase
        .from("account_mappings")
        .select("default_account_type_id, chart_of_accounts_id, is_active")
        .eq("company_id", companyId);
      if (mappingsError) throw mappingsError;
      const mappedTypeIds = new Set(
        (mappings || [])
          .filter((mapping) => mapping.is_active !== false)
          .map((mapping) => mapping.default_account_type_id)
      );
      return (types || []).map((type) => ({
        ...type,
        mapped: mappedTypeIds.has(type.id),
      }));
    },
    enabled: Boolean(companyId),
    staleTime: 30_000,
  });
}

/** Upserts a mapping row (unique per company+type): repoint or insert. */
export function useSetAccountMapping() {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  return useMutation({
    mutationFn: async (input: { typeCode: string; chartAccountId: string }) => {
      if (!companyId) throw new Error("No company access");
      const { data: typeRow, error: typeError } = await supabase
        .from("default_account_types")
        .select("id")
        .eq("type_code", input.typeCode)
        .single();
      if (typeError || !typeRow) throw new Error("Unknown account type");
      const { data: existing, error: findError } = await supabase
        .from("account_mappings")
        .select("id")
        .eq("company_id", companyId)
        .eq("default_account_type_id", typeRow.id);
      if (findError) throw findError;
      if (existing && existing.length > 0) {
        const { error } = await supabase
          .from("account_mappings")
          .update({ chart_of_accounts_id: input.chartAccountId, is_active: true })
          .eq("id", existing[0].id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("account_mappings").insert({
          company_id: companyId,
          default_account_type_id: typeRow.id,
          chart_of_accounts_id: input.chartAccountId,
          is_active: true,
        });
        if (error) throw error;
      }
      return { typeCode: input.typeCode };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fleetBridge.all });
      toast.success(`رُبط دور «${result.typeCode}» بالحساب المحدد`);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error && /duplicate|unique/i.test(error.message)
          ? "يوجد ربط لهذا الدور — حدّث الصفحة وأعد المحاولة."
          : fleetBridgeErrorMessage(error)
      );
    },
  });
}

/** Loose RPC boundary for functions added after the last generated-type dump. */
const looseRpc = (
  name: string,
  args: Record<string, unknown>
): PromiseLike<{
  data: unknown;
  error: { message: string; code?: string } | null;
}> =>
  (supabase.rpc as unknown as (
    name: string,
    args: Record<string, unknown>
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>)(name, args);

/**
 * Creates bridge drafts sequentially through the canonical RPC. Idempotency is
 * enforced by the unique (company, reference_type, reference_id) index; the
 * candidates reader already flags bridged sources so reruns skip them.
 */
export function useCreateBridgeDrafts() {
  const queryClient = useQueryClient();
  const { companyId, user } = useUnifiedCompanyAccess();
  const financeAccess = useFinanceAccessGuard();

  return useMutation({
    mutationFn: async (drafts: BridgeEntryDraft[]) => {
      if (!companyId) throw new Error("No company access");
      if (!financeAccess.can("finance.journal.create_draft")) {
        throw new Error("ليس لديك صلاحية إنشاء قيد محاسبي");
      }
      const created: Array<{ id: string; entry_number: string; description: string }> = [];
      for (const draft of drafts) {
        const { data, error } = await looseRpc("create_manual_journal_entry_v1", {
          p_company_id: companyId,
          p_entry_number: `${draft.entryNumberPrefix}-${draft.referenceId.replace(/-/g, '').slice(0, 8)}`,
          p_entry_date: draft.entryDate,
          p_description: draft.description,
          p_reference_type: draft.referenceType,
          p_reference_id: draft.referenceId,
          p_lines: draft.lines.map((line) => ({
            account_id: line.accountId,
            cost_center_id: null,
            asset_id: line.asset_id || null,
            employee_id: null,
            line_description: line.line_description || "",
            debit_amount: Number(line.debit_amount) || 0,
            credit_amount: Number(line.credit_amount) || 0,
          })),
          p_idempotency_key: crypto.randomUUID(),
          p_actor_id: user?.id,
        });
        if (error) throw error;
        const entry = data as { id?: string; entry_number?: string; description?: string } | null;
        if (entry?.id) {
          created.push({
            id: entry.id,
            entry_number: entry.entry_number ?? "",
            description: entry.description ?? draft.description,
          });
        }
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.journalEntries.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.fleetBridge.all });
    },
    onError: (error) => {
      toast.error(fleetBridgeErrorMessage(error));
    },
  });
}

/**
 * Posts a bridge draft through the canonical RPC. The strict segregation rule
 * stays default; the acknowledged variant is only sent after an explicit
 * reviewer confirmation in the page.
 */
export function usePostBridgeEntry() {
  const queryClient = useQueryClient();
  const { companyId, user } = useUnifiedCompanyAccess();
  const financeAccess = useFinanceAccessGuard();

  return useMutation({
    mutationFn: async (input: { entryId: string; selfReviewAcknowledged?: boolean }) => {
      if (!companyId) throw new Error("No company access");
      if (!financeAccess.can("finance.journal.post")) {
        throw new Error("ليس لديك صلاحية ترحيل القيود المحاسبية");
      }
      const { data, error } = await looseRpc("post_manual_journal_entry_v1", {
        p_company_id: companyId,
        p_entry_id: input.entryId,
        p_actor_id: user?.id,
        p_self_review_acknowledged: Boolean(input.selfReviewAcknowledged),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.journalEntries.all });
      queryClient.invalidateQueries({ queryKey: ["accountBalances"] });
      queryClient.invalidateQueries({ queryKey: ["trialBalance"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error && /cannot post the same journal/i.test(error.message)
          ? "قاعدة فصل المهام تمنع ترحيل منشئ القيد لقيده — فعّل الإقرار الذاتي الموثق أو لْبيه مستخدماً آخر."
          : fleetBridgeErrorMessage(error)
      );
    },
  });
}
