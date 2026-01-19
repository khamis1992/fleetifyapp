import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';

export interface ContractOperationsOptions {
  autoGenerateSchedule?: boolean;
  requireApproval?: boolean;
  enableNotifications?: boolean;
  autoCreateJournalEntry?: boolean;
  createInvoices?: boolean;
}

interface VehicleItem {
  vehicle_id: string;
  quantity?: number;
}

interface PaymentScheduleItem {
  amount: number;
  due_date: string | Date;
  installment_number?: number;
  description?: string;
  is_deposit?: boolean;
  late_fee?: number;
}

interface Contract {
  id: string;
  contract_number: string;
  company_id: string;
  customer_id: string;
  vehicle_id?: string | null;
  contract_type: string;
  contract_date: string;
  start_date: string;
  end_date: string;
  contract_amount: number;
  monthly_amount: number;
  description?: string | null;
  terms?: string | null;
  status: 'draft' | 'active' | 'expired' | 'suspended' | 'cancelled' | 'renewed';
  total_paid?: number;
  balance_due?: number;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  cost_center_id?: string | null;
}

interface CreateContractData {
  customer_id: string;
  vehicle_id?: string | null;
  contract_number?: string;
  contract_type: 'rental' | 'daily_rental' | 'weekly_rental' | 'monthly_rental' | 'yearly_rental' | 'rent_to_own';
  contract_date?: string;
  start_date: string | Date;
  end_date: string | Date;
  contract_amount: number;
  monthly_amount?: number;
  description?: string;
  terms?: string;
  cost_center_id?: string | null;

  // Legacy field mappings for backward compatibility
  total_amount?: number;
  notes?: string;
  terms_and_conditions?: string;
  vehicles?: VehicleItem[];
  payment_schedule?: PaymentScheduleItem[];
}

interface UpdateContractData extends CreateContractData {
  id: string;
  status?: 'draft' | 'active' | 'expired' | 'suspended' | 'cancelled' | 'renewed';
}

