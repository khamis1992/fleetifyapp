import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { createAuditLog } from '@/hooks/useAuditLog';
import { calculateCanonicalRenewalEndDate } from '@/utils/contractCalculations';
import type { Json } from '@/integrations/supabase/types';

interface ContractRenewalData {
  contract_id: string;
  new_end_date: string;
  new_amount?: number;
  renewal_terms?: string;
  auto_renew?: boolean;
  renewal_period_months?: number;
}

export interface AutoRenewalFailure {
  contractId: string;
  contractNumber: string;
  message: string;
}

export interface AutoRenewalBatchResult {
  eligibleCount: number;
  renewedContracts: Array<Record<string, unknown>>;
  failures: AutoRenewalFailure[];
}

export class AutoRenewalBatchError extends Error {
  readonly result: AutoRenewalBatchResult;

  constructor(result: AutoRenewalBatchResult) {
    const failureSummary = result.failures
      .map((failure) => (
        `${failure.contractNumber || failure.contractId}: ${failure.message}`
      ))
      .join('; ');
    super(
      `Auto-renewal failed for ${result.failures.length} contract(s). ${failureSummary}`,
    );
    this.name = 'AutoRenewalBatchError';
    this.result = result;
  }
}

export interface ContractCancellationImpact {
  contractId: string;
  openPenaltyCount: number;
  openPenaltyAmount: number;
  requiresCompanyTransfer: boolean;
  blockedPenaltyCount: number;
  authorizedToTransfer: boolean;
  canTransfer: boolean;
}

export const normalizeContractCancellationImpact = (value: unknown): ContractCancellationImpact => {
  const payload = value && typeof value === 'object'
    ? value as Record<string, unknown>
    : {};

  return {
    contractId: String(payload.contract_id || ''),
    openPenaltyCount: Number(payload.open_penalty_count || 0),
    openPenaltyAmount: Number(payload.open_penalty_amount || 0),
    requiresCompanyTransfer: payload.requires_company_transfer === true,
    blockedPenaltyCount: Number(payload.blocked_penalty_count || 0),
    authorizedToTransfer: payload.authorized_to_transfer === true,
    canTransfer: payload.can_transfer === true,
  };
};

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || fallback);
  }
  return fallback;
};

export const useContractCancellationImpact = ({
  contractId,
  companyId,
  enabled = true,
}: {
  contractId?: string | null;
  companyId?: string | null;
  enabled?: boolean;
}) => {
  const { user } = useAuth();
  const resolvedCompanyId = companyId || user?.profile?.company_id || null;

  return useQuery({
    queryKey: ['contract-cancellation-impact', resolvedCompanyId, contractId],
    queryFn: async () => {
      if (!contractId || !resolvedCompanyId) {
        throw new Error('تعذر تحديد العقد أو الشركة قبل فحص الإلغاء');
      }

      const { data, error } = await (supabase as any).rpc(
        'get_contract_cancellation_impact_v1',
        {
          p_company_id: resolvedCompanyId,
          p_contract_id: contractId,
        },
      );
      if (error) throw error;
      return normalizeContractCancellationImpact(data);
    },
    enabled: enabled && !!contractId && !!resolvedCompanyId,
    staleTime: 0,
    refetchOnMount: 'always',
  });
};

// Hook to get contracts expiring soon
export const useExpiringContracts = (daysAhead: number = 30) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["expiring-contracts", user?.profile?.company_id, daysAhead],
    queryFn: async () => {
      if (!user?.profile?.company_id) return [];
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);
      
      const { data, error } = await supabase
        .from("contracts")
        .select(`
          *,
          customer:customers(first_name, last_name, company_name, customer_type),
          vehicle:vehicles(plate_number, make, model)
        `)
        .eq("company_id", user.profile.company_id)
        .eq("status", "active")
        .lte("end_date", futureDate.toISOString().split('T')[0])
        .order("end_date", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.profile?.company_id
  });
};

