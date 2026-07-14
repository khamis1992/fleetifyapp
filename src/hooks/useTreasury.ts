import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";

const getCurrentCompanyId = async () => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('المستخدم غير مسجل الدخول');

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.user.id)
    .single();

  if (!profile?.company_id) throw new Error('لم يتم العثور على بيانات الشركة');
  return profile.company_id;
};

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
      const companyId = await getCurrentCompanyId();

      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .eq('company_id', companyId)
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
      const companyId = await getCurrentCompanyId();

      let query = supabase
        .from('bank_transactions')
        .select('*')
        .eq('company_id', companyId)
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
      const companyId = await getCurrentCompanyId();
      if (transactionData.company_id !== companyId) {
        throw new Error('لا يمكن إنشاء معاملة لشركة أخرى');
      }
      const amount = Number(transactionData.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('مبلغ المعاملة يجب أن يكون أكبر من صفر');
      }

      const { data: bank, error: bankError } = await supabase
        .from('banks')
        .select('id, current_balance')
        .eq('id', transactionData.bank_id)
        .eq('company_id', companyId)
        .single();
      if (bankError) throw bankError;

      const balanceAfter = transactionData.transaction_type === 'deposit'
        ? Number(bank.current_balance) + amount
        : Number(bank.current_balance) - amount;
      if (balanceAfter < 0) {
        throw new Error('لا يمكن تنفيذ السحب لأن الرصيد المتاح غير كافٍ');
      }

      const { data: transaction, error: transactionError } = await supabase
        .from('bank_transactions')
        .insert([{ ...transactionData, company_id: companyId, amount, balance_after: balanceAfter }])
        .select()
        .single();

      if (transactionError) throw transactionError;

      const { error: bankUpdateError } = await supabase
        .from('banks')
        .update({
          current_balance: balanceAfter,
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionData.bank_id)
        .eq('company_id', companyId)
        .eq('current_balance', bank.current_balance)
        .select('id')
        .single();

      if (bankUpdateError) {
        const { error: cleanupError } = await supabase
          .from('bank_transactions')
          .delete()
          .eq('id', transaction.id)
          .eq('company_id', companyId);
        if (cleanupError) {
          throw new Error(`فشل تحديث الرصيد وفشل حذف المعاملة التعويضية: ${cleanupError.message}`);
        }
        throw bankUpdateError;
      }

      return transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      queryClient.invalidateQueries({ queryKey: ['treasury-summary'] });
      toast.success('تم إنشاء المعاملة بنجاح');
    },
    onError: (error) => {
      toast.error('حدث خطأ في إنشاء المعاملة');
      console.error('Bank transaction creation error:', error);
    },
  });
};

export const useDeleteBankTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactionId: string) => {
      const companyId = await getCurrentCompanyId();

      const { data: transaction, error: transactionError } = await supabase
        .from('bank_transactions')
        .select('id, bank_id, amount, balance_after, transaction_type, reconciled, journal_entry_id, payment_id, reversal_of_transaction_id')
        .eq('id', transactionId)
        .eq('company_id', companyId)
        .single();
      if (transactionError) throw transactionError;
      if (transaction.reconciled || transaction.journal_entry_id || transaction.payment_id || transaction.reversal_of_transaction_id) {
        throw new Error('لا يمكن حذف معاملة مسوّاة أو مرتبطة بدفعة أو قيد أو عملية عكس. استخدم معاملة عكسية معتمدة.');
      }

      const { data: latestTransaction, error: latestError } = await supabase
        .from('bank_transactions')
        .select('id')
        .eq('bank_id', transaction.bank_id)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestError) throw latestError;
      if (latestTransaction?.id !== transaction.id) {
        throw new Error('لا يمكن حذف معاملة قديمة لأنها ستفسد الرصيد الجاري. أنشئ معاملة عكسية بدلًا من ذلك.');
      }

      const { data: bank, error: bankError } = await supabase
        .from('banks')
        .select('id, current_balance')
        .eq('id', transaction.bank_id)
        .eq('company_id', companyId)
        .single();
      if (bankError) throw bankError;
      if (Math.abs(Number(bank.current_balance) - Number(transaction.balance_after)) > 0.001) {
        throw new Error('رصيد البنك تغير بعد هذه المعاملة؛ استخدم معاملة عكسية بدل الحذف.');
      }

      const restoredBalance = transaction.transaction_type === 'deposit'
        ? Number(bank.current_balance) - Number(transaction.amount)
        : Number(bank.current_balance) + Number(transaction.amount);

      const { error: bankUpdateError } = await supabase
        .from('banks')
        .update({ current_balance: restoredBalance, updated_at: new Date().toISOString() })
        .eq('id', transaction.bank_id)
        .eq('company_id', companyId)
        .eq('current_balance', bank.current_balance)
        .select('id')
        .single();
      if (bankUpdateError) throw bankUpdateError;

      const { error } = await supabase
        .from('bank_transactions')
        .delete()
        .eq('id', transactionId)
        .eq('company_id', companyId)
        .select('id')
        .single();

      if (error) {
        const { error: rollbackError } = await supabase
          .from('banks')
          .update({ current_balance: bank.current_balance, updated_at: new Date().toISOString() })
          .eq('id', transaction.bank_id)
          .eq('company_id', companyId)
          .eq('current_balance', restoredBalance);
        if (rollbackError) {
          throw new Error(`فشل حذف المعاملة وفشل استرجاع رصيد البنك: ${rollbackError.message}`);
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      queryClient.invalidateQueries({ queryKey: ['treasury-summary'] });
      toast.success('تم حذف المعاملة بنجاح');
    },
    onError: (error) => {
      toast.error('حدث خطأ في حذف المعاملة');
      console.error('Bank transaction deletion error:', error);
    },
  });
};

// Cost Centers hooks - Use the centralized hook from useCostCenters.ts
// export const useCostCenters is removed to avoid conflicts - import from @/hooks/useCostCenters instead

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
      const companyId = await getCurrentCompanyId();

      const { data: banks, error: banksError } = await supabase
        .from('banks')
        .select('current_balance, currency')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (banksError) throw banksError;

      const { data: transactions, error: transactionsError } = await supabase
        .from('bank_transactions')
        .select('amount, transaction_type, transaction_date')
        .eq('company_id', companyId)
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
