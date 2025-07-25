import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"

// Types
export interface ChartOfAccount {
  id: string
  company_id: string
  account_code: string
  account_name: string
  account_name_ar?: string
  account_type: 'assets' | 'liabilities' | 'equity' | 'revenue' | 'expenses'
  account_subtype?: string
  parent_account_id?: string
  account_level?: number
  sort_order?: number
  is_header?: boolean
  is_default?: boolean
  is_active: boolean
  is_system: boolean
  balance_type: 'debit' | 'credit'
  current_balance: number
  description?: string
  created_at: string
  updated_at: string
}

export interface JournalEntry {
  id: string
  company_id: string
  entry_number: string
  entry_date: string
  accounting_period_id?: string
  reference_type?: string
  reference_id?: string
  description: string
  total_debit: number
  total_credit: number
  status: 'draft' | 'posted' | 'reversed'
  created_by?: string
  posted_by?: string
  posted_at?: string
  reversed_by?: string
  reversed_at?: string
  reversal_entry_id?: string
  created_at: string
  updated_at: string
}

export interface JournalEntryLine {
  id: string
  journal_entry_id: string
  account_id: string
  line_description?: string
  debit_amount: number
  credit_amount: number
  line_number: number
  created_at: string
  account?: ChartOfAccount
}

export interface Invoice {
  id: string
  company_id: string
  invoice_number: string
  invoice_date: string
  due_date?: string
  customer_id?: string
  vendor_id?: string
  cost_center_id?: string
  fixed_asset_id?: string
  invoice_type: 'sales' | 'purchase' | 'service'
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  paid_amount: number
  balance_due: number
  currency: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  payment_status: 'unpaid' | 'partial' | 'paid'
  notes?: string
  terms?: string
  journal_entry_id?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  company_id: string
  payment_number: string
  payment_date: string
  payment_type: 'cash' | 'check' | 'bank_transfer' | 'credit_card'
  payment_method: 'received' | 'made'
  customer_id?: string
  vendor_id?: string
  invoice_id?: string
  amount: number
  currency: string
  reference_number?: string
  bank_account?: string
  check_number?: string
  notes?: string
  status: 'pending' | 'cleared' | 'bounced' | 'cancelled'
  journal_entry_id?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface Vendor {
  id: string
  company_id: string
  vendor_code: string
  vendor_name: string
  vendor_name_ar?: string
  contact_person?: string
  email?: string
  phone?: string
  address?: string
  address_ar?: string
  tax_number?: string
  payment_terms: number
  credit_limit: number
  current_balance: number
  is_active: boolean
  notes?: string
  created_at: string
  updated_at: string
}

export interface CostCenter {
  id: string
  company_id: string
  center_code: string
  center_name: string
  center_name_ar?: string
  description?: string
  parent_center_id?: string
  manager_id?: string
  budget_amount?: number
  actual_amount?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface FixedAsset {
  id: string
  company_id: string
  asset_code: string
  asset_name: string
  asset_name_ar?: string
  category: string
  serial_number?: string
  location?: string
  purchase_date: string
  purchase_cost: number
  salvage_value?: number
  useful_life_years: number
  depreciation_method: 'straight_line' | 'declining_balance' | 'units_of_production'
  accumulated_depreciation?: number
  book_value: number
  condition_status?: 'excellent' | 'good' | 'fair' | 'poor'
  disposal_date?: string
  disposal_amount?: number
  asset_account_id?: string
  depreciation_account_id?: string
  is_active: boolean
  notes?: string
  created_at: string
  updated_at: string
}

export interface Budget {
  id: string
  company_id: string
  budget_name: string
  budget_year: number
  accounting_period_id?: string
  total_revenue?: number
  total_expenses?: number
  net_income?: number
  status: 'draft' | 'approved' | 'active' | 'closed'
  created_by?: string
  approved_by?: string
  approved_at?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface BankTransaction {
  id: string
  company_id: string
  bank_id: string
  transaction_number: string
  transaction_date: string
  transaction_type: 'deposit' | 'withdrawal' | 'transfer'
  amount: number
  balance_after: number
  description: string
  reference_number?: string
  check_number?: string
  counterpart_bank_id?: string
  status: 'pending' | 'completed' | 'cancelled'
  reconciled?: boolean
  reconciled_at?: string
  journal_entry_id?: string
  created_by?: string
  created_at: string
  updated_at: string
}

// Chart of Accounts Hooks
export const useChartOfAccounts = () => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ["chartOfAccounts", user?.profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chart_of_accounts")
        .select("*")
        .eq("is_active", true)
        .order("account_level, sort_order, account_code")
      
      if (error) throw error
      return data as ChartOfAccount[]
    },
    enabled: !!user?.profile?.company_id
  })
}

