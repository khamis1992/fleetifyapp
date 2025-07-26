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

export interface CustomerNote {
  id: string;
  company_id: string;
  customer_id: string;
  note_type: string;
  title: string;
  content: string;
  is_important: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerAccount {
  id: string;
  company_id: string;
  customer_id: string;
  account_id: string;
  created_at: string;
  updated_at: string;
  account?: {
    id: string;
    account_code: string;
    account_name: string;
    current_balance: number;
  };
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
  address?: string;
  address_ar?: string;
  city?: string;
  country?: string;
  date_of_birth?: string;
  credit_limit?: number;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
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

      // Optimized query without unnecessary JOINs for initial performance
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
            `email.ilike.%${searchTerm}%,` +
            `national_id.ilike.%${searchTerm}%`
          );
        }
      }

      const { data: customers, error } = await query;

      if (error) {
        console.error('Error fetching customers:', error);
        throw error;
      }

      if (!customers || customers.length === 0) {
        return [];
      }

      // Only fetch contract counts if we have customers and it's not a search query
      // This avoids unnecessary queries for empty results or during search
      const shouldFetchContracts = customers.length > 0 && (!filters?.search || filters.search.trim() === '');
      
      if (shouldFetchContracts) {
        const customerIds = customers.map(customer => customer.id);
        
        try {
          const { data: contractCounts } = await supabase
            .from('contracts')
            .select('customer_id')
            .in('customer_id', customerIds);

          // Count contracts per customer
          const contractCountMap = new Map();
          contractCounts?.forEach(contract => {
            const count = contractCountMap.get(contract.customer_id) || 0;
            contractCountMap.set(contract.customer_id, count + 1);
          });

          // Add contract count to each customer
          return customers.map(customer => ({
            ...customer,
            contracts_count: contractCountMap.get(customer.id) || 0
          }));
        } catch (contractError) {
          console.warn('Failed to fetch contract counts, returning customers without counts:', contractError);
          return customers.map(customer => ({
            ...customer,
            contracts_count: 0
          }));
        }
      }

      // For search results, return without contract counts for better performance
      return customers.map(customer => ({
        ...customer,
        contracts_count: 0
      }));
    },
    enabled: !!(user?.profile?.company_id || user?.company?.id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false, // Avoid unnecessary refetches
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
          ),
          customer_notes:customer_notes(
            *
          )
        `)
        .eq('id', customerId)
        .single();

      if (error) {
        console.error('Error fetching customer:', error);
        throw error;
      }

      // Get contracts separately
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select('*')
        .eq('customer_id', customerId);

      if (contractsError) {
        console.error('Error fetching contracts:', contractsError);
      }

      return {
        ...data,
        contracts: contracts || []
      };
    },
    enabled: !!customerId
  });
};

export const useCreateCustomer = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customerData: CustomerFormData & { selectedCompanyId?: string }) => {
      const isSuperAdmin = user?.roles?.includes('super_admin');
      let company_id;
      
      if (isSuperAdmin && customerData.selectedCompanyId) {
        // Super Admin can select any company
        company_id = customerData.selectedCompanyId;
      } else {
        // Regular users use their company
        company_id = user?.profile?.company_id || user?.company?.id;
      }

      if (!company_id) {
        throw new Error('لا يمكن تحديد الشركة. يرجى التأكد من اختيار شركة صحيحة.');
      }

      const { selectedCompanyId, ...customerDataWithoutCompany } = customerData;
      
      const { data, error } = await supabase
        .from('customers')
        .insert([{
          ...customerDataWithoutCompany,
          company_id
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('تم إضافة العميل بنجاح');
    },
    onError: (error) => {
      console.error('Error creating customer:', error);
      toast.error('حدث خطأ أثناء إضافة العميل');
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
      queryClient.invalidateQueries({ queryKey: ['customer'] });
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
      queryClient.invalidateQueries({ queryKey: ['customer'] });
      toast.success(variables.isBlacklisted ? 'تم إضافة العميل للقائمة السوداء' : 'تم إزالة العميل من القائمة السوداء');
    },
    onError: (error) => {
      console.error('Error toggling customer blacklist:', error);
      toast.error('حدث خطأ أثناء تحديث حالة العميل');
    }
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
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      customerId, 
      noteData 
    }: { 
      customerId: string; 
      noteData: {
        note_type?: string;
        title: string;
        content: string;
        is_important?: boolean;
      }
    }) => {
      const { data, error } = await supabase
        .from('customer_notes')
        .insert([{
          customer_id: customerId,
          company_id: user?.profile?.company_id || user?.company?.id,
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
      queryClient.invalidateQueries({ queryKey: ['customer', variables.customerId] });
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
      // Get customer account balance
      const { data: customerAccount, error: accountError } = await supabase
        .from('customer_accounts')
        .select(`
          account_id,
          chart_of_accounts!inner(current_balance)
        `)
        .eq('customer_id', customerId)
        .single();

      if (accountError && accountError.code !== 'PGRST116') {
        console.error('Error fetching customer account:', accountError);
        throw accountError;
      }

      // Get total contracts amount
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select('contract_amount, status')
        .eq('customer_id', customerId);

      if (contractsError) {
        console.error('Error fetching contracts:', contractsError);
        throw contractsError;
      }

      // Get total payments received
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount')
        .eq('customer_id', customerId)
        .eq('payment_type', 'receipt');

      if (paymentsError) {
        console.error('Error fetching payments:', paymentsError);
        throw paymentsError;
      }

      // Get invoices summary
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('total_amount, paid_amount, balance_due, payment_status')
        .eq('customer_id', customerId);

      if (invoicesError) {
        console.error('Error fetching invoices:', invoicesError);
        throw invoicesError;
      }

      const currentBalance = (customerAccount?.chart_of_accounts as any)?.current_balance || 0;
      const totalContracts = contracts?.reduce((sum, contract) => sum + (contract.contract_amount || 0), 0) || 0;
      const totalPayments = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
      const activeContracts = contracts?.filter(c => c.status === 'active')?.length || 0;
      
      // Calculate invoice totals
      const totalInvoices = invoices?.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0) || 0;
      const totalInvoicesPaid = invoices?.reduce((sum, invoice) => sum + (invoice.paid_amount || 0), 0) || 0;
      const totalInvoicesOutstanding = invoices?.reduce((sum, invoice) => sum + (invoice.balance_due || 0), 0) || 0;
      const invoicesCount = invoices?.length || 0;

      return {
        currentBalance,
        totalContracts,
        totalPayments,
        outstandingBalance: totalContracts - totalPayments,
        activeContracts,
        contractsCount: contracts?.length || 0,
        totalInvoices,
        totalInvoicesPaid,
        totalInvoicesOutstanding,
        invoicesCount
      };
    },
    enabled: !!customerId
  });
};