import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';

export interface VendorAccount {
  id: string;
  company_id: string;
  vendor_id: string;
  account_id: string;
  account_type: 'payable' | 'expense' | 'advance';
  is_default: boolean;
  created_at: string;
  updated_at: string;
  vendor?: {
    vendor_name: string;
    vendor_name_ar?: string;
  };
  account?: {
    account_code: string;
    account_name: string;
    account_name_ar?: string;
    account_type: string;
    current_balance: number;
  };
}

export interface CreateVendorAccountData {
  vendor_id: string;
  account_id: string;
  account_type: VendorAccount['account_type'];
  is_default?: boolean;
}

export const useVendorAccounts = () => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['vendor-accounts', companyId],
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required');

      const { data, error } = await supabase
        .from('vendor_accounts')
        .select(`
          *,
          vendor:vendors(
            vendor_name,
            vendor_name_ar
          ),
          account:chart_of_accounts(
            account_code,
            account_name,
            account_name_ar,
            account_type,
            current_balance
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as VendorAccount[];
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useVendorAccountsByVendor = (vendorId?: string) => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['vendor-accounts', companyId, vendorId],
    queryFn: async () => {
      if (!companyId || !vendorId) throw new Error('Company ID and vendor ID are required');

      const { data, error } = await supabase
        .from('vendor_accounts')
        .select(`
          *,
          account:chart_of_accounts(
            account_code,
            account_name,
            account_name_ar,
            account_type,
            current_balance
          )
        `)
        .eq('company_id', companyId)
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as VendorAccount[];
    },
    enabled: !!companyId && !!vendorId,
  });
};

export const useCreateVendorAccount = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async (data: CreateVendorAccountData) => {
      if (!companyId) throw new Error('Company ID is required');

      const { data: vendorAccount, error } = await supabase
        .from('vendor_accounts')
        .insert({
          company_id: companyId,
          vendor_id: data.vendor_id,
          account_id: data.account_id,
          account_type: data.account_type,
          is_default: data.is_default ?? false,
        })
        .select()
        .single();

      if (error) throw error;
      return vendorAccount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-accounts'] });
      toast.success('تم ربط حساب المورد بنجاح');
    },
    onError: (error) => {
      logger.error('Error creating vendor account:', error);
      toast.error('حدث خطأ أثناء ربط حساب المورد');
    },
  });
};

export const useUpdateVendorAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateVendorAccountData> }) => {
      const { error } = await supabase
        .from('vendor_accounts')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-accounts'] });
      toast.success('تم تحديث حساب المورد بنجاح');
    },
    onError: (error) => {
      logger.error('Error updating vendor account:', error);
      toast.error('حدث خطأ أثناء تحديث حساب المورد');
    },
  });
};

export const useDeleteVendorAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vendor_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-accounts'] });
      toast.success('تم حذف ربط حساب المورد بنجاح');
    },
    onError: (error) => {
      logger.error('Error deleting vendor account:', error);
      toast.error('حدث خطأ أثناء حذف ربط حساب المورد');
    },
  });
};

export const useCreateVendorFinancialAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ vendorId, companyId, vendorData }: { 
      vendorId: string; 
      companyId: string; 
      vendorData?: any 
    }) => {
      const { data, error } = await supabase
        .rpc('create_vendor_financial_account', {
          vendor_id_param: vendorId,
          company_id_param: companyId,
          vendor_data: vendorData || null
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast.success('تم إنشاء الحساب المالي للمورد بنجاح');
    },
    onError: (error) => {
      console.error('Error creating vendor financial account:', error);
      toast.error('حدث خطأ أثناء إنشاء الحساب المالي للمورد');
    },
  });
};