export const useCreateAccount = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async (accountData: {
      account_code: string
      account_name: string
      account_name_ar?: string
      account_type: 'assets' | 'liabilities' | 'equity' | 'revenue' | 'expenses'
      balance_type: 'debit' | 'credit'
      account_subtype?: string
      parent_account_id?: string | null
      description?: string
      current_balance?: number
    }) => {
      // Validation
      if (!accountData.account_code.trim()) {
        throw new Error("كود الحساب مطلوب")
      }
      if (!accountData.account_name.trim()) {
        throw new Error("اسم الحساب مطلوب")
      }
      if (!user?.profile?.company_id) {
        throw new Error("معرف الشركة مطلوب")
      }

      // Check for duplicate account code
      const { data: existingAccount } = await supabase
        .from("chart_of_accounts")
        .select("id")
        .eq("company_id", user.profile.company_id)
        .eq("account_code", accountData.account_code.trim())
        .eq("is_active", true)
        .maybeSingle()

      if (existingAccount) {
        throw new Error("كود الحساب موجود بالفعل")
      }

      // Calculate account level
      let accountLevel = 1
      if (accountData.parent_account_id) {
        const { data: parentAccount } = await supabase
          .from("chart_of_accounts")
          .select("account_level")
          .eq("id", accountData.parent_account_id)
          .single()
        
        if (parentAccount) {
          accountLevel = (parentAccount.account_level || 1) + 1
        }
      }

      // Prepare data for insertion
      const insertData = {
        account_code: accountData.account_code.trim(),
        account_name: accountData.account_name.trim(),
        account_name_ar: accountData.account_name_ar?.trim() || null,
        account_type: accountData.account_type,
        balance_type: accountData.balance_type,
        account_subtype: accountData.account_subtype?.trim() || null,
        parent_account_id: accountData.parent_account_id || null,
        description: accountData.description?.trim() || null,
        current_balance: accountData.current_balance || 0,
        company_id: user.profile.company_id,
        account_level: accountLevel,
        is_active: true,
        is_system: false,
        is_header: false,
        sort_order: 0
      }

      console.log('Creating account with data:', insertData)

      const { data, error } = await supabase
        .from("chart_of_accounts")
        .insert(insertData)
        .select()
        .single()
      
      if (error) {
        console.error('Database error:', error)
        throw new Error(`خطأ في قاعدة البيانات: ${error.message}`)
      }
      
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chartOfAccounts"] })
      toast.success("تم إنشاء الحساب بنجاح")
    },
    onError: (error) => {
      console.error('Account creation error:', error)
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير معروف'
      toast.error(`خطأ في إنشاء الحساب: ${errorMessage}`)
    }
  })
}

export const useUpdateAccount = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...accountData }: {
      id: string
      account_code?: string
      account_name?: string
      account_name_ar?: string
      account_type?: 'assets' | 'liabilities' | 'equity' | 'revenue' | 'expenses'
      balance_type?: 'debit' | 'credit'
      account_subtype?: string
      parent_account_id?: string
      description?: string
      current_balance?: number
      is_active?: boolean
    }) => {
      const { data, error } = await supabase
        .from("chart_of_accounts")
        .update(accountData)
        .eq("id", id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chartOfAccounts"] })
      toast.success("تم تحديث الحساب بنجاح")
    },
    onError: (error) => {
      toast.error("خطأ في تحديث الحساب: " + error.message)
    }
  })
}

