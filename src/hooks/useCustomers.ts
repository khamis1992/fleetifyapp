
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import * as Sentry from "@sentry/react";
import { useSystemLogger } from "@/hooks/useSystemLogger";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { Customer, CustomerFormData, CustomerFilters } from '@/types/customer';
import { useMemo } from 'react';
import { queryKeys } from "@/utils/queryKeys";
import type { Database } from '@/integrations/supabase/types';

type CustomerInsert = Database['public']['Tables']['customers']['Insert'];
type CustomerUpdate = Database['public']['Tables']['customers']['Update'];

// Re-export types for compatibility
export type { Customer, CustomerFormData, CustomerFilters };

export const useCustomers = (filters?: CustomerFilters) => {
  const { companyId, filter, isBrowsingMode, browsedCompany, hasGlobalAccess } = useUnifiedCompanyAccess();

  // Memoize filters to prevent unnecessary re-queries
  const search = filters?.search;
  const searchTerm = filters?.searchTerm;
  const customerType = filters?.customer_type;
  const isBlacklisted = filters?.is_blacklisted;
  const includeInactive = filters?.includeInactive;
  const limit = filters?.limit;
  const page = filters?.page;
  const pageSize = filters?.pageSize;
  const customerCode = filters?.customer_code;
  const memoizedFilters = useMemo<CustomerFilters | undefined>(() => {
    const normalized: CustomerFilters = {
      search,
      searchTerm,
      customer_type: customerType,
      is_blacklisted: isBlacklisted,
      includeInactive,
      limit,
      page,
      pageSize,
      customer_code: customerCode,
    };

    return Object.values(normalized).some(value => value !== undefined)
      ? normalized
      : undefined;
  }, [
    search,
    searchTerm,
    customerType,
    isBlacklisted,
    includeInactive,
    limit,
    page,
    pageSize,
    customerCode,
  ]);

  return useQuery({
    queryKey: queryKeys.customers.list({
      ...memoizedFilters,
      companyId: companyId ?? undefined,
    }),
    queryFn: async ({ signal }) => {
      Sentry.addBreadcrumb({ category: "customers", message: "Fetching customers", level: "info" });
      // Reduced logging for performance - uncomment for debugging
      // console.log('🔍 [CUSTOMERS] Starting customer fetch with context:', {
      //   companyId,
      //   filter,
      //   isBrowsingMode,
      //   browsedCompany: browsedCompany ? { id: browsedCompany.id, name: browsedCompany.name } : null,
      //   hasGlobalAccess,
      //   userCompany: user?.company?.name,
      //   filters
      // });

      if (!companyId && !hasGlobalAccess) {
        // Reduced logging for performance - uncomment for debugging
        // console.log('❌ [CUSTOMERS] No company ID found and no global access');
        return {
          data: [],
          pagination: undefined
        };
      }

      let query = supabase
        .from('customers')
        .select('*')
        .abortSignal(signal);

      // Apply company filter based on unified access logic
      if (filter.company_id) {
        // Reduced logging for performance - uncomment for debugging
        // console.log('🏢 [CUSTOMERS] Applying company filter:', filter.company_id);
        query = query.eq('company_id', filter.company_id);
      } else if (hasGlobalAccess && !isBrowsingMode) {
        // Reduced logging for performance - uncomment for debugging
        // console.log('🏢 [CUSTOMERS] Super admin without browse mode - showing own company customers only');
        // For super_admin not in browse mode, show their own company customers only (not all)
        if (companyId) {
          query = query.eq('company_id', companyId);
        }
      } else if (companyId) {
        // Reduced logging for performance - uncomment for debugging
        // console.log('🏢 [CUSTOMERS] Applying fallback company filter:', companyId);
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
          // Enhanced error logging for count query
          const errorDetails = {
            message: countError.message,
            details: countError.details,
            hint: countError.hint,
            code: countError.code,
            companyId,
            hasGlobalAccess,
            filterCompanyId: filter.company_id,
            timestamp: new Date().toISOString()
          };
          
          console.error('❌ [CUSTOMERS] Error fetching count:', errorDetails);
          
          // Handle RLS/permission errors gracefully
          if (countError.code === 'PGRST301' || countError.message?.includes('permission') || countError.message?.includes('policy')) {
            console.warn('⚠️ [CUSTOMERS] RLS policy issue in count query - using 0 as fallback');
            totalCount = 0;
          } else {
            // For other errors, use 0 as fallback but don't throw
            totalCount = 0;
          }
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
        // Enhanced error logging with more context
        const errorDetails = {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          companyId,
          hasGlobalAccess,
          isBrowsingMode,
          filterCompanyId: filter.company_id,
          browsedCompany: browsedCompany ? { id: browsedCompany.id, name: browsedCompany.name } : null,
          timestamp: new Date().toISOString()
        };
        
        console.error('❌ [CUSTOMERS] Error fetching customers:', errorDetails);
        
        // Handle specific error types gracefully
        if (error.code === 'PGRST301' || error.message?.includes('permission') || error.message?.includes('policy')) {
          console.warn('⚠️ [CUSTOMERS] RLS policy or permission issue - returning empty result');
          return {
            data: [],
            pagination: memoizedFilters?.page || memoizedFilters?.pageSize ? {
              page,
              pageSize,
              totalCount: 0,
              totalPages: 0,
              hasMore: false
            } : undefined
          };
        }
        
        if (error.code === '42P01') {
          console.error('❌ [CUSTOMERS] Table customers does not exist');
          return {
            data: [],
            pagination: memoizedFilters?.page || memoizedFilters?.pageSize ? {
              page,
              pageSize,
              totalCount: 0,
              totalPages: 0,
              hasMore: false
            } : undefined
          };
        }
        
        // For other errors, throw to let React Query handle retry
        throw new Error(`Failed to fetch customers: ${error.message || 'Unknown error'}`);
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

      // Reduced logging for performance - uncomment for debugging
      // console.log('✅ [CUSTOMERS] Successfully fetched customers:', {
      //   count: data?.length || 0,
      //   totalCount,
      //   page,
      //   pageSize,
      //   companyFilter: filter.company_id,
      //   isBrowsingMode,
      //   browsedCompanyName: browsedCompany?.name
      // });

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
      Sentry.addBreadcrumb({ category: "customers", message: "Creating customer", level: "info" });
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

      // تحديد الشركة للتحقق من التكرارات
      const checkCompanyId = customerData.selectedCompanyId || user?.profile?.company_id || user?.company?.id;

      // التحقق من التكرارات - البحث بناءً على رقم الهاتف أو الهوية
      if (checkCompanyId) {
        const phone = customerData.phone?.trim();
        const nationalId = customerData.national_id?.trim();

        // التحقق من رقم الهاتف
        if (phone) {
          const { data: existingByPhone } = await supabase
            .from('customers')
            .select('id, first_name, last_name, first_name_ar, last_name_ar, phone')
            .eq('company_id', checkCompanyId)
            .eq('phone', phone)
            .eq('is_active', true)
            .maybeSingle();

          if (existingByPhone) {
            const existingName = existingByPhone.first_name_ar || existingByPhone.first_name || '';
            const existingLastName = existingByPhone.last_name_ar || existingByPhone.last_name || '';
            throw new Error(`يوجد عميل بنفس رقم الهاتف: ${existingName} ${existingLastName} (${phone})`);
          }
        }

        // التحقق من رقم الهوية
        if (nationalId) {
          const { data: existingByNationalId } = await supabase
            .from('customers')
            .select('id, first_name, last_name, first_name_ar, last_name_ar, national_id')
            .eq('company_id', checkCompanyId)
            .eq('national_id', nationalId)
            .eq('is_active', true)
            .maybeSingle();

          if (existingByNationalId) {
            const existingName = existingByNationalId.first_name_ar || existingByNationalId.first_name || '';
            const existingLastName = existingByNationalId.last_name_ar || existingByNationalId.last_name || '';
            throw new Error(`يوجد عميل بنفس رقم الهوية: ${existingName} ${existingLastName} (${nationalId})`);
          }
        }
      }

      // تحديد الشركة
      const isSuperAdmin = user?.roles?.includes('super_admin');
      const resolvedCompanyId = isSuperAdmin && customerData.selectedCompanyId
        ? customerData.selectedCompanyId
        : user?.profile?.company_id || user?.company?.id;

      if (isSuperAdmin && customerData.selectedCompanyId) {
        console.log('🏢 Using selected company ID for super admin:', resolvedCompanyId);
      } else {
        console.log('🏢 Using user company ID:', resolvedCompanyId);
      }

      if (!resolvedCompanyId) {
        throw new Error('لا يمكن تحديد الشركة. يرجى التأكد من صحة البيانات.');
      }

      // إعداد البيانات للإرسال
      const { selectedCompanyId, ...customerDataToSend } = customerData;
      
      const finalData: CustomerInsert = {
        ...customerDataToSend,
        company_id: resolvedCompanyId,
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
      Sentry.addBreadcrumb({ category: "customers", message: "Created customer successfully", level: "info" });
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
      Sentry.addBreadcrumb({ category: "customers", message: "Updating customer", level: "info" });
      console.log('🔄 Updating customer:', customerId, data);
      
      // Clean the data - remove any undefined values and selectedCompanyId
      const { selectedCompanyId, ...cleanData } = data;
      const updateData = Object.fromEntries(
        Object.entries(cleanData).filter(([_, value]) => value !== undefined)
      ) as CustomerUpdate;
      
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
      Sentry.addBreadcrumb({ category: "customers", message: "Updated customer successfully", level: "info" });
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
      Sentry.addBreadcrumb({ category: "customers", message: "Toggling customer blacklist", level: "info" });
      const { error } = await supabase
        .from('customers')
        .update({ 
          is_blacklisted: isBlacklisted,
          blacklist_reason: isBlacklisted ? reason : null
        })
        .eq('id', customerId);

      if (error) { Sentry.captureException(error, { tags: { feature: "customers" } }); throw error; }
    },
    onSuccess: async (_, variables) => {
      Sentry.addBreadcrumb({ category: "customers", message: "Toggled customer blacklist successfully", level: "info" });
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
        let customerAccounts: Array<Record<string, unknown>> = [];
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
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['customer-notes'], [customerId]),
    queryFn: async ({ signal }) => {
      if (!companyId || !customerId) return [];

      const { data, error } = await supabase
        .from('customer_notes')
        .select('*')
        .eq('customer_id', customerId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .abortSignal(signal);

      if (error) throw error;
      return data ?? [];
    },
    enabled: options?.enabled !== false && !!companyId && !!customerId,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
