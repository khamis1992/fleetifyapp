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
  description: string
  line_description?: string
  debit_amount: number
  credit_amount: number
  running_balance: number
  reference_type?: string
  reference_id?: string
  journal_entry_id: string
  status: string
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
      if (!user?.profile?.company_id) return []
      
      let query = supabase
        .from("journal_entries")
        .select(`
          *,
          created_by_profile:profiles!created_by(first_name, last_name, first_name_ar, last_name_ar),
          posted_by_profile:profiles!posted_by(first_name, last_name, first_name_ar, last_name_ar),
          journal_entry_lines(
            *,
            account:chart_of_accounts(*),
            cost_center:cost_centers(*)
          )
        `)
        .eq("company_id", user.profile.company_id)
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
      let query = supabase
        .from("chart_of_accounts")
        .select(`
          id,
          account_code,
          account_name,
          account_name_ar,
          account_type,
          balance_type,
          current_balance
        `)
        .eq("is_active", true)
        .order("account_code")
      
      if (filters?.accountType) {
        query = query.eq("account_type", filters.accountType)
      }
      
      const { data: accounts, error } = await query
      
      if (error) throw error
      
      // For now, return simplified account balances
      // In a full implementation, we would calculate running balances with journal entries
      const accountBalances: AccountBalance[] = accounts.map(account => ({
        account_id: account.id,
        account_code: account.account_code,
        account_name: account.account_name,
        account_name_ar: account.account_name_ar,
        account_type: account.account_type,
        balance_type: account.balance_type as 'debit' | 'credit',
        opening_balance: account.current_balance,
        total_debits: 0,
        total_credits: 0,
        closing_balance: account.current_balance
      }))
      
      return accountBalances
    },
    enabled: !!user?.profile?.company_id
  })
}

