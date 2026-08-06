import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { toast } from 'sonner';
import { Customer, CustomerFilters, type CustomerFormData } from '@/types/customer';
import { useCustomerViewContext } from '@/contexts/CustomerViewContext';
import { getCustomerDataIssues } from '@/utils/formatCustomerName';

export type EnhancedCustomer = Customer;

type CustomerInsert = Database['public']['Tables']['customers']['Insert'];
type CustomerRow = Database['public']['Tables']['customers']['Row'];
type CustomerUpdate = Database['public']['Tables']['customers']['Update'];
type CustomerNoteInsert = Database['public']['Tables']['customer_notes']['Insert'];

const normalizeCustomer = (row: CustomerRow): Customer => ({
  id: row.id,
  company_id: row.company_id,
  customer_code: row.customer_code ?? undefined,
  customer_type: row.customer_type ?? 'individual',
  first_name: row.first_name ?? undefined,
  last_name: row.last_name ?? undefined,
  first_name_ar: row.first_name_ar ?? undefined,
  last_name_ar: row.last_name_ar ?? undefined,
  company_name: row.company_name ?? undefined,
  company_name_ar: row.company_name_ar ?? undefined,
  email: row.email ?? undefined,
  phone: row.phone,
  alternative_phone: row.alternative_phone ?? undefined,
  national_id: row.national_id ?? undefined,
  nationality: row.nationality ?? undefined,
  passport_number: row.passport_number ?? undefined,
  license_number: row.license_number ?? undefined,
  address: row.address ?? undefined,
  address_ar: row.address_ar ?? undefined,
  city: row.city ?? undefined,
  country: row.country ?? undefined,
  date_of_birth: row.date_of_birth ?? undefined,
  license_expiry: row.license_expiry ?? undefined,
  national_id_expiry: row.national_id_expiry ?? undefined,
  credit_limit: row.credit_limit ?? undefined,
  emergency_contact_name: row.emergency_contact_name ?? undefined,
  emergency_contact_phone: row.emergency_contact_phone ?? undefined,
  is_blacklisted: row.is_blacklisted ?? undefined,
  blacklist_reason: row.blacklist_reason ?? undefined,
  documents: row.documents ?? undefined,
  notes: row.notes ?? undefined,
  is_active: row.is_active ?? undefined,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

interface CreateCustomerInput extends CustomerFormData {
  force_create?: boolean;
  commercial_register?: string;
  base_currency?: string;
  accounts?: unknown;
}

interface DuplicateCustomerMatch {
  name?: string;
  duplicate_field?: string;
  duplicate_value?: string;
}

interface CustomerNoteInput {
  title?: string;
  content?: string;
  note_type?: string;
  is_important?: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Optimized hook for fetching customer counts only (no data)
export const useCustomerCount = (filters?: CustomerFilters, options?: { enabled?: boolean }) => {
  const { companyId, getQueryKey, isSystemLevel, hasGlobalAccess, getFilterForOwnCompany, getFilterForGlobalView } = useUnifiedCompanyAccess();
  
  // Use customer view context with fallback
  let viewAllCustomers = false;
  try {
    const context = useCustomerViewContext();
    viewAllCustomers = context.viewAllCustomers;
  } catch {
    viewAllCustomers = false;
  }

  const activeFilter = viewAllCustomers && hasGlobalAccess ? getFilterForGlobalView() : getFilterForOwnCompany();
  
  const { 
    includeInactive = false, 
    searchTerm, 
    search,
    customer_code,
    customer_type,
    is_blacklisted,
  } = filters || {};
  
  return useQuery({
    queryKey: getQueryKey(['customer-count'], [includeInactive, searchTerm, search, customer_code, customer_type, is_blacklisted, viewAllCustomers]),
    queryFn: async (): Promise<number> => {
      if (!isSystemLevel && !companyId) {
        return 0;
      }
      
      // Build count query only (no data fetching)
      let countQuery = supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });
      
      if (activeFilter.company_id) {
        countQuery = countQuery.eq('company_id', activeFilter.company_id);
      }
      
      if (!includeInactive) {
        countQuery = countQuery.eq('is_active', true);
      }
      
      if (customer_type) {
        countQuery = countQuery.eq('customer_type', customer_type);
      }

      if (is_blacklisted !== undefined) {
        countQuery = countQuery.eq('is_blacklisted', is_blacklisted);
      }
      
      const searchText = searchTerm || search;
      if (searchText) {
        // تقسيم عبارة البحث إلى كلمات
        const searchWords = searchText.trim().split(/\s+/).filter((w: string) => w.length > 0);
        
        // استخدام الكلمة الأخيرة (الأكثر تحديداً) للبحث في DB
        const primarySearchWord = searchWords[searchWords.length - 1];
        
        countQuery = countQuery.or(
          `first_name.ilike.%${primarySearchWord}%,` +
          `last_name.ilike.%${primarySearchWord}%,` +
          `first_name_ar.ilike.%${primarySearchWord}%,` +
          `last_name_ar.ilike.%${primarySearchWord}%,` +
          `company_name.ilike.%${searchText}%,` +
          `phone.ilike.%${searchText}%,` +
          `email.ilike.%${searchText}%,` +
          `customer_code.ilike.%${searchText}%`
        );
      }

      if (customer_code?.trim()) {
        countQuery = countQuery.ilike('customer_code', `%${customer_code}%`);
      }
      
      const { count, error: countError } = await countQuery;
      
      if (countError) {
        console.error('❌ [useCustomerCount] Error counting customers:', countError);
        throw countError;
      }
      
      return count || 0;
    },
    enabled: (options?.enabled !== false) && (isSystemLevel || !!companyId),
    staleTime: 60 * 1000, // 1 minute cache for counts
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false, // Don't refetch counts on window focus
  });
};

export const useCustomers = (filters?: CustomerFilters) => {
  const { companyId, getQueryKey, isSystemLevel, hasGlobalAccess, getFilterForOwnCompany, getFilterForGlobalView } = useUnifiedCompanyAccess();
  
  // Use customer view context with fallback
  let viewAllCustomers = false;
  try {
    const context = useCustomerViewContext();
    viewAllCustomers = context.viewAllCustomers;
  } catch {
    // Context not available - use default value
    viewAllCustomers = false;
  }
  
  // Get the appropriate filter based on view mode
  // For Super Admins: default to their own company unless explicitly viewing all customers
  const activeFilter = viewAllCustomers && hasGlobalAccess ? getFilterForGlobalView() : getFilterForOwnCompany();
  
  // Reduced logging for performance - uncomment for debugging
  // console.log('🎯 [useCustomers] Filter logic:', {
  //   viewAllCustomers,
  //   hasGlobalAccess,
  //   userCompanyId: companyId,
  //   activeFilter,
  //   getFilterForOwnCompany: getFilterForOwnCompany(),
  //   getFilterForGlobalView: getFilterForGlobalView()
  // });
  const { 
    includeInactive = false, 
    searchTerm, 
    search,
    customer_code,
    limit,
    customer_type,
    is_blacklisted,
    page = 1,
    pageSize = 50
  } = filters || {};
  
  // Reduced logging for performance - uncomment for debugging
  // console.log('🏢 [useCustomers] Company context:', {
  //   companyId,
  //   isBrowsingMode,
  //   isSystemLevel,
  //   hasGlobalAccess,
  //   browsedCompany: browsedCompany ? { id: browsedCompany.id, name: browsedCompany.name } : null,
  //   filters,
  //   defaultFilter: filter,
  //   activeFilter,
  //   viewAllCustomers,
  //   queryKey: getQueryKey(['customers'], [includeInactive, searchTerm, search, customer_code, limit, customer_type, is_blacklisted, page, pageSize])
  // });
  
  return useQuery({
    queryKey: getQueryKey(['customers'], [includeInactive, searchTerm, search, customer_code, limit, customer_type, is_blacklisted, viewAllCustomers, page, pageSize]),
    queryFn: async (): Promise<{ data: EnhancedCustomer[], total: number }> => {
      // For system level users (super_admin), allow querying all customers
      // For company scoped users, require a company ID
      if (!isSystemLevel && !companyId) {
        console.error('❌ [useCustomers] No company ID available for company-scoped user');
        throw new Error("No company access available");
      }
      
      // Reduced logging for performance - uncomment for debugging
      // console.log('🔍 [useCustomers] Executing query:', {
      //   isSystemLevel,
      //   companyId,
      //   hasGlobalAccess,
      //   defaultFilterCompanyId: filter.company_id,
      //   activeFilterCompanyId: activeFilter.company_id,
      //   viewAllCustomers,
      //   usingActiveFilter: !!activeFilter.company_id,
      //   page,
      //   pageSize
      // });
      
      // Build count query first
      let countQuery = supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });
      
      // Use the active filter based on view mode
      if (activeFilter.company_id) {
        countQuery = countQuery.eq('company_id', activeFilter.company_id);
        // Reduced logging for performance
        // console.log('🔍 [useCustomers] Applied active company filter:', activeFilter.company_id);
      }
      // else {
      //   console.log('🔍 [useCustomers] No company filter - viewing all customers');
      // }
      
      if (!includeInactive) {
        countQuery = countQuery.eq('is_active', true);
      }
      
      if (customer_type) {
        countQuery = countQuery.eq('customer_type', customer_type);
      }

      if (is_blacklisted !== undefined) {
        countQuery = countQuery.eq('is_blacklisted', is_blacklisted);
      }
      
      const searchText = searchTerm || search;
      if (searchText) {
        // تقسيم عبارة البحث إلى كلمات
        const searchWords = searchText.trim().split(/\s+/).filter((w: string) => w.length > 0);
        
        // استخدام الكلمة الأخيرة (الأكثر تحديداً) للبحث في DB
        const primarySearchWord = searchWords[searchWords.length - 1];
        
        countQuery = countQuery.or(
          `first_name.ilike.%${primarySearchWord}%,` +
          `last_name.ilike.%${primarySearchWord}%,` +
          `first_name_ar.ilike.%${primarySearchWord}%,` +
          `last_name_ar.ilike.%${primarySearchWord}%,` +
          `company_name.ilike.%${searchText}%,` +
          `phone.ilike.%${searchText}%,` +
          `email.ilike.%${searchText}%,` +
          `customer_code.ilike.%${searchText}%`
        );
      }

      if (customer_code?.trim()) {
        countQuery = countQuery.ilike('customer_code', `%${customer_code}%`);
      }
      
      // Get total count
      const { count, error: countError } = await countQuery;
      
      if (countError) {
        console.error('❌ [useCustomers] Error counting customers:', countError);
        throw countError;
      }
      
      // Build data query with pagination
      let query = supabase
        .from('customers')
        .select('*');
      
      // Use the active filter based on view mode
      if (activeFilter.company_id) {
        query = query.eq('company_id', activeFilter.company_id);
      }
      
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }
      
      if (customer_type) {
        query = query.eq('customer_type', customer_type);
      }

      if (is_blacklisted !== undefined) {
        query = query.eq('is_blacklisted', is_blacklisted);
      }
      
      // تقسيم عبارة البحث إلى كلمات
      const searchWords = searchText ? searchText.trim().split(/\s+/).filter((w: string) => w.length > 0) : [];
      
      if (searchText && searchWords.length > 0) {
        // استخدام الكلمة الأخيرة (الأكثر تحديداً) للبحث في DB
        const primarySearchWord = searchWords[searchWords.length - 1];
        
        query = query.or(
          `first_name.ilike.%${primarySearchWord}%,` +
          `last_name.ilike.%${primarySearchWord}%,` +
          `first_name_ar.ilike.%${primarySearchWord}%,` +
          `last_name_ar.ilike.%${primarySearchWord}%,` +
          `company_name.ilike.%${searchText}%,` +
          `phone.ilike.%${searchText}%,` +
          `email.ilike.%${searchText}%,` +
          `customer_code.ilike.%${searchText}%`
        );
      }

      if (customer_code?.trim()) {
        query = query.ilike('customer_code', `%${customer_code}%`);
      }
      
      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
      
      // Apply ordering
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) {
        console.error('❌ [useCustomers] Error fetching customers:', error);
        throw error;
      }
      
      // تصفية النتائج للتأكد من أن جميع كلمات البحث موجودة
      let filteredData = data || [];
      if (searchWords.length > 1) {
        filteredData = filteredData.filter(customer => {
          // بناء الاسم الكامل للمقارنة
          const fullName = [
            customer.first_name || '',
            customer.last_name || '',
            customer.first_name_ar || '',
            customer.last_name_ar || '',
            customer.company_name || ''
          ].join(' ').toLowerCase();
          
          // التحقق من أن جميع كلمات البحث موجودة
          return searchWords.every(word => fullName.includes(word.toLowerCase()));
        });
      }
      
      return {
        data: filteredData.map(normalizeCustomer),
        total: searchWords.length > 1 ? filteredData.length : (count || 0)
      };
    },
    // Enable query for system level users or users with company ID
    enabled: isSystemLevel || !!companyId,
    staleTime: 30 * 1000, // 30 seconds for faster updates
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true, // Always refetch on mount to ensure fresh data
    // Add better error handling and defaults
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Provide fallback data in case of errors
    placeholderData: {
      data: [],
      total: 0
    }
  });
};

