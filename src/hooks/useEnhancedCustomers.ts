import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { toast } from 'sonner';
import { Customer, CustomerFilters } from '@/types/customer';

export type EnhancedCustomer = Customer;

export const useCustomers = (filters?: CustomerFilters) => {
  const { companyId, getQueryKey, validateCompanyAccess, browsedCompany, isBrowsingMode } = useUnifiedCompanyAccess();
  const { 
    includeInactive = false, 
    searchTerm, 
    search,
    limit,
    customer_type,
    is_blacklisted 
  } = filters || {};
  
  // Debug logging for company context
  console.log('🏢 [useCustomers] Company context:', {
    companyId,
    isBrowsingMode,
    browsedCompany: browsedCompany ? { id: browsedCompany.id, name: browsedCompany.name } : null,
    filters
  });
  
  return useQuery({
    queryKey: getQueryKey(['customers'], [includeInactive, searchTerm, search, limit, customer_type, is_blacklisted]),
    queryFn: async (): Promise<EnhancedCustomer[]> => {
      if (!companyId) {
        throw new Error("No company access available");
      }
      
      let query = supabase
        .from('customers')
        .select('*')
        .eq('company_id', companyId);
      
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }
      
      if (customer_type) {
        query = query.eq('customer_type', customer_type);
      }

      if (is_blacklisted !== undefined) {
        query = query.eq('is_blacklisted', is_blacklisted);
      }
      
      const searchText = searchTerm || search;
      if (searchText) {
        query = query.or(
          `first_name.ilike.%${searchText}%,` +
          `last_name.ilike.%${searchText}%,` +
          `company_name.ilike.%${searchText}%,` +
          `phone.ilike.%${searchText}%,` +
          `email.ilike.%${searchText}%`
        );
      }
      
      if (limit) {
        query = query.limit(limit);
      }
      
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching customers:', error);
        throw error;
      }
      
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  });
};

export const useCustomerById = (customerId: string) => {
  const { companyId, getQueryKey, browsedCompany, isBrowsingMode } = useUnifiedCompanyAccess();
  
  // Debug logging for company context
  console.log('🏢 [useCustomerById] Company context:', {
    customerId,
    companyId,
    isBrowsingMode,
    browsedCompany: browsedCompany ? { id: browsedCompany.id, name: browsedCompany.name } : null
  });
  
  return useQuery({
    queryKey: getQueryKey(['customer'], [customerId]),
    queryFn: async (): Promise<EnhancedCustomer | null> => {
      if (!companyId || !customerId) return null;
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('company_id', companyId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('Error fetching customer:', error);
        throw error;
      }
      
      return data;
    },
    enabled: !!companyId && !!customerId,
    staleTime: 5 * 60 * 1000 // 5 minutes
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

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  const { companyId, validateCompanyAccess } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async (data: any) => {
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

      const { error } = await supabase
        .from('customers')
        .insert({
          ...data,
          company_id: targetCompanyId,
          is_active: true
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('تم إنشاء العميل بنجاح');
    },
    onError: (error) => {
      console.error('Error creating customer:', error);
      toast.error('حدث خطأ أثناء إنشاء العميل');
    }
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();
  const { companyId, validateCompanyAccess } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
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

export const useCustomerNotes = (customerId: string) => {
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
    enabled: !!companyId && !!customerId,
    staleTime: 2 * 60 * 1000 // 2 minutes
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

export const useCustomerFinancialSummary = (customerId: string) => {
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
    enabled: !!companyId && !!customerId,
    staleTime: 5 * 60 * 1000 // 5 minutes
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