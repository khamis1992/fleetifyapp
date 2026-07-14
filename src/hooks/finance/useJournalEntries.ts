/**
 * Journal Entries Hooks
 * Extracted from useFinance.ts for better code organization and tree-shaking
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { toast } from "sonner";
import { queryKeys } from "@/utils/queryKeys";
import type { ChartOfAccount } from '../useChartOfAccounts';
import { assertFinancialPeriodOpen } from "@/services/financialControls";
import { useFinanceAccessGuard } from "@/hooks/finance/useFinanceAccessGuard";
import type { Database } from "@/integrations/supabase/types";

type JournalEntryInsert = Database["public"]["Tables"]["journal_entries"]["Insert"];
type JournalEntryLineInsert = Database["public"]["Tables"]["journal_entry_lines"]["Insert"];
type CreateJournalEntryInput = Omit<JournalEntryInsert, "company_id"> & {
  lines: Omit<JournalEntryLineInsert, "journal_entry_id" | "line_number">[];
};

export interface JournalEntry {
  id: string;
  company_id: string;
  entry_number: string;
  entry_date: string;
  accounting_period_id?: string;
  reference_type?: string;
  reference_id?: string;
  description: string;
  total_debit: number;
  total_credit: number;
  status: 'draft' | 'posted' | 'reversed';
  created_by?: string;
  posted_by?: string;
  posted_at?: string;
  reversed_by?: string;
  reversed_at?: string;
  reversal_entry_id?: string;
  created_at: string;
  updated_at: string;
}

export interface JournalEntryLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  cost_center_id?: string | null;
  asset_id?: string | null;
  employee_id?: string | null;
  line_description?: string;
  debit_amount: number;
  credit_amount: number;
  line_number: number;
  created_at: string;
  account?: ChartOfAccount;
}

interface JournalEntryFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
}

export const useJournalEntries = (filters?: JournalEntryFilters) => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: queryKeys.journalEntries.list(filters),
    queryFn: async () => {
      if (!companyId) throw new Error("No company access");

      let query = supabase
        .from("journal_entries")
        .select("*")
        .eq("company_id", companyId)
        .order("entry_date", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.startDate) {
        query = query.gte("entry_date", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("entry_date", filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useJournalEntryLines = (journalEntryId: string) => {
  return useQuery({
    queryKey: ['journal-entry-lines', journalEntryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entry_lines")
        .select(`
          *,
          account:chart_of_accounts(*)
        `)
        .eq("journal_entry_id", journalEntryId)
        .order("line_number");

      if (error) throw error;
      return data || [];
    },
    enabled: !!journalEntryId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateJournalEntry = () => {
  const { companyId } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();
  const financeAccess = useFinanceAccessGuard();

  return useMutation({
    mutationFn: async (entry: CreateJournalEntryInput) => {
      if (!companyId) throw new Error("No company access");
      if (!financeAccess.can('finance.journal.create_draft')) {
        throw new Error("ليس لديك صلاحية إنشاء قيد محاسبي");
      }

      const { lines, ...entryData } = entry;
      await assertFinancialPeriodOpen(companyId, entryData.entry_date);

      // Create journal entry
      const { data: journalEntry, error: entryError } = await supabase
        .from("journal_entries")
        .insert({
          ...entryData,
          company_id: companyId,
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // Create journal entry lines
      if (lines && lines.length > 0) {
        const linesWithJournalId: JournalEntryLineInsert[] = lines.map((line, index) => {
          // Remove company_id — it doesn't exist on journal_entry_lines (it's on journal_entries parent)
          return {
            ...line,
            journal_entry_id: journalEntry.id,
            line_number: index + 1,
          };
        });

        const { error: linesError } = await supabase
          .from("journal_entry_lines")
          .insert(linesWithJournalId);

        if (linesError) {
          const { error: cleanupError } = await supabase
            .from("journal_entries")
            .delete()
            .eq("id", journalEntry.id)
            .eq("company_id", companyId)
            .eq("status", "draft");

          if (cleanupError) {
            throw new Error(`${linesError.message}; failed to remove incomplete journal entry: ${cleanupError.message}`);
          }
          throw linesError;
        }
      }

      return journalEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.journalEntries.all });
      toast.success("تم إنشاء القيد بنجاح");
    },
    onError: (error) => {
      toast.error(`خطأ في إنشاء القيد: ${error.message}`);
    },
  });
};

export const usePostJournalEntry = () => {
  const queryClient = useQueryClient();
  const { companyId, user } = useUnifiedCompanyAccess();
  const financeAccess = useFinanceAccessGuard();

  return useMutation({
    mutationFn: async (entryId: string) => {
      if (!companyId) {
        throw new Error("No company access");
      }

      if (!financeAccess.can('finance.journal.post')) {
        throw new Error("ليس لديك صلاحية ترحيل القيود المحاسبية");
      }

      const { data: existingEntry, error: fetchError } = await supabase
        .from("journal_entries")
        .select("id, company_id, entry_date, created_by, status")
        .eq("id", entryId)
        .eq("company_id", companyId)
        .single();

      if (fetchError || !existingEntry) {
        throw new Error("القيد غير موجود");
      }

      const segregationDecision = financeAccess.checkSegregationOfDuties({
        action: 'finance.journal.post',
        actorId: user?.id,
        creatorId: existingEntry.created_by,
      });

      if (!segregationDecision.allowed) {
        throw new Error(segregationDecision.reason || "تم منع العملية بسبب قاعدة فصل المهام");
      }

      if (existingEntry.company_id && existingEntry.entry_date) {
        await assertFinancialPeriodOpen(existingEntry.company_id, existingEntry.entry_date);
      }

      const { data, error } = await supabase
        .from("journal_entries")
        .update({
          status: 'posted',
          posted_by: user?.id,
          posted_at: new Date().toISOString(),
        })
        .eq('id', entryId)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.journalEntries.all });
      toast.success("تم ترحيل القيد بنجاح");
    },
    onError: (error) => {
      toast.error(`خطأ في ترحيل القيد: ${error.message}`);
    },
  });
};
