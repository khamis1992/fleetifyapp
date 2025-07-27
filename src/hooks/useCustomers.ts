
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Customer {
  id: string;
  company_id: string;
  customer_type: 'individual' | 'corporate';
  first_name?: string;
  last_name?: string;
  first_name_ar?: string;
  last_name_ar?: string;
  company_name?: string;
  company_name_ar?: string;
  email?: string;
  phone: string;
  alternative_phone?: string;
  national_id?: string;
  passport_number?: string;
  license_number?: string;
  address?: string;
  address_ar?: string;
  city?: string;
  country?: string;
  date_of_birth?: string;
  license_expiry?: string;
  credit_limit?: number;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  is_blacklisted?: boolean;
  blacklist_reason?: string;
  documents?: any;
  notes?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
  contracts_count?: number;
  contracts?: any[];
  customer_accounts?: any[];
}

export interface CustomerFormData {
  customer_type: 'individual' | 'corporate';
  first_name?: string;
  last_name?: string;
  first_name_ar?: string;
  last_name_ar?: string;
  company_name?: string;
  company_name_ar?: string;
  email?: string;
  phone: string;
  alternative_phone?: string;
  national_id?: string;
  passport_number?: string;
  license_number?: string;
  license_expiry?: string;
  address?: string;
  address_ar?: string;
  city?: string;
  country?: string;
  date_of_birth?: string;
  credit_limit?: number;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
  selectedCompanyId?: string;
}

export const useCustomers = (filters?: {
  customer_type?: 'individual' | 'corporate';
  is_blacklisted?: boolean;
  search?: string;
}) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['customers', user?.profile?.company_id || user?.company?.id, filters],
    queryFn: async () => {
      const companyId = user?.profile?.company_id || user?.company?.id;
      if (!companyId) return [];

      let query = supabase
        .from('customers')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (filters?.customer_type) {
        query = query.eq('customer_type', filters.customer_type);
      }

      if (filters?.is_blacklisted !== undefined) {
        query = query.eq('is_blacklisted', filters.is_blacklisted);
      }

      if (filters?.search) {
        const searchTerm = filters.search.trim();
        if (searchTerm) {
          query = query.or(
            `first_name.ilike.%${searchTerm}%,` +
            `last_name.ilike.%${searchTerm}%,` +
            `company_name.ilike.%${searchTerm}%,` +
            `phone.ilike.%${searchTerm}%,` +
            `email.ilike.%${searchTerm}%`
          );
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching customers:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!(user?.profile?.company_id || user?.company?.id),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useCreateCustomer = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customerData: CustomerFormData) => {
      console.log('🔄 Creating customer with data:', customerData);
      console.log('👤 Current user:', {
        id: user?.id,
        email: user?.email,
        profile: user?.profile,
        company: user?.company,
        roles: user?.roles
      });

      // التحقق من البيانات الأساسية
      if (!customerData.phone?.trim()) {
        throw new Error('رقم الهاتف مطلوب');
      }

      if (customerData.customer_type === 'individual') {
        if (!customerData.first_name?.trim() || !customerData.last_name?.trim()) {
          throw new Error('الاسم الأول والأخير مطلوبان للعملاء الأفراد');
        }
      } else if (customerData.customer_type === 'corporate') {
        if (!customerData.company_name?.trim()) {
          throw new Error('اسم الشركة مطلوب للعملاء الشركات');
        }
      }

      // تحديد الشركة
      const isSuperAdmin = user?.roles?.includes('super_admin');
      let companyId: string;

      if (isSuperAdmin && customerData.selectedCompanyId) {
        companyId = customerData.selectedCompanyId;
      } else {
        companyId = user?.profile?.company_id || user?.company?.id;
      }

      if (!companyId) {
        throw new Error('لا يمكن تحديد الشركة. يرجى التأكد من صحة البيانات.');
      }

      // إعداد البيانات للإرسال
      const { selectedCompanyId, ...customerDataToSend } = customerData;
      
      const finalData = {
        ...customerDataToSend,
        company_id: companyId,
        is_active: true,
        is_blacklisted: false,
        credit_limit: customerDataToSend.credit_limit || 0,
        city: customerDataToSend.city || 'Kuwait City',
        country: customerDataToSend.country || 'Kuwait',
        date_of_birth: customerDataToSend.date_of_birth || null,
        license_expiry: customerDataToSend.license_expiry || null,
      };

      console.log('📤 Sending data to database:', finalData);

      const { data, error } = await supabase
        .from('customers')
        .insert([finalData])
        .select()
        .single();

      if (error) {
        console.error('❌ Database error:', error);
        throw new Error(`خطأ في قاعدة البيانات: ${error.message}`);
      }

      console.log('✅ Customer created successfully:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('🎉 Customer creation successful:', data);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      
      const customerName = data.customer_type === 'individual' 
        ? `${data.first_name} ${data.last_name}`
        : data.company_name;
      
      toast.success(`تم إضافة العميل "${customerName}" بنجاح`);
    },
    onError: (error: any) => {
      console.error('💥 Customer creation failed:', error);
      toast.error(error.message || 'حدث خطأ أثناء إضافة العميل');
    }
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ customerId, data }: { customerId: string; data: Partial<CustomerFormData> }) => {
      const { error } = await supabase
        .from('customers')
        .update(data)
        .eq('id', customerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('تم تحديث بيانات العميل بنجاح');
    },
    onError: (error) => {
      console.error('Error updating customer:', error);
      toast.error('حدث خطأ أثناء تحديث بيانات العميل');
    }
  });
};

export const useToggleCustomerBlacklist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ customerId, isBlacklisted, reason }: { 
      customerId: string; 
      isBlacklisted: boolean; 
      reason?: string 
    }) => {
      const { error } = await supabase
        .from('customers')
        .update({ 
          is_blacklisted: isBlacklisted,
          blacklist_reason: isBlacklisted ? reason : null
        })
        .eq('id', customerId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(variables.isBlacklisted ? 'تم إضافة العميل للقائمة السوداء' : 'تم إزالة العميل من القائمة السوداء');
    },
    onError: (error) => {
      console.error('Error toggling customer blacklist:', error);
      toast.error('حدث خطأ أثناء تحديث حالة العميل');
    }
  });
};

export const useCustomer = (customerId: string) => {
  return useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          customer_accounts:customer_accounts(
            *,
            account:chart_of_accounts(*)
          )
        `)
        .eq('id', customerId)
        .single();

      if (error) {
        console.error('Error fetching customer:', error);
        throw error;
      }

      return data;
    },
    enabled: !!customerId
  });
};
