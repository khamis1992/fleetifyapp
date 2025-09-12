import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCompanyFilter } from '@/hooks/useCompanyFilter';

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
  const { companyId } = useCompanyFilter();
  
  return useQuery({
    queryKey: ['deposits', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('customer_deposits')
        .select(`
          *,
          customers!inner(name),
          deposit_types!inner(name, name_ar),
          chart_of_accounts(account_name, account_name_ar)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(deposit => ({
        ...deposit,
        customer_name: deposit.customers?.name,
        deposit_type_name: deposit.deposit_types?.name_ar || deposit.deposit_types?.name,
        account_name: deposit.chart_of_accounts?.account_name_ar || deposit.chart_of_accounts?.account_name
      })) || [];
    },
    enabled: !!companyId,
  });
};

export const useCreateDeposit = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { companyId } = useCompanyFilter();

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

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateDepositData> }) => {
      const { data, error } = await supabase
        .from('customer_deposits')
        .update(updates)
        .eq('id', id)
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

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customer_deposits')
        .delete()
        .eq('id', id);

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

  return useMutation({
    mutationFn: async ({ id, returnAmount, notes }: { id: string; returnAmount: number; notes?: string }) => {
      const { data: deposit } = await supabase
        .from('customer_deposits')
        .select('amount, returned_amount')
        .eq('id', id)
        .single();

      if (!deposit) throw new Error('Deposit not found');

      const currentReturned = deposit.returned_amount || 0;
      const newReturnedAmount = currentReturned + returnAmount;
      const totalAmount = deposit.amount;

      let newStatus = 'active';
      if (newReturnedAmount >= totalAmount) {
        newStatus = 'returned';
      } else if (newReturnedAmount > 0) {
        newStatus = 'partial';
      }

      const { data, error } = await supabase
        .from('customer_deposits')
        .update({
          returned_amount: newReturnedAmount,
          status: newStatus,
          notes: notes ? `${deposit.notes || ''}\n${notes}` : deposit.notes
        })
        .eq('id', id)
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