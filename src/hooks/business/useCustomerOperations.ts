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
          throw new Error(`يوجد عميل مشابه في النظام: ${duplicateCheck.duplicates.map(d => d.name).join(', ')}`);
        }
      }

      // Prepare data for database insertion
      const customerData = {
        ...validatedData,
        company_id: companyId,
        created_by: user?.id,
        customer_code: validatedData.customer_code || await generateCustomerCode(),
      };

      // Remove fields not in database schema
      delete customerData.force_create;
      delete customerData.context;

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
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', customer.id] });
      
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
      };

      // Remove ID from update data
      const { id, ...dataToUpdate } = updateData;

      // Update customer
      const { data: updatedCustomer, error } = await supabase
        .from('customers')
        .update(dataToUpdate)
        .eq('id', validatedData.id)
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
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', customer.id] });
      
      toast.success('تم تحديث العميل بنجاح');
    },
    onError: (error: any) => {
      console.error('💥 [useCustomerOperations] Update customer error:', error);
      toast.error(error.message || 'حدث خطأ أثناء تحديث العميل');
    }
  });

  // Delete customer operation
  const deleteCustomer = useMutation({
    mutationFn: async (customerId: string) => {
      console.log('🗑️ [useCustomerOperations] Starting customer deletion:', customerId);

      // Check if customer has active contracts or unpaid invoices
      const hasActiveRelations = await checkCustomerActiveRelations(customerId);
      if (hasActiveRelations) {
        throw new Error('لا يمكن حذف العميل لوجود عقود نشطة أو فواتير غير مدفوعة');
      }

      // Soft delete customer
      const { error } = await supabase
        .from('customers')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id,
        })
        .eq('id', customerId)
        .eq('company_id', companyId);

      if (error) {
        console.error('❌ [useCustomerOperations] Delete error:', error);
        throw error;
      }

      console.log('✅ [useCustomerOperations] Customer deleted successfully');
      return { id: customerId };
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
    const { data, error } = await supabase.rpc('check_customer_duplicates', {
      p_company_id: companyId,
      p_customer_type: customerData.customer_type,
      p_national_id: customerData.national_id || null,
      p_passport_number: customerData.passport_number || null,
      p_phone: customerData.phone || null,
      p_email: customerData.email || null,
      p_company_name: customerData.company_name || null,
      p_commercial_register: null
    });

    if (error) {
      console.error('Error checking duplicates:', error);
      throw error;
    }

    return data as { has_duplicates: boolean; duplicates: any[] };
  };

  const generateCustomerCode = async (): Promise<string> => {
    const prefix = 'CUST';
    const year = new Date().getFullYear().toString().slice(-2);
    
    // Get the next sequence number
    const { data, error } = await supabase.rpc('get_next_customer_code', {
      p_company_id: companyId,
      p_prefix: prefix,
      p_year: year
    });

    if (error) {
      console.error('Error generating customer code:', error);
      // Fallback to timestamp-based code
      return `${prefix}-${year}-${Date.now().toString().slice(-6)}`;
    }

    return data || `${prefix}-${year}-001`;
  };

  const createCustomerAccounts = async (customerId: string) => {
    try {
      // Create default accounts for the customer
      const { error } = await supabase.rpc('create_customer_accounts', {
        p_customer_id: customerId,
        p_company_id: companyId
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