export const useCustomerById = (customerId: string, options?: { enabled?: boolean }) => {
  const { companyId, getQueryKey, browsedCompany, isBrowsingMode, isSystemLevel, filter } = useUnifiedCompanyAccess();
  
  // Use customer view context with fallback
  let viewAllCustomers = false;
  try {
    const context = useCustomerViewContext();
    viewAllCustomers = context.viewAllCustomers;
  } catch {
    // Context not available - use default value
    viewAllCustomers = false;
  }
  
  // Debug logging for company context
  console.log('🏢 [useCustomerById] Company context:', {
    customerId,
    companyId,
    isBrowsingMode,
    browsedCompany: browsedCompany ? { id: browsedCompany.id, name: browsedCompany.name } : null
  });
  
  return useQuery({
    queryKey: getQueryKey(['customer'], [customerId, viewAllCustomers]),
    queryFn: async (): Promise<EnhancedCustomer | null> => {
      if (!customerId) return null;
      if (!isSystemLevel && !companyId) return null;
      
      const startTime = performance.now();
      
      let query = supabase
        .from('customers')
        .select('*')
        .eq('id', customerId);
      
      // Use the unified filter logic instead of direct companyId
      // But allow super_admin to view customers from any company when viewAllCustomers is enabled
      if (!viewAllCustomers && filter.company_id) {
        query = query.eq('company_id', filter.company_id);
      }
      
      const { data, error } = await query.single();
      
      const duration = performance.now() - startTime;
      console.log(`⏱️ [useCustomerById] Query took ${duration.toFixed(2)}ms`);
      
      if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('Error fetching customer:', error);
        throw error;
      }
      
      return normalizeCustomer(data);
    },
    enabled: options?.enabled !== false && !!customerId && (isSystemLevel || !!companyId),
    staleTime: 5 * 60 * 1000, // 5 minutes - increased from 2 minutes
    gcTime: 15 * 60 * 1000,   // 15 minutes - increased from 10 minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false, // Don't refetch on component mount if data exists
  });
};

