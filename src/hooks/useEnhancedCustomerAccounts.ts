import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CustomerAccount, CustomerAccountFormData } from '@/types/customerAccount';
import { useToast } from '@/hooks/use-toast';

// Fetch customer accounts with enhanced data
export const useCustomerAccounts = (customerId: string) => {
  return useQuery({
    queryKey: ['customer-accounts', customerId],
    queryFn: async (): Promise<CustomerAccount[]> => {
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
        .eq('customer_id', customerId)
        .eq('is_active', true)
        .order('is_default', { ascending: false });

      if (error) {
        console.error('Error fetching customer accounts:', error);
        throw error;
      }

      return (data || []) as unknown as CustomerAccount[];
    },
    enabled: !!customerId,
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
      // If this is set as default, first unset other defaults of the same type
      if (accountData.is_default) {
        await supabase
          .from('customer_accounts')
          .update({ is_default: false })
          .eq('customer_id', customerId)
          .eq('account_type_id', accountData.account_type_id);
      }

      // Get the customer's company_id
      const { data: customer } = await supabase
        .from('customers')
        .select('company_id')
        .eq('id', customerId)
        .single();

      if (!customer) throw new Error('Customer not found');

      const { data, error } = await supabase
        .from('customer_accounts')
        .insert({
          customer_id: customerId,
          company_id: customer.company_id,
          ...accountData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: ['customer-accounts', customerId] });
      toast({
        title: "تم إضافة الحساب المحاسبي",
        description: "تم ربط الحساب المحاسبي بالعميل بنجاح",
      });
    },
    onError: (error: any) => {
      console.error('Error creating customer account:', error);
      
      let errorMessage = "حدث خطأ أثناء إضافة الحساب المحاسبي";
      
      // Handle specific error types
      if (error.message?.includes('unique constraint') || error.code === '23505') {
        if (error.message?.includes('customer_accounts_customer_id_account_id_key')) {
          errorMessage = "هذا الحساب المحاسبي مربوط مسبقاً بهذا العميل";
        } else if (error.message?.includes('unique_customer_account')) {
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
      // Check for existing account conflicts before updating
      if (accountData.account_id) {
        const { data: existingAccount } = await supabase
          .from('customer_accounts')
          .select('id')
          .eq('customer_id', customerId)
          .eq('account_id', accountData.account_id)
          .neq('id', accountId)
          .eq('is_active', true)
          .single();

        if (existingAccount) {
          throw new Error('ACCOUNT_ALREADY_LINKED');
        }
      }

      // If this is set as default, first unset other defaults of the same type
      if (accountData.is_default && accountData.account_type_id) {
        await supabase
          .from('customer_accounts')
          .update({ is_default: false })
          .eq('customer_id', customerId)
          .eq('account_type_id', accountData.account_type_id)
          .neq('id', accountId);
      }

      const { data, error } = await supabase
        .from('customer_accounts')
        .update(accountData)
        .eq('id', accountId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: ['customer-accounts', customerId] });
      toast({
        title: "تم تحديث الحساب المحاسبي",
        description: "تم تحديث بيانات الحساب المحاسبي بنجاح",
      });
    },
    onError: (error: any) => {
      console.error('Error updating customer account:', error);
      
      let errorMessage = "حدث خطأ أثناء تحديث الحساب المحاسبي";
      
      // Handle specific error types
      if (error.message === 'ACCOUNT_ALREADY_LINKED') {
        errorMessage = "هذا الحساب المحاسبي مربوط مسبقاً بهذا العميل";
      } else if (error.message?.includes('unique constraint') || error.code === '23505') {
        if (error.message?.includes('customer_accounts_customer_id_account_id_key')) {
          errorMessage = "هذا الحساب المحاسبي مربوط مسبقاً بهذا العميل";
        } else if (error.message?.includes('unique_customer_account')) {
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
      const { error } = await supabase
        .from('customer_accounts')
        .update({ is_active: false })
        .eq('id', accountId);

      if (error) throw error;
    },
    onSuccess: (_, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: ['customer-accounts', customerId] });
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
      const { data, error } = await supabase.rpc('auto_create_customer_accounts', {
        company_id_param: companyId,
        customer_id_param: customerId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (result, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: ['customer-accounts', customerId] });
      
      const resultData = result as any;
      
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