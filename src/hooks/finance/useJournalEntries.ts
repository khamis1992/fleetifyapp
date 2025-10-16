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
  dateFrom?: string;
  dateTo?: string;
}

export const useJournalEntries = (filters?: JournalEntryFilters) => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: queryKeys.finance.journalEntries(filters),
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
      if (filters?.dateFrom) {
        query = query.gte("entry_date", filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte("entry_date", filters.dateTo);
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

  return useMutation({
    mutationFn: async (entry: Partial<JournalEntry> & { lines: Partial<JournalEntryLine>[] }) => {
      if (!companyId) throw new Error("No company access");

      const { lines, ...entryData } = entry;

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
        const linesWithJournalId = lines.map((line, index) => ({
          ...line,
          journal_entry_id: journalEntry.id,
          line_number: index + 1,
        }));

        const { error: linesError } = await supabase
          .from("journal_entry_lines")
          .insert(linesWithJournalId);

        if (linesError) throw linesError;
      }

      return journalEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.journalEntries() });
      toast.success("تم إنشاء القيد بنجاح");
    },
    onError: (error) => {
      toast.error(`خطأ في إنشاء القيد: ${error.message}`);
    },
  });
};

export const usePostJournalEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryId: string) => {
      const { data, error } = await supabase
        .from("journal_entries")
        .update({
          status: 'posted',
          posted_at: new Date().toISOString(),
        })
        .eq('id', entryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.journalEntries() });
      toast.success("تم ترحيل القيد بنجاح");
    },
    onError: (error) => {
      toast.error(`خطأ في ترحيل القيد: ${error.message}`);
    },
  });
};