export const useDeleteAccount = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (accountId: string) => {
      // Instead of deleting, we deactivate the account
      const { data, error } = await supabase
        .from("chart_of_accounts")
        .update({ is_active: false })
        .eq("id", accountId)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chartOfAccounts"] })
      toast.success("تم حذف الحساب بنجاح")
    },
    onError: (error) => {
      toast.error("خطأ في حذف الحساب: " + error.message)
    }
  })
}

// Journal Entries Hooks
export const useJournalEntries = (filters?: { status?: string; dateFrom?: string; dateTo?: string }) => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ["journalEntries", user?.profile?.company_id, filters],
    queryFn: async () => {
      let query = supabase
        .from("journal_entries")
        .select("*")
        .order("entry_date", { ascending: false })
      
      if (filters?.status) {
        query = query.eq("status", filters.status)
      }
      if (filters?.dateFrom) {
        query = query.gte("entry_date", filters.dateFrom)
      }
      if (filters?.dateTo) {
        query = query.lte("entry_date", filters.dateTo)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return data as JournalEntry[]
    },
    enabled: !!user?.profile?.company_id
  })
}

export const useJournalEntryLines = (journalEntryId: string) => {
  return useQuery({
    queryKey: ["journalEntryLines", journalEntryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entry_lines")
        .select(`
          *,
          account:chart_of_accounts(*)
        `)
        .eq("journal_entry_id", journalEntryId)
        .order("line_number")
      
      if (error) throw error
      return data as JournalEntryLine[]
    },
    enabled: !!journalEntryId
  })
}

export const useCreateJournalEntry = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async (entryData: { 
      entry: {
        entry_number: string
        entry_date: string
        description: string
        accounting_period_id?: string
        reference_type?: string
        reference_id?: string
        total_debit?: number
        total_credit?: number
        status?: 'draft' | 'posted' | 'reversed'
      }
      lines: {
        account_id: string
        cost_center_id?: string | null
        line_description?: string
        debit_amount?: number
        credit_amount?: number
      }[]
    }) => {
      if (!user?.profile?.company_id || !user?.id) throw new Error("User data is required")
      
      // Start transaction
      const { data: entry, error: entryError } = await supabase
        .from("journal_entries")
        .insert({
          entry_number: entryData.entry.entry_number,
          entry_date: entryData.entry.entry_date,
          description: entryData.entry.description,
          accounting_period_id: entryData.entry.accounting_period_id,
          reference_type: entryData.entry.reference_type,
          reference_id: entryData.entry.reference_id,
          total_debit: entryData.entry.total_debit || 0,
          total_credit: entryData.entry.total_credit || 0,
          status: entryData.entry.status || 'draft',
          company_id: user.profile.company_id,
          created_by: user.id
        })
        .select()
        .single()
      
      if (entryError) throw entryError
      
      // Insert lines
      const lines = entryData.lines.map((line, index) => ({
        journal_entry_id: entry.id,
        account_id: line.account_id,
        cost_center_id: line.cost_center_id || null,
        line_description: line.line_description,
        debit_amount: line.debit_amount || 0,
        credit_amount: line.credit_amount || 0,
        line_number: index + 1
      }))
      
      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert(lines)
      
      if (linesError) throw linesError
      
      return entry
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journalEntries"] })
      toast.success("تم إنشاء القيد المحاسبي بنجاح")
    },
    onError: (error) => {
      toast.error("خطأ في إنشاء القيد: " + error.message)
    }
  })
}

// Invoices Hooks
export const useInvoices = (filters?: { type?: string; status?: string }) => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ["invoices", user?.profile?.company_id, filters],
    queryFn: async () => {
      let query = supabase
        .from("invoices")
        .select("*")
        .order("invoice_date", { ascending: false })
      
      if (filters?.type) {
        query = query.eq("invoice_type", filters.type)
      }
      if (filters?.status) {
        query = query.eq("status", filters.status)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return data as Invoice[]
    },
    enabled: !!user?.profile?.company_id
  })
}

