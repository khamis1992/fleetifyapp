import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"

// Enhanced types for ledger functionality
export interface AccountBalance {
  account_id: string
  account_code: string
  account_name: string
  account_name_ar?: string
  account_type: 'assets' | 'liabilities' | 'equity' | 'revenue' | 'expenses'
  balance_type: 'debit' | 'credit'
  debit_total: number
  credit_total: number
  net_balance: number
  transaction_count: number
}

export interface AccountTransaction {
  id: string
  entry_number: string
  entry_date: string
  line_description?: string
  debit_amount: number
  credit_amount: number
  running_balance: number
  reference_type?: string
  reference_id?: string
  status: 'draft' | 'posted' | 'reversed'
}

export interface TrialBalanceItem {
  account_id: string
  account_code: string
  account_name: string
  account_name_ar?: string
  account_type: 'assets' | 'liabilities' | 'equity' | 'revenue' | 'expenses'
  debit_balance: number
  credit_balance: number
}

// Hook to get account balances with transaction counts
export const useAccountBalances = (filters?: {
  account_type?: string
  date_from?: string
  date_to?: string
}) => {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['account-balances', user?.id, filters],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')

      let query = supabase
        .from('journal_entry_lines')
        .select(`
          account_id,
          debit_amount,
          credit_amount,
          account:chart_of_accounts!inner (
            id,
            account_code,
            account_name,
            account_name_ar,
            account_type,
            balance_type
          ),
          journal_entry:journal_entries!inner (
            entry_date,
            status
          )
        `)
        .eq('account.is_active', true)

      // Apply filters
      if (filters?.account_type) {
        query = query.eq('account.account_type', filters.account_type)
      }
      
      if (filters?.date_from) {
        query = query.gte('journal_entry.entry_date', filters.date_from)
      }
      
      if (filters?.date_to) {
        query = query.lte('journal_entry.entry_date', filters.date_to)
      }

      // Only include posted entries for balance calculations
      query = query.eq('journal_entry.status', 'posted')

      const { data, error } = await query

      if (error) throw error

      // Group by account and calculate balances
      const accountBalances = new Map<string, AccountBalance>()

      data?.forEach((line: any) => {
        const accountId = line.account_id
        const account = line.account

        if (!accountBalances.has(accountId)) {
          accountBalances.set(accountId, {
            account_id: accountId,
            account_code: account.account_code,
            account_name: account.account_name,
            account_name_ar: account.account_name_ar,
            account_type: account.account_type,
            balance_type: account.balance_type,
            debit_total: 0,
            credit_total: 0,
            net_balance: 0,
            transaction_count: 0
          })
        }

        const balance = accountBalances.get(accountId)!
        balance.debit_total += line.debit_amount || 0
        balance.credit_total += line.credit_amount || 0
        balance.transaction_count += 1
      })

      // Calculate net balances
      accountBalances.forEach(balance => {
        if (balance.balance_type === 'debit') {
          balance.net_balance = balance.debit_total - balance.credit_total
        } else {
          balance.net_balance = balance.credit_total - balance.debit_total
        }
      })

      return Array.from(accountBalances.values()).sort((a, b) => 
        a.account_code.localeCompare(b.account_code)
      )
    },
    enabled: !!user?.id,
  })
}

