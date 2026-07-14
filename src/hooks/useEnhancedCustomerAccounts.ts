import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CustomerAccount, CustomerAccountFormData } from '@/types/customerAccount';
import { useToast } from '@/hooks/use-toast';
import type { Database, Json } from '@/integrations/supabase/types';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

type CustomerAccountUpdate = Database['public']['Tables']['customer_accounts']['Update'];

interface ErrorInfo {
  code?: string;
  message: string;
}

interface AutoCreateResult {
  success?: boolean;
  message?: string;
  error?: string;
  created_accounts?: number;
}

const getErrorInfo = (error: unknown): ErrorInfo => {
  if (error instanceof Error) return { message: error.message };
  if (typeof error === 'object' && error !== null) {
    const candidate = error as { code?: unknown; message?: unknown };
    return {
      code: typeof candidate.code === 'string' ? candidate.code : undefined,
      message: typeof candidate.message === 'string' ? candidate.message : String(error),
    };
  }
  return { message: String(error) };
};

const asAutoCreateResult = (value: Json): AutoCreateResult => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const result = value as Record<string, Json | undefined>;
  return {
    success: typeof result.success === 'boolean' ? result.success : undefined,
    message: typeof result.message === 'string' ? result.message : undefined,
    error: typeof result.error === 'string' ? result.error : undefined,
    created_accounts: typeof result.created_accounts === 'number' ? result.created_accounts : undefined,
  };
};

const getCustomerCompanyId = async (customerId: string): Promise<string> => {
  const { data: customer, error } = await supabase
    .from('customers')
    .select('company_id')
    .eq('id', customerId)
    .single();
  if (error) throw error;
  return customer.company_id;
};

const switchDefaultCustomerAccount = async ({
  accountId,
  customerId,
  companyId,
  accountTypeId,
}: {
  accountId: string;
  customerId: string;
  companyId: string;
  accountTypeId: string;
}) => {
  const { data: previousDefaults, error: previousError } = await supabase
    .from('customer_accounts')
    .select('id')
    .eq('company_id', companyId)
    .eq('customer_id', customerId)
    .eq('account_type_id', accountTypeId)
    .eq('is_active', true)
    .eq('is_default', true)
    .neq('id', accountId);
  if (previousError) throw previousError;

  const { error: unsetError } = await supabase
    .from('customer_accounts')
    .update({ is_default: false })
    .eq('company_id', companyId)
    .eq('customer_id', customerId)
    .eq('account_type_id', accountTypeId)
    .eq('is_active', true)
    .neq('id', accountId);
  if (unsetError) throw unsetError;

  const { error: setError } = await supabase
    .from('customer_accounts')
    .update({ is_default: true })
    .eq('id', accountId)
    .eq('company_id', companyId)
    .eq('customer_id', customerId)
    .eq('is_active', true);

  if (setError) {
    const previousIds = (previousDefaults || []).map(account => account.id);
    if (previousIds.length > 0) {
      const { error: restoreError } = await supabase
        .from('customer_accounts')
        .update({ is_default: true })
        .eq('company_id', companyId)
        .in('id', previousIds);
      if (restoreError) console.error('Failed to restore previous customer account defaults:', restoreError);
    }
    throw setError;
  }
};

// Fetch customer accounts with enhanced data
export const useCustomerAccounts = (customerId: string) => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['customer-accounts', companyId, customerId],
    queryFn: async (): Promise<CustomerAccount[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('customer_accounts')
        .select(`
          *,
          account_type:customer_account_types(*),
          account:chart_of_accounts(
            id,
            account_code,
            account_name,
            account_name_ar,
            current_balance
          )
        `)
        .eq('company_id', companyId)
        .eq('customer_id', customerId)
        .eq('is_active', true)
        .order('is_default', { ascending: false });

      if (error) {
        console.error('Error fetching customer accounts:', error);
        throw error;
      }

      return (data || []) as unknown as CustomerAccount[];
    },
    enabled: !!companyId && !!customerId,
  });
};