export const useCreateInvoice = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async (invoiceData: {
      invoice_number: string
      invoice_date: string
      invoice_type: 'sales' | 'purchase' | 'service'
      due_date?: string
      customer_id?: string
      vendor_id?: string
      subtotal?: number
      tax_amount?: number
      discount_amount?: number
      total_amount?: number
      currency?: string
      status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
      payment_status?: 'unpaid' | 'partial' | 'paid'
      notes?: string
      terms?: string
    }) => {
      if (!user?.profile?.company_id || !user?.id) throw new Error("User data is required")
      
      const { data, error } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceData.invoice_number,
          invoice_date: invoiceData.invoice_date,
          invoice_type: invoiceData.invoice_type,
          due_date: invoiceData.due_date,
          customer_id: invoiceData.customer_id,
          vendor_id: invoiceData.vendor_id,
          subtotal: invoiceData.subtotal || 0,
          tax_amount: invoiceData.tax_amount || 0,
          discount_amount: invoiceData.discount_amount || 0,
          total_amount: invoiceData.total_amount || 0,
          paid_amount: 0,
          balance_due: invoiceData.total_amount || 0,
          currency: invoiceData.currency || 'KWD',
          status: invoiceData.status || 'draft',
          payment_status: invoiceData.payment_status || 'unpaid',
          notes: invoiceData.notes,
          terms: invoiceData.terms,
          company_id: user.profile.company_id,
          created_by: user.id
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] })
      toast.success("تم إنشاء الفاتورة بنجاح")
    },
    onError: (error) => {
      toast.error("خطأ في إنشاء الفاتورة: " + error.message)
    }
  })
}

// Payments Hooks
export const usePayments = (filters?: { method?: string; status?: string }) => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ["payments", user?.profile?.company_id, filters],
    queryFn: async () => {
      let query = supabase
        .from("payments")
        .select("*")
        .order("payment_date", { ascending: false })
      
      if (filters?.method) {
        query = query.eq("payment_method", filters.method)
      }
      if (filters?.status) {
        query = query.eq("status", filters.status)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return data as Payment[]
    },
    enabled: !!user?.profile?.company_id
  })
}

// Vendors Hooks
export const useVendors = () => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ["vendors", user?.profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .eq("is_active", true)
        .order("vendor_name")
      
      if (error) throw error
      return data as Vendor[]
    },
    enabled: !!user?.profile?.company_id
  })
}

export const useCreateVendor = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async (vendorData: {
      vendor_code: string
      vendor_name: string
      vendor_name_ar?: string
      contact_person?: string
      email?: string
      phone?: string
      address?: string
      address_ar?: string
      tax_number?: string
      payment_terms?: number
      credit_limit?: number
      notes?: string
    }) => {
      if (!user?.profile?.company_id) throw new Error("Company ID is required")
      
      const { data, error } = await supabase
        .from("vendors")
        .insert({
          vendor_code: vendorData.vendor_code,
          vendor_name: vendorData.vendor_name,
          vendor_name_ar: vendorData.vendor_name_ar,
          contact_person: vendorData.contact_person,
          email: vendorData.email,
          phone: vendorData.phone,
          address: vendorData.address,
          address_ar: vendorData.address_ar,
          tax_number: vendorData.tax_number,
          payment_terms: vendorData.payment_terms || 30,
          credit_limit: vendorData.credit_limit || 0,
          current_balance: 0,
          is_active: true,
          notes: vendorData.notes,
          company_id: user.profile.company_id
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] })
      toast.success("تم إنشاء المورد بنجاح")
    },
    onError: (error) => {
      toast.error("خطأ في إنشاء المورد: " + error.message)
    }
  })
}