export const useToggleCustomerBlacklist = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async ({ customerId, isBlacklisted, reason }: { 
      customerId: string; 
      isBlacklisted: boolean; 
      reason?: string 
    }) => {
      if (!companyId) throw new Error('No company access available');
      if (isBlacklisted && !reason?.trim()) {
        throw new Error('يجب إدخال سبب إضافة العميل إلى القائمة السوداء');
      }

      const { error } = await supabase
        .from('customers')
        .update({ 
          is_blacklisted: isBlacklisted,
          blacklist_reason: isBlacklisted ? reason?.trim() : null
        })
        .eq('id', customerId)
        .eq('company_id', companyId)
        .select('id')
        .single();

      if (error) throw error;
    },
    onSuccess: async (_, variables) => {
      console.log('✅ Customer blacklist toggle successful, updating cache');
      
      // استخدام invalidateQueries للحصول على تحديث فوري
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      
      toast.success(variables.isBlacklisted ? 'تم إضافة العميل للقائمة السوداء' : 'تم إزالة العميل من القائمة السوداء');
    },
    onError: (error) => {
      console.error('Error toggling customer blacklist:', error);
      toast.error('حدث خطأ أثناء تحديث حالة العميل');
    }
  });
};

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async (customerId: string) => {
      if (!companyId) throw new Error('No company access available');

      const relatedQueries = await Promise.all([
        supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('customer_id', customerId).eq('company_id', companyId),
        supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('customer_id', customerId).eq('company_id', companyId),
        supabase.from('payments').select('id', { count: 'exact', head: true }).eq('customer_id', customerId).eq('company_id', companyId),
        supabase.from('quotations').select('id', { count: 'exact', head: true }).eq('customer_id', customerId).eq('company_id', companyId),
      ]);
      const failedQuery = relatedQueries.find((result) => result.error);
      if (failedQuery?.error) throw failedQuery.error;

      const relatedCount = relatedQueries.reduce(
        (sum, result) => sum + (result.count || 0),
        0
      );
      if (relatedCount > 0) {
        throw new Error(
          'لا يمكن حذف عميل لديه عقود أو فواتير أو مدفوعات أو عروض أسعار. عطّل العميل بدلًا من ذلك للحفاظ على السجل المالي.'
        );
      }

      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId)
        .eq('company_id', companyId)
        .select('id')
        .single();
      if (error) throw error;

      return { success: true };
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['customers'] }),
        queryClient.invalidateQueries({ queryKey: ['contracts'] }),
        queryClient.invalidateQueries({ queryKey: ['invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['payments'] }),
        queryClient.invalidateQueries({ queryKey: ['quotations'] }),
      ]);
      toast.success('تم حذف العميل بنجاح');
    },
    onError: (error: unknown) => {
      console.error('Error deleting customer:', error);
      toast.error(error instanceof Error ? error.message : 'فشل حذف العميل');
    },
  });
};
export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  const { companyId, validateCompanyAccess } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async (data: CreateCustomerInput) => {
      const targetCompanyId = data.selectedCompanyId || companyId;
      if (!targetCompanyId) throw new Error('No company access available');
      validateCompanyAccess(targetCompanyId);

      const today = new Date().toISOString().split('T')[0];
      if (data.national_id_expiry && data.national_id_expiry < today) {
        throw new Error('البطاقة المدنية منتهية الصلاحية. يجب تجديدها قبل تسجيل العميل');
      }
      if (data.license_expiry && data.license_expiry < today) {
        throw new Error('رخصة القيادة منتهية الصلاحية. يجب تجديدها قبل تسجيل العميل');
      }

      const { data: duplicateCheck, error: duplicateError } = await supabase.rpc(
        'check_duplicate_customer',
        {
          p_company_id: targetCompanyId,
          p_customer_type: data.customer_type,
          p_national_id: data.national_id || undefined,
          p_passport_number: data.passport_number || undefined,
          p_phone: data.phone || undefined,
          p_email: data.email || undefined,
          p_company_name: data.company_name || undefined,
          p_commercial_register: data.commercial_register || undefined,
        }
      );
      if (duplicateError) throw duplicateError;

      const duplicateRecord = isRecord(duplicateCheck) ? duplicateCheck : null;
      const duplicates = Array.isArray(duplicateRecord?.duplicates)
        ? duplicateRecord.duplicates.filter(isRecord)
        : [];
      if (duplicateRecord?.has_duplicates === true && !data.force_create) {
        const duplicateInfo = duplicates
          .map((duplicate): DuplicateCustomerMatch => {
            const match = duplicate as Record<string, unknown>;
            return {
              name: typeof match.name === 'string' ? match.name : undefined,
              duplicate_field:
                typeof match.duplicate_field === 'string'
                  ? match.duplicate_field
                  : undefined,
              duplicate_value:
                typeof match.duplicate_value === 'string'
                  ? match.duplicate_value
                  : undefined,
            };
          })
          .map(
            (duplicate) =>
              `${duplicate.name || 'عميل'} (${duplicate.duplicate_field || 'حقل مطابق'}: ${duplicate.duplicate_value || '-'})`
          )
          .join('، ');
        throw new Error(`يوجد عميل مشابه في النظام: ${duplicateInfo || 'راجع بيانات العميل'}`);
      }

      const controlFields = new Set([
        'selectedCompanyId',
        'force_create',
        'commercial_register',
        'base_currency',
        'accounts',
      ]);
      const customerFields = Object.fromEntries(
        Object.entries(data).filter(([key]) => !controlFields.has(key))
      ) as Omit<CustomerInsert, 'company_id'>;
      const cleanData: CustomerInsert = {
        ...customerFields,
        company_id: targetCompanyId,
        phone: data.phone.trim(),
        is_active: true,
      };

      const customerDataIssues = getCustomerDataIssues(cleanData);
      if (customerDataIssues.length > 0) {
        throw new Error(`استكمل بيانات العميل أولاً: ${customerDataIssues.join('، ')}`);
      }

      if (!cleanData.customer_code) {
        const { data: generatedCode, error: codeError } = await supabase.rpc(
          'generate_customer_code',
          {
            p_company_id: targetCompanyId,
            p_customer_type: cleanData.customer_type || data.customer_type,
          }
        );
        if (codeError) throw codeError;
        if (!generatedCode) throw new Error('فشل في توليد كود العميل');
        cleanData.customer_code = generatedCode;
      }

      const { data: insertData, error } = await supabase
        .from('customers')
        .insert(cleanData)
        .select()
        .single();
      if (error) {
        if (error.code === '23505') {
          if (error.message.includes('national_id')) {
            throw new Error('يوجد عميل آخر بنفس رقم البطاقة المدنية');
          }
          if (error.message.includes('passport')) {
            throw new Error('يوجد عميل آخر بنفس رقم الجواز');
          }
          if (error.message.includes('phone')) {
            throw new Error('يوجد عميل آخر بنفس رقم الهاتف');
          }
          if (error.message.includes('email')) {
            throw new Error('يوجد عميل آخر بنفس البريد الإلكتروني');
          }
          throw new Error('البيانات المدخلة موجودة مسبقًا في النظام');
        }
        throw error;
      }

      let autoAccountCreationError: string | null = null;
      try {
        const { data: companySettings, error: settingsError } = await supabase
          .from('companies')
          .select('customer_account_settings')
          .eq('id', targetCompanyId)
          .single();
        if (settingsError) throw settingsError;

        const settings = isRecord(companySettings?.customer_account_settings)
          ? companySettings.customer_account_settings
          : null;
        if (settings?.auto_create_account === true) {
          const { data: accountsCreated, error: autoCreateError } = await supabase.rpc(
            'auto_create_customer_accounts',
            {
              company_id_param: targetCompanyId,
              customer_id_param: insertData.id,
            }
          );
          if (autoCreateError) throw autoCreateError;
          if (Number(accountsCreated || 0) === 0) {
            autoAccountCreationError =
              'لم يتم إنشاء أي حسابات تلقائيًا. تحقق من إعدادات ربط الحسابات.';
          }
        }
      } catch (accountError) {
        autoAccountCreationError =
          accountError instanceof Error
            ? accountError.message
            : 'فشل إنشاء الحسابات المحاسبية تلقائيًا';
      }

      return { ...insertData, _autoAccountCreationError: autoAccountCreationError };
    },
    onSuccess: async (customerData) => {
      queryClient.setQueryData(['customer', customerData.id], customerData);
      await queryClient.invalidateQueries({
        queryKey: ['customers'],
        exact: false,
        refetchType: 'active',
      });

      if (customerData._autoAccountCreationError) {
        toast.success('تم إنشاء العميل بنجاح', {
          description: `تعذر إكمال الحسابات المحاسبية: ${customerData._autoAccountCreationError}`,
          duration: 8000,
        });
      } else {
        toast.success('تم إنشاء العميل بنجاح');
      }
    },
    onError: (error: unknown) => {
      console.error('Error creating customer:', error);
      toast.error(error instanceof Error ? error.message : 'فشل إنشاء العميل');
    },
  });
};
export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CustomerFormData> }) => {
      if (!companyId) {
        throw new Error("No company access available");
      }

      // Clean data by removing undefined values
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined)
      ) as CustomerUpdate;

      const { data: existingCustomer, error: fetchError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .single();

      if (fetchError) throw fetchError;

      const customerDataIssues = getCustomerDataIssues({
        ...existingCustomer,
        ...cleanData,
      });

      if (customerDataIssues.length > 0) {
        throw new Error(`استكمل بيانات العميل أولاً: ${customerDataIssues.join('، ')}`);
      }

      // إضافة التحقق من صلاحية الوثائق قبل التحديث
      const today = new Date().toISOString().split('T')[0];
      
      if (cleanData.national_id_expiry && cleanData.national_id_expiry < today) {
        throw new Error('البطاقة المدنية منتهية الصلاحية. يجب تجديدها قبل تحديث العميل');
      }
      
      if (cleanData.license_expiry && cleanData.license_expiry < today) {
        throw new Error('رخصة القيادة منتهية الصلاحية. يجب تجديدها قبل تحديث العميل');
      }

      const { error } = await supabase
        .from('customers')
        .update(cleanData)
        .eq('id', id)
        .eq('company_id', companyId);

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

export const useCustomerNotes = (customerId: string, options?: { enabled?: boolean }) => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['customer-notes'], [customerId]),
    queryFn: async () => {
      if (!companyId || !customerId) return [];

      const { data, error } = await supabase
        .from('customer_notes')
        .select('*')
        .eq('customer_id', customerId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: options?.enabled !== false && !!companyId && !!customerId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
  });
};

