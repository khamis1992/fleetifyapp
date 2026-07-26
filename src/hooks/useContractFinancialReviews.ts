import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import type { Json } from '@/integrations/supabase/types';

export const CONTRACT_FINANCIAL_REVIEW_CATEGORY = 'contract_financial_review';
export const OPEN_FINANCIAL_REVIEW_STATUSES = ['pending', 'in_progress', 'on_hold'] as const;

export type FinancialIssueType =
  | 'payment_wrong_invoice'
  | 'payment_amount_or_date'
  | 'missing_or_duplicate_invoice'
  | 'schedule_invoice_mismatch'
  | 'balance_mismatch'
  | 'accounting_entry'
  | 'other';

export type FinancialReviewResolution =
  | 'corrected'
  | 'approved_as_is'
  | 'needs_more_information'
  | 'legal_transfer_rejected';

export interface ContractFinancialReviewMetadata {
  source: 'customer_verification';
  verificationTaskId: string;
  contractId: string;
  contractNumber: string;
  customerId: string;
  customerName: string;
  issueType: FinancialIssueType;
  issueLabel: string;
  relatedInvoiceId?: string;
  relatedInvoiceNumber?: string;
  reportedAmount?: number;
  reportedBy: string;
  managerProfileId: string;
  employeeDetails?: string;
  managerResolution?: FinancialReviewResolution;
  managerResolutionLabel?: string;
  managerNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  returnedAt?: string;
}

export interface ContractFinancialReviewTask {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  created_by: string;
  assigned_to: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string | null;
  metadata: ContractFinancialReviewMetadata;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    first_name: string;
    last_name: string;
    first_name_ar: string | null;
    last_name_ar: string | null;
  } | null;
}

export const financialIssueLabels: Record<FinancialIssueType, string> = {
  payment_wrong_invoice: 'دفعة مرتبطة بفاتورة غير صحيحة',
  payment_amount_or_date: 'مبلغ أو تاريخ دفعة غير صحيح',
  missing_or_duplicate_invoice: 'فاتورة ناقصة أو مكررة',
  schedule_invoice_mismatch: 'اختلاف جدول الدفعات عن الفواتير',
  balance_mismatch: 'رصيد العقد غير مطابق',
  accounting_entry: 'مشكلة في القيد المحاسبي',
  other: 'مشكلة مالية أخرى',
};

const taskSelect = `
  *,
  creator:profiles!tasks_created_by_fkey(
    id,
    first_name,
    last_name,
    first_name_ar,
    last_name_ar
  )
`;

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

async function findManagerProfile(companyId: string, fallbackProfileId: string) {
  const { data: roleRows, error: roleError } = await supabase
    .from('user_roles')
    .select('user_id, role')
    .eq('company_id', companyId)
    .in('role', ['company_admin', 'manager']);

  const managerUserIds = roleError ? [] : (roleRows || []).map((row) => row.user_id);
  if (managerUserIds.length > 0) {
    const { data: managerProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, user_id, role')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .in('user_id', managerUserIds)
      .order('created_at', { ascending: true })
      .limit(1);

    if (profilesError) throw profilesError;
    if (managerProfiles?.[0]?.id) return managerProfiles[0].id;
  }

  const { data: legacyManagers, error: legacyError } = await supabase
    .from('profiles')
    .select('id')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .in('role', ['admin', 'owner', 'super_admin', 'company_admin', 'manager'])
    .order('created_at', { ascending: true })
    .limit(1);

  if (legacyError) throw legacyError;
  return legacyManagers?.[0]?.id || fallbackProfileId;
}

export function useFinancialReviewAccess() {
  const { user } = useAuth();
  const { hasCompanyAdminAccess } = useUnifiedCompanyAccess();
  const companyId = user?.profile?.company_id;

  const query = useQuery({
    queryKey: ['financial-review-access', companyId, user?.id, hasCompanyAdminAccess],
    queryFn: async () => {
      if (!companyId || !user?.id) return false;
      if (hasCompanyAdminAccess) return true;

      const { data, error } = await supabase
        .from('user_roles')
        .select('id')
        .eq('company_id', companyId)
        .eq('user_id', user.id)
        .in('role', ['company_admin', 'manager'])
        .limit(1);

      if (error) throw error;
      return Boolean(data?.length);
    },
    enabled: Boolean(companyId && user?.id),
    staleTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    canReviewFinancialIssues: query.data === true,
  };
}

export function useVerificationFinancialReview(verificationTaskId?: string) {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['verification-financial-review', companyId, verificationTaskId],
    queryFn: async () => {
      if (!companyId || !verificationTaskId) return null;

      const { data, error } = await supabase
        .from('tasks')
        .select(taskSelect)
        .eq('company_id', companyId)
        .eq('category', CONTRACT_FINANCIAL_REVIEW_CATEGORY)
        .contains('metadata', { verificationTaskId })
        .in('status', [...OPEN_FINANCIAL_REVIEW_STATUSES])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as ContractFinancialReviewTask | null;
    },
    enabled: Boolean(companyId && verificationTaskId),
    staleTime: 15_000,
  });
}