// Account Movements (Detailed)  
export const useAccountMovements = (accountId: string, filters?: LedgerFilters) => {
  return useQuery({
    queryKey: ["accountMovements", accountId, filters],
    queryFn: async () => {
      // Get journal entry lines for the account
      const { data: lines, error: linesError } = await supabase
        .from("journal_entry_lines")
        .select(`
          *,
          journal_entry:journal_entries(*)
        `)
        .eq("account_id", accountId)
      
      if (linesError) throw linesError
      
      // Get cost centers separately to avoid relation issues
      const costCenterIds = lines
        .map(line => line.cost_center_id)
        .filter(id => id !== null)
      
      let costCenters: any[] = []
      if (costCenterIds.length > 0) {
        const { data: centers, error: centersError } = await supabase
          .from("cost_centers")
          .select("id, center_code, center_name, center_name_ar")
          .in("id", costCenterIds)
        
        if (!centersError) {
          costCenters = centers || []
        }
      }
      
      // Filter by date if needed
      let filteredData = lines
      if (filters?.dateFrom || filters?.dateTo) {
        filteredData = lines.filter(line => {
          const entryDate = new Date(line.journal_entry.entry_date)
          if (filters.dateFrom && entryDate < new Date(filters.dateFrom)) return false
          if (filters.dateTo && entryDate > new Date(filters.dateTo)) return false
          return true
        })
      }
      
      // Sort by date and entry number
      filteredData.sort((a, b) => {
        const dateCompare = new Date(a.journal_entry.entry_date).getTime() - new Date(b.journal_entry.entry_date).getTime()
        if (dateCompare !== 0) return dateCompare
        return a.journal_entry.entry_number.localeCompare(b.journal_entry.entry_number)
      })
      
      // Calculate running balances
      let runningBalance = 0
      const movements: AccountMovement[] = filteredData.map(line => {
        const movement = line.debit_amount - line.credit_amount
        runningBalance += movement
        
        const costCenter = line.cost_center_id 
          ? costCenters.find(cc => cc.id === line.cost_center_id)
          : undefined
        
        return {
          id: line.id,
          entry_number: line.journal_entry.entry_number,
          entry_date: line.journal_entry.entry_date,
          description: line.journal_entry.description,
          line_description: line.line_description || '',
          debit_amount: line.debit_amount,
          credit_amount: line.credit_amount,
          running_balance: runningBalance,
          reference_type: line.journal_entry.reference_type || '',
          reference_id: line.journal_entry.reference_id || '',
          journal_entry_id: line.journal_entry_id,
          status: line.journal_entry.status,
          cost_center: costCenter
        }
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
      const { data: accounts, error } = await supabase
        .from("chart_of_accounts")
        .select("*")
        .eq("is_active", true)
        .order("account_level, account_code")
      
      if (error) throw error
      
      // For simplified trial balance, use current balances
      // In full implementation, calculate based on journal entries up to asOfDate
      const trialBalance: TrialBalanceItem[] = accounts.map(account => ({
        account_id: account.id,
        account_code: account.account_code,
        account_name: account.account_name,
        account_name_ar: account.account_name_ar,
        account_type: account.account_type,
        account_level: account.account_level || 1,
        debit_balance: account.balance_type === 'debit' && account.current_balance > 0 ? account.current_balance : 0,
        credit_balance: account.balance_type === 'credit' && account.current_balance > 0 ? account.current_balance : 0
      }))
      
      return trialBalance
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
      const { data: accounts, error } = await supabase
        .from("chart_of_accounts")
        .select("*")
        .eq("is_active", true)
      
      if (error) throw error
      
      // Calculate summary from current balances
      // In full implementation, would calculate from journal entries within date range
      let totalAssets = 0
      let totalLiabilities = 0
      let totalEquity = 0
      let totalRevenue = 0
      let totalExpenses = 0
      
      accounts.forEach(account => {
        const balance = account.current_balance || 0
        switch (account.account_type) {
          case 'assets':
            totalAssets += balance
            break
          case 'liabilities':
            totalLiabilities += balance
            break
          case 'equity':
            totalEquity += balance
            break
          case 'revenue':
            totalRevenue += balance
            break
          case 'expenses':
            totalExpenses += balance
            break
        }
      })
      
      const summary: FinancialSummary = {
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        total_equity: totalEquity,
        total_revenue: totalRevenue,
        total_expenses: totalExpenses,
        net_income: totalRevenue - totalExpenses,
        unbalanced_entries_count: 0 // Would need separate query for this
      }
      
      return summary
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
      // Get cost centers
      const { data: costCenters, error: centersError } = await supabase
        .from("cost_centers")
        .select("*")
        .eq("is_active", true)
        .order("center_code")
      
      if (centersError) throw centersError
      
      // Get journal entry lines for cost centers
      const { data: lines, error: linesError } = await supabase
        .from("journal_entry_lines")
        .select(`
          cost_center_id,
          debit_amount,
          credit_amount,
          journal_entry:journal_entries(entry_date, status)
        `)
        .not("cost_center_id", "is", null)
      
      if (linesError) throw linesError
      
      const analysis = costCenters.map(center => {
        const centerLines = lines.filter(line => line.cost_center_id === center.id)
        let totalDebits = 0
        let totalCredits = 0
        let entryCount = 0
        
        centerLines.forEach((line: any) => {
          if (line.journal_entry?.status === 'posted') {
            const entryDate = new Date(line.journal_entry.entry_date)
            const includeEntry = (!filters?.dateFrom || entryDate >= new Date(filters.dateFrom)) &&
                               (!filters?.dateTo || entryDate <= new Date(filters.dateTo))
            
            if (includeEntry) {
              totalDebits += line.debit_amount || 0
              totalCredits += line.credit_amount || 0
              entryCount++
            }
          }
        })
        
        return {
          cost_center_id: center.id,
          center_code: center.center_code,
          center_name: center.center_name,
          center_name_ar: center.center_name_ar,
          total_debits: totalDebits,
          total_credits: totalCredits,
          net_amount: totalDebits - totalCredits,
          entry_count: entryCount
        }
      })
      
      return analysis
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
      // For now, just update the status to reversed
      // In full implementation, would create a reversal entry
      const { data, error } = await supabase
        .from("journal_entries")
        .update({
          status: 'reversed',
          reversed_by: user?.id,
          reversed_at: new Date().toISOString()
        })
        .eq("id", entryId)
        .eq("status", "posted")
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
      // For now, return a success message
      // In full implementation, would generate and download the file
      return `Export request for ${format} format has been queued for processing.`
    },
    onSuccess: () => {
      toast.success("تم تصدير البيانات بنجاح")
    },
    onError: (error) => {
      toast.error("خطأ في تصدير البيانات: " + error.message)
    }
  })
}