export const useUpdateVendor = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...vendorData }: {
      id: string
      vendor_code?: string
      vendor_name?: string
      vendor_name_ar?: string
      contact_person?: string
      email?: string
      phone?: string
      address?: string
      address_ar?: string
      tax_number?: string
      payment_terms?: number
      credit_limit?: number
      notes?: string
      is_active?: boolean
    }) => {
      const { data, error } = await supabase
        .from("vendors")
        .update(vendorData)
        .eq("id", id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] })
      toast.success("تم تحديث المورد بنجاح")
    },
    onError: (error) => {
      toast.error("خطأ في تحديث المورد: " + error.message)
    }
  })
}

export const useDeleteVendor = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("vendors")
        .update({ is_active: false })
        .eq("id", id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] })
      toast.success("تم حذف المورد بنجاح")
    },
    onError: (error) => {
      toast.error("خطأ في حذف المورد: " + error.message)
    }
  })
}

// Financial Summary Hook
export const useFinancialSummary = () => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ["financialSummary", user?.profile?.company_id],
    queryFn: async () => {
      // Get current month data
      const currentMonth = new Date().toISOString().slice(0, 7) + '-01'
      const nextMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().slice(0, 10)
      
      // Get revenue accounts balance
      const { data: revenueAccounts } = await supabase
        .from("chart_of_accounts")
        .select("current_balance")
        .eq("account_type", "revenue")
        .eq("company_id", user?.profile?.company_id)
      
      // Get expense accounts balance
      const { data: expenseAccounts } = await supabase
        .from("chart_of_accounts")
        .select("current_balance")
        .eq("account_type", "expenses")
        .eq("company_id", user?.profile?.company_id)
      
      // Get pending transactions count
      const { count: pendingTransactions } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
        .eq("company_id", user?.profile?.company_id)
      
      const totalRevenue = revenueAccounts?.reduce((sum, acc) => sum + Number(acc.current_balance), 0) || 0
      const totalExpenses = expenseAccounts?.reduce((sum, acc) => sum + Number(acc.current_balance), 0) || 0
      const netIncome = totalRevenue - totalExpenses
      
      return {
        totalRevenue,
        totalExpenses,
        netIncome,
        pendingTransactions: pendingTransactions || 0
      }
    },
    enabled: !!user?.profile?.company_id
  })
}

// Hook to get default chart of accounts
export const useDefaultChartOfAccounts = () => {
  return useQuery({
    queryKey: ['default-chart-of-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('default_chart_of_accounts')
        .select('*')
        .order('account_level, sort_order, account_code');

      if (error) throw error;
      return data;
    },
  });
};

// Hook to copy default accounts to company
export const useCopyDefaultAccounts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (companyId: string) => {
      const { error } = await supabase.rpc('copy_default_accounts_to_company', {
        target_company_id: companyId
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chartOfAccounts'] });
      toast.success('تم نسخ دليل الحسابات الافتراضي بنجاح');
    },
    onError: (error) => {
      console.error('Error copying default accounts:', error);
      toast.error('حدث خطأ في نسخ دليل الحسابات الافتراضي');
    },
  });
};

// Cost Centers Hooks
export const useCostCenters = () => {
  const { user } = useAuth()
  
  console.log('📝 [COST_CENTERS] Hook called with user:', {
    userId: user?.id,
    companyId: user?.profile?.company_id,
    hasProfile: !!user?.profile
  });
  
  return useQuery({
    queryKey: ["costCenters", user?.profile?.company_id],
    queryFn: async () => {
      const companyId = user?.profile?.company_id;
      console.log('📝 [COST_CENTERS] Fetching cost centers for company:', companyId);
      
      if (!companyId) {
        console.error('📝 [COST_CENTERS] No company ID found');
        throw new Error('No company ID found');
      }
      
      const { data, error } = await supabase
        .from("cost_centers")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("center_code")
      
      console.log('📝 [COST_CENTERS] Query result:', { data, error, count: data?.length });
      
      if (error) {
        console.error('📝 [COST_CENTERS] Query error:', error);
        throw error;
      }
      
      return data as CostCenter[]
    },
    enabled: !!user?.profile?.company_id,
    retry: 1
  })
}

