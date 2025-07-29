
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useSystemLogger } from "@/hooks/useSystemLogger";

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
      if (!companyId) {
        console.log('❌ No company ID found for user');
        return [];
      }

      console.log('🔍 Fetching customers for company:', companyId);

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
        console.error('❌ Error fetching customers:', error);
        throw error;
      }

      console.log('✅ Successfully fetched customers:', data?.length || 0);
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
  const { log } = useSystemLogger();

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
        console.log('🏢 Using selected company ID for super admin:', companyId);
      } else {
        companyId = user?.profile?.company_id || user?.company?.id;
        console.log('🏢 Using user company ID:', companyId);
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
      
      // Log the customer creation
      const customerName = data.customer_type === 'individual' 
        ? `${data.first_name} ${data.last_name}`
        : data.company_name;
      
      log.info('customers', 'create', `تم إنشاء العميل ${customerName}`, {
        resource_type: 'customer',
        resource_id: data.id,
        metadata: {
          customer_type: data.customer_type,
          name: customerName,
          phone: data.phone
        }
      });
      
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
      console.log('🔄 Updating customer:', customerId, data);
      
      const { error } = await supabase
        .from('customers')
        .update(data)
        .eq('id', customerId);

      if (error) {
        console.error('❌ Error updating customer:', error);
        throw error;
      }

      console.log('✅ Customer updated successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('تم تحديث بيانات العميل بنجاح');
    },
    onError: (error) => {
      console.error('❌ Error updating customer:', error);
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
      console.log('🔍 Fetching customer data for ID:', customerId);
      
      try {
        // First fetch the customer data
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .maybeSingle();

        if (customerError) {
          console.error('❌ Error fetching customer:', customerError);
          throw new Error(`Failed to fetch customer: ${customerError.message}`);
        }

        if (!customerData) {
          console.error('❌ Customer not found:', customerId);
          throw new Error('Customer not found');
        }

        console.log('✅ Customer data fetched successfully:', customerData);

        // Try to fetch customer accounts separately (optional)
        let customerAccounts = [];
        try {
          const { data: accountsData, error: accountsError } = await supabase
            .from('customer_accounts')
            .select(`
              *,
              account:chart_of_accounts(*)
            `)
            .eq('customer_id', customerId);

          if (!accountsError && accountsData) {
            customerAccounts = accountsData;
            console.log('✅ Customer accounts fetched:', customerAccounts);
          } else if (accountsError) {
            console.warn('⚠️ Could not fetch customer accounts:', accountsError.message);
          }
        } catch (accountsErr) {
          console.warn('⚠️ Error fetching customer accounts (non-critical):', accountsErr);
        }

        return { 
          ...customerData, 
          customer_accounts: customerAccounts,
          contracts: [] 
        };
      } catch (error) {
        console.error('❌ Critical error in useCustomer:', error);
        throw error;
      }
    },
    enabled: !!customerId,
    retry: 3,
    retryDelay: 1000
  });
};

export const useCustomerNotes = (customerId: string) => {
  return useQuery({
    queryKey: ['customer-notes', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_notes')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching customer notes:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!customerId
  });
};

export const useCreateCustomerNote = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ customerId, noteData }: { 
      customerId: string; 
      noteData: {
        note_type: string;
        title: string;
        content: string;
        is_important: boolean;
      }
    }) => {
      const companyId = user?.profile?.company_id || user?.company?.id;
      
      const { data, error } = await supabase
        .from('customer_notes')
        .insert([{
          customer_id: customerId,
          company_id: companyId,
          created_by: user?.id,
          ...noteData
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer-notes', variables.customerId] });
      toast.success('تم إضافة الملاحظة بنجاح');
    },
    onError: (error) => {
      console.error('Error creating customer note:', error);
      toast.error('حدث خطأ أثناء إضافة الملاحظة');
    }
  });
};

