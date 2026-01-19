/**
 * Contract Amendment System Hook
 * 
 * Provides functionality for:
 * - Creating contract amendments
 * - Tracking changes with audit trail
 * - Approval workflow
 * - Customer re-signature (optional)
 * - Applying approved amendments
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type {
  ContractAmendment,
  AmendmentWithChanges,
  CreateAmendmentData,
  AmendmentApprovalData,
  AmendmentSignatureData,
  AmendmentChangeLog
} from '@/types/amendment';

export const useContractAmendments = (contractId?: string) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch amendments for a contract
  const {
    data: amendments = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['contract-amendments', contractId],
    queryFn: async () => {
      if (!contractId) return [];

      const { data, error } = await supabase
        .from('contract_amendments' as any)
        .select('*')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as ContractAmendment[];
    },
    enabled: !!contractId
  });

  // Fetch single amendment with changes
  const fetchAmendmentWithChanges = async (amendmentId: string): Promise<AmendmentWithChanges> => {
    // Fetch amendment
    const { data: amendment, error: amendmentError } = await supabase
      .from('contract_amendments' as any)
      .select('*')
      .eq('id', amendmentId)
      .single();

    if (amendmentError) throw amendmentError;

    // Fetch change logs
    const { data: changeLogs, error: logsError } = await supabase
      .from('amendment_change_log' as any)
      .select('*')
      .eq('amendment_id', amendmentId)
      .order('created_at', { ascending: true });

    if (logsError) throw logsError;

    return {
      ...(amendment as any),
      change_logs: (changeLogs || []) as unknown as AmendmentChangeLog[]
    } as AmendmentWithChanges;
  };

  // Create amendment
  const createAmendmentMutation = useMutation({
    mutationFn: async (data: CreateAmendmentData) => {
      console.log('📝 [CREATE_AMENDMENT] Starting...', { data });
      
      if (!user?.id) throw new Error('User not authenticated');

      // Get company_id from profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        console.error('❌ [CREATE_AMENDMENT] Profile error:', profileError);
        throw new Error('Company not found');
      }
      console.log('✅ [CREATE_AMENDMENT] Profile found:', profile);

      // Get contract details for current values
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', data.contract_id)
        .single();

      if (contractError || !contract) {
        console.error('❌ [CREATE_AMENDMENT] Contract error:', contractError);
        throw new Error('Contract not found');
      }
      console.log('✅ [CREATE_AMENDMENT] Contract found:', contract.contract_number);

      // Generate amendment number
      const { data: amendmentNumber, error: numberError } = await supabase
        .rpc('generate_amendment_number' as any, {
          p_company_id: profile.company_id,
          p_contract_id: data.contract_id
        });

      if (numberError) {
        console.error('❌ [CREATE_AMENDMENT] Number generation error:', numberError);
        throw numberError;
      }
      console.log('✅ [CREATE_AMENDMENT] Amendment number generated:', amendmentNumber);

      // Calculate amount difference if financial changes
      let amountDifference = 0;
      let requiresPaymentAdjustment = false;

      if (data.new_values.contract_amount && data.original_values.contract_amount) {
        amountDifference = Number(data.new_values.contract_amount) - Number(data.original_values.contract_amount);
        requiresPaymentAdjustment = amountDifference !== 0;
      }

      // Also check monthly_amount for calculating difference
      if (data.new_values.monthly_amount && data.original_values.monthly_amount) {
        const monthlyDiff = Number(data.new_values.monthly_amount) - Number(data.original_values.monthly_amount);
        if (monthlyDiff !== 0) {
          amountDifference = monthlyDiff;
          requiresPaymentAdjustment = true;
        }
      }

      // Prepare insert data
      const insertData = {
        company_id: profile.company_id,
        contract_id: data.contract_id,
        amendment_number: amendmentNumber,
        amendment_type: data.amendment_type,
        amendment_reason: data.amendment_reason,
        original_values: data.original_values,
        new_values: data.new_values,
        amount_difference: amountDifference,
        requires_payment_adjustment: requiresPaymentAdjustment,
        requires_customer_signature: data.requires_customer_signature || false,
        effective_date: data.effective_date || null,
        created_by: user.id,
        status: 'pending'
      };
      
      console.log('📤 [CREATE_AMENDMENT] Inserting data:', insertData);

      // Create amendment
      const { data: newAmendment, error: createError } = await supabase
        .from('contract_amendments' as any)
        .insert(insertData)
        .select()
        .single();

      if (createError) {
        console.error('❌ [CREATE_AMENDMENT] Insert error:', {
          code: createError.code,
          message: createError.message,
          details: createError.details,
          hint: createError.hint
        });
        
        // Provide more specific error messages
        if (createError.code === '23505') {
          throw new Error('رقم التعديل موجود مسبقاً');
        } else if (createError.code === '42501') {
          throw new Error('لا تملك صلاحية إنشاء تعديلات العقود');
        } else if (createError.message) {
          throw new Error(createError.message);
        }
        throw createError;
      }

      console.log('✅ [CREATE_AMENDMENT] Success:', newAmendment);
      return newAmendment as unknown as ContractAmendment;
    },
    onSuccess: (data) => {
      toast({
        title: '✅ تم إنشاء التعديل',
        description: `رقم التعديل: ${data.amendment_number}`,
      });
      queryClient.invalidateQueries({ queryKey: ['contract-amendments', data.contract_id] });
    },
    onError: (error: Error) => {
      toast({
        title: '❌ فشل إنشاء التعديل',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Approve or reject amendment
  const approveRejectMutation = useMutation({
    mutationFn: async ({ amendment_id, action, notes, rejection_reason }: AmendmentApprovalData) => {
      if (!user?.id) throw new Error('User not authenticated');

      const updateData: any = {
        status: action === 'approve' ? 'approved' : 'rejected',
        updated_at: new Date().toISOString()
      };

      if (action === 'approve') {
        updateData.approved_by = user.id;
        updateData.approved_at = new Date().toISOString();
        updateData.approval_notes = notes || null;
      } else {
        updateData.rejected_by = user.id;
        updateData.rejected_at = new Date().toISOString();
        updateData.rejection_reason = rejection_reason || null;
      }

      const { data, error } = await supabase
        .from('contract_amendments' as any)
        .update(updateData)
        .eq('id', amendment_id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ContractAmendment;
    },
    onSuccess: (data, variables) => {
      toast({
        title: variables.action === 'approve' ? '✅ تم اعتماد التعديل' : '❌ تم رفض التعديل',
        description: `رقم التعديل: ${data.amendment_number}`,
      });
      queryClient.invalidateQueries({ queryKey: ['contract-amendments', data.contract_id] });
    },
    onError: (error: Error) => {
      toast({
        title: '❌ فشلت العملية',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Apply approved amendment to contract
  const applyAmendmentMutation = useMutation({
    mutationFn: async (amendmentId: string) => {
      const { data, error } = await supabase
        .rpc('apply_contract_amendment' as any, {
          p_amendment_id: amendmentId
        });

      if (error) throw error;
      
      const result = data as any;
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to apply amendment');
      }

      return data;
    },
    onSuccess: () => {
      toast({
        title: '✅ تم تطبيق التعديل',
        description: 'تم تحديث العقد بنجاح',
      });
      queryClient.invalidateQueries({ queryKey: ['contract-amendments'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
    onError: (error: Error) => {
      toast({
        title: '❌ فشل تطبيق التعديل',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Add signature
  const addSignatureMutation = useMutation({
    mutationFn: async ({ amendment_id, signature_type, signature_data }: AmendmentSignatureData) => {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (signature_type === 'customer') {
        updateData.customer_signature_data = signature_data;
        updateData.customer_signed = true;
        updateData.customer_signed_at = new Date().toISOString();
      } else {
        updateData.company_signature_data = signature_data;
        updateData.company_signed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('contract_amendments' as any)
        .update(updateData)
        .eq('id', amendment_id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ContractAmendment;
    },
    onSuccess: (data, variables) => {
      toast({
        title: '✅ تم إضافة التوقيع',
        description: variables.signature_type === 'customer' ? 'توقيع العميل' : 'توقيع الشركة',
      });
      queryClient.invalidateQueries({ queryKey: ['contract-amendments', data.contract_id] });
    },
    onError: (error: Error) => {
      toast({
        title: '❌ فشل إضافة التوقيع',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Cancel amendment
  const cancelAmendmentMutation = useMutation({
    mutationFn: async (amendmentId: string) => {
      const { data, error } = await supabase
        .from('contract_amendments' as any)
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', amendmentId)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ContractAmendment;
    },
    onSuccess: (data) => {
      toast({
        title: '✅ تم إلغاء التعديل',
        description: `رقم التعديل: ${data.amendment_number}`,
      });
      queryClient.invalidateQueries({ queryKey: ['contract-amendments', data.contract_id] });
    },
    onError: (error: Error) => {
      toast({
        title: '❌ فشل إلغاء التعديل',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  return {
    // Data
    amendments,
    isLoading,
    error,
    
    // Functions
    refetch,
    fetchAmendmentWithChanges,
    
    // Mutations
    createAmendment: createAmendmentMutation.mutate,
    isCreating: createAmendmentMutation.isPending,
    
    approveReject: approveRejectMutation.mutate,
    isApprovingRejecting: approveRejectMutation.isPending,
    
    applyAmendment: applyAmendmentMutation.mutate,
    isApplying: applyAmendmentMutation.isPending,
    
    addSignature: addSignatureMutation.mutate,
    isAddingSignature: addSignatureMutation.isPending,
    
    cancelAmendment: cancelAmendmentMutation.mutate,
    isCancelling: cancelAmendmentMutation.isPending,
  };
};
