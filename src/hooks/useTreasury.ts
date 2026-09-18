import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';
import { financeToday, readFinancialPages, requireFinanceCompany } from '@/services/financialReporting';

// Bank interfaces
export interface Bank {
  id: string;
  company_id: string;
  bank_name: string;
  bank_name_ar?: string | null;
  account_number: string;
  iban?: string | null;
  swift_code?: string | null;
  branch_name?: string | null;
  branch_name_ar?: string | null;
  account_type: string;
  currency: string;
  current_balance: number | null;
  opening_balance: number | null;
  opening_date: string | null;
  is_active: boolean | null;
  is_primary: boolean | null;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
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
  reference_number?: string | null;
  check_number?: string | null;
  counterpart_bank_id?: string | null;
  journal_entry_id?: string | null;
  manual_idempotency_key?: string | null;
  manual_bank_account_id?: string | null;
  manual_counterpart_account_id?: string | null;
  payment_id?: string | null;
  reversal_of_transaction_id?: string | null;
  status: string;
  reconciled: boolean | null;
  reconciled_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ManualBankTransactionInput {
  company_id: string;
  bank_id: string;
  transaction_type: 'deposit' | 'withdrawal';
  amount: number;
  transaction_date: string;
  description: string;
  reference_number?: string;
  bank_account_id: string;
  counterpart_account_id: string;
  idempotency_key: string;
  actor_id?: string;
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
  const { companyId } = useUnifiedCompanyAccess();
  return useQuery({
    queryKey: ['banks', companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      requireFinanceCompany(companyId);

      return readFinancialPages((from, to) =>
        supabase
          .from('banks')
          .select('*', { count: 'exact' })
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('bank_name')
          .order('id')
          .range(from, to)
      );
    },
  });
};

export const useCreateBank = () => {
  const { companyId } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bankData: Omit<Bank, 'id' | 'created_at' | 'updated_at'>) => {
      requireFinanceCompany(companyId);
      if (bankData.company_id !== companyId) throw new Error('Company access denied');
      const { data, error } = await supabase
        .from('banks')
        .insert([{ ...bankData, company_id: companyId! }])
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
  const { companyId } = useUnifiedCompanyAccess();
  return useQuery({
    queryKey: ['bank-transactions', companyId, bankId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      requireFinanceCompany(companyId);

      return readFinancialPages((from, to) => {
        let query = supabase
          .from('bank_transactions')
          .select('*', { count: 'exact' })
          .eq('company_id', companyId)
          .order('transaction_date', { ascending: false })
          .order('id')
          .range(from, to);
        if (bankId) query = query.eq('bank_id', bankId);
        return query;
      });
    },
  });
};

export const useCreateBankTransaction = () => {
  const { companyId } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ManualBankTransactionInput) => {
      requireFinanceCompany(companyId);
      if (input.company_id !== companyId) throw new Error('Company access denied');
      const amount = Number(input.amount);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('Transaction amount must be positive');

      const { data, error } = await supabase.rpc('create_manual_bank_transaction_v1', {
        p_company_id: companyId,
        p_bank_id: input.bank_id,
        p_transaction_type: input.transaction_type,
        p_amount: amount,
        p_transaction_date: input.transaction_date,
        p_description: input.description.trim(),
        p_reference_number: input.reference_number?.trim() || '',
        p_bank_account_id: input.bank_account_id,
        p_counterpart_account_id: input.counterpart_account_id,
        p_idempotency_key: input.idempotency_key,
        p_actor_id: input.actor_id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      queryClient.invalidateQueries({ queryKey: ['treasury-summary'] });
      toast.success('تم إنشاء الحركة وقيدها المحاسبي بنجاح');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'فشل إنشاء الحركة المصرفية');
    },
  });
};

export const useReverseBankTransaction = () => {
  const { companyId } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transactionId,
      reason,
      idempotencyKey,
    }: {
      transactionId: string;
      reason: string;
      idempotencyKey: string;
    }) => {
      requireFinanceCompany(companyId);
      const { data, error } = await supabase.rpc('reverse_manual_bank_transaction_v1', {
        p_company_id: companyId,
        p_transaction_id: transactionId,
        p_reversal_date: financeToday(),
        p_reason: reason.trim(),
        p_idempotency_key: idempotencyKey,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      queryClient.invalidateQueries({ queryKey: ['treasury-summary'] });
      toast.success('تم عكس الحركة بقيد محاسبي مقابل');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'فشل عكس الحركة المصرفية');
    },
  });
};

// Cost Centers hooks - Use the centralized hook from useCostCenters.ts
// export const useCostCenters is removed to avoid conflicts - import from @/hooks/useCostCenters instead

export const useCreateCostCenter = () => {
  const { companyId } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (centerData: Omit<CostCenter, 'id' | 'created_at' | 'updated_at'>) => {
      requireFinanceCompany(companyId);
      if (centerData.company_id !== companyId) throw new Error('Company access denied');
      const { data, error } = await supabase
        .from('cost_centers')
        .insert([{ ...centerData, company_id: companyId! }])
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
  const { companyId } = useUnifiedCompanyAccess();
  const { currency } = useCompanyCurrency();
  return useQuery({
    queryKey: ['treasury-summary', companyId, currency],
    enabled: Boolean(companyId),
    queryFn: async () => {
      requireFinanceCompany(companyId);
      const today = financeToday(),
        monthStart = today.slice(0, 7) + '-01';
      const banks = await readFinancialPages((from, to) =>
        supabase
          .from('banks')
          .select('id,current_balance,currency,is_active', { count: 'exact' })
          .eq('company_id', companyId)
          .order('id')
          .range(from, to)
      );
      const bankIds = new Set(banks.filter((bank) => bank.currency === currency).map((bank) => bank.id));
      const transactions = await readFinancialPages((from, to) =>
        supabase
          .from('bank_transactions')
          .select('id,bank_id,amount,transaction_type,transaction_date,status', { count: 'exact' })
          .eq('company_id', companyId)
          .eq('status', 'completed')
          .gte('transaction_date', monthStart)
          .lte('transaction_date', today)
          .order('id')
          .range(from, to)
      );
      const matching = transactions.filter((transaction) => bankIds.has(transaction.bank_id));
      const sum = (type: string) =>
        matching.filter((t) => t.transaction_type === type).reduce((total, t) => total + Number(t.amount), 0);
      const monthlyDeposits = sum('deposit'),
        monthlyWithdrawals = sum('withdrawal');
      return {
        totalBalance: banks
          .filter((bank) => bank.currency === currency)
          .reduce((total, bank) => total + Number(bank.current_balance || 0), 0),
        totalBanks: banks.filter((bank) => bank.is_active).length,
        monthlyDeposits,
        monthlyWithdrawals,
        netFlow: monthlyDeposits - monthlyWithdrawals,
        currency,
      };
    },
  });
};