export function useManagerFinancialReviews() {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;
  const profileId = user?.profile?.id;
  const { canReviewFinancialIssues } = useFinancialReviewAccess();

  return useQuery({
    queryKey: ['manager-financial-reviews', companyId, profileId],
    queryFn: async () => {
      if (!companyId || !profileId) return [];

      const { data, error } = await supabase
        .from('tasks')
        .select(taskSelect)
        .eq('company_id', companyId)
        .eq('category', CONTRACT_FINANCIAL_REVIEW_CATEGORY)
        .eq('assigned_to', profileId)
        .in('status', [...OPEN_FINANCIAL_REVIEW_STATUSES])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as ContractFinancialReviewTask[];
    },
    enabled: Boolean(companyId && profileId && canReviewFinancialIssues),
  });
}

interface CreateFinancialReviewInput {
  verificationTaskId: string;
  contractId: string;
  contractNumber: string;
  customerId: string;
  customerName: string;
  issueType: FinancialIssueType;
  details: string;
  relatedInvoiceId?: string;
  relatedInvoiceNumber?: string;
  reportedAmount?: number;
}

export function useCreateContractFinancialReview() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateFinancialReviewInput) => {
      const companyId = user?.profile?.company_id;
      const profileId = user?.profile?.id;
      if (!companyId || !profileId) throw new Error('تعذر تحديد الموظف أو الشركة');

      const { data: existing, error: existingError } = await supabase
        .from('tasks')
        .select('id')
        .eq('company_id', companyId)
        .eq('category', CONTRACT_FINANCIAL_REVIEW_CATEGORY)
        .contains('metadata', { verificationTaskId: input.verificationTaskId })
        .in('status', [...OPEN_FINANCIAL_REVIEW_STATUSES])
        .limit(1)
        .maybeSingle();

      if (existingError) throw existingError;
      if (existing) throw new Error('توجد مراجعة مالية مفتوحة لهذه المهمة بالفعل');

      const managerProfileId = await findManagerProfile(companyId, profileId);
      if (managerProfileId === profileId) {
        throw new Error('لم يتم العثور على مدير نشط لإسناد المراجعة المالية إليه');
      }

      const issueLabel = financialIssueLabels[input.issueType];
      const metadata: ContractFinancialReviewMetadata = {
        source: 'customer_verification',
        verificationTaskId: input.verificationTaskId,
        contractId: input.contractId,
        contractNumber: input.contractNumber,
        customerId: input.customerId,
        customerName: input.customerName,
        issueType: input.issueType,
        issueLabel,
        relatedInvoiceId: input.relatedInvoiceId,
        relatedInvoiceNumber: input.relatedInvoiceNumber,
        reportedAmount: input.reportedAmount,
        reportedBy: profileId,
        managerProfileId,
        employeeDetails: input.details.trim(),
      };

      const { data: task, error } = await supabase
        .from('tasks')
        .insert({
          company_id: companyId,
          created_by: profileId,
          assigned_to: managerProfileId,
          title: `مراجعة مالية للعقد ${input.contractNumber}`,
          description: `${issueLabel}\n\n${input.details.trim()}`,
          status: 'pending',
          priority: 'high',
          due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          category: CONTRACT_FINANCIAL_REVIEW_CATEGORY,
          tags: ['financial-review', 'contract', 'human-decision'],
          metadata: toJson(metadata),
        })
        .select()
        .single();

      if (error) throw error;

      await Promise.allSettled([
        supabase.from('task_activity_log').insert({
          task_id: task.id,
          user_id: profileId,
          action: 'created',
          description: `رفع الموظف مشكلة مالية في العقد ${input.contractNumber} إلى المدير`,
          new_value: toJson({ issueType: input.issueType, verificationTaskId: input.verificationTaskId }),
        }),
        supabase.from('task_notifications').insert({
          task_id: task.id,
          user_id: managerProfileId,
          type: 'assignment',
          title: 'مراجعة مالية لعقد',
          message: `توجد مشكلة مالية تحتاج قرارك في العقد ${input.contractNumber}`,
        }),
      ]);

      return task;
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ['verification-financial-review', undefined, input.verificationTaskId] });
      queryClient.invalidateQueries({ queryKey: ['verification-financial-review'] });
      queryClient.invalidateQueries({ queryKey: ['manager-financial-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-statistics'] });
    },
  });
}