export const useContractOperations = (options: ContractOperationsOptions = {}) => {
  const { companyId, user } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();

  const {
    autoGenerateSchedule = true,
    requireApproval = false,
    enableNotifications = true,
    autoCreateJournalEntry = false,
    createInvoices = false
  } = options;

  // Check permissions
  const { hasAccess: canCreateContracts } = usePermissions({
    permissions: ['contracts.create'],
    requireCompanyAdmin: false
  });

  const { hasAccess: canApproveContracts } = usePermissions({
    permissions: ['contracts.approve'],
    requireCompanyAdmin: true
  });

  // Create contract operation
  const createContract = useMutation({
    mutationFn: async (data: CreateContractData) => {
      console.log('📄 [useContractOperations] Starting contract creation:', data);

      // Check permissions
      if (!canCreateContracts) {
        throw new Error('ليس لديك صلاحية إنشاء العقود');
      }

      // Validate input data
      await validateContractData(data);

      // Generate contract number if not provided
      const contractNumber = data.contract_number || await generateContractNumber();

      // Prepare contract data
      const contractData = {
        contract_number: contractNumber,
        company_id: companyId,
        customer_id: data.customer_id,
        vehicle_id: data.vehicle_id || null,
        contract_type: data.contract_type,
        contract_date: data.contract_date || new Date().toISOString().split('T')[0],
        start_date: typeof data.start_date === 'string' ? data.start_date : data.start_date.toISOString().split('T')[0],
        end_date: typeof data.end_date === 'string' ? data.end_date : data.end_date.toISOString().split('T')[0],
        contract_amount: data.total_amount || data.contract_amount || 0,
        monthly_amount: data.monthly_amount || 0,
        description: data.notes || data.description || null,
        terms: data.terms_and_conditions || data.terms || null,
        status: requireApproval ? 'draft' : 'active',
        created_by: user?.id || '',
        cost_center_id: data.cost_center_id || null,
      };

      // Insert main contract
      const { data: insertedContract, error } = await supabase
        .from('contracts')
        .insert(contractData)
        .select()
        .single();

      if (error) {
        console.error('❌ [useContractOperations] Database error:', error);
        throw error;
      }

      console.log('✅ [useContractOperations] Contract created successfully:', insertedContract);

      // Handle vehicles if provided (store in contract.vehicle_id for single vehicle)
      if (data.vehicles && data.vehicles.length > 0 && !data.vehicle_id) {
        // For single vehicle contracts, update the vehicle_id
        const firstVehicle = data.vehicles[0];
        if (firstVehicle.vehicle_id) {
          await supabase
            .from('contracts')
            .update({ vehicle_id: firstVehicle.vehicle_id })
            .eq('id', insertedContract.id);
          
          // Update vehicle status to rented if contract is active
          if (insertedContract.status === 'active') {
            await supabase
              .from('vehicles')
              .update({ status: 'rented', updated_at: new Date().toISOString() })
              .eq('id', firstVehicle.vehicle_id);
          }
        }
      }

      // Update vehicle status if vehicle_id is directly provided and contract is active
      if (insertedContract.vehicle_id && insertedContract.status === 'active') {
        const today = new Date()
        const startDate = new Date(insertedContract.start_date)
        const endDate = insertedContract.end_date ? new Date(insertedContract.end_date) : null
        
        // Check if contract is active now
        const isActiveNow = startDate <= today && (endDate === null || endDate >= today)
        
        if (isActiveNow) {
          await supabase
            .from('vehicles')
            .update({ status: 'rented', updated_at: new Date().toISOString() })
            .eq('id', insertedContract.vehicle_id);
          
          console.log(`✅ [useContractOperations] Updated vehicle ${insertedContract.vehicle_id} status to rented`)
        }
      }

      // Create payment schedule if provided
      if (data.payment_schedule && data.payment_schedule.length > 0) {
        await createPaymentSchedule(insertedContract.id, data.payment_schedule);
      }

      // Create initial journal entry if auto-create is enabled
      if (autoCreateJournalEntry) {
        try {
          await createContractJournalEntry(insertedContract);
        } catch (journalError) {
          console.warn('⚠️ [useContractOperations] Journal entry creation failed:', journalError);
          // Don't fail the contract creation if journal entry fails
        }
      }

      // Create invoices if enabled
      if (createInvoices) {
        try {
          await createContractInvoices(insertedContract);
        } catch (invoiceError) {
          console.warn('⚠️ [useContractOperations] Invoice creation failed:', invoiceError);
          // Don't fail the contract creation if invoice creation fails
        }
      }

      return insertedContract;
    },
    onSuccess: (contract) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });

      toast.success('تم إنشاء العقد بنجاح');
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء العقد'
      console.error('💥 [useContractOperations] Create contract error:', error);
      toast.error(errorMessage);
    }
  });

  // Update contract operation
  const updateContract = useMutation({
    mutationFn: async (data: UpdateContractData) => {
      console.log('🔄 [useContractOperations] Starting contract update:', data);

      // Check if contract exists and user has permission
      const { data: existingContract, error: fetchError } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', data.id)
        .eq('company_id', companyId)
        .single();

      if (fetchError || !existingContract) {
        throw new Error('العقد غير موجود أو لا تملك صلاحية للتعديل');
      }

      // Check if contract can be updated
      if (existingContract.status === 'cancelled' || existingContract.status === 'expired') {
        throw new Error('لا يمكن تعديل عقد ملغى أو منتهي الصلاحية');
      }

      // Prepare update data
      const updateData = {
        contract_date: data.contract_date || new Date().toISOString().split('T')[0],
        start_date: typeof data.start_date === 'string' ? data.start_date : data.start_date?.toISOString().split('T')[0],
        end_date: typeof data.end_date === 'string' ? data.end_date : data.end_date?.toISOString().split('T')[0],
        contract_amount: data.total_amount || data.contract_amount,
        monthly_amount: data.monthly_amount,
        description: data.notes || data.description,
        terms: data.terms_and_conditions || data.terms,
        contract_type: data.contract_type,
        customer_id: data.customer_id,
        vehicle_id: data.vehicle_id,
        status: data.status,
        cost_center_id: data.cost_center_id,
        updated_at: new Date().toISOString(),
        updated_by: user?.id,
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof typeof updateData] === undefined) {
          delete updateData[key as keyof typeof updateData];
        }
      });

      // Update contract
      const { data: updatedContract, error } = await supabase
        .from('contracts')
        .update(updateData)
        .eq('id', data.id)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) {
        console.error('❌ [useContractOperations] Update error:', error);
        throw error;
      }

      console.log('✅ [useContractOperations] Contract updated successfully:', updatedContract);

      // Update vehicle status based on contract status
      if (updatedContract.vehicle_id) {
        const today = new Date()
        const startDate = new Date(updatedContract.start_date)
        const endDate = updatedContract.end_date ? new Date(updatedContract.end_date) : null
        
        // Check if contract is active now
        const isActiveNow = updatedContract.status === 'active' && 
                           startDate <= today && 
                           (endDate === null || endDate >= today)
        
        if (isActiveNow) {
          // Contract is active - set vehicle to rented
          await supabase
            .from('vehicles')
            .update({ status: 'rented', updated_at: new Date().toISOString() })
            .eq('id', updatedContract.vehicle_id);
          
          console.log(`✅ [useContractOperations] Updated vehicle ${updatedContract.vehicle_id} status to rented`)
        } else if (updatedContract.status === 'cancelled' || updatedContract.status === 'closed' || updatedContract.status === 'expired') {
          // Contract is cancelled/closed/expired - check if there are other active contracts for this vehicle
          const { data: otherActiveContracts } = await supabase
            .from('contracts')
            .select('id')
            .eq('vehicle_id', updatedContract.vehicle_id)
            .eq('status', 'active')
            .neq('id', updatedContract.id)
            .lte('start_date', today.toISOString().split('T')[0])
            .or(`end_date.gte.${today.toISOString().split('T')[0]},end_date.is.null`)
          
          // Only set to available if no other active contracts exist
          if (!otherActiveContracts || otherActiveContracts.length === 0) {
            await supabase
              .from('vehicles')
              .update({ status: 'available', updated_at: new Date().toISOString() })
              .eq('id', updatedContract.vehicle_id);
            
            console.log(`✅ [useContractOperations] Updated vehicle ${updatedContract.vehicle_id} status to available`)
          }
        }
      }

      return updatedContract;
    },
    onSuccess: (contract) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract', contract.id] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });

      toast.success('تم تحديث العقد بنجاح');
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء تحديث العقد'
      console.error('💥 [useContractOperations] Update contract error:', error);
      toast.error(errorMessage);
    }
  });

  // Get contracts with related data
  const getContracts = (filters?: { status?: string; customer_id?: string; vehicle_id?: string }) => useQuery({
    queryKey: ['contracts', companyId, filters],
    queryFn: async () => {
      console.log('📋 [useContractOperations] Fetching contracts for company:', companyId);
      
      if (!companyId) {
        throw new Error('Company ID is required');
      }

      let query = supabase
        .from('contracts')
        .select(`
          *,
          customers (
            id,
            first_name_ar,
            last_name_ar,
            company_name_ar,
            customer_type
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
      }
      if (filters?.vehicle_id) {
        query = query.eq('vehicle_id', filters.vehicle_id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ [useContractOperations] Error fetching contracts:', error);
        throw error;
      }

      console.log('✅ [useContractOperations] Fetched contracts:', data?.length || 0);
      return data || [];
    },
    enabled: !!companyId
  });

  // Get single contract
  const getContract = (contractId: string) => useQuery({
    queryKey: ['contract', contractId],
    queryFn: async () => {
      console.log('📄 [useContractOperations] Fetching contract:', contractId);
      
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          customers (
            id,
            first_name_ar,
            last_name_ar,
            company_name_ar,
            customer_type,
            phone,
            email
          )
        `)
        .eq('id', contractId)
        .eq('company_id', companyId)
        .single();

      if (error) {
        console.error('❌ [useContractOperations] Error fetching contract:', error);
        throw error;
      }

      console.log('✅ [useContractOperations] Fetched contract:', data);
      return data;
    },
    enabled: !!contractId && !!companyId
  });

  // Contract calculations
  const calculateContractTotals = (contract: Contract) => {
    const contractAmount = contract.contract_amount || 0;
    const totalPaid = contract.total_paid || 0;
    const balanceDue = contractAmount - totalPaid;

    return {
      contract_amount: contractAmount,
      total_paid: totalPaid,
      balance_due: balanceDue,
      payment_percentage: contractAmount > 0 ? (totalPaid / contractAmount) * 100 : 0
    };
  };

  const isContractOverdue = (contract: Contract) => {
    const endDate = new Date(contract.end_date);
    const today = new Date();
    return endDate < today && contract.status === 'active';
  };

  const getDaysUntilExpiry = (contract: Contract) => {
    const endDate = new Date(contract.end_date);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Helper functions
  const validateContractData = async (data: CreateContractData) => {
    // Validate customer exists and is not blacklisted
    const { data: customer } = await supabase
      .from('customers')
      .select('id, is_blacklisted')
      .eq('id', data.customer_id)
      .eq('company_id', companyId)
      .single();

    if (!customer) {
      throw new Error('العميل غير موجود');
    }

    if (customer.is_blacklisted) {
      throw new Error('لا يمكن إنشاء عقد للعميل المحظور');
    }

    // Validate contract dates
    const startDate = typeof data.start_date === 'string' ? new Date(data.start_date) : data.start_date;
    const endDate = typeof data.end_date === 'string' ? new Date(data.end_date) : data.end_date;
    
    if (startDate >= endDate) {
      throw new Error('تاريخ النهاية يجب أن يكون بعد تاريخ البداية');
    }

    if (startDate < new Date()) {
      throw new Error('تاريخ البداية لا يمكن أن يكون في الماضي');
    }
  };

  const generateContractNumber = async (): Promise<string> => {
    const prefix = 'CON';
    const year = new Date().getFullYear().toString().slice(-2);
    
    try {
      // Try to get existing contracts count for the year
      const { count, error } = await supabase
        .from('contracts')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('contract_date', `${new Date().getFullYear()}-01-01`)
        .lte('contract_date', `${new Date().getFullYear()}-12-31`);

      if (error) {
        console.error('Error getting contract count:', error);
        return `${prefix}-${year}-${Date.now().toString().slice(-6)}`;
      }

      const nextNumber = (count || 0) + 1;
      return `${prefix}-${year}-${nextNumber.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating contract number:', error);
      return `${prefix}-${year}-${Date.now().toString().slice(-6)}`;
    }
  };

  const createPaymentSchedule = async (contractId: string, schedule: PaymentScheduleItem[]) => {
    const scheduleData = schedule.map(item => ({
      contract_id: contractId,
      company_id: companyId,
      amount: item.amount || 0,
      due_date: typeof item.due_date === 'string' ? item.due_date : item.due_date?.toISOString().split('T')[0],
      installment_number: item.installment_number || 1,
      description: item.description || '',
      status: 'pending',
      is_paid: false,
      is_deposit: item.is_deposit || false,
      late_fee: item.late_fee || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('contract_payment_schedules')
      .insert(scheduleData);

    if (error) {
      console.error('Error creating payment schedule:', error);
      throw error;
    }

    console.log('✅ Created payment schedule:', scheduleData);
  };

  const createContractJournalEntry = async (contract: Contract) => {
    console.log('📄 Creating journal entry for contract:', contract.id);
    // Journal entry creation logic here
  };

  const createContractInvoices = async (contract: Contract) => {
    console.log('📄 Creating contract invoices for:', contract.id);
    // Invoice creation logic here
  };

  // Delete contract permanently with all dependencies
  const deleteContractPermanently = useMutation({
    mutationFn: async (contractId: string) => {
      console.log('🗑️ [useContractOperations] Starting permanent contract deletion:', contractId);

      if (!companyId) {
        throw new Error('معرف الشركة غير متوفر');
      }

      // 1. Get contract info first
      const { data: contract, error: contractFetchError } = await supabase
        .from('contracts')
        .select('id, contract_number, vehicle_id, customer_id')
        .eq('id', contractId)
        .eq('company_id', companyId)
        .single();

      if (contractFetchError || !contract) {
        throw new Error('العقد غير موجود');
      }

      // 2. Delete related records in order (due to foreign key constraints)
      
      // Delete delinquent_customers records
      const { error: delinquentError } = await supabase
        .from('delinquent_customers')
        .delete()
        .eq('contract_id', contractId);
      
      if (delinquentError) {
        console.warn('Error deleting delinquent_customers:', delinquentError);
      }

      // Delete payments
      const { error: paymentsError } = await supabase
        .from('payments')
        .delete()
        .eq('contract_id', contractId);
      
      if (paymentsError) {
        console.warn('Error deleting payments:', paymentsError);
      }

      // Delete invoices
      const { error: invoicesError } = await supabase
        .from('invoices')
        .delete()
        .eq('contract_id', contractId);
      
      if (invoicesError) {
        console.warn('Error deleting invoices:', invoicesError);
      }

      // Delete contract_payment_schedules
      const { error: schedulesError } = await supabase
        .from('contract_payment_schedules')
        .delete()
        .eq('contract_id', contractId);
      
      if (schedulesError) {
        console.warn('Error deleting payment schedules:', schedulesError);
      }

      // Delete lawsuit_preparations
      const { error: lawsuitPrepError } = await supabase
        .from('lawsuit_preparations')
        .delete()
        .eq('contract_id', contractId);
      
      if (lawsuitPrepError) {
        console.warn('Error deleting lawsuit_preparations:', lawsuitPrepError);
      }

      // 3. Update vehicle status to available if exists
      if (contract.vehicle_id) {
        const { error: vehicleError } = await supabase
          .from('vehicles')
          .update({ status: 'available' })
          .eq('id', contract.vehicle_id);
        
        if (vehicleError) {
          console.warn('Error updating vehicle status:', vehicleError);
        }
      }

      // 4. Finally delete the contract
      const { error: deleteError } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contractId)
        .eq('company_id', companyId);

      if (deleteError) {
        console.error('❌ [useContractOperations] Error deleting contract:', deleteError);
        throw deleteError;
      }

      console.log('✅ [useContractOperations] Contract deleted permanently:', contract.contract_number);
      return contract;
    },
    onSuccess: (contract) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['delinquent-customers'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      
      toast.success(`تم حذف العقد #${contract.contract_number} نهائياً مع جميع البيانات المرتبطة`);
    },
    onError: (error: any) => {
      console.error('❌ Delete contract error:', error);
      toast.error(error.message || 'فشل حذف العقد');
    }
  });

  return {
    createContract,
    updateContract,
    getContracts,
    getContract,
    deleteContractPermanently,
    calculateContractTotals,
    isContractOverdue,
    getDaysUntilExpiry,
    // Expose loading states
    isCreating: createContract.isPending,
    isUpdating: updateContract.isPending,
    isDeleting: deleteContractPermanently.isPending,
    // Expose permissions
    canCreateContracts,
    canApproveContracts,
  };
};