export const useCreateCustomerNote = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async ({ customerId, content, noteData }: { 
      customerId: string; 
      content?: string;
      noteData?: CustomerNoteInput; 
    }) => {
      if (!companyId) {
        throw new Error("No company access available");
      }

      const insertData: CustomerNoteInsert = noteData ? {
        customer_id: customerId,
        title: noteData.title || 'ملاحظة',
        content: noteData.content || content || '',
        note_type: noteData.note_type || 'general',
        is_important: noteData.is_important || false,
        company_id: companyId
      } : {
        customer_id: customerId,
        content: content || '',
        title: 'ملاحظة',
        company_id: companyId
      };

      const { error } = await supabase
        .from('customer_notes')
        .insert(insertData);

      if (error) throw error;
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

export const useCustomerFinancialSummary = (customerId: string, options?: { enabled?: boolean }) => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['customer-financial-summary'], [customerId]),
    queryFn: async () => {
      if (!companyId || !customerId) return null;

      const [customerResult, contractsResult, invoicesResult, paymentsResult] = await Promise.all([
        supabase
          .from('customers')
          .select('credit_limit')
          .eq('id', customerId)
          .eq('company_id', companyId)
          .single(),
        supabase
          .from('contracts')
          .select('id, status')
          .eq('customer_id', customerId)
          .eq('company_id', companyId),
        supabase
          .from('invoices')
          .select('total_amount, paid_amount, balance_due, payment_status, status')
          .eq('customer_id', customerId)
          .eq('company_id', companyId),
        supabase
          .from('payments')
          .select('amount, amount_paid, payment_date, payment_status, transaction_type')
          .eq('customer_id', customerId)
          .eq('company_id', companyId),
      ]);
      const failed = [customerResult, contractsResult, invoicesResult, paymentsResult].find(
        (result) => result.error
      );
      if (failed?.error) throw failed.error;

      const contracts = contractsResult.data || [];
      const invoices = (invoicesResult.data || []).filter(
        (invoice) => invoice.status !== 'cancelled'
      );
      const completedReceipts = (paymentsResult.data || []).filter(
        (payment) =>
          payment.transaction_type === 'receipt' &&
          ['completed', 'paid'].includes(payment.payment_status)
      );
      const totalPayments = completedReceipts.reduce(
        (sum, payment) => sum + Number(payment.amount_paid ?? payment.amount ?? 0),
        0
      );
      const totalInvoices = invoices.reduce(
        (sum, invoice) => sum + Number(invoice.total_amount || 0),
        0
      );
      const totalInvoicesPaid = invoices.reduce(
        (sum, invoice) => sum + Number(invoice.paid_amount || 0),
        0
      );
      const totalInvoicesOutstanding = invoices.reduce(
        (sum, invoice) =>
          sum +
          Number(
            invoice.balance_due ??
              Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0))
          ),
        0
      );
      const lastPaymentDate =
        completedReceipts
          .map((payment) => payment.payment_date)
          .filter(Boolean)
          .sort()
          .at(-1) || null;

      return {
        totalRevenue: totalPayments,
        outstandingBalance: totalInvoicesOutstanding,
        creditLimit: Number(customerResult.data?.credit_limit || 0),
        lastPaymentDate,
        currentBalance: totalInvoicesOutstanding,
        totalContracts: contracts.length,
        totalPayments,
        totalInvoices,
        invoicesCount: invoices.length,
        totalInvoicesOutstanding,
        activeContracts: contracts.filter((contract) => contract.status === 'active').length,
        contractsCount: contracts.length,
        totalInvoicesPaid,
      };
    },
    enabled: options?.enabled !== false && !!companyId && !!customerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000,   // 15 minutes
  });
};

export const useCustomerDiagnostics = () => {
  const { companyId, user } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['customer-diagnostics'],
    queryFn: async () => {
      if (!user) return null;

      return {
        userInfo: {
          id: user.id,
          email: user.email,
          roles: user.roles || [],
          hasProfile: !!user.company,
          profileCompanyId: user.company?.id,
          userCompanyId: user.company?.id
        },
        permissions: {
          isSuperAdmin: user.roles?.includes('super_admin') || false,
          isCompanyAdmin: user.roles?.includes('company_admin') || false,
          isManager: user.roles?.includes('manager') || false,
          isSalesAgent: user.roles?.includes('sales_agent') || false,
          companyId,
          canCreateCustomers: user.roles?.some(role => 
            ['super_admin', 'company_admin', 'manager', 'sales_agent'].includes(role)
          ) || false
        },
        database: {
          companyExists: !!companyId,
          canAccessCustomers: !!companyId,
          canInsertCustomers: !!companyId,
          error: null
        },
        companyId,
        timestamp: new Date().toISOString()
      };
    },
    enabled: !!user,
    staleTime: 30 * 1000 // 30 seconds
  });
};

// Alias for backwards compatibility
export const useCustomer = useCustomerById;
