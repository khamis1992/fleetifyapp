import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"

export interface LedgerFilters {
  dateFrom?: string
  dateTo?: string
  accountId?: string
  costCenterId?: string
  referenceType?: string
  status?: string
  searchTerm?: string
}

export interface AccountBalance {
  account_id: string
  account_code: string
  account_name: string
  account_name_ar?: string
  account_type: string
  balance_type: 'debit' | 'credit'
  opening_balance: number
  total_debits: number
  total_credits: number
  closing_balance: number
}

export interface AccountMovement {
  id: string
  entry_number: string
  entry_date: string
  line_description?: string
  debit_amount: number
  credit_amount: number
  running_balance: number
  reference_type?: string
  reference_id?: string
  journal_entry_id: string
  cost_center?: {
    id: string
    center_code: string
    center_name: string
    center_name_ar?: string
  }
}

export interface TrialBalanceItem {
  account_id: string
  account_code: string
  account_name: string
  account_name_ar?: string
  account_type: string
  account_level: number
  debit_balance: number
  credit_balance: number
}

export interface FinancialSummary {
  total_assets: number
  total_liabilities: number
  total_equity: number
  total_revenue: number
  total_expenses: number
  net_income: number
  unbalanced_entries_count: number
}

// Enhanced Journal Entries with relations
export const useEnhancedJournalEntries = (filters?: LedgerFilters) => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ["enhancedJournalEntries", user?.profile?.company_id, filters],
    queryFn: async () => {
      let query = supabase
        .from("journal_entries")
        .select(`
          *,
          created_by_profile:profiles!journal_entries_created_by_fkey(first_name, last_name, first_name_ar, last_name_ar),
          posted_by_profile:profiles!journal_entries_posted_by_fkey(first_name, last_name, first_name_ar, last_name_ar),
          journal_entry_lines(
            *,
            account:chart_of_accounts(*),
            cost_center:cost_centers(*)
          )
        `)
        .order("entry_date", { ascending: false })
        .order("entry_number", { ascending: false })
      
      if (filters?.status && filters.status !== 'all') {
        query = query.eq("status", filters.status)
      }
      if (filters?.dateFrom) {
        query = query.gte("entry_date", filters.dateFrom)
      }
      if (filters?.dateTo) {
        query = query.lte("entry_date", filters.dateTo)
      }
      if (filters?.referenceType) {
        query = query.eq("reference_type", filters.referenceType)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      // Filter by search term if provided
      let filteredData = data
      if (filters?.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase()
        filteredData = data.filter(entry =>
          entry.description.toLowerCase().includes(searchLower) ||
          entry.entry_number.toLowerCase().includes(searchLower)
        )
      }
      
      return filteredData
    },
    enabled: !!user?.profile?.company_id
  })
}

// Account Balances
export const useAccountBalances = (filters?: { accountType?: string; asOfDate?: string }) => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ["accountBalances", user?.profile?.company_id, filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_account_balances', {
        company_id_param: user?.profile?.company_id,
        as_of_date: filters?.asOfDate || new Date().toISOString().split('T')[0],
        account_type_filter: filters?.accountType
      })
      
      if (error) throw error
      return data as AccountBalance[]
    },
    enabled: !!user?.profile?.company_id
  })
}

