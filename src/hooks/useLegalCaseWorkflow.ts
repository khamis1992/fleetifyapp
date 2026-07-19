import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyFilter } from '@/hooks/useCompanyScope';

export type LegalWorkflowStage =
  | 'preparation'
  | 'filed'
  | 'hearings'
  | 'reserved_for_judgment'
  | 'judgment_issued'
  | 'appeal'
  | 'enforcement'
  | 'collection'
  | 'closed'
  | 'cancelled';

export const LEGAL_WORKFLOW_STAGES: Array<{ value: LegalWorkflowStage; label: string }> = [
  { value: 'preparation', label: 'تجهيز الملف' },
  { value: 'filed', label: 'تم رفع الدعوى' },
  { value: 'hearings', label: 'الجلسات' },
  { value: 'reserved_for_judgment', label: 'محجوزة للحكم' },
  { value: 'judgment_issued', label: 'صدر الحكم' },
  { value: 'appeal', label: 'الاستئناف' },
  { value: 'enforcement', label: 'التنفيذ' },
  { value: 'collection', label: 'التحصيل' },
  { value: 'closed', label: 'مغلقة نهائياً' },
  { value: 'cancelled', label: 'ملغاة' },
];

export interface LegalCaseWorkflowData {
  legalCase: Record<string, any>;
  hearings: Record<string, any>[];
  appeals: Record<string, any>[];
  enforcements: Record<string, any>[];
  payments: Record<string, any>[];
  settlement: Record<string, any> | null;
  tasks: Record<string, any>[];
}

type RpcInput = { name: string; args: Record<string, unknown> };

export const useLegalCaseWorkflow = (caseId?: string) => {
  const companyFilter = useCompanyFilter();
  const queryClient = useQueryClient();
  const companyId = companyFilter.company_id;
  const db = supabase as any;

  const query = useQuery({
    queryKey: ['legal-case-workflow', companyId, caseId],
    enabled: Boolean(companyId && caseId),
    queryFn: async (): Promise<LegalCaseWorkflowData> => {
      const [caseResult, hearingsResult, appealsResult, enforcementsResult, paymentsResult, settlementResult, tasksResult] = await Promise.all([
        db.from('legal_cases').select('*').eq('id', caseId).eq('company_id', companyId).single(),
        db.from('legal_case_hearings').select('*').eq('case_id', caseId).eq('company_id', companyId).order('hearing_date', { ascending: false }),
        db.from('legal_case_appeals').select('*').eq('case_id', caseId).eq('company_id', companyId).order('created_at', { ascending: false }),
        db.from('legal_case_enforcements').select('*').eq('case_id', caseId).eq('company_id', companyId).order('created_at', { ascending: false }),
        db.from('legal_case_payment_allocations').select('id,allocated_amount,status,payments:payment_id(payment_status,journal_entry_id,journal_entries:journal_entry_id(status))').eq('case_id', caseId).eq('company_id', companyId).eq('status', 'active'),
        db.from('legal_judgment_settlements_v1').select('settled_amount,remaining_amount,settlement_status').eq('id', caseId).eq('company_id', companyId).maybeSingle(),
        db.from('tasks').select('id,title,status,priority,due_date,metadata').eq('company_id', companyId).eq('category', 'legal_workflow').contains('metadata', { legal_case_id: caseId }).order('created_at', { ascending: false }),
      ]);
      const failed = [caseResult, hearingsResult, appealsResult, enforcementsResult, paymentsResult, settlementResult, tasksResult].find((result) => result.error);
      if (failed?.error) throw failed.error;
      return {
        legalCase: caseResult.data,
        hearings: hearingsResult.data ?? [],
        appeals: appealsResult.data ?? [],
        enforcements: enforcementsResult.data ?? [],
        payments: paymentsResult.data ?? [],
        settlement: settlementResult.data ?? null,
        tasks: tasksResult.data ?? [],
      };
    },
    staleTime: 10_000,
  });

  const mutation = useMutation({
    mutationFn: async ({ name, args }: RpcInput) => {
      if (!companyId || !caseId) throw new Error('تعذر تحديد الشركة أو القضية');
      const { data, error } = await db.rpc(name, { p_company_id: companyId, p_case_id: caseId, ...args });
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['legal-case-workflow', companyId, caseId] }),
        queryClient.invalidateQueries({ queryKey: ['legal-cases'] }),
        queryClient.invalidateQueries({ queryKey: ['legal-case', caseId] }),
        queryClient.invalidateQueries({ queryKey: ['legal-case-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['manual-legal-collections'] }),
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
      ]);
    },
  });

  const run = (name: string, args: Record<string, unknown>) => mutation.mutateAsync({ name, args });

  return {
    ...query,
    isSaving: mutation.isPending,
    transition: (target: LegalWorkflowStage, reason?: string) => run('transition_legal_case_workflow_v1', { p_target_stage: target, p_reason: reason || null }),
    recordHearing: (values: Record<string, unknown>) => run('record_legal_case_hearing_v1', values),
    recordJudgment: (values: Record<string, unknown>) => run('record_legal_case_judgment_v1', values),
    recordAppeal: (values: Record<string, unknown>) => run('record_legal_case_appeal_v1', values),
    startEnforcement: (values: Record<string, unknown>) => run('start_legal_case_enforcement_v1', values),
    closeFinal: (reason: string, overrideUnsettled: boolean) => run('close_legal_case_final_v1', { p_reason: reason, p_override_unsettled: overrideUnsettled }),
    reopen: (target: LegalWorkflowStage, reason: string) => run('reopen_legal_case_v1', { p_target_stage: target, p_reason: reason }),
  };
};