interface ResolveFinancialReviewInput {
  task: ContractFinancialReviewTask;
  resolution: FinancialReviewResolution;
  notes: string;
}

export function useResolveContractFinancialReview() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { canReviewFinancialIssues } = useFinancialReviewAccess();

  return useMutation({
    mutationFn: async ({ task, resolution, notes }: ResolveFinancialReviewInput) => {
      const companyId = user?.profile?.company_id;
      const profileId = user?.profile?.id;
      if (!companyId || !profileId || !canReviewFinancialIssues) {
        throw new Error('هذا الإجراء متاح للمدير فقط');
      }
      if (!notes.trim()) throw new Error('اكتب نتيجة المراجعة قبل حفظ القرار');

      const { data, error } = await supabase.rpc('resolve_contract_financial_review_v1', {
        p_company_id: companyId,
        p_task_id: task.id,
        p_resolution: resolution,
        p_notes: notes.trim(),
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ['manager-financial-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['verification-financial-review'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['task', input.task.id] });
    },
  });
}

interface ResubmitFinancialReviewInput {
  task: ContractFinancialReviewTask;
  details: string;
}

export function useResubmitContractFinancialReview() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ task, details }: ResubmitFinancialReviewInput) => {
      const companyId = user?.profile?.company_id;
      const profileId = user?.profile?.id;
      if (!companyId || !profileId || task.metadata.reportedBy !== profileId) {
        throw new Error('لا يمكنك تحديث مراجعة مالية لم تقم بإنشائها');
      }
      if (!details.trim()) throw new Error('اكتب المعلومات المطلوبة');

      const nextMetadata: ContractFinancialReviewMetadata = {
        ...task.metadata,
        employeeDetails: `${task.metadata.employeeDetails || ''}\n\nاستكمال الموظف:\n${details.trim()}`.trim(),
        managerResolution: undefined,
        managerResolutionLabel: undefined,
        returnedAt: undefined,
      };

      const { data, error } = await supabase
        .from('tasks')
        .update({
          status: 'pending',
          assigned_to: task.metadata.managerProfileId,
          description: `${task.metadata.issueLabel}\n\n${nextMetadata.employeeDetails}`,
          metadata: toJson(nextMetadata),
        })
        .eq('id', task.id)
        .eq('company_id', companyId)
        .eq('assigned_to', profileId)
        .select()
        .single();

      if (error) throw error;

      await Promise.allSettled([
        supabase.from('task_activity_log').insert({
          task_id: task.id,
          user_id: profileId,
          action: 'information_added',
          description: `استكمل الموظف معلومات المراجعة المالية: ${details.trim()}`,
        }),
        supabase.from('task_notifications').insert({
          task_id: task.id,
          user_id: task.metadata.managerProfileId,
          type: 'assignment',
          title: 'تم استكمال المراجعة المالية',
          message: `أضاف الموظف معلومات جديدة للعقد ${task.metadata.contractNumber}`,
        }),
      ]);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-financial-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['verification-financial-review'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