// Account Movements (Detailed)
export const useAccountMovements = (accountId: string, filters?: LedgerFilters) => {
  return useQuery({
    queryKey: ["accountMovements", accountId, filters],
    queryFn: async () => {
      let query = supabase
        .from("journal_entry_lines")
        .select(`
          *,
          journal_entry:journal_entries(*),
          cost_center:cost_centers(*)
        `)
        .eq("account_id", accountId)
        .order("journal_entry(entry_date)", { ascending: true })
        .order("journal_entry(entry_number)", { ascending: true })
      
      if (filters?.dateFrom) {
        query = query.gte("journal_entry.entry_date", filters.dateFrom)
      }
      if (filters?.dateTo) {
        query = query.lte("journal_entry.entry_date", filters.dateTo)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      // Calculate running balances
      let runningBalance = 0
      const movements = data.map(line => {
        const movement = line.debit_amount - line.credit_amount
        runningBalance += movement
        
        return {
          id: line.id,
          entry_number: line.journal_entry.entry_number,
          entry_date: line.journal_entry.entry_date,
          line_description: line.line_description,
          debit_amount: line.debit_amount,
          credit_amount: line.credit_amount,
          running_balance: runningBalance,
          reference_type: line.journal_entry.reference_type,
          reference_id: line.journal_entry.reference_id,
          journal_entry_id: line.journal_entry_id,
          cost_center: line.cost_center
        } as AccountMovement
      })
      
      return movements
    },
    enabled: !!accountId
  })
}

// Trial Balance
export const useTrialBalance = (asOfDate?: string) => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ["trialBalance", user?.profile?.company_id, asOfDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_trial_balance', {
        company_id_param: user?.profile?.company_id,
        as_of_date: asOfDate || new Date().toISOString().split('T')[0]
      })
      
      if (error) throw error
      return data as TrialBalanceItem[]
    },
    enabled: !!user?.profile?.company_id
  })
}

// Financial Summary
export const useFinancialSummary = (filters?: { dateFrom?: string; dateTo?: string }) => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ["financialSummary", user?.profile?.company_id, filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_financial_summary', {
        company_id_param: user?.profile?.company_id,
        date_from: filters?.dateFrom || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
        date_to: filters?.dateTo || new Date().toISOString().split('T')[0]
      })
      
      if (error) throw error
      return data as FinancialSummary
    },
    enabled: !!user?.profile?.company_id
  })
}

// Cost Center Analysis
export const useCostCenterAnalysis = (filters?: LedgerFilters) => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ["costCenterAnalysis", user?.profile?.company_id, filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_cost_center_analysis', {
        company_id_param: user?.profile?.company_id,
        date_from: filters?.dateFrom,
        date_to: filters?.dateTo
      })
      
      if (error) throw error
      return data
    },
    enabled: !!user?.profile?.company_id
  })
}

// Post Journal Entry
export const usePostJournalEntry = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async (entryId: string) => {
      const { data, error } = await supabase
        .from("journal_entries")
        .update({
          status: 'posted',
          posted_by: user?.id,
          posted_at: new Date().toISOString()
        })
        .eq("id", entryId)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enhancedJournalEntries"] })
      queryClient.invalidateQueries({ queryKey: ["accountBalances"] })
      queryClient.invalidateQueries({ queryKey: ["trialBalance"] })
      queryClient.invalidateQueries({ queryKey: ["financialSummary"] })
      toast.success("تم ترحيل القيد بنجاح")
    },
    onError: (error) => {
      toast.error("خطأ في ترحيل القيد: " + error.message)
    }
  })
}

// Reverse Journal Entry
export const useReverseJournalEntry = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async ({ entryId, reason }: { entryId: string; reason: string }) => {
      const { data, error } = await supabase.rpc('reverse_journal_entry', {
        entry_id: entryId,
        reversal_reason: reason,
        reversed_by_user: user?.id
      })
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enhancedJournalEntries"] })
      queryClient.invalidateQueries({ queryKey: ["accountBalances"] })
      queryClient.invalidateQueries({ queryKey: ["trialBalance"] })
      queryClient.invalidateQueries({ queryKey: ["financialSummary"] })
      toast.success("تم عكس القيد بنجاح")
    },
    onError: (error) => {
      toast.error("خطأ في عكس القيد: " + error.message)
    }
  })
}

// Export data functionality
export const useExportLedgerData = () => {
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async ({ 
      format, 
      filters 
    }: { 
      format: 'excel' | 'pdf' | 'csv'
      filters?: LedgerFilters 
    }) => {
      const { data, error } = await supabase.rpc('export_ledger_data', {
        company_id_param: user?.profile?.company_id,
        export_format: format,
        filters: filters || {}
      })
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success("تم تصدير البيانات بنجاح")
    },
    onError: (error) => {
      toast.error("خطأ في تصدير البيانات: " + error.message)
    }
  })
}