// Create new customer account
export const useCreateCustomerAccount = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ customerId, accountData }: { 
      customerId: string; 
      accountData: CustomerAccountFormData 
    }) => {
      const companyId = await getCustomerCompanyId(customerId);

      const { data, error } = await supabase
        .from('customer_accounts')
        .insert({
          customer_id: customerId,
          company_id: companyId,
          ...accountData,
          is_default: false,
        })
        .select()
        .single();

      if (error) throw error;

      if (accountData.is_default) {
        try {
          await switchDefaultCustomerAccount({
            accountId: data.id,
            customerId,
            companyId,
            accountTypeId: accountData.account_type_id,
          });
          return { ...data, is_default: true };
        } catch (defaultError) {
          const { error: cleanupError } = await supabase
            .from('customer_accounts')
            .delete()
            .eq('id', data.id)
            .eq('company_id', companyId);
          if (cleanupError) console.error('Failed to clean up customer account after default switch error:', cleanupError);
          throw defaultError;
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-accounts'] });
      toast({
        title: "تم إضافة الحساب المحاسبي",
        description: "تم ربط الحساب المحاسبي بالعميل بنجاح",
      });
    },
    onError: (error: unknown) => {
      console.error('Error creating customer account:', error);
      const errorInfo = getErrorInfo(error);
      
      let errorMessage = "حدث خطأ أثناء إضافة الحساب المحاسبي";
      
      // Handle specific error types
      if (errorInfo.message.includes('unique constraint') || errorInfo.code === '23505') {
        if (errorInfo.message.includes('customer_accounts_customer_id_account_id_key')) {
          errorMessage = "هذا الحساب المحاسبي مربوط مسبقاً بهذا العميل";
        } else if (errorInfo.message.includes('unique_customer_account')) {
          errorMessage = "يوجد حساب محاسبي لهذا العميل مسبقاً في هذه الشركة";
        } else {
          errorMessage = "يوجد تضارب في البيانات، تأكد من عدم تكرار المعلومات";
        }
      }
      
      toast({
        title: "خطأ في إضافة الحساب",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
};

// Update customer account
export const useUpdateCustomerAccount = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      accountId, 
      customerId, 
      accountData 
    }: { 
      accountId: string; 
      customerId: string; 
      accountData: Partial<CustomerAccountFormData> 
    }) => {
      const companyId = await getCustomerCompanyId(customerId);

      // Check for existing account conflicts before updating
      if (accountData.account_id) {
        const { data: existingAccount, error: conflictError } = await supabase
          .from('customer_accounts')
          .select('id')
          .eq('company_id', companyId)
          .eq('customer_id', customerId)
          .eq('account_id', accountData.account_id)
          .neq('id', accountId)
          .eq('is_active', true)
          .maybeSingle();

        if (conflictError) throw conflictError;

        if (existingAccount) {
          throw new Error('ACCOUNT_ALREADY_LINKED');
        }
      }

      const { is_default: requestedDefault, ...editableFields } = accountData;
      const updateData: CustomerAccountUpdate = {
        ...editableFields,
        ...(requestedDefault === false ? { is_default: false } : {}),
      };

      const { data, error } = await supabase
        .from('customer_accounts')
        .update(updateData)
        .eq('id', accountId)
        .eq('company_id', companyId)
        .eq('customer_id', customerId)
        .select()
        .single();

      if (error) throw error;

      if (requestedDefault) {
        if (!data.account_type_id) throw new Error('ACCOUNT_TYPE_REQUIRED_FOR_DEFAULT');
        await switchDefaultCustomerAccount({
          accountId,
          customerId,
          companyId,
          accountTypeId: data.account_type_id,
        });
        return { ...data, is_default: true };
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-accounts'] });
      toast({
        title: "تم تحديث الحساب المحاسبي",
        description: "تم تحديث بيانات الحساب المحاسبي بنجاح",
      });
    },
    onError: (error: unknown) => {
      console.error('Error updating customer account:', error);
      const errorInfo = getErrorInfo(error);
      
      let errorMessage = "حدث خطأ أثناء تحديث الحساب المحاسبي";
      
      // Handle specific error types
      if (errorInfo.message === 'ACCOUNT_ALREADY_LINKED') {
        errorMessage = "هذا الحساب المحاسبي مربوط مسبقاً بهذا العميل";
      } else if (errorInfo.message === 'ACCOUNT_TYPE_REQUIRED_FOR_DEFAULT') {
        errorMessage = "يجب تحديد نوع الحساب قبل تعيينه كحساب افتراضي";
      } else if (errorInfo.message.includes('unique constraint') || errorInfo.code === '23505') {
        if (errorInfo.message.includes('customer_accounts_customer_id_account_id_key')) {
          errorMessage = "هذا الحساب المحاسبي مربوط مسبقاً بهذا العميل";
        } else if (errorInfo.message.includes('unique_customer_account')) {
          errorMessage = "يوجد تضارب في بيانات الحساب، تأكد من عدم وجود حساب مكرر";
        } else {
          errorMessage = "يوجد تضارب في البيانات، تأكد من عدم تكرار المعلومات";
        }
      }
      
      toast({
        title: "خطأ في تحديث الحساب",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
};

// Delete customer account
export const useDeleteCustomerAccount = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ accountId, customerId }: { accountId: string; customerId: string }) => {
      const companyId = await getCustomerCompanyId(customerId);
      const { data: account, error: accountError } = await supabase
        .from('customer_accounts')
        .select('account_type_id,is_default')
        .eq('id', accountId)
        .eq('company_id', companyId)
        .eq('customer_id', customerId)
        .single();
      if (accountError) throw accountError;

      const { error } = await supabase
        .from('customer_accounts')
        .update({ is_active: false, is_default: false })
        .eq('id', accountId)
        .eq('company_id', companyId)
        .eq('customer_id', customerId);

      if (error) throw error;

      if (account.is_default && account.account_type_id) {
        const { data: replacement, error: replacementError } = await supabase
          .from('customer_accounts')
          .select('id')
          .eq('company_id', companyId)
          .eq('customer_id', customerId)
          .eq('account_type_id', account.account_type_id)
          .eq('is_active', true)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (replacementError) {
          await supabase
            .from('customer_accounts')
            .update({ is_active: true, is_default: true })
            .eq('id', accountId)
            .eq('company_id', companyId)
            .eq('customer_id', customerId);
          throw replacementError;
        }
        if (replacement) {
          const { error: promoteError } = await supabase
            .from('customer_accounts')
            .update({ is_default: true })
            .eq('id', replacement.id)
            .eq('company_id', companyId);
          if (promoteError) {
            await supabase
              .from('customer_accounts')
              .update({ is_active: true, is_default: true })
              .eq('id', accountId)
              .eq('company_id', companyId)
              .eq('customer_id', customerId);
            throw promoteError;
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-accounts'] });
      toast({
        title: "تم حذف الحساب المحاسبي",
        description: "تم إلغاء ربط الحساب المحاسبي بالعميل",
      });
    },
    onError: (error) => {
      console.error('Error deleting customer account:', error);
      toast({
        title: "خطأ في حذف الحساب",
        description: "حدث خطأ أثناء حذف الحساب المحاسبي",
        variant: "destructive",
      });
    },
  });
};

// Auto-create customer accounts
export const useAutoCreateCustomerAccounts = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ customerId, companyId }: { customerId: string; companyId: string }) => {
      const customerCompanyId = await getCustomerCompanyId(customerId);
      if (customerCompanyId !== companyId) throw new Error('Customer does not belong to the selected company');

      const { data, error } = await supabase.rpc('auto_create_customer_accounts', {
        company_id_param: companyId,
        customer_id_param: customerId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['customer-accounts'] });
      
      const resultData = asAutoCreateResult(result);
      
      if (resultData?.success) {
        toast({
          title: "تم إنشاء الحسابات المحاسبية",
          description: resultData.message || `تم إنشاء ${resultData.created_accounts || 0} حساب محاسبي للعميل`,
        });
      } else {
        toast({
          title: "تنبيه",
          description: resultData?.message || resultData?.error || "لا توجد حسابات جديدة لإنشائها",
          variant: resultData?.error ? "destructive" : "default",
        });
      }
    },
    onError: (error) => {
      console.error('Error auto-creating customer accounts:', error);
      toast({
        title: "خطأ في إنشاء الحسابات",
        description: "حدث خطأ أثناء إنشاء الحسابات المحاسبية التلقائية. تأكد من إعداد حساب المقبوضات الافتراضي في إعدادات الشركة.",
        variant: "destructive",
      });
    },
  });
};
