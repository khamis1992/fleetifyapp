import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";

// Bank interfaces
export interface Bank {
  id: string;
  company_id: string;
  bank_name: string;
  bank_name_ar?: string;
  account_number: string;
  iban?: string;
  swift_code?: string;
  branch_name?: string;
  branch_name_ar?: string;
  account_type: string;
  currency: string;
  current_balance: number;
  opening_balance: number;
  opening_date: string;
  is_active: boolean;
  is_primary: boolean;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface BankTransaction {
  id: string;
  company_id: string;
  bank_id: string;
  transaction_number: string;
  transaction_date: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  description: string;
  reference_number?: string;
  check_number?: string;
  counterpart_bank_id?: string;
  journal_entry_id?: string;
  status: string;
  reconciled: boolean;
  reconciled_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CostCenter {
  id: string;
  company_id: string;
  center_code: string;
  center_name: string;
  center_name_ar?: string;
  description?: string;
  parent_center_id?: string;
  manager_id?: string;
  budget_amount: number;
  actual_amount: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Banks hooks
export const useBanks = () => {
  return useQuery({
    queryKey: ['banks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .eq('is_active', true)
        .order('bank_name');

      if (error) throw error;
      
      // Filter out any records with empty or null IDs
      return (data as Bank[]).filter(bank => bank.id && bank.id.trim() !== '');
    },
  });
};

export const useCreateBank = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bankData: Omit<Bank, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('banks')
        .insert([bankData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      toast.success('تم إنشاء البنك بنجاح');
    },
    onError: (error) => {
      toast.error('حدث خطأ في إنشاء البنك');
      console.error('Bank creation error:', error);
    },
  });
};

// Bank Transactions hooks
export const useBankTransactions = (bankId?: string) => {
  return useQuery({
    queryKey: ['bank-transactions', bankId],
    queryFn: async () => {
      let query = supabase
        .from('bank_transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (bankId) {
        query = query.eq('bank_id', bankId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Filter out any records with empty or null IDs
      return (data as BankTransaction[]).filter(transaction => transaction.id && transaction.id.trim() !== '');
    },
  });
};

export const useCreateBankTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactionData: Omit<BankTransaction, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('bank_transactions')
        .insert([transactionData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      toast.success('تم إنشاء المعاملة بنجاح');
    },
    onError: (error) => {
      toast.error('حدث خطأ في إنشاء المعاملة');
      console.error('Bank transaction creation error:', error);
    },
  });
};

// Cost Centers hooks
export const useCostCenters = () => {
  return useQuery({
    queryKey: ['cost-centers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_centers')
        .select('*')
        .eq('is_active', true)
        .order('center_name');

      if (error) throw error;
      
      // Filter out any records with empty or null IDs
      return (data as CostCenter[]).filter(center => center.id && center.id.trim() !== '');
    },
  });
};

export const useCreateCostCenter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (centerData: Omit<CostCenter, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('cost_centers')
        .insert([centerData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-centers'] });
      toast.success('تم إنشاء مركز التكلفة بنجاح');
    },
    onError: (error) => {
      toast.error('حدث خطأ في إنشاء مركز التكلفة');
      console.error('Cost center creation error:', error);
    },
  });
};

// Treasury Summary hook
export const useTreasurySummary = () => {
  return useQuery({
    queryKey: ['treasury-summary'],
    queryFn: async () => {
      const { data: banks, error: banksError } = await supabase
        .from('banks')
        .select('current_balance, currency')
        .eq('is_active', true);

      if (banksError) throw banksError;

      const { data: transactions, error: transactionsError } = await supabase
        .from('bank_transactions')
        .select('amount, transaction_type, transaction_date')
        .gte('transaction_date', new Date(new Date().setDate(new Date().getDate() - 30)).toISOString());

      if (transactionsError) throw transactionsError;

      const totalBalance = banks?.reduce((sum, bank) => sum + (bank.current_balance || 0), 0) || 0;
      
      const monthlyDeposits = transactions
        ?.filter(t => t.transaction_type === 'deposit')
        .reduce((sum, t) => sum + t.amount, 0) || 0;

      const monthlyWithdrawals = transactions
        ?.filter(t => t.transaction_type === 'withdrawal')
        .reduce((sum, t) => sum + t.amount, 0) || 0;

      return {
        totalBalance,
        totalBanks: banks?.length || 0,
        monthlyDeposits,
        monthlyWithdrawals,
        netFlow: monthlyDeposits - monthlyWithdrawals
      };
    },
  });
};