// Hook to renew a contract
export const useRenewContract = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (renewalData: ContractRenewalData) => {
      if (!user?.profile?.company_id) throw new Error("Company ID is required");
      
      // Get the original contract
      const { data: originalContract, error: fetchError } = await supabase
        .from("contracts")
        .select("*")
        .eq("id", renewalData.contract_id)
        .single();
      
      if (fetchError) throw fetchError;
      
      const { data: renewalResult, error } = await supabase.rpc(
        'renew_contract_with_billing_graph_atomic',
        {
          p_contract_id: renewalData.contract_id,
          p_new_end_date: renewalData.new_end_date,
          p_new_amount: renewalData.new_amount,
          p_renewal_terms: renewalData.renewal_terms,
        },
      );
      if (error) throw error;
      const payload = renewalResult as Record<string, unknown> | null;
      if (!payload?.success || !payload.billing_graph_created || !payload.contract_id) {
        throw new Error(String(payload?.error || 'لم يكتمل تجديد العقد وشبكة الفوترة'));
      }

      const { data: newContract, error: newContractError } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', String(payload.contract_id))
        .single();
      if (newContractError) throw newContractError;
      
      return { newContract, originalContract };
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["expiring-contracts"] });
      
      // Log audit trail
      await createAuditLog(
        'UPDATE',
        'contract',
        result.originalContract.id,
        result.originalContract.contract_number,
        {
          old_values: {
            status: 'active',
            end_date: result.originalContract.end_date,
          },
          new_values: {
            status: 'renewed',
            new_contract_id: result.newContract.id,
            new_contract_number: result.newContract.contract_number,
            new_end_date: result.newContract.end_date,
          },
          changes_summary: `Renewed contract ${result.originalContract.contract_number} to ${result.newContract.contract_number}`,
          metadata: {
            original_contract: result.originalContract.contract_number,
            new_contract: result.newContract.contract_number,
            new_amount: result.newContract.contract_amount,
          },
          severity: 'high',
        }
      );
      
      toast.success("تم تجديد العقد بنجاح");
    },
    onError: (error) => {
      toast.error("خطأ في تجديد العقد: " + error.message);
    }
  });
};

// Hook to auto-renew eligible contracts
export const useAutoRenewContracts = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async () => {
      if (!user?.profile?.company_id) throw new Error("Company ID is required");
      
      // Get contracts that are expiring in 7 days and have auto-renewal enabled
      const today = new Date();
      const sevenDaysFromNow = new Date(today);
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      const todayDate = formatLocalDate(today);
      const sevenDaysFromNowDate = formatLocalDate(sevenDaysFromNow);
      
      const { data: contractsToRenew, error: fetchError } = await supabase
        .from("contracts")
        .select("*")
        .eq("company_id", user.profile.company_id)
        .eq("status", "active")
        .eq("auto_renew_enabled", true)
        .gte("end_date", todayDate)
        .lte("end_date", sevenDaysFromNowDate);
      
      if (fetchError) throw fetchError;
      
      const renewedContracts: Array<Record<string, unknown>> = [];
      const failures: AutoRenewalFailure[] = [];
      
      for (const contract of contractsToRenew || []) {
        const contractNumber = contract.contract_number || contract.id;

        try {
          const newEndDate = calculateCanonicalRenewalEndDate(
            contract.start_date,
            contract.end_date,
          );
          if (!newEndDate) {
            throw new Error('Unable to calculate a valid renewal end date');
          }
          
          const { data: renewalResult, error } = await supabase.rpc(
            'renew_contract_with_billing_graph_atomic',
            {
              p_contract_id: contract.id,
              p_new_end_date: newEndDate,
              p_new_amount: contract.contract_amount,
              p_renewal_terms: contract.terms || undefined,
            },
          );
          if (error) throw error;

          const payload = renewalResult as Record<string, unknown> | null;
          if (!payload?.success || !payload.billing_graph_created || !payload.contract_id) {
            throw new Error(
              String(payload?.error || 'The atomic renewal did not create a complete billing graph'),
            );
          }

          renewedContracts.push({
            ...contract,
            id: String(payload.contract_id),
            contract_number: String(payload.contract_number || ''),
            end_date: newEndDate,
          });
        } catch (error) {
          failures.push({
            contractId: contract.id,
            contractNumber,
            message: getErrorMessage(error, 'Unknown auto-renewal error'),
          });
        }
      }
      
      const result: AutoRenewalBatchResult = {
        eligibleCount: contractsToRenew?.length || 0,
        renewedContracts,
        failures,
      };

      if (failures.length > 0) {
        // Earlier contracts may already be committed by the atomic RPC.
        queryClient.invalidateQueries({ queryKey: ["contracts"] });
        queryClient.invalidateQueries({ queryKey: ["expiring-contracts"] });
        throw new AutoRenewalBatchError(result);
      }

      return result;
    },
    onSuccess: (result) => {
      const renewedContracts = result.renewedContracts;
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["expiring-contracts"] });
      if (renewedContracts.length > 0) {
        toast.success(`تم تجديد ${renewedContracts.length} عقد تلقائياً`);
      }
    },
    onError: (error) => {
      toast.error("خطأ في التجديد التلقائي: " + error.message);
    }
  });
};