// Hook to get transactions for a specific account
export const useAccountTransactions = (accountId: string, filters?: {
  date_from?: string
  date_to?: string
  status?: string
}) => {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['account-transactions', accountId, user?.id, filters],
    queryFn: async () => {
      if (!user?.id || !accountId) throw new Error('Missing required parameters')

      let query = supabase
        .from('journal_entry_lines')
        .select(`
          id,
          debit_amount,
          credit_amount,
          line_description,
          journal_entry:journal_entries!inner (
            id,
            entry_number,
            entry_date,
            reference_type,
            reference_id,
            status
          )
        `)
        .eq('account_id', accountId)
        .order('journal_entry(entry_date)', { ascending: true })

      // Apply filters
      if (filters?.date_from) {
        query = query.gte('journal_entry.entry_date', filters.date_from)
      }
      
      if (filters?.date_to) {
        query = query.lte('journal_entry.entry_date', filters.date_to)
      }

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('journal_entry.status', filters.status)
      }

      const { data, error } = await query

      if (error) throw error

      // Calculate running balance
      let runningBalance = 0
      const transactions: AccountTransaction[] = []

      data?.forEach((line: any) => {
        const debitAmount = line.debit_amount || 0
        const creditAmount = line.credit_amount || 0
        
        // For debit balance accounts: debits increase, credits decrease
        // For credit balance accounts: credits increase, debits decrease
        runningBalance += debitAmount - creditAmount

        transactions.push({
          id: line.id,
          entry_number: line.journal_entry.entry_number,
          entry_date: line.journal_entry.entry_date,
          line_description: line.line_description,
          debit_amount: debitAmount,
          credit_amount: creditAmount,
          running_balance: runningBalance,
          reference_type: line.journal_entry.reference_type,
          reference_id: line.journal_entry.reference_id,
          status: line.journal_entry.status
        })
      })

      return transactions
    },
    enabled: !!user?.id && !!accountId,
  })
}

// Hook to generate trial balance
export const useTrialBalance = (asOfDate?: string) => {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['trial-balance', user?.id, asOfDate],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')

      let query = supabase
        .from('journal_entry_lines')
        .select(`
          account_id,
          debit_amount,
          credit_amount,
          account:chart_of_accounts!inner (
            id,
            account_code,
            account_name,
            account_name_ar,
            account_type,
            balance_type
          ),
          journal_entry:journal_entries!inner (
            entry_date,
            status
          )
        `)
        .eq('account.is_active', true)
        .eq('journal_entry.status', 'posted')

      // Filter by date if provided
      if (asOfDate) {
        query = query.lte('journal_entry.entry_date', asOfDate)
      }

      const { data, error } = await query

      if (error) throw error

      // Group by account and calculate trial balance
      const trialBalance = new Map<string, TrialBalanceItem>()
      let totalDebits = 0
      let totalCredits = 0

      data?.forEach((line: any) => {
        const accountId = line.account_id
        const account = line.account

        if (!trialBalance.has(accountId)) {
          trialBalance.set(accountId, {
            account_id: accountId,
            account_code: account.account_code,
            account_name: account.account_name,
            account_name_ar: account.account_name_ar,
            account_type: account.account_type,
            debit_balance: 0,
            credit_balance: 0
          })
        }

        const balance = trialBalance.get(accountId)!
        const debitAmount = line.debit_amount || 0
        const creditAmount = line.credit_amount || 0

        // Calculate net balance based on account type
        if (account.balance_type === 'debit') {
          const netBalance = debitAmount - creditAmount
          if (netBalance > 0) {
            balance.debit_balance += netBalance
            totalDebits += netBalance
          } else if (netBalance < 0) {
            balance.credit_balance += Math.abs(netBalance)
            totalCredits += Math.abs(netBalance)
          }
        } else {
          const netBalance = creditAmount - debitAmount
          if (netBalance > 0) {
            balance.credit_balance += netBalance
            totalCredits += netBalance
          } else if (netBalance < 0) {
            balance.debit_balance += Math.abs(netBalance)
            totalDebits += Math.abs(netBalance)
          }
        }
      })

      const trialBalanceItems = Array.from(trialBalance.values())
        .filter(item => item.debit_balance > 0 || item.credit_balance > 0)
        .sort((a, b) => a.account_code.localeCompare(b.account_code))

      return {
        items: trialBalanceItems,
        totals: {
          total_debits: totalDebits,
          total_credits: totalCredits,
          difference: totalDebits - totalCredits
        }
      }
    },
    enabled: !!user?.id,
  })
}