/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

export type LegalEmployeeReviewStatus =
  | 'awaiting_assignment'
  | 'pending'
  | 'in_progress'
  | 'corrections_required'
  | 'employee_approved'
  | 'deferred'
  | 'employee_rejected'
  | 'manager_overridden'
  | 'system_verified'
  | 'cancelled';

export type LegalEmployeeReviewDecision =
  | 'employee_approved'
  | 'corrections_required'
  | 'deferred'
  | 'employee_rejected';

export interface LegalTransferEmployeeReview {
  id: string;
  company_id: string;
  contract_id: string;
  customer_id: string;
  assigned_to_profile_id: string | null;
  requested_by: string;
  reviewed_by: string | null;
  overridden_by: string | null;
  status: LegalEmployeeReviewStatus;
  request_reason: string | null;
  employee_decision: string | null;
  employee_notes: string | null;
  override_reason: string | null;
  checklist: Record<string, unknown>;
  corrected_fields: Record<string, unknown>;
  request_snapshot: Record<string, unknown>;
  approval_snapshot: Record<string, unknown>;
  requested_at: string;
  due_at: string;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  contracts?: {
    id: string;
    contract_number: string;
    status: string;
    balance_due: number | null;
    late_fine_amount: number | null;
    vehicle_returned: boolean | null;
    assigned_to_profile_id: string | null;
    vehicle_id: string | null;
    vehicles?: {
      plate_number: string | null;
      make: string | null;
      model: string | null;
    } | null;
  } | null;
  customers?: {
    id: string;
    first_name_ar: string | null;
    last_name_ar: string | null;
    first_name: string | null;
    last_name: string | null;
    nationality: string | null;
    national_id: string | null;
    national_id_expiry: string | null;
    phone: string | null;
  } | null;
  profiles?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

const reviewSelect = `
  *,
  contracts!inner(
    id, contract_number, status, balance_due, late_fine_amount,
    vehicle_returned, assigned_to_profile_id, vehicle_id,
    vehicles(plate_number, make, model)
  ),
  customers!inner(
    id, first_name_ar, last_name_ar, first_name, last_name,
    nationality, national_id, national_id_expiry, phone
  ),
  profiles!legal_transfer_employee_reviews_assigned_to_profile_id_fkey(
    id, first_name, last_name
  )
`;

async function callReviewRpc<T>(name: string, params: Record<string, unknown>): Promise<T> {
  const { data, error } = await (supabase.rpc as any)(name, params);
  if (error) throw error;
  return data as T;
}

export function useCompanyLegalTransferEmployeeReviews() {
  const { companyId } = useUnifiedCompanyAccess();
  return useQuery({
    queryKey: ['legal-transfer-employee-reviews', 'company', companyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)('legal_transfer_employee_reviews')
        .select(reviewSelect)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as LegalTransferEmployeeReview[];
    },
    enabled: Boolean(companyId),
    staleTime: 30_000,
  });
}

export function useMyLegalTransferEmployeeReviews(profileId?: string | null) {
  const { companyId } = useUnifiedCompanyAccess();
  return useQuery({
    queryKey: ['legal-transfer-employee-reviews', 'employee', companyId, profileId],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)('legal_transfer_employee_reviews')
        .select(reviewSelect)
        .eq('company_id', companyId)
        .eq('assigned_to_profile_id', profileId)
        .in('status', ['pending', 'in_progress', 'corrections_required', 'deferred'])
        .order('due_at', { ascending: true });
      if (error) throw error;
      return (data || []) as LegalTransferEmployeeReview[];
    },
    enabled: Boolean(companyId && profileId),
    staleTime: 15_000,
  });
}

export function latestLegalEmployeeReviewByContract(
  reviews: LegalTransferEmployeeReview[],
): Map<string, LegalTransferEmployeeReview> {
  const result = new Map<string, LegalTransferEmployeeReview>();
  for (const review of reviews) {
    if (!result.has(review.contract_id)) result.set(review.contract_id, review);
  }
  return result;
}

export function useRequestLegalEmployeeReview() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ companyId, contractId, reason, assigneeProfileId }: {
      companyId: string;
      contractId: string;
      reason?: string;
      assigneeProfileId?: string | null;
    }) => callReviewRpc<LegalTransferEmployeeReview>('request_legal_transfer_employee_review_v1', {
      p_company_id: companyId,
      p_contract_id: contractId,
      p_reason: reason || null,
      p_actor_id: user?.id || null,
      p_assignee_profile_id: assigneeProfileId || null,
    }),
    onSuccess: (review) => {
      queryClient.invalidateQueries({ queryKey: ['legal-transfer-employee-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['contract-operations'] });
      toast.success(
        review.status === 'awaiting_assignment'
          ? 'تم إنشاء الطلب وهو بانتظار تعيين موظف مسؤول'
          : 'تم إرسال طلب التدقيق إلى الموظف المسؤول',
      );
    },
    onError: (error: Error) => toast.error('تعذر إرسال طلب التدقيق', { description: error.message }),
  });
}

export function useRespondToLegalEmployeeReview() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      companyId,
      reviewId,
      decision,
      notes,
      checklist,
      customerUpdates,
      contractUpdates,
    }: {
      companyId: string;
      reviewId: string;
      decision: LegalEmployeeReviewDecision;
      notes: string;
      checklist: Record<string, boolean>;
      customerUpdates: Record<string, string>;
      contractUpdates: { vehicle_returned: boolean };
    }) => callReviewRpc<LegalTransferEmployeeReview>('respond_legal_transfer_employee_review_v1', {
      p_company_id: companyId,
      p_review_id: reviewId,
      p_decision: decision,
      p_notes: notes,
      p_checklist: checklist,
      p_customer_updates: customerUpdates,
      p_contract_updates: contractUpdates,
      p_actor_id: user?.id || null,
    }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['legal-transfer-employee-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['employee-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      // Fire-and-forget: the verifier agent checks the employee's corrections
      // against the stored OCR evidence before the legal team relies on them.
      if (Object.keys(variables.customerUpdates || {}).length > 0) {
        void supabase.functions
          .invoke('correction-verifier-agent', {
            body: { reviewId: variables.reviewId, companyId: variables.companyId },
          })
          .catch((verifyError) => console.warn('Correction verifier failed:', verifyError));
      }
      toast.success('تم إرسال نتيجة التدقيق إلى الفريق القانوني');
    },
    onError: (error: Error) => toast.error('تعذر حفظ نتيجة التدقيق', { description: error.message }),
  });
}

export function useOverrideLegalEmployeeReview() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ companyId, reviewId, reason }: {
      companyId: string;
      reviewId: string;
      reason: string;
    }) => callReviewRpc<LegalTransferEmployeeReview>('override_legal_transfer_employee_review_v1', {
      p_company_id: companyId,
      p_review_id: reviewId,
      p_reason: reason,
      p_actor_id: user?.id || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-transfer-employee-reviews'] });
      toast.success('تم اعتماد التجاوز الإداري وتسجيل السبب');
    },
    onError: (error: Error) => toast.error('تعذر تنفيذ التجاوز الإداري', { description: error.message }),
  });
}
