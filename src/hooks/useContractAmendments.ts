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
        .from('contract_amendments')
        .select('*')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ContractAmendment[];
    },
    enabled: !!contractId
  });

  // Fetch single amendment with changes
  const fetchAmendmentWithChanges = async (amendmentId: string): Promise<AmendmentWithChanges> => {
    // Fetch amendment
    const { data: amendment, error: amendmentError } = await supabase
      .from('contract_amendments')
      .select('*')
      .eq('id', amendmentId)
      .single();

    if (amendmentError) throw amendmentError;

    // Fetch change logs
    const { data: changeLogs, error: logsError } = await supabase
      .from('amendment_change_log')
      .select('*')
      .eq('amendment_id', amendmentId)
      .order('created_at', { ascending: true });

    if (logsError) throw logsError;

    return {
      ...amendment,
      change_logs: changeLogs as AmendmentChangeLog[]
    } as AmendmentWithChanges;
  };

  // Create amendment
  const createAmendmentMutation = useMutation({
    mutationFn: async (data: CreateAmendmentData) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Get company_id from profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) throw new Error('Company not found');

      // Get contract details for current values
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', data.contract_id)
        .single();

      if (contractError || !contract) throw new Error('Contract not found');

      // Generate amendment number
      const { data: amendmentNumber, error: numberError } = await supabase
        .rpc('generate_amendment_number', {
          p_company_id: profile.company_id,
          p_contract_id: data.contract_id
        });

      if (numberError) throw numberError;

      // Calculate amount difference if financial changes
      let amountDifference = 0;
      let requiresPaymentAdjustment = false;

      if (data.new_values.contract_amount && data.original_values.contract_amount) {
        amountDifference = Number(data.new_values.contract_amount) - Number(data.original_values.contract_amount);
        requiresPaymentAdjustment = amountDifference !== 0;
      }

      // Create amendment
      const { data: newAmendment, error: createError } = await supabase
        .from('contract_amendments')
        .insert({
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
        })
        .select()
        .single();

      if (createError) throw createError;

      return newAmendment as ContractAmendment;
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
        .from('contract_amendments')
        .update(updateData)
        .eq('id', amendment_id)
        .select()
        .single();

      if (error) throw error;
      return data as ContractAmendment;
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
        .rpc('apply_contract_amendment', {
          p_amendment_id: amendmentId
        });

      if (error) throw error;
      
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to apply amendment');
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
        .from('contract_amendments')
        .update(updateData)
        .eq('id', amendment_id)
        .select()
        .single();

      if (error) throw error;
      return data as ContractAmendment;
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
        .from('contract_amendments')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', amendmentId)
        .select()
        .single();

      if (error) throw error;
      return data as ContractAmendment;
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