export const useCreateCostCenter = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async (centerData: {
      center_code: string
      center_name: string
      center_name_ar?: string
      description?: string
      parent_center_id?: string
      manager_id?: string
      budget_amount?: number
      actual_amount?: number
    }) => {
      if (!user?.profile?.company_id) throw new Error("Company ID is required")
      
      const { data, error } = await supabase
        .from("cost_centers")
        .insert({
          ...centerData,
          company_id: user.profile.company_id,
          is_active: true
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["costCenters"] })
      toast.success("تم إنشاء مركز التكلفة بنجاح")
    },
    onError: (error) => {
      toast.error("خطأ في إنشاء مركز التكلفة: " + error.message)
    }
  })
}

export const useUpdateCostCenter = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async ({ id, ...centerData }: {
      id: string
      center_code?: string
      center_name?: string
      center_name_ar?: string
      description?: string
      budget_amount?: number
      actual_amount?: number
      is_active?: boolean
    }) => {
      if (!user?.profile?.company_id) throw new Error("Company ID is required")
      
      const { data, error } = await supabase
        .from("cost_centers")
        .update(centerData)
        .eq("id", id)
        .eq("company_id", user.profile.company_id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["costCenters"] })
      toast.success("تم تحديث مركز التكلفة بنجاح")
    },
    onError: (error) => {
      toast.error("خطأ في تحديث مركز التكلفة: " + error.message)
    }
  })
}

export const useDeleteCostCenter = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.profile?.company_id) throw new Error("Company ID is required")
      
      const { data, error } = await supabase
        .from("cost_centers")
        .update({ is_active: false })
        .eq("id", id)
        .eq("company_id", user.profile.company_id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["costCenters"] })
      toast.success("تم حذف مركز التكلفة بنجاح")
    },
    onError: (error) => {
      toast.error("خطأ في حذف مركز التكلفة: " + error.message)
    }
  })
}

// Fixed Assets Hooks
export const useFixedAssets = () => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ["fixedAssets", user?.profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fixed_assets")
        .select("*")
        .eq("is_active", true)
        .order("asset_code")
      
      if (error) throw error
      return data as FixedAsset[]
    },
    enabled: !!user?.profile?.company_id
  })
}

export const useCreateFixedAsset = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async (assetData: {
      asset_code: string
      asset_name: string
      asset_name_ar?: string
      category: string
      serial_number?: string
      location?: string
      purchase_date: string
      purchase_cost: number
      salvage_value?: number
      useful_life_years: number
      depreciation_method?: 'straight_line' | 'declining_balance' | 'units_of_production'
      condition_status?: 'excellent' | 'good' | 'fair' | 'poor'
      asset_account_id?: string
      depreciation_account_id?: string
      notes?: string
    }) => {
      if (!user?.profile?.company_id) throw new Error("Company ID is required")
      
      const bookValue = assetData.purchase_cost - (assetData.salvage_value || 0)
      
      const { data, error } = await supabase
        .from("fixed_assets")
        .insert({
          ...assetData,
          company_id: user.profile.company_id,
          book_value: bookValue,
          accumulated_depreciation: 0,
          depreciation_method: assetData.depreciation_method || 'straight_line',
          condition_status: assetData.condition_status || 'good',
          is_active: true
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixedAssets"] })
      toast.success("تم إنشاء الأصل الثابت بنجاح")
    },
    onError: (error) => {
      toast.error("خطأ في إنشاء الأصل الثابت: " + error.message)
    }
  })
}

