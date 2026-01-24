/**
 * Hook for managing customer verification tasks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';

export interface VerificationTask {
  id: string;
  company_id: string;
  customer_id: string;
  contract_id: string;
  assigned_to: string;
  assigned_by: string;
  status: 'pending' | 'in_progress' | 'verified' | 'rejected';
  verified_at: string | null;
  verified_by: string | null;
  verifier_name: string | null;
  notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get verification status for multiple customers/contracts
 */
export const useVerificationStatuses = (contractIds: string[]) => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['verification-statuses', companyId, contractIds],
    queryFn: async (): Promise<Map<string, VerificationTask>> => {
      if (!companyId || contractIds.length === 0) return new Map();

      const { data, error } = await supabase
        .from('customer_verification_tasks')
        .select('*')
        .eq('company_id', companyId)
        .in('contract_id', contractIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching verification statuses:', error);
        return new Map();
      }

      // Create a map of contract_id -> latest verification task
      const statusMap = new Map<string, VerificationTask>();
      for (const task of data || []) {
        // Only keep the latest task for each contract
        if (!statusMap.has(task.contract_id)) {
          statusMap.set(task.contract_id, task as VerificationTask);
        }
      }

      return statusMap;
    },
    enabled: !!companyId && contractIds.length > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

export interface VerificationTaskWithDetails extends VerificationTask {
  customer?: {
    first_name: string;
    last_name: string;
    phone: string;
  };
  contract?: {
    contract_number: string;
  };
  assigner?: {
    first_name_ar: string;
    last_name_ar: string;
  };
}

/**
 * Get all pending verification tasks assigned to current user
 */
export const useMyVerificationTasks = () => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['my-verification-tasks', companyId],
    queryFn: async (): Promise<VerificationTaskWithDetails[]> => {
      if (!companyId) return [];

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get the profile id for the current user
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profileData) return [];

      const { data, error } = await supabase
        .from('customer_verification_tasks')
        .select(`
          *,
          customer:customers(first_name, last_name, phone),
          contract:contracts(contract_number),
          assigner:profiles!customer_verification_tasks_assigned_by_fkey(first_name_ar, last_name_ar)
        `)
        .eq('company_id', companyId)
        .eq('assigned_to', profileData.id)
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching my verification tasks:', error);
        return [];
      }

      return data as unknown as VerificationTaskWithDetails[];
    },
    enabled: !!companyId,
    staleTime: 1000 * 60, // 1 minute
  });
};
