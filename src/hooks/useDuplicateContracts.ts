import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompanyId } from '@/hooks/useUnifiedCompanyAccess';

export interface DuplicateContract {
  id: string;
  contract_number: string;
  customer_id: string;
  contract_amount: number;
  status: string;
  created_at: string;
  payments_count: number;
  invoices_count: number;
  documents_count: number;
  approval_steps_count: number;
  payment_schedules_count: number;
  total_paid: number;
  is_safe_to_delete: boolean;
  customer_name?: string;
}

export interface DuplicateGroup {
  contract_number: string;
  contracts: DuplicateContract[];
  total_contracts: number;
  contracts_with_payments: number;
  contracts_without_payments: number;
  recommended_action: 'keep_all' | 'delete_duplicates' | 'manual_review';
}

export const useDuplicateContracts = () => {
  const companyId = useCurrentCompanyId();
  
  return useQuery({
    queryKey: ['duplicate-contracts', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      // Get all contracts with their related data counts
      const { data: contractsData, error } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          customer_id,
          contract_amount,
          status,
          created_at,
          customers!inner(full_name, full_name_ar)
        `)
        .eq('company_id', companyId)
        .order('contract_number', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching contracts:', error);
        throw error;
      }

      // Get counts for related data
      const contractIds = contractsData?.map(c => c.id) || [];
      
      const [paymentsResult, invoicesResult, documentsResult, approvalStepsResult, paymentSchedulesResult] = await Promise.all([
        supabase
          .from('payments')
          .select('contract_id, amount')
          .in('contract_id', contractIds),
        supabase
          .from('invoices')
          .select('contract_id')
          .in('contract_id', contractIds),
        supabase
          .from('contract_documents')
          .select('contract_id')
          .in('contract_id', contractIds),
        supabase
          .from('contract_approval_steps')
          .select('contract_id')
          .in('contract_id', contractIds),
        supabase
          .from('contract_payment_schedules')
          .select('contract_id')
          .in('contract_id', contractIds)
      ]);

      // Process the data to create contract objects with counts
      const contractsWithCounts: DuplicateContract[] = contractsData?.map(contract => {
        const payments = paymentsResult.data?.filter(p => p.contract_id === contract.id) || [];
        const invoices = invoicesResult.data?.filter(i => i.contract_id === contract.id) || [];
        const documents = documentsResult.data?.filter(d => d.contract_id === contract.id) || [];
        const approvalSteps = approvalStepsResult.data?.filter(a => a.contract_id === contract.id) || [];
        const paymentSchedules = paymentSchedulesResult.data?.filter(p => p.contract_id === contract.id) || [];
        
        const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        
        const isSafeToDelete = 
          payments.length === 0 &&
          invoices.length === 0 &&
          documents.length === 0 &&
          approvalSteps.length === 0 &&
          paymentSchedules.length === 0;

        return {
          id: contract.id,
          contract_number: contract.contract_number,
          customer_id: contract.customer_id,
          contract_amount: contract.contract_amount || 0,
          status: contract.status,
          created_at: contract.created_at,
          payments_count: payments.length,
          invoices_count: invoices.length,
          documents_count: documents.length,
          approval_steps_count: approvalSteps.length,
          payment_schedules_count: paymentSchedules.length,
          total_paid: totalPaid,
          is_safe_to_delete: isSafeToDelete,
          customer_name: (contract.customers as any)?.full_name || (contract.customers as any)?.full_name_ar
        };
      }) || [];

      // Group contracts by contract_number
      const groupedContracts = contractsWithCounts.reduce((acc, contract) => {
        if (!acc[contract.contract_number]) {
          acc[contract.contract_number] = [];
        }
        acc[contract.contract_number].push(contract);
        return acc;
      }, {} as Record<string, DuplicateContract[]>);

      // Filter only groups with duplicates and create DuplicateGroup objects
      const duplicateGroups: DuplicateGroup[] = Object.entries(groupedContracts)
        .filter(([_, contracts]) => contracts.length > 1)
        .map(([contractNumber, contracts]) => {
          const contractsWithPayments = contracts.filter(c => c.payments_count > 0);
          const contractsWithoutPayments = contracts.filter(c => c.payments_count === 0);
          
          let recommendedAction: 'keep_all' | 'delete_duplicates' | 'manual_review';
          
          if (contractsWithPayments.length === 0) {
            // All contracts have no payments - manual review needed
            recommendedAction = 'manual_review';
          } else if (contractsWithoutPayments.length > 0) {
            // Some have payments, some don't - can delete those without payments
            recommendedAction = 'delete_duplicates';
          } else {
            // All have payments - keep all, manual review needed
            recommendedAction = 'keep_all';
          }

          return {
            contract_number: contractNumber,
            contracts: contracts.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
            total_contracts: contracts.length,
            contracts_with_payments: contractsWithPayments.length,
            contracts_without_payments: contractsWithoutPayments.length,
            recommended_action: recommendedAction
          };
        })
        .sort((a, b) => b.total_contracts - a.total_contracts);

      return duplicateGroups;
    },
    enabled: !!companyId,
  });
};

export const useDuplicateContractsSummary = () => {
  const companyId = useCurrentCompanyId();
  
  return useQuery({
    queryKey: ['duplicate-contracts-summary', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      // Get all contracts with their related data counts - duplicate the logic from useDuplicateContracts
      const { data: contractsData, error } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          customer_id,
          contract_amount,
          status,
          created_at,
          customers!inner(full_name, full_name_ar)
        `)
        .eq('company_id', companyId);

      if (error) throw error;

      // Get counts for related data
      const contractIds = contractsData?.map(c => c.id) || [];
      
      const [paymentsResult] = await Promise.all([
        supabase
          .from('payments')
          .select('contract_id, amount')
          .in('contract_id', contractIds)
      ]);

      // Group contracts by contract_number and find duplicates
      const groupedContracts = contractsData?.reduce((acc, contract) => {
        if (!acc[contract.contract_number]) {
          acc[contract.contract_number] = [];
        }
        acc[contract.contract_number].push({
          id: contract.id,
          payments_count: paymentsResult.data?.filter(p => p.contract_id === contract.id).length || 0
        });
        return acc;
      }, {} as Record<string, Array<{ id: string; payments_count: number }>>) || {};

      // Filter only groups with duplicates
      const duplicateGroups = Object.entries(groupedContracts)
        .filter(([_, contracts]) => contracts.length > 1);

      const totalDuplicateGroups = duplicateGroups.length;
      const totalDuplicateContracts = duplicateGroups.reduce((sum, [_, contracts]) => sum + contracts.length, 0);
      const contractsWithPayments = duplicateGroups.reduce((sum, [_, contracts]) => 
        sum + contracts.filter(c => c.payments_count > 0).length, 0);
      const contractsWithoutPayments = duplicateGroups.reduce((sum, [_, contracts]) => 
        sum + contracts.filter(c => c.payments_count === 0).length, 0);
      const safeToDeleteContracts = contractsWithoutPayments; // Simplified - contracts without payments are safe to delete

      return {
        totalDuplicateGroups,
        totalDuplicateContracts,
        contractsWithPayments,
        contractsWithoutPayments,
        safeToDeleteContracts,
        groupsByAction: {
          delete_duplicates: duplicateGroups.filter(([_, contracts]) => 
            contracts.some(c => c.payments_count > 0) && contracts.some(c => c.payments_count === 0)
          ).length,
          manual_review: duplicateGroups.filter(([_, contracts]) => 
            contracts.every(c => c.payments_count === 0)
          ).length,
          keep_all: duplicateGroups.filter(([_, contracts]) => 
            contracts.every(c => c.payments_count > 0)
          ).length
        }
      };
    },
    enabled: !!companyId,
  });
};