// Hook to suspend/cancel contracts
export const useUpdateContractStatus = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({
      contractId,
      status,
      reason,
      companyId,
      transferTrafficViolationsToCompany = false,
      vehicleReturn = null,
    }: {
      contractId: string;
      status: 'suspended' | 'cancelled' | 'active';
      reason?: string;
      companyId?: string;
      transferTrafficViolationsToCompany?: boolean;
      vehicleReturn?: Json | null;
    }) => {
      const updateData: any = {
        status,
        suspension_reason: status === 'active' ? null : reason?.trim() || null,
      };
      
      // Get contract details first to check if it has a vehicle
      const { data: contractData, error: contractError } = await supabase
        .from("contracts")
        .select("contract_number, company_id, vehicle_id, old_status:status")
        .eq("id", contractId)
        .single();
      
      if (contractError) throw contractError;
      
      let data: any;
      if (status === 'active') {
        const activatableStatuses = new Set(['draft', 'pending', 'pending_completion', 'suspended']);
        if (!activatableStatuses.has(contractData.old_status)) {
          throw new Error(`لا يمكن تفعيل عقد حالته الحالية ${contractData.old_status || 'غير محددة'}`);
        }
        const { data: activationResult, error: activationError } = await supabase.rpc(
          'activate_contract_with_billing_graph_atomic',
          { p_contract_id: contractId },
        );
        if (activationError) throw activationError;
        const payload = activationResult as Record<string, unknown> | null;
        if (!payload?.success || !payload.billing_graph_created) {
          throw new Error(String(payload?.error || 'لم يكتمل تفعيل العقد وشبكة الفوترة'));
        }

        const { data: activatedContract, error: fetchError } = await supabase
          .from('contracts')
          .select('*')
          .eq('id', contractId)
          .single();
        if (fetchError) throw fetchError;
        data = activatedContract;
      } else if (status === 'cancelled') {
        const resolvedCompanyId = companyId || contractData.company_id || user?.profile?.company_id;
        if (!resolvedCompanyId) {
          throw new Error('تعذر تحديد الشركة المرتبطة بالعقد');
        }

        const { data: cancellationResult, error: cancellationError } = await supabase.rpc(
          'cancel_contract_with_return_and_penalties_v2',
          {
            p_company_id: resolvedCompanyId,
            p_contract_id: contractId,
            p_reason: reason?.trim() || '',
            p_transfer_open_penalties_to_company: transferTrafficViolationsToCompany,
            p_return_payload: vehicleReturn,
            p_actor_id: user?.id || null,
          },
        );
        if (cancellationError) throw cancellationError;

        const payload = cancellationResult && typeof cancellationResult === 'object'
          ? cancellationResult as Record<string, unknown>
          : {};
        data = payload.contract;
      } else {
        // Non-billable lifecycle changes do not create financial obligations.
        const { data: updatedContract, error } = await supabase
          .from("contracts")
          .update(updateData)
          .eq("id", contractId)
          .select()
          .single();
        if (error) throw error;
        data = updatedContract;
      }
      
      // Vehicle status is now handled by database trigger - no manual update needed
      // This prevents the "tuple already modified" error
      
      return { data, contractData };
    },
    onSuccess: async (result, variables) => {
      // Invalidate only essential queries - don't wait for refetch
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["traffic-violations"] });
      queryClient.invalidateQueries({ queryKey: ["traffic-violations-count"] });
      queryClient.invalidateQueries({ queryKey: ["traffic-violations-stats"] });
      queryClient.invalidateQueries({ queryKey: ["contract-cancellation-impact"] });
      
      // Log audit trail (don't await to speed up response)
      createAuditLog(
        'UPDATE',
        'contract',
        variables.contractId,
        result.contractData.contract_number,
        {
          old_values: {
            status: result.contractData.old_status,
          },
          new_values: {
            status: variables.status,
          },
          changes_summary: `Updated contract ${result.contractData.contract_number} status to ${variables.status}`,
          metadata: {
            contract_number: result.contractData.contract_number,
            reason: variables.reason,
            vehicle_released: variables.status === 'cancelled' && !!result.contractData.vehicle_id,
          },
          severity: 'high',
        }
      );
      
      const statusText = variables.status === 'suspended' ? 'تعليق' : 
                        variables.status === 'cancelled' ? 'إلغاء' : 'تفعيل';
      toast.success(`تم ${statusText} العقد بنجاح`);
    },
    onError: (error: unknown) => {
      toast.error("خطأ في تحديث حالة العقد: " + getErrorMessage(error, 'حدث خطأ غير متوقع'));
    }
  });
};
