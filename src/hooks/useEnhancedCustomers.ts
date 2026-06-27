import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { toast } from 'sonner';
import { Customer, CustomerFilters } from '@/types/customer';
import { useCustomerViewContext } from '@/contexts/CustomerViewContext';

export type EnhancedCustomer = Customer;

// Optimized hook for fetching customer counts only (no data)
export const useCustomerCount = (filters?: CustomerFilters, options?: { enabled?: boolean }) => {
  const { companyId, getQueryKey, isSystemLevel, hasGlobalAccess, filter, getFilterForOwnCompany, getFilterForGlobalView } = useUnifiedCompanyAccess();
  
  // Use customer view context with fallback
  let viewAllCustomers = false;
  try {
    const context = useCustomerViewContext();
    viewAllCustomers = context.viewAllCustomers;
  } catch (error) {
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
        return 0;
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
  const { companyId, getQueryKey, validateCompanyAccess, browsedCompany, isBrowsingMode, isSystemLevel, hasGlobalAccess, filter, getFilterForOwnCompany, getFilterForGlobalView } = useUnifiedCompanyAccess();
  
  // Use customer view context with fallback
  let viewAllCustomers = false;
  try {
    const context = useCustomerViewContext();
    viewAllCustomers = context.viewAllCustomers;
  } catch (error) {
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
        data: filteredData,
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
  } catch (error) {
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
      
      return data;
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
      console.log('🗑️ Starting delete process for customer:', customerId);
      
      if (!companyId) {
        throw new Error("No company access available");
      }

      try {
        // حذف البيانات المرتبطة بالعميل بالترتيب الصحيح
        
        // 1. أولاً احصل على معرفات العقود المرتبطة بالعميل
        console.log('🗑️ Getting related contract IDs...');
        const { data: contractIds, error: contractIdsError } = await supabase
          .from('contracts')
          .select('id')
          .eq('customer_id', customerId)
          .eq('company_id', companyId);
        
        if (contractIdsError) {
          console.error('Error getting contract IDs:', contractIdsError);
        }

        // 2. احصل على معرفات الفواتير المرتبطة بالعميل
        console.log('🗑️ Getting related invoice IDs...');
        const { data: invoiceIds, error: invoiceIdsError } = await supabase
          .from('invoices')
          .select('id')
          .eq('customer_id', customerId)
          .eq('company_id', companyId);
        
        if (invoiceIdsError) {
          console.error('Error getting invoice IDs:', invoiceIdsError);
        }

        // 3. حذف جداول الدفع للعقود
        if (contractIds && contractIds.length > 0) {
          console.log('🗑️ Deleting payment schedules...');
          const contractIdList = contractIds.map(c => c.id);
          const { error: paymentSchedulesError } = await supabase
            .from('contract_payment_schedules')
            .delete()
            .in('contract_id', contractIdList);
          
          if (paymentSchedulesError) {
            console.error('Error deleting payment schedules:', paymentSchedulesError);
          }
        }

        // 4. حذف عناصر الفواتير
        if (invoiceIds && invoiceIds.length > 0) {
          console.log('🗑️ Deleting invoice items...');
          const invoiceIdList = invoiceIds.map(i => i.id);
          const { error: invoiceItemsError } = await supabase
            .from('invoice_items')
            .delete()
            .in('invoice_id', invoiceIdList);
          
          if (invoiceItemsError) {
            console.error('Error deleting invoice items:', invoiceItemsError);
          }
        }

        // 5. حذف المدفوعات المرتبطة بالعميل
        const { count: relatedPaymentsCount, error: paymentsCheckError } = await supabase
          .from('payments')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', customerId)
          .eq('company_id', companyId);

        if (paymentsCheckError) {
          throw paymentsCheckError;
        }

        if ((relatedPaymentsCount || 0) > 0) {
          throw new Error('Cannot permanently delete a customer with recorded payments. Archive or deactivate the customer to preserve the financial audit trail.');
        }

        console.log('🗑️ Deleting invoices...');
        const { error: invoicesError } = await supabase
          .from('invoices')
          .delete()
          .eq('customer_id', customerId)
          .eq('company_id', companyId);
        
        if (invoicesError) {
          console.error('Error deleting invoices:', invoicesError);
        }

        // 7. حذف عروض الأسعار المرتبطة بالعميل
        console.log('🗑️ Deleting quotations...');
        const { error: quotationsError } = await supabase
          .from('quotations')
          .delete()
          .eq('customer_id', customerId)
          .eq('company_id', companyId);
        
        if (quotationsError) {
          console.error('Error deleting quotations:', quotationsError);
        }

        // 8. حذف العقود
        console.log('🗑️ Deleting contracts...');
        const { error: contractsError } = await supabase
          .from('contracts')
          .delete()
          .eq('customer_id', customerId)
          .eq('company_id', companyId);
        
        if (contractsError) {
          console.error('Error deleting contracts:', contractsError);
        }

        // 9. حذف الملاحظات المرتبطة بالعميل
        console.log('🗑️ Deleting customer notes...');
        const { error: notesError } = await supabase
          .from('customer_notes')
          .delete()
          .eq('customer_id', customerId)
          .eq('company_id', companyId);

        if (notesError) {
          console.error('Error deleting notes:', notesError);
        }

        // 10. حذف العميل نفسه
        console.log('🗑️ Deleting customer...');
        const { error: customerError } = await supabase
          .from('customers')
          .delete()
          .eq('id', customerId)
          .eq('company_id', companyId);

        if (customerError) {
          console.error('Error deleting customer:', customerError);
          throw customerError;
        }

        console.log('✅ Customer deleted successfully');
        return { success: true };
        
      } catch (error) {
        console.error('❌ Error in delete process:', error);
        throw error;
      }
    },
    onSuccess: async () => {
      console.log('✅ Customer deletion successful, updating cache');
      
      // استخدام invalidateQueries للحصول على تحديث فوري
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['customers'] }),
        queryClient.invalidateQueries({ queryKey: ['contracts'] }),
        queryClient.invalidateQueries({ queryKey: ['invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['payments'] }),
        queryClient.invalidateQueries({ queryKey: ['quotations'] })
      ]);
      
      toast.success('تم حذف العميل وجميع البيانات المرتبطة به بنجاح');
    },
    onError: (error) => {
      console.error('Error deleting customer:', error);
      toast.error('حدث خطأ أثناء حذف العميل: ' + error.message);
    }
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  const { companyId, validateCompanyAccess } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async (data: unknown) => {
      const targetCompanyId = data.selectedCompanyId || companyId;
      
      if (!targetCompanyId) {
        throw new Error("No company access available");
      }

      validateCompanyAccess(targetCompanyId);

      // إضافة التحقق من صلاحية الوثائق قبل الحفظ
      const today = new Date().toISOString().split('T')[0];
      
      if (data.national_id_expiry && data.national_id_expiry < today) {
        throw new Error('البطاقة المدنية منتهية الصلاحية. يجب تجديدها قبل تسجيل العميل');
      }
      
      if (data.license_expiry && data.license_expiry < today) {
        throw new Error('رخصة القيادة منتهية الصلاحية. يجب تجديدها قبل تسجيل العميل');
      }

      // التحقق من تكرار العملاء قبل الإنشاء
      const { data: duplicateCheck, error: duplicateError } = await supabase.rpc('check_duplicate_customer', {
        p_company_id: targetCompanyId,
        p_customer_type: data.customer_type,
        p_national_id: data.national_id || null,
        p_passport_number: data.passport_number || null,
        p_phone: data.phone || null,
        p_email: data.email || null,
        p_company_name: data.company_name || null,
        p_commercial_register: null
      });

      if (duplicateError) {
        console.error('Error checking duplicates:', duplicateError);
        throw duplicateError;
      }

      const typedDuplicateCheck = duplicateCheck as unknown as { has_duplicates: boolean; duplicates: any[] };
      if (typedDuplicateCheck?.has_duplicates && !data.force_create) {
        const duplicateInfo = typedDuplicateCheck.duplicates.map((dup: unknown) => 
          `${dup.name} (${dup.duplicate_field}: ${dup.duplicate_value})`
        ).join(', ');
        throw new Error(`يوجد عميل مشابه في النظام: ${duplicateInfo}`);
      }

      // إزالة الحقول غير الموجودة في جدول customers
      const cleanData = { ...data };
      delete cleanData.commercial_register;
      delete cleanData.base_currency;
      delete cleanData.accounts;
      delete cleanData.selectedCompanyId;
      delete cleanData.force_create;

      // توليد كود العميل إذا لم يكن موجوداً
      if (!cleanData.customer_code) {
        const { data: generatedCode, error: codeError } = await supabase.rpc('generate_customer_code', {
          p_company_id: targetCompanyId,
          p_customer_type: cleanData.customer_type
        });

        if (codeError) {
          console.error('Error generating customer code:', codeError);
          throw new Error('فشل في توليد كود العميل');
        }

        cleanData.customer_code = generatedCode;
      }

      console.log('🔍 Creating customer with data:', cleanData);
      
      const { data: insertData, error } = await supabase
        .from('customers')
        .insert({
          ...cleanData,
          company_id: targetCompanyId,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        // التحقق من خطأ القيود الفريدة
        if (error.code === '23505') {
          if (error.message.includes('national_id')) {
            throw new Error('يوجد عميل آخر بنفس رقم البطاقة المدنية');
          } else if (error.message.includes('passport')) {
            throw new Error('يوجد عميل آخر بنفس رقم الجواز');
          } else if (error.message.includes('phone')) {
            throw new Error('يوجد عميل آخر بنفس رقم الهاتف');
          } else if (error.message.includes('email')) {
            throw new Error('يوجد عميل آخر بنفس البريد الإلكتروني');
          } else if (error.message.includes('business')) {
            throw new Error('يوجد شركة أخرى بنفس الاسم والسجل التجاري');
          } else {
            throw new Error('البيانات المدخلة موجودة مسبقاً في النظام');
          }
        }
        throw error;
      }

      // التحقق من إعدادات إنشاء الحسابات التلقائية
      let autoAccountCreationError: string | null = null;
      try {
        console.log('🔍 [useCreateCustomer] Checking company auto-account settings...');
        
        const { data: companySettings, error: settingsError } = await supabase
          .from('companies')
          .select('customer_account_settings')
          .eq('id', targetCompanyId)
          .single();

        if (settingsError) {
          console.warn('⚠️ [useCreateCustomer] Error fetching company settings:', settingsError);
          autoAccountCreationError = 'فشل في جلب إعدادات الشركة';
        } else if (companySettings?.customer_account_settings) {
          const settings = companySettings.customer_account_settings as any;
          console.log('⚙️ [useCreateCustomer] Company settings found:', settings);
          
          // إذا كان الإنشاء التلقائي مفعلاً، قم بإنشاء الحسابات
          if (settings.auto_create_account) {
            console.log('🔄 [useCreateCustomer] Auto-creating customer accounts...');
            
            const { data: accountsCreated, error: autoCreateError } = await supabase.rpc('auto_create_customer_accounts', {
              company_id_param: targetCompanyId,
              customer_id_param: insertData.id,
            });

            if (autoCreateError) {
              console.error('💥 [useCreateCustomer] Error auto-creating customer accounts:', autoCreateError);
              autoAccountCreationError = `فشل في إنشاء الحسابات تلقائياً: ${autoCreateError.message || autoCreateError}`;
              console.warn('⚠️ [useCreateCustomer] Customer created successfully but auto-account creation failed');
            } else {
              console.log(`✅ [useCreateCustomer] Auto-created ${accountsCreated || 0} customer accounts`);
              if (accountsCreated === 0) {
                autoAccountCreationError = 'لم يتم إنشاء أي حسابات تلقائياً - تحقق من إعدادات الحسابات';
              }
            }
          } else {
            console.log('ℹ️ [useCreateCustomer] Auto-create account is disabled');
            autoAccountCreationError = 'الإنشاء التلقائي للحسابات معطل في إعدادات الشركة';
          }
        } else {
          console.log('ℹ️ [useCreateCustomer] No customer account settings found');
          autoAccountCreationError = 'لم يتم العثور على إعدادات الحسابات للشركة';
        }
      } catch (autoAccountError) {
        console.error('💥 [useCreateCustomer] Error in auto-account creation process:', autoAccountError);
        autoAccountCreationError = `خطأ في عملية إنشاء الحسابات: ${autoAccountError.message || autoAccountError}`;
      }

      // إضافة معلومات عن حالة إنشاء الحسابات إلى البيانات المُرجعة
      return {
        ...insertData,
        _autoAccountCreationError: autoAccountCreationError
      };
    },
    onSuccess: (customerData) => {
      console.log('🎉 [useCreateCustomer] onSuccess called with:', customerData);
      
      // Get all customer queries to update them properly
      const allCustomerQueries = queryClient.getQueriesData({ 
        queryKey: ['customers'], 
        exact: false 
      });
      
      console.log('🔄 [useCreateCustomer] Found customer queries to update:', allCustomerQueries.length);
      
      // Update all matching customer query caches immediately
      allCustomerQueries.forEach(([queryKey, oldData]) => {
        if (Array.isArray(oldData)) {
          const exists = oldData.some((customer: unknown) => customer.id === customerData.id);
          if (!exists) {
            console.log('🔄 [useCreateCustomer] Updating cache for query:', queryKey);
            queryClient.setQueryData(queryKey, [customerData, ...oldData]);
          }
        }
      });
      
      // Also update individual customer cache
      queryClient.setQueryData(['customer', customerData.id], customerData);
      
      // Trigger immediate invalidation for all customer queries
      queryClient.invalidateQueries({ 
        queryKey: ['customers'], 
        exact: false,
        refetchType: 'active' 
      });
      
      // Mark that manual update happened to coordinate with real-time
      (queryClient as any)._lastCustomerUpdate = Date.now();
      
      // إظهار رسالة نجاح مع تحذير إذا فشل إنشاء الحسابات
      const hasAccountError = (customerData as any)?._autoAccountCreationError;
      if (hasAccountError) {
        toast.success('تم إنشاء العميل بنجاح', {
          description: `لكن حدث خطأ في إنشاء الحسابات: ${hasAccountError}`,
          duration: 8000,
        });
      } else {
        toast.success('تم إنشاء العميل بنجاح مع الحسابات المحاسبية');
      }
      
      console.log('🔄 [useCreateCustomer] Cache updated and queries refreshed');
      
      return customerData;
    },
    onError: (error) => {
      console.error('💥 [useCreateCustomer] onError called with:', {
        error,
        message: error.message,
        stack: error.stack
      });
      toast.error(error.message || 'حدث خطأ أثناء إنشاء العميل');
    }
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();
  const { companyId, validateCompanyAccess } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: unknown }) => {
      if (!companyId) {
        throw new Error("No company access available");
      }

      // Clean data by removing undefined values
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== undefined)
      );

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
      noteData?: any; 
    }) => {
      if (!companyId) {
        throw new Error("No company access available");
      }

      const insertData = noteData ? {
        customer_id: customerId,
        title: noteData.title || 'ملاحظة',
        content: noteData.content || content,
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

      // Enhanced placeholder with required properties
      return {
        totalRevenue: 0,
        outstandingBalance: 0,
        creditLimit: 0,
        lastPaymentDate: null,
        currentBalance: 0,
        totalContracts: 0,
        totalPayments: 0,
        totalInvoices: 0,
        invoicesCount: 0,
        totalInvoicesOutstanding: 0,
        activeContracts: 0,
        contractsCount: 0,
        totalInvoicesPaid: 0
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
