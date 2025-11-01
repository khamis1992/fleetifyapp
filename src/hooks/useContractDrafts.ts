import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { toast } from 'sonner';
import type { ContractDraft, ContractDraftInput, ContractDraftUpdateInput } from '@/types/contracts.types';

/**
 * Custom hook for managing contract drafts
 * Provides CRUD operations for saving, loading, updating, and deleting contract drafts
 *
 * Features:
 * - Save draft (create or update)
 * - Load user's drafts
 * - Delete draft
 * - Auto-expire drafts after 30 days
 *
 * @example
 * const { saveDraft, loadDrafts, deleteDraft } = useContractDrafts();
 *
 * // Save a draft
 * saveDraft.mutate({ draft_data: formData, customer_id: '...' });
 *
 * // Load drafts
 * const { data: drafts, isLoading } = loadDrafts;
 *
 * // Delete a draft
 * deleteDraft.mutate(draftId);
 */
/**
 * Maps database record to ContractDraft interface
 */
function mapDraftFromDb(draft: any): ContractDraft {
  const draftData = draft.data || {};
  return {
    id: draft.id,
    company_id: draft.company_id,
    user_id: draft.created_by,
    draft_data: draftData,
    // Extract optional fields from data JSONB if they exist, otherwise null
    customer_id: draft.customer_id || draftData.customer_id || null,
    vehicle_id: draft.vehicle_id || draftData.vehicle_id || null,
    draft_name: draft.draft_name || draftData.draft_name || null,
    created_at: draft.created_at,
    updated_at: draft.updated_at,
    expires_at: draft.last_saved_at || draft.created_at,
  };
}

export function useContractDrafts() {
  const { user } = useAuth();
  const { companyId } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();

  /**
   * Load all drafts for the current user
   * Filters out expired drafts and sorts by most recently updated
   */
  const loadDrafts = useQuery({
    queryKey: ['contract-drafts', companyId, user?.id],
    queryFn: async (): Promise<ContractDraft[]> => {
      if (!companyId || !user?.id) {
        return [];
      }

      const { data, error } = await supabase
        .from('contract_drafts')
        .select('*')
        .eq('company_id', companyId)
        .eq('created_by', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading contract drafts:', error);
        throw error;
      }

      // Map database fields to ContractDraft interface
      return (data || []).map(mapDraftFromDb);
    },
    enabled: !!companyId && !!user?.id,
    staleTime: 30000, // Cache for 30 seconds
  });

  /**
   * Save a new draft or update existing one
   */
  const saveDraft = useMutation({
    mutationFn: async (input: ContractDraftInput & { id?: string }) => {
      if (!companyId || !user?.id) {
        throw new Error('Company ID or User ID not available');
      }

      const draftPayload = {
        company_id: companyId,
        created_by: user.id,
        data: input.draft_data,
        last_saved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // If id is provided, update; otherwise, insert
      if (input.id) {
        const { data, error } = await supabase
          .from('contract_drafts')
          .update(draftPayload)
          .eq('id', input.id)
          .eq('created_by', user.id) // Security: only update own drafts
          .select()
          .single();

        if (error) throw error;
        return mapDraftFromDb(data);
      } else {
        const { data, error } = await supabase
          .from('contract_drafts')
          .insert([draftPayload])
          .select()
          .single();

        if (error) throw error;
        return mapDraftFromDb(data);
      }
    },
    onSuccess: (data, variables) => {
      toast.success(variables.id ? 'تم تحديث المسودة بنجاح' : 'تم حفظ المسودة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['contract-drafts'] });
    },
    onError: (error: Error) => {
      console.error('Error saving draft:', error);
      toast.error('فشل حفظ المسودة: ' + error.message);
    },
  });

  /**
   * Delete a draft
   */
  const deleteDraft = useMutation({
    mutationFn: async (draftId: string) => {
      if (!user?.id) {
        throw new Error('User ID not available');
      }

      const { error } = await supabase
        .from('contract_drafts')
        .delete()
        .eq('id', draftId)
        .eq('created_by', user.id); // Security: only delete own drafts

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم حذف المسودة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['contract-drafts'] });
    },
    onError: (error: Error) => {
      console.error('Error deleting draft:', error);
      toast.error('فشل حذف المسودة: ' + error.message);
    },
  });

  /**
   * Load a specific draft by ID
   */
  const loadDraft = (draftId: string) => {
    return useQuery({
      queryKey: ['contract-draft', draftId],
      queryFn: async (): Promise<ContractDraft | null> => {
        if (!draftId) return null;

        const { data, error } = await supabase
          .from('contract_drafts')
          .select('*')
          .eq('id', draftId)
          .single();

        if (error) {
          console.error('Error loading draft:', error);
          throw error;
        }

        if (!data) return null;

        // Map database fields to ContractDraft interface
        return mapDraftFromDb(data);
      },
      enabled: !!draftId,
    });
  };

  return {
    loadDrafts,
    saveDraft,
    deleteDraft,
    loadDraft,
  };
}