export const useUpdateFixedAsset = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...assetData }: {
      id: string
      asset_code?: string
      asset_name?: string
      asset_name_ar?: string
      category?: string
      serial_number?: string
      location?: string
      purchase_date?: string
      purchase_cost?: number
      salvage_value?: number
      useful_life_years?: number
      depreciation_method?: 'straight_line' | 'declining_balance' | 'units_of_production'
      condition_status?: 'excellent' | 'good' | 'fair' | 'poor'
      asset_account_id?: string
      depreciation_account_id?: string
      notes?: string
    }) => {
      const updateData: any = { ...assetData }
      
      // Recalculate book value if purchase cost or salvage value changed
      if (assetData.purchase_cost !== undefined || assetData.salvage_value !== undefined) {
        const { data: currentAsset } = await supabase
          .from("fixed_assets")
          .select("purchase_cost, salvage_value, accumulated_depreciation")
          .eq("id", id)
          .single()
        
        const newPurchaseCost = assetData.purchase_cost ?? currentAsset?.purchase_cost ?? 0
        const newSalvageValue = assetData.salvage_value ?? currentAsset?.salvage_value ?? 0
        const accumulatedDepreciation = currentAsset?.accumulated_depreciation ?? 0
        
        updateData.book_value = newPurchaseCost - accumulatedDepreciation
      }
      
      const { data, error } = await supabase
        .from("fixed_assets")
        .update(updateData)
        .eq("id", id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixedAssets"] })
      toast.success("تم تحديث الأصل الثابت بنجاح")
    },
    onError: (error) => {
      toast.error("خطأ في تحديث الأصل الثابت: " + error.message)
    }
  })
}

export const useDeleteFixedAsset = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("fixed_assets")
        .update({ is_active: false })
        .eq("id", id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixedAssets"] })
      toast.success("تم حذف الأصل الثابت بنجاح")
    },
    onError: (error) => {
      toast.error("خطأ في حذف الأصل الثابت: " + error.message)
    }
  })
}

// Budgets Hooks
export const useBudgets = () => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ["budgets", user?.profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .order("budget_year", { ascending: false })
      
      if (error) throw error
      return data as Budget[]
    },
    enabled: !!user?.profile?.company_id
  })
}

export const useCreateBudget = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async (budgetData: {
      budget_name: string
      budget_year: number
      accounting_period_id?: string
      total_revenue?: number
      total_expenses?: number
      notes?: string
    }) => {
      if (!user?.profile?.company_id || !user?.id) throw new Error("User data is required")
      
      const netIncome = (budgetData.total_revenue || 0) - (budgetData.total_expenses || 0)
      
      const { data, error } = await supabase
        .from("budgets")
        .insert({
          ...budgetData,
          company_id: user.profile.company_id,
          net_income: netIncome,
          status: 'draft',
          created_by: user.id
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] })
      toast.success("تم إنشاء الموازنة بنجاح")
    },
    onError: (error) => {
      toast.error("خطأ في إنشاء الموازنة: " + error.message)
    }
  })
}

// Bank Transactions Hooks
export const useBankTransactions = () => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ["bankTransactions", user?.profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_transactions")
        .select(`
          *,
          bank:banks(bank_name, account_number)
        `)
        .order("transaction_date", { ascending: false })
      
      if (error) throw error
      return data as any[]
    },
    enabled: !!user?.profile?.company_id
  })
}

export const useCreateBankTransaction = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async (transactionData: {
      bank_id: string
      transaction_number: string
      transaction_date: string
      transaction_type: 'deposit' | 'withdrawal' | 'transfer'
      amount: number
      balance_after: number
      description: string
      reference_number?: string
      check_number?: string
      counterpart_bank_id?: string
      status?: 'pending' | 'completed' | 'cancelled'
    }) => {
      if (!user?.profile?.company_id || !user?.id) throw new Error("User data is required")
      
      const { data, error } = await supabase
        .from("bank_transactions")
        .insert({
          ...transactionData,
          company_id: user.profile.company_id,
          status: transactionData.status || 'completed',
          created_by: user.id
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bankTransactions"] })
      toast.success("تم إنشاء الحركة البنكية بنجاح")
    },
    onError: (error) => {
      toast.error("خطأ في إنشاء الحركة البنكية: " + error.message)
    }
  })
}