export const useCustomerFinancialSummary = (customerId: string) => {
  return useQuery({
    queryKey: ['customer-financial-summary', customerId],
    queryFn: async () => {
      return {
        currentBalance: 0,
        totalContracts: 0,
        totalPayments: 0,
        outstandingBalance: 0,
        totalInvoices: 0,
        totalInvoicesOutstanding: 0,
        totalInvoicesPaid: 0,
        invoicesCount: 0,
        activeContracts: 0,
        contractsCount: 0
      };
    },
    enabled: !!customerId
  });
};

export const useCustomerDiagnostics = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['customer-diagnostics', user?.id],
    queryFn: async () => {
      const companyId = user?.profile?.company_id || user?.company?.id;
      
      console.log('🔍 Running customer diagnostics for user:', user?.id);
      console.log('🏢 Company ID:', companyId);

      const diagnostics = {
        userInfo: {
          id: user?.id || 'غير متاح',
          email: user?.email || 'غير متاح',
          roles: user?.roles || [],
          hasProfile: !!user?.profile,
          profileCompanyId: user?.profile?.company_id || null,
          userCompanyId: user?.company?.id || null
        },
        permissions: {
          isSuperAdmin: user?.roles?.includes('super_admin') || false,
          isCompanyAdmin: user?.roles?.includes('company_admin') || false,
          isManager: user?.roles?.includes('manager') || false,
          isSalesAgent: user?.roles?.includes('sales_agent') || false,
          companyId: companyId || null,
          canCreateCustomers: !!(
            user?.roles?.includes('super_admin') ||
            user?.roles?.includes('company_admin') ||
            user?.roles?.includes('manager') ||
            user?.roles?.includes('sales_agent')
          )
        },
        database: {
          companyExists: null as boolean | null,
          canAccessCustomers: null as boolean | null,
          canInsertCustomers: null as boolean | null,
          error: null as string | null
        }
      };

      // Test database access if we have a company ID
      if (companyId) {
        try {
          console.log('🔍 Testing database access...');
          
          // Check if company exists
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .select('id')
            .eq('id', companyId)
            .single();

          if (companyError && companyError.code !== 'PGRST116') {
            diagnostics.database.error = companyError.message;
            console.error('❌ Company check error:', companyError);
          } else {
            diagnostics.database.companyExists = !!companyData;
            console.log('✅ Company exists:', !!companyData);
          }

          // Test customer access
          const { data: customerData, error: customerError } = await supabase
            .from('customers')
            .select('id')
            .eq('company_id', companyId)
            .limit(1);

          if (customerError) {
            diagnostics.database.canAccessCustomers = false;
            if (!diagnostics.database.error) {
              diagnostics.database.error = customerError.message;
            }
            console.error('❌ Customer access error:', customerError);
          } else {
            diagnostics.database.canAccessCustomers = true;
            console.log('✅ Can access customers');
          }

          // Test customer insertion (dry run)
          const testCustomer = {
            company_id: companyId,
            customer_type: 'individual' as const,
            first_name: 'Test',
            last_name: 'User',
            phone: '12345678',
            is_active: true,
            is_blacklisted: false,
            credit_limit: 0,
            city: 'Kuwait City',
            country: 'Kuwait'
          };

          const { data: insertData, error: insertError } = await supabase
            .from('customers')
            .insert([testCustomer])
            .select()
            .single();

          if (insertError) {
            diagnostics.database.canInsertCustomers = false;
            if (!diagnostics.database.error) {
              diagnostics.database.error = insertError.message;
            }
            console.error('❌ Customer insert test error:', insertError);
          } else {
            diagnostics.database.canInsertCustomers = true;
            console.log('✅ Can insert customers');
            
            // Clean up test customer
            await supabase
              .from('customers')
              .delete()
              .eq('id', insertData.id);
            console.log('🧹 Test customer cleaned up');
          }

        } catch (error: any) {
          diagnostics.database.error = error.message;
          console.error('❌ Database diagnostics error:', error);
        }
      }

      console.log('📊 Diagnostics complete:', diagnostics);
      return diagnostics;
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 60 * 1000, // 1 minute
  });
};
