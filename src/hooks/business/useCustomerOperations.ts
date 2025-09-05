import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerDuplicateCheck } from '@/hooks/useCustomerDuplicateCheck';
import { 
  CreateCustomerData, 
  UpdateCustomerData,
  createCustomerSchema,
  updateCustomerSchema 
} from '@/schemas/customer.schema';

export interface CustomerOperationsOptions {
  enableDuplicateCheck?: boolean;
  autoCreateAccounts?: boolean;
  sendWelcomeEmail?: boolean;
}

export const useCustomerOperations = (options: CustomerOperationsOptions = {}) => {
  const { companyId, user } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();

  const {
    enableDuplicateCheck = true,
    autoCreateAccounts = true,
    sendWelcomeEmail = false
  } = options;

  // Create customer operation
  const createCustomer = useMutation({
    mutationFn: async (data: CreateCustomerData) => {
      console.log('🚀 [useCustomerOperations] Starting customer creation:', data);

      // Validate input data
      const validatedData = createCustomerSchema.parse(data);

      // Check for duplicates if enabled
      if (enableDuplicateCheck && !validatedData.force_create) {
        const duplicateCheck = await checkForDuplicates(validatedData);
        if (duplicateCheck.has_duplicates) {
        const duplicateNames = duplicateCheck.duplicates.map(d => 
          d.customer_type === 'individual' ? `${d.first_name} ${d.last_name}` : d.company_name
        ).join(', ');
        throw new Error(`يوجد عميل مشابه في النظام: ${duplicateNames}`);
        }
      }

      // Prepare data for database insertion
      const customerData = {
        customer_type: validatedData.customer_type,
        first_name: validatedData.first_name,
        last_name: validatedData.last_name,
        company_name: validatedData.company_name,
        phone: validatedData.phone,
        email: validatedData.email,
        national_id: validatedData.national_id,
        passport_number: validatedData.passport_number,
        license_number: validatedData.license_number,
        credit_limit: validatedData.credit_limit,
        notes: validatedData.notes,
        company_id: companyId,
        created_by: user?.id,
        customer_code: validatedData.customer_code || await generateCustomerCode(),
        // Convert dates to ISO strings for database
        date_of_birth: validatedData.date_of_birth ? validatedData.date_of_birth.toISOString().split('T')[0] : undefined,
        license_expiry: validatedData.license_expiry ? validatedData.license_expiry.toISOString().split('T')[0] : undefined,
        national_id_expiry: validatedData.national_id_expiry ? validatedData.national_id_expiry.toISOString().split('T')[0] : undefined,
      };

      // Insert customer
      const { data: insertedCustomer, error } = await supabase
        .from('customers')
        .insert(customerData)
        .select()
        .single();

      if (error) {
        console.error('❌ [useCustomerOperations] Database error:', error);
        throw error;
      }

      console.log('✅ [useCustomerOperations] Customer created successfully:', insertedCustomer);

      // Post-creation operations
      if (autoCreateAccounts && insertedCustomer.id) {
        await createCustomerAccounts(insertedCustomer.id);
      }

      if (sendWelcomeEmail && insertedCustomer.email) {
        await sendWelcomeEmailToCustomer(insertedCustomer);
      }

      return insertedCustomer;
    },
    onSuccess: (customer) => {
      console.log('✅ Customer creation successful:', customer.id);
      
      // Immediate cache update - add new customer to existing list
      queryClient.setQueriesData(
        { queryKey: ['customers'] },
        (oldData: any) => {
          if (!oldData) return [customer];
          
          // Check if customer already exists to avoid duplicates
          const exists = oldData.some((c: any) => c.id === customer.id);
          if (exists) return oldData;
          
          // Add new customer at the beginning of the list
          console.log('📋 Cache: Adding new customer to list', customer.id);
          return [customer, ...oldData];
        }
      );
      
      // Set individual customer cache
      queryClient.setQueryData(['customer', customer.id], customer);
      
      // Force a background refetch to ensure data consistency
      setTimeout(() => {
        queryClient.refetchQueries({ 
          queryKey: ['customers'],
          type: 'active'
        });
      }, 100);
      
      toast.success('تم إنشاء العميل بنجاح');
    },
    onError: (error: any) => {
      console.error('💥 [useCustomerOperations] Create customer error:', error);
      toast.error(error.message || 'حدث خطأ أثناء إنشاء العميل');
    }
  });

  // Update customer operation
  const updateCustomer = useMutation({
    mutationFn: async (data: UpdateCustomerData) => {
      console.log('🔄 [useCustomerOperations] Starting customer update:', data);

      // Validate input data
      const validatedData = updateCustomerSchema.parse(data);

      // Check if customer exists and user has permission
      const { data: existingCustomer, error: fetchError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', validatedData.id)
        .eq('company_id', companyId)
        .single();

      if (fetchError || !existingCustomer) {
        throw new Error('العميل غير موجود أو لا تملك صلاحية للتعديل');
      }

      // Prepare update data
      const updateData = {
        ...validatedData,
        updated_at: new Date().toISOString(),
        updated_by: user?.id,
        // Convert dates to ISO strings for database
        date_of_birth: validatedData.date_of_birth ? validatedData.date_of_birth.toISOString().split('T')[0] : undefined,
        license_expiry: validatedData.license_expiry ? validatedData.license_expiry.toISOString().split('T')[0] : undefined,
        national_id_expiry: validatedData.national_id_expiry ? validatedData.national_id_expiry.toISOString().split('T')[0] : undefined,
      };

      // Remove ID from update data
      const { id: customerId, ...dataToUpdate } = updateData;

      // Update customer
      const { data: updatedCustomer, error } = await supabase
        .from('customers')
        .update(dataToUpdate)
        .eq('id', customerId)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) {
        console.error('❌ [useCustomerOperations] Update error:', error);
        throw error;
      }

      console.log('✅ [useCustomerOperations] Customer updated successfully:', updatedCustomer);
      return updatedCustomer;
    },
    onSuccess: (customer) => {
      console.log('✅ Customer update successful:', customer.id);
      
      // Immediate cache update - update customer in existing list
      queryClient.setQueriesData(
        { queryKey: ['customers'] },
        (oldData: any) => {
          if (!oldData) return oldData;
          
          return oldData.map((c: any) => 
            c.id === customer.id ? { ...c, ...customer } : c
          );
        }
      );
      
      // Update individual customer cache
      queryClient.setQueryData(['customer', customer.id], customer);
      
      // Force background refetch for consistency
      setTimeout(() => {
        queryClient.refetchQueries({ 
          queryKey: ['customers'],
          type: 'active'
        });
      }, 100);
      
      toast.success('تم تحديث العميل بنجاح');
    },
    onError: (error: any) => {
      console.error('💥 [useCustomerOperations] Update customer error:', error);
      toast.error(error.message || 'حدث خطأ أثناء تحديث العميل');
    }
  });

  // Delete customer operation using optimized function
  const deleteCustomer = useMutation({
    mutationFn: async (customerId: string) => {
      console.log('🗑️ [useCustomerOperations] Starting optimized customer deletion:', customerId);

      // Get customer data for the optimized delete function
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('company_id', companyId)
        .single();

      if (customerError || !customer) {
        throw new Error('العميل غير موجود');
      }

      // Use the enhanced database function for fast deletion
      const { data, error } = await supabase.rpc('enhanced_delete_customer_and_relations', {
        target_customer_id: customerId,
        target_company_id: companyId
      });

      if (error) {
        console.error('❌ [useCustomerOperations] Database error:', error);
        throw new Error(`خطأ في حذف العميل: ${error.message}`);
      }

      const result = data as any;
      if (!result?.success) {
        console.error('❌ [useCustomerOperations] Function error:', result?.error);
        throw new Error(result?.error || 'فشل في حذف العميل');
      }

      console.log('✅ [useCustomerOperations] Customer deleted successfully:', result);
      return result;
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      
      toast.success('تم حذف العميل بنجاح');
    },
    onError: (error: any) => {
      console.error('💥 [useCustomerOperations] Delete customer error:', error);
      toast.error(error.message || 'حدث خطأ أثناء حذف العميل');
    }
  });

  // Toggle blacklist operation
  const toggleBlacklist = useMutation({
    mutationFn: async ({ customerId, isBlacklisted, reason }: { 
      customerId: string; 
      isBlacklisted: boolean; 
      reason?: string; 
    }) => {
      console.log('🔒 [useCustomerOperations] Toggling blacklist:', { customerId, isBlacklisted, reason });

      const { error } = await supabase
        .from('customers')
        .update({
          is_blacklisted: isBlacklisted,
          blacklist_reason: reason,
          blacklisted_at: isBlacklisted ? new Date().toISOString() : null,
          blacklisted_by: isBlacklisted ? user?.id : null,
        })
        .eq('id', customerId)
        .eq('company_id', companyId);

      if (error) {
        console.error('❌ [useCustomerOperations] Blacklist toggle error:', error);
        throw error;
      }

      return { customerId, isBlacklisted };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', data.customerId] });
      
      toast.success(data.isBlacklisted ? 'تم حظر العميل' : 'تم إلغاء حظر العميل');
    },
    onError: (error: any) => {
      console.error('💥 [useCustomerOperations] Toggle blacklist error:', error);
      toast.error(error.message || 'حدث خطأ أثناء تغيير حالة الحظر');
    }
  });

  // Helper functions
  const checkForDuplicates = async (customerData: CreateCustomerData) => {
    // Simple duplicate check using database query
    const duplicateQuery = supabase
      .from('customers')
      .select('id, first_name, last_name, company_name, customer_type')
      .eq('company_id', companyId);

    if (customerData.national_id) {
      duplicateQuery.eq('national_id', customerData.national_id);
    } else if (customerData.passport_number) {
      duplicateQuery.eq('passport_number', customerData.passport_number);
    } else if (customerData.phone) {
      duplicateQuery.eq('phone', customerData.phone);
    } else {
      return { has_duplicates: false, duplicates: [] };
    }

    const { data, error } = await duplicateQuery;

    if (error) {
      console.error('Error checking duplicates:', error);
      throw error;
    }

    return {
      has_duplicates: (data && data.length > 0),
      duplicates: data || []
    };
  };

  const generateCustomerCode = async (): Promise<string> => {
    const prefix = 'CUST';
    const year = new Date().getFullYear().toString().slice(-2);
    
    // Get count of existing customers to generate next number
    const { count, error } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    if (error) {
      console.error('Error generating customer code:', error);
      // Fallback to timestamp-based code
      return `${prefix}-${year}-${Date.now().toString().slice(-6)}`;
    }

    const nextNumber = (count || 0) + 1;
    return `${prefix}-${year}-${nextNumber.toString().padStart(3, '0')}`;
  };

  const createCustomerAccounts = async (customerId: string) => {
    try {
      // Create default accounts for the customer using the available function
      const { error } = await supabase.rpc('auto_create_customer_accounts', {
        company_id_param: companyId,
        customer_id_param: customerId
      });

      if (error) {
        console.error('Error creating customer accounts:', error);
        // Don't throw error, just log it
      }
    } catch (error) {
      console.error('Error in createCustomerAccounts:', error);
    }
  };

  const checkCustomerActiveRelations = async (customerId: string): Promise<boolean> => {
    // Check for active contracts
    const { data: contracts } = await supabase
      .from('contracts')
      .select('id')
      .eq('customer_id', customerId)
      .in('status', ['active', 'pending']);

    // Check for unpaid invoices
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id')
      .eq('customer_id', customerId)
      .neq('payment_status', 'paid');

    return (contracts && contracts.length > 0) || (invoices && invoices.length > 0);
  };

  const sendWelcomeEmailToCustomer = async (customer: any) => {
    try {
      // Implementation for sending welcome email
      console.log('📧 Sending welcome email to:', customer.email);
      // This would typically call an email service
    } catch (error) {
      console.error('Error sending welcome email:', error);
      // Don't throw error, just log it
    }
  };

  return {
    createCustomer,
    updateCustomer,
    deleteCustomer,
    toggleBlacklist,
    // Expose loading states
    isCreating: createCustomer.isPending,
    isUpdating: updateCustomer.isPending,
    isDeleting: deleteCustomer.isPending,
    isToggling: toggleBlacklist.isPending,
  };
};