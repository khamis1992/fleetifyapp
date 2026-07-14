import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

export interface Deposit {
  id: string;
  deposit_number: string;
  customer_id: string;
  customer_name?: string;
  contract_id?: string;
  deposit_type: string;
  deposit_type_name?: string;
  amount: number;
  received_date: string;
  due_date?: string;
  status: 'active' | 'returned' | 'partial' | 'pending';
  returned_amount?: number;
  notes?: string;
  account_id?: string;
  journal_entry_id?: string;
  created_at: string;
  updated_at: string;
  company_id: string;
}

export interface CreateDepositData {
  customer_id: string;
  contract_id?: string;
  deposit_type: string;
  amount: number;
  received_date: string;
  due_date?: string;
  notes?: string;
  account_id?: string;
}

export const useDeposits = () => {
  const { filter } = useUnifiedCompanyAccess();
  const companyId = filter?.company_id;
  
  return useQuery({
    queryKey: ['deposits', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('customer_deposits')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(deposit => ({
        ...deposit,
        customer_name: `Customer ${deposit.customer_id}`,
        deposit_type_name: deposit.deposit_type,
        account_name: 'Account'
      })) || [];
    },
    enabled: !!companyId,
  });
};

export const useCreateDeposit = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { filter } = useUnifiedCompanyAccess();
  const companyId = filter?.company_id;

  return useMutation({
    mutationFn: async (depositData: CreateDepositData) => {
      if (!companyId) throw new Error('Company ID is required');

      // Generate deposit number
      const { data: lastDeposit } = await supabase
        .from('customer_deposits')
        .select('deposit_number')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(1);

      let depositNumber = 'DEP-0001';
      if (lastDeposit && lastDeposit.length > 0) {
        const lastNumber = parseInt(lastDeposit[0].deposit_number.split('-')[1]);
        depositNumber = `DEP-${String(lastNumber + 1).padStart(4, '0')}`;
      }

      const { data, error } = await supabase
        .from('customer_deposits')
        .insert({
          ...depositData,
          deposit_number: depositNumber,
          company_id: companyId,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      toast({
        title: 'تم بنجاح',
        description: 'تم إنشاء الوديعة بنجاح',
      });
    },
    onError: (error) => {
      toast({
        title: 'خطأ',
        description: 'فشل في إنشاء الوديعة',
        variant: 'destructive',
      });
      console.error('Error creating deposit:', error);
    },
  });
};

export const useUpdateDeposit = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { filter } = useUnifiedCompanyAccess();
  const companyId = filter?.company_id;

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateDepositData> }) => {
      if (!companyId) throw new Error('Company ID is required');
      const { data: existing, error: existingError } = await supabase
        .from('customer_deposits')
        .select('id, journal_entry_id, returned_amount')
        .eq('id', id)
        .eq('company_id', companyId)
        .single();
      if (existingError || !existing) throw existingError || new Error('Deposit not found');

      const financialFields = ['amount', 'customer_id', 'contract_id', 'deposit_type', 'received_date', 'account_id'];
      const changesFinancialField = financialFields.some((field) => field in updates);
      if (changesFinancialField && (existing.journal_entry_id || Number(existing.returned_amount || 0) > 0)) {
        throw new Error('لا يمكن تغيير بيانات وديعة مرتبطة بقيد أو استرداد. استخدم إجراء تصحيح مالي معتمد.');
      }

      const { data, error } = await supabase
        .from('customer_deposits')
        .update(updates)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      toast({
        title: 'تم بنجاح',
        description: 'تم تحديث الوديعة بنجاح',
      });
    },
    onError: (error) => {
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث الوديعة',
        variant: 'destructive',
      });
      console.error('Error updating deposit:', error);
    },
  });
};

export const useDeleteDeposit = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { filter } = useUnifiedCompanyAccess();
  const companyId = filter?.company_id;

  return useMutation({
    mutationFn: async (id: string) => {
      if (!companyId) throw new Error('Company ID is required');
      const { data: deposit, error: depositError } = await supabase
        .from('customer_deposits')
        .select('id, status, returned_amount, journal_entry_id')
        .eq('id', id)
        .eq('company_id', companyId)
        .single();
      if (depositError || !deposit) throw depositError || new Error('Deposit not found');
      if (deposit.status !== 'pending' || deposit.journal_entry_id || Number(deposit.returned_amount || 0) > 0) {
        throw new Error('لا يمكن حذف وديعة نشطة أو مرحّلة أو مستردة. احتفظ بالسجل واستخدم إجراء الاسترداد أو التصحيح.');
      }

      const { error } = await supabase
        .from('customer_deposits')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId)
        .eq('status', 'pending')
        .select('id')
        .single();

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      toast({
        title: 'تم بنجاح',
        description: 'تم حذف الوديعة بنجاح',
      });
    },
    onError: (error) => {
      toast({
        title: 'خطأ',
        description: 'فشل في حذف الوديعة',
        variant: 'destructive',
      });
      console.error('Error deleting deposit:', error);
    },
  });
};

export const useReturnDeposit = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { filter } = useUnifiedCompanyAccess();
  const companyId = filter?.company_id;

  return useMutation({
    mutationFn: async ({ id, returnAmount, notes }: { id: string; returnAmount: number; notes?: string }) => {
      if (!companyId) throw new Error('Company ID is required');
      if (!Number.isFinite(returnAmount) || returnAmount <= 0) throw new Error('مبلغ الاسترداد يجب أن يكون أكبر من صفر');
      const { data: deposit, error: depositError } = await supabase
        .from('customer_deposits')
        .select('amount, returned_amount, notes')
        .eq('id', id)
        .eq('company_id', companyId)
        .single();

      if (depositError || !deposit) throw depositError || new Error('Deposit not found');

      const currentReturned = deposit.returned_amount || 0;
      const newReturnedAmount = currentReturned + returnAmount;
      const totalAmount = deposit.amount;
      if (newReturnedAmount > totalAmount) throw new Error('مبلغ الاسترداد يتجاوز الرصيد المتبقي للوديعة');

      let newStatus = 'active';
      if (newReturnedAmount >= totalAmount) {
        newStatus = 'returned';
      } else if (newReturnedAmount > 0) {
        newStatus = 'partial';
      }

      let updateQuery = supabase
        .from('customer_deposits')
        .update({
          returned_amount: newReturnedAmount,
          status: newStatus,
          notes: notes ? `${deposit.notes || ''}\n${notes}` : deposit.notes
        })
        .eq('id', id)
        .eq('company_id', companyId);
      updateQuery = deposit.returned_amount === null
        ? updateQuery.is('returned_amount', null)
        : updateQuery.eq('returned_amount', deposit.returned_amount);
      const { data, error } = await updateQuery
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      toast({
        title: 'تم بنجاح',
        description: 'تم استرداد الوديعة بنجاح',
      });
    },
    onError: (error) => {
      toast({
        title: 'خطأ',
        description: 'فشل في استرداد الوديعة',
        variant: 'destructive',
      });
      console.error('Error returning deposit:', error);
    },
  });
};
