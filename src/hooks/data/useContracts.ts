/**
 * useContracts Hook
 * 
 * React Query hooks for contract data management.
 * Replaces direct Supabase calls with cached queries.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contractService } from '@/services';
import { queryKeys } from '@/lib/queryClient';
import { toast } from 'sonner';
import type { Contract, ContractCreationData } from '@/types/contracts';

/**
 * Get all contracts
 */
export function useContracts(companyId?: string) {
  return useQuery({
    queryKey: queryKeys.contracts.all(companyId),
    queryFn: () => companyId ? contractService.getByCompany(companyId) : contractService.getAll(),
    enabled: !!companyId
  });
}

/**
 * Get contract by ID
 */
export function useContract(id: string) {
  return useQuery({
    queryKey: queryKeys.contracts.detail(id),
    queryFn: () => contractService.getById(id),
    enabled: !!id
  });
}

/**
 * Get contract with customer details
 */
export function useContractWithCustomer(id: string) {
  return useQuery({
    queryKey: ['contract-with-customer', id],
    queryFn: () => contractService.getContractWithCustomer(id),
    enabled: !!id
  });
}

/**
 * Get all contracts with customer details
 */
export function useContractsWithCustomer(companyId?: string) {
  return useQuery({
    queryKey: ['contracts-with-customer', companyId],
    queryFn: () => contractService.getAllContractsWithCustomer(companyId),
    enabled: !!companyId
  });
}

/**
 * Get active contracts
 */
export function useActiveContracts(companyId?: string) {
  return useQuery({
    queryKey: ['contracts', 'active', companyId],
    queryFn: () => contractService.getActiveContracts(companyId)
  });
}

/**
 * Get contracts expiring soon
 */
export function useExpiringContracts(days: number, companyId?: string) {
  return useQuery({
    queryKey: ['contracts', 'expiring', days, companyId],
    queryFn: () => contractService.getExpiringSoon(days, companyId),
    enabled: !!companyId
  });
}

/**
 * Get contract statistics
 */
export function useContractStats(companyId: string) {
  return useQuery({
    queryKey: queryKeys.contracts.stats(companyId),
    queryFn: () => contractService.getContractStats(companyId),
    enabled: !!companyId
  });
}

/**
 * Create contract mutation
 */
export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: {
      data: ContractCreationData;
      userId: string;
      companyId: string;
    }) => contractService.createContract(variables.data, variables.userId, variables.companyId),
    
    onSuccess: (result, variables) => {
      toast.success('✅ تم إنشاء العقد بنجاح', {
        description: `رقم العقد: ${result.contract_number}`
      });

      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all(variables.companyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.stats(variables.companyId) });
    },
    
    onError: (error: Error) => {
      toast.error('❌ فشل إنشاء العقد', {
        description: error.message
      });
    }
  });
}

/**
 * Update contract status mutation
 */
export function useUpdateContractStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { id: string; status: Contract['status'] }) =>
      contractService.updateContractStatus(variables.id, variables.status),
    
    onSuccess: (contract) => {
      toast.success('✅ تم تحديث حالة العقد');

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.detail(contract.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all(contract.company_id) });
    }
  });
}

/**
 * Delete contract mutation
 */
export function useDeleteContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => contractService.delete(id),
    
    onSuccess: () => {
      toast.success('✅ تم حذف العقد');
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    }
  });
}

