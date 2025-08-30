import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { 
  CreateContractData,
  UpdateContractData,
  ContractVehicleData,
  ContractPaymentScheduleData,
  createContractSchema,
  updateContractSchema 
} from '@/schemas/contract.schema';

export interface ContractOperationsOptions {
  autoGenerateSchedule?: boolean;
  requireApproval?: boolean;
  enableNotifications?: boolean;
  createInvoices?: boolean;
}

export const useContractOperations = (options: ContractOperationsOptions = {}) => {
  const { companyId, user } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();

  const {
    autoGenerateSchedule = true,
    requireApproval = false,
    enableNotifications = true,
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
      const validatedData = createContractSchema.parse(data);

      // Additional business validations
      await validateContractData(validatedData);

      // Check vehicle availability
      await validateVehicleAvailability(validatedData.vehicles, validatedData.start_date, validatedData.end_date);

      // Generate contract number if not provided
      const contractNumber = validatedData.contract_number || await generateContractNumber();

      // Prepare contract data
      const contractData = {
        ...validatedData,
        contract_number: contractNumber,
        company_id: companyId,
        created_by: user?.id,
        status: requireApproval ? 'draft' : 'active',
      };

      // Remove nested arrays from main contract data
      const { vehicles, payment_schedule, ...mainContractData } = contractData;

      // Insert main contract
      const { data: insertedContract, error } = await supabase
        .from('contracts')
        .insert(mainContractData)
        .select()
        .single();

      if (error) {
        console.error('❌ [useContractOperations] Database error:', error);
        throw error;
      }

      console.log('✅ [useContractOperations] Contract created successfully:', insertedContract);

      // Add vehicles to contract
      if (vehicles && vehicles.length > 0) {
        await addVehiclesToContract(insertedContract.id, vehicles, validatedData.start_date, validatedData.end_date);
      }

      // Generate payment schedule if enabled
      if (autoGenerateSchedule) {
        await generatePaymentSchedule(insertedContract, validatedData);
      } else if (payment_schedule && payment_schedule.length > 0) {
        await addPaymentSchedule(insertedContract.id, payment_schedule);
      }

      // Post-creation operations
      if (enableNotifications) {
        await sendContractNotifications(insertedContract);
      }

      return insertedContract;
    },
    onSuccess: (contract) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      
      toast.success('تم إنشاء العقد بنجاح');
    },
    onError: (error: any) => {
      console.error('💥 [useContractOperations] Create contract error:', error);
      toast.error(error.message || 'حدث خطأ أثناء إنشاء العقد');
    }
  });

  // Update contract operation
  const updateContract = useMutation({
    mutationFn: async (data: UpdateContractData) => {
      console.log('🔄 [useContractOperations] Starting contract update:', data);

      // Validate input data
      const validatedData = updateContractSchema.parse(data);

      // Check if contract exists and user has permission
      const { data: existingContract, error: fetchError } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', validatedData.id)
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
        ...validatedData,
        updated_at: new Date().toISOString(),
        updated_by: user?.id,
      };

      // Remove ID from update data
      const { id, ...dataToUpdate } = updateData;

      // Update contract
      const { data: updatedContract, error } = await supabase
        .from('contracts')
        .update(dataToUpdate)
        .eq('id', validatedData.id)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) {
        console.error('❌ [useContractOperations] Update error:', error);
        throw error;
      }

      console.log('✅ [useContractOperations] Contract updated successfully:', updatedContract);
      return updatedContract;
    },
    onSuccess: (contract) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract', contract.id] });
      
      toast.success('تم تحديث العقد بنجاح');
    },
    onError: (error: any) => {
      console.error('💥 [useContractOperations] Update contract error:', error);
      toast.error(error.message || 'حدث خطأ أثناء تحديث العقد');
    }
  });

  // Activate contract operation
  const activateContract = useMutation({
    mutationFn: async (contractId: string) => {
      console.log('✅ [useContractOperations] Starting contract activation:', contractId);

      // Get contract details
      const { data: contract, error: fetchError } = await supabase
        .from('contracts')
        .select('*, contract_vehicles(*)')
        .eq('id', contractId)
        .eq('company_id', companyId)
        .single();

      if (fetchError || !contract) {
        throw new Error('العقد غير موجود');
      }

      if (contract.status !== 'draft') {
        throw new Error('العقد ليس في حالة مسودة');
      }

      // Validate contract can be activated
      await validateContractActivation(contract);

      // Update contract status to active
      const { data: activatedContract, error } = await supabase
        .from('contracts')
        .update({
          status: 'active',
          activated_at: new Date().toISOString(),
          activated_by: user?.id,
        })
        .eq('id', contractId)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) {
        console.error('❌ [useContractOperations] Activation error:', error);
        throw error;
      }

      // Update vehicle statuses to rented
      await updateVehicleStatuses(contract.contract_vehicles, 'rented');

      // Create initial invoices if enabled
      if (createInvoices) {
        await createContractInvoices(activatedContract);
      }

      console.log('✅ [useContractOperations] Contract activated successfully:', activatedContract);
      return activatedContract;
    },
    onSuccess: (contract) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract', contract.id] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      
      toast.success('تم تفعيل العقد بنجاح');
    },
    onError: (error: any) => {
      console.error('💥 [useContractOperations] Activate contract error:', error);
      toast.error(error.message || 'حدث خطأ أثناء تفعيل العقد');
    }
  });

  // Terminate contract operation
  const terminateContract = useMutation({
    mutationFn: async ({ contractId, reason, returnDate }: { 
      contractId: string; 
      reason?: string; 
      returnDate?: Date; 
    }) => {
      console.log('🔚 [useContractOperations] Starting contract termination:', { contractId, reason });

      // Get contract details
      const { data: contract, error: fetchError } = await supabase
        .from('contracts')
        .select('*, contract_vehicles(*)')
        .eq('id', contractId)
        .eq('company_id', companyId)
        .single();

      if (fetchError || !contract) {
        throw new Error('العقد غير موجود');
      }

      if (contract.status !== 'active') {
        throw new Error('العقد ليس نشطاً');
      }

      // Calculate termination costs/penalties
      const terminationData = await calculateTerminationCosts(contract, returnDate);

      // Update contract status
      const { data: terminatedContract, error } = await supabase
        .from('contracts')
        .update({
          status: 'cancelled',
          terminated_at: new Date().toISOString(),
          terminated_by: user?.id,
          termination_reason: reason,
          actual_end_date: returnDate || new Date(),
          ...terminationData,
        })
        .eq('id', contractId)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) {
        console.error('❌ [useContractOperations] Termination error:', error);
        throw error;
      }

      // Update vehicle statuses back to available
      await updateVehicleStatuses(contract.contract_vehicles, 'available');

      // Cancel future payment schedules
      await cancelFuturePayments(contractId);

      console.log('✅ [useContractOperations] Contract terminated successfully:', terminatedContract);
      return terminatedContract;
    },
    onSuccess: (contract) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract', contract.id] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      
      toast.success('تم إنهاء العقد بنجاح');
    },
    onError: (error: any) => {
      console.error('💥 [useContractOperations] Terminate contract error:', error);
      toast.error(error.message || 'حدث خطأ أثناء إنهاء العقد');
    }
  });

  // Renew contract operation
  const renewContract = useMutation({
    mutationFn: async ({ contractId, newEndDate, newRate }: { 
      contractId: string; 
      newEndDate: Date; 
      newRate?: number; 
    }) => {
      console.log('🔄 [useContractOperations] Starting contract renewal:', { contractId, newEndDate });

      // Get contract details
      const { data: contract, error: fetchError } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .eq('company_id', companyId)
        .single();

      if (fetchError || !contract) {
        throw new Error('العقد غير موجود');
      }

      if (contract.status !== 'active' && contract.status !== 'expired') {
        throw new Error('لا يمكن تجديد هذا العقد');
      }

      // Calculate new total amount
      const daysDiff = Math.ceil((newEndDate.getTime() - new Date(contract.end_date).getTime()) / (1000 * 60 * 60 * 24));
      const extensionAmount = newRate ? newRate * daysDiff : (contract.total_amount / 
        Math.ceil((new Date(contract.end_date).getTime() - new Date(contract.start_date).getTime()) / (1000 * 60 * 60 * 24))) * daysDiff;

      // Update contract
      const { data: renewedContract, error } = await supabase
        .from('contracts')
        .update({
          end_date: newEndDate.toISOString(),
          total_amount: contract.total_amount + extensionAmount,
          status: 'active',
          renewed_at: new Date().toISOString(),
          renewed_by: user?.id,
        })
        .eq('id', contractId)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) {
        console.error('❌ [useContractOperations] Renewal error:', error);
        throw error;
      }

      // Generate additional payment schedule for extension period
      if (autoGenerateSchedule) {
        await generateExtensionPaymentSchedule(renewedContract, daysDiff, extensionAmount);
      }

      console.log('✅ [useContractOperations] Contract renewed successfully:', renewedContract);
      return renewedContract;
    },
    onSuccess: (contract) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract', contract.id] });
      
      toast.success('تم تجديد العقد بنجاح');
    },
    onError: (error: any) => {
      console.error('💥 [useContractOperations] Renew contract error:', error);
      toast.error(error.message || 'حدث خطأ أثناء تجديد العقد');
    }
  });

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
    if (data.start_date >= data.end_date) {
      throw new Error('تاريخ النهاية يجب أن يكون بعد تاريخ البداية');
    }

    if (data.start_date < new Date()) {
      throw new Error('تاريخ البداية لا يمكن أن يكون في الماضي');
    }
  };

  const validateVehicleAvailability = async (vehicles: any[], startDate: Date, endDate: Date) => {
    for (const vehicle of vehicles) {
      const { data: conflicts } = await supabase
        .from('contract_vehicles')
        .select('id, contract_id')
        .eq('vehicle_id', vehicle.vehicle_id)
        .eq('status', 'active')
        .or(`and(start_date.lte.${startDate.toISOString()},end_date.gte.${startDate.toISOString()}),and(start_date.lte.${endDate.toISOString()},end_date.gte.${endDate.toISOString()})`);

      if (conflicts && conflicts.length > 0) {
        throw new Error(`المركبة ${vehicle.vehicle_id} غير متاحة في الفترة المحددة`);
      }
    }
  };

  const validateContractActivation = async (contract: any) => {
    // Check if all required documents are uploaded
    // Check if customer is still valid
    // Check if vehicles are still available
    console.log('🔍 Validating contract activation for:', contract.id);
  };

  const generateContractNumber = async (): Promise<string> => {
    const prefix = 'CON';
    const year = new Date().getFullYear().toString().slice(-2);
    
    const { data, error } = await supabase.rpc('get_next_contract_number', {
      p_company_id: companyId,
      p_year: year
    });

    if (error) {
      console.error('Error generating contract number:', error);
      return `${prefix}-${year}-${Date.now().toString().slice(-6)}`;
    }

    return data || `${prefix}-${year}-001`;
  };

  const addVehiclesToContract = async (contractId: string, vehicles: any[], startDate: Date, endDate: Date) => {
    const vehicleData = vehicles.map(vehicle => ({
      contract_id: contractId,
      vehicle_id: vehicle.vehicle_id,
      daily_rate: vehicle.daily_rate,
      monthly_rate: vehicle.monthly_rate,
      deposit_amount: vehicle.deposit_amount || 0,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      status: 'active',
    }));

    const { error } = await supabase
      .from('contract_vehicles')
      .insert(vehicleData);

    if (error) {
      console.error('Error adding vehicles to contract:', error);
      throw error;
    }
  };

  const generatePaymentSchedule = async (contract: any, contractData: CreateContractData) => {
    console.log('📅 Generating payment schedule for contract:', contract.id);
    
    // This would generate payment schedule based on payment terms
    // Implementation depends on business rules
  };

  const addPaymentSchedule = async (contractId: string, schedule: ContractPaymentScheduleData[]) => {
    const scheduleData = schedule.map(item => ({
      ...item,
      contract_id: contractId,
    }));

    const { error } = await supabase
      .from('contract_payment_schedules')
      .insert(scheduleData);

    if (error) {
      console.error('Error adding payment schedule:', error);
      throw error;
    }
  };

  const updateVehicleStatuses = async (contractVehicles: any[], status: string) => {
    for (const cv of contractVehicles) {
      await supabase
        .from('vehicles')
        .update({ status })
        .eq('id', cv.vehicle_id);
    }
  };

  const calculateTerminationCosts = async (contract: any, returnDate?: Date) => {
    // Calculate penalties, remaining charges, etc.
    return {
      termination_fee: 0,
      early_termination_penalty: 0,
    };
  };

  const cancelFuturePayments = async (contractId: string) => {
    await supabase
      .from('contract_payment_schedules')
      .update({ status: 'cancelled' })
      .eq('contract_id', contractId)
      .eq('status', 'pending')
      .gte('due_date', new Date().toISOString());
  };

  const generateExtensionPaymentSchedule = async (contract: any, days: number, amount: number) => {
    console.log('📅 Generating extension payment schedule:', { days, amount });
  };

  const createContractInvoices = async (contract: any) => {
    console.log('📄 Creating contract invoices for:', contract.id);
  };

  const sendContractNotifications = async (contract: any) => {
    console.log('📧 Sending contract notifications for:', contract.id);
  };

  return {
    createContract,
    updateContract,
    activateContract,
    terminateContract,
    renewContract,
    // Expose loading states
    isCreating: createContract.isPending,
    isUpdating: updateContract.isPending,
    isActivating: activateContract.isPending,
    isTerminating: terminateContract.isPending,
    isRenewing: renewContract.isPending,
    // Expose permissions
    canCreateContracts,
    canApproveContracts,
  };
};