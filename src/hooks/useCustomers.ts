
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useSystemLogger } from "@/hooks/useSystemLogger";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { Customer, CustomerFormData, CustomerFilters } from '@/types/customer';
import { useMemo } from 'react';
import { queryKeys } from "@/utils/queryKeys";

// Re-export types for compatibility
export type { Customer, CustomerFormData, CustomerFilters };

export const useCustomers = (filters?: CustomerFilters) => {
  const { user } = useAuth();
  const { companyId, filter, isBrowsingMode, browsedCompany, hasGlobalAccess } = useUnifiedCompanyAccess();

  // Memoize filters to prevent unnecessary re-queries
  const memoizedFilters = useMemo(() => filters, [
    filters?.search,
    filters?.searchTerm,
    filters?.customer_type,
    filters?.is_blacklisted,
    filters?.includeInactive,
    filters?.limit,
    filters?.page,
    filters?.pageSize
  ]);

  return useQuery({
    queryKey: queryKeys.customers.list({
      ...memoizedFilters,
      companyId,
    }),
    queryFn: async ({ signal }) => {
      console.log('🔍 [CUSTOMERS] Starting customer fetch with context:', {
        companyId,
        filter,
        isBrowsingMode,
        browsedCompany: browsedCompany ? { id: browsedCompany.id, name: browsedCompany.name } : null,
        hasGlobalAccess,
        userCompany: user?.company?.name,
        filters
      });

      if (!companyId && !hasGlobalAccess) {
        console.log('❌ [CUSTOMERS] No company ID found and no global access');
        return [];
      }

      let query = supabase
        .from('customers')
        .select('*')
        .abortSignal(signal);

      // Apply company filter based on unified access logic
      if (filter.company_id) {
        console.log('🏢 [CUSTOMERS] Applying company filter:', filter.company_id);
        query = query.eq('company_id', filter.company_id);
      } else if (hasGlobalAccess && !isBrowsingMode) {
        console.log('🏢 [CUSTOMERS] Super admin without browse mode - showing own company customers only');
        // For super_admin not in browse mode, show their own company customers only (not all)
        if (companyId) {
          query = query.eq('company_id', companyId);
        }
      } else if (companyId) {
        console.log('🏢 [CUSTOMERS] Applying fallback company filter:', companyId);
        query = query.eq('company_id', companyId);
      }

      // Apply active filter
      if (!memoizedFilters?.includeInactive) {
        query = query.eq('is_active', true);
      }

      // Apply customer type filter
      if (memoizedFilters?.customer_type) {
        query = query.eq('customer_type', memoizedFilters.customer_type);
      }

      // Apply blacklist filter
      if (memoizedFilters?.is_blacklisted !== undefined) {
        query = query.eq('is_blacklisted', memoizedFilters.is_blacklisted);
      }

      // Apply search filters with minimum length check
      const searchTerm = memoizedFilters?.search || memoizedFilters?.searchTerm;
      if (searchTerm?.trim() && searchTerm.trim().length >= 2) {
        const search = searchTerm.trim();
        query = query.or(
          `first_name.ilike.%${search}%,` +
          `last_name.ilike.%${search}%,` +
          `first_name_ar.ilike.%${search}%,` +
          `last_name_ar.ilike.%${search}%,` +
          `company_name.ilike.%${search}%,` +
          `company_name_ar.ilike.%${search}%,` +
          `phone.ilike.%${search}%,` +
          `email.ilike.%${search}%,` +
          `national_id.ilike.%${search}%`
        );
      }

      // Apply pagination or limit
      const page = memoizedFilters?.page || 1;
      const pageSize = memoizedFilters?.pageSize || memoizedFilters?.limit || 50;

      // For pagination, we need total count
      let totalCount = 0;
      if (memoizedFilters?.page || memoizedFilters?.pageSize) {
        // Build count query with same filters
        let countQuery = supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .abortSignal(signal);

        // Apply same filters to count query
        if (filter.company_id) {
          countQuery = countQuery.eq('company_id', filter.company_id);
        } else if (hasGlobalAccess && !isBrowsingMode) {
          if (companyId) {
            countQuery = countQuery.eq('company_id', companyId);
          }
        } else if (companyId) {
          countQuery = countQuery.eq('company_id', companyId);
        }

        if (!memoizedFilters?.includeInactive) {
          countQuery = countQuery.eq('is_active', true);
        }
        if (memoizedFilters?.customer_type) {
          countQuery = countQuery.eq('customer_type', memoizedFilters.customer_type);
        }
        if (memoizedFilters?.is_blacklisted !== undefined) {
          countQuery = countQuery.eq('is_blacklisted', memoizedFilters.is_blacklisted);
        }
        const searchTerm = memoizedFilters?.search || memoizedFilters?.searchTerm;
        if (searchTerm?.trim() && searchTerm.trim().length >= 2) {
          const search = searchTerm.trim();
          countQuery = countQuery.or(
            `first_name.ilike.%${search}%,` +
            `last_name.ilike.%${search}%,` +
            `first_name_ar.ilike.%${search}%,` +
            `last_name_ar.ilike.%${search}%,` +
            `company_name.ilike.%${search}%,` +
            `company_name_ar.ilike.%${search}%,` +
            `phone.ilike.%${search}%,` +
            `email.ilike.%${search}%,` +
            `national_id.ilike.%${search}%`
          );
        }

        const { count, error: countError } = await countQuery;
        if (countError) {
          console.error('❌ [CUSTOMERS] Error fetching count:', countError);
        } else {
          totalCount = count || 0;
        }
      }

      // Apply pagination with range
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      // Order by creation date
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('❌ [CUSTOMERS] Error fetching customers:', error);
        throw error;
      }

      const result = {
        data: data || [],
        pagination: memoizedFilters?.page || memoizedFilters?.pageSize ? {
          page,
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
          hasMore: (page * pageSize) < totalCount
        } : undefined
      };

      console.log('✅ [CUSTOMERS] Successfully fetched customers:', {
        count: data?.length || 0,
        totalCount,
        page,
        pageSize,
        companyFilter: filter.company_id,
        isBrowsingMode,
        browsedCompanyName: browsedCompany?.name
      });

      return result;
    },
    enabled: !!(companyId || hasGlobalAccess),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
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
    onSuccess: async (data) => {
      console.log('🎉 Customer creation successful:', data);
      
      // Update cache immediately with optimistic update
      queryClient.setQueriesData(
        { queryKey: queryKeys.customers.lists() },
        (oldData: unknown) => {
          if (!oldData) return [data];

          // Type guard: check if oldData is an array
          if (!Array.isArray(oldData)) return [data];

          // Check if customer already exists to avoid duplicates
          const exists = (oldData as Customer[]).some((customer: Customer) => customer.id === data.id);
          if (exists) return oldData;

          // Add new customer to the beginning of the list
          return [data, ...oldData];
        }
      );
      
      // Also update individual customer cache
      queryClient.setQueryData(['customer', data.id], data);
      
      // Trigger refetch as backup (but don't wait for it)
      queryClient.refetchQueries({
        queryKey: queryKeys.customers.lists(),
        type: 'active' 
      });
      
      const customerName = data.customer_type === 'individual' 
        ? `${data.first_name} ${data.last_name}`
        : data.company_name;
      
      toast.success(`تم إضافة العميل "${customerName}" بنجاح`);
    },
    onError: (error: Error | unknown) => {
      console.error('💥 Customer creation failed:', error);

      // التحقق من رسالة العميل المحظور
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('العميل محظور:')) {
        toast.error(errorMessage);
      } else {
        toast.error(errorMessage || 'حدث خطأ أثناء إضافة العميل');
      }
    }
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();
  const { log } = useSystemLogger();

  return useMutation({
    mutationFn: async ({ customerId, data }: { customerId: string; data: Partial<CustomerFormData> }) => {
      console.log('🔄 Updating customer:', customerId, data);
      
      // Clean the data - remove any undefined values and selectedCompanyId
      const { selectedCompanyId, ...cleanData } = data;
      const updateData = Object.fromEntries(
        Object.entries(cleanData).filter(([_, value]) => value !== undefined)
      );
      
      console.log('📤 Sending update data to database:', updateData);
      
      const { data: updatedCustomer, error } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', customerId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating customer:', error);
        throw new Error(`فشل في تحديث العميل: ${error.message}`);
      }

      console.log('✅ Customer updated successfully:', updatedCustomer);
      
      // Log the customer update
      const customerName = updatedCustomer.customer_type === 'individual' 
        ? `${updatedCustomer.first_name} ${updatedCustomer.last_name}`
        : updatedCustomer.company_name;
      
      log.info('customers', 'update', `تم تحديث العميل ${customerName}`, {
        resource_type: 'customer',
        resource_id: updatedCustomer.id,
        metadata: {
          customer_type: updatedCustomer.customer_type,
          name: customerName,
          phone: updatedCustomer.phone
        }
      });
      
      return updatedCustomer;
    },
    onSuccess: async (data) => {
      console.log('🎉 Customer update successful:', data);
      
      // Update cache immediately with optimistic update
      queryClient.setQueriesData(
        { queryKey: queryKeys.customers.lists() },
        (oldData: unknown) => {
          if (!oldData) return [data];

          // Type guard: check if oldData is an array
          if (!Array.isArray(oldData)) return [data];

          // Update the existing customer in the list
          return (oldData as Customer[]).map((customer: Customer) =>
            customer.id === data.id ? { ...customer, ...data } : customer
          );
        }
      );
      
      // Update individual customer cache
      queryClient.setQueryData(['customer', data.id], data);
      
      // Also trigger refetch as a backup (but don't wait for it)
      queryClient.refetchQueries({ queryKey: ['customers'], type: 'active' });
      queryClient.refetchQueries({ queryKey: queryKeys.customers.detail(data.id), type: 'active' });
      
      const customerName = data.customer_type === 'individual' 
        ? `${data.first_name} ${data.last_name}`
        : data.company_name;
      
      toast.success(`تم تحديث بيانات العميل "${customerName}" بنجاح`);
    },
    onError: (error: Error | unknown) => {
      console.error('❌ Customer update failed:', error);

      // التحقق من رسالة العميل المحظور
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('العميل محظور:')) {
        toast.error(errorMessage);
      } else {
        toast.error(errorMessage || 'حدث خطأ أثناء تحديث بيانات العميل');
      }
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
    onSuccess: async (_, variables) => {
      // Update cache immediately with optimistic update
      queryClient.setQueriesData(
        { queryKey: queryKeys.customers.lists() },
        (oldData: unknown) => {
          if (!oldData) return oldData;

          // Type guard: check if oldData is an array
          if (!Array.isArray(oldData)) return oldData;

          // Update the existing customer in the list
          return (oldData as Customer[]).map((customer: Customer) =>
            customer.id === variables.customerId
              ? {
                  ...customer,
                  is_blacklisted: variables.isBlacklisted,
                  blacklist_reason: variables.isBlacklisted ? variables.reason : null
                }
              : customer
          );
        }
      );
      
      // Also trigger refetch as a backup (but don't wait for it)
      queryClient.refetchQueries({
        queryKey: queryKeys.customers.lists(),
        type: 'active' 
      });
      
      toast.success(variables.isBlacklisted ? 'تم إضافة العميل للقائمة السوداء' : 'تم إزالة العميل من القائمة السوداء');
    },
    onError: (error) => {
      console.error('Error toggling customer blacklist:', error);
      toast.error('حدث خطأ أثناء تحديث حالة العميل');
    }
  });
};

export const useCustomer = (customerId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.customers.detail(customerId),
    queryFn: async ({ signal }) => {
      console.log('🔍 Fetching customer data for ID:', customerId);

      try {
        // First fetch the customer data
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .abortSignal(signal)
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
            .eq('customer_id', customerId)
            .abortSignal(signal);

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
    enabled: options?.enabled !== false && !!customerId,
    retry: 3,
    retryDelay: 1000,
    staleTime: 2 * 60 * 1000, // 2 minutes - data stays fresh longer
    gcTime: 10 * 60 * 1000,    // 10 minutes - keep in cache longer
  });
};

export const useCustomerNotes = (customerId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.customers.notes(customerId),
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase
        .from('customer_notes')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .abortSignal(signal);

      if (error) {
        console.error('Error fetching customer notes:', error);
        throw error;
      }

      return data || [];
    },
    enabled: options?.enabled !== false && !!customerId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
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
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.notes(variables.customerId) });
      toast.success('تم إضافة الملاحظة بنجاح');
    },
    onError: (error) => {
      console.error('Error creating customer note:', error);
      toast.error('حدث خطأ أثناء إضافة الملاحظة');
    }
  });
};

export const useCustomerFinancialSummary = (customerId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.customers.financialSummary(customerId),
    queryFn: async () => {
      // Return placeholder data - will be implemented with real calculations later
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
    enabled: options?.enabled !== false && !!customerId,
    staleTime: 5 * 60 * 1000, // 5 minutes - financial data doesn't change that often
    gcTime: 15 * 60 * 1000,   // 15 minutes cache
  });
};

export const useCustomerDiagnostics = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.customers.diagnostics(user?.id),
    queryFn: async ({ signal }) => {
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
            .abortSignal(signal)
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
            .limit(1)
            .abortSignal(signal);

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
            .abortSignal(signal)
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
              .eq('id', insertData.id)
              .abortSignal(signal);
            console.log('🧹 Test customer cleaned up');
          }

        } catch (error: unknown) {
          diagnostics.database.error = error instanceof Error ? error.message : String(error);
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
