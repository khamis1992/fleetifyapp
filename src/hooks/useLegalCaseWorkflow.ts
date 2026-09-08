import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyFilter } from '@/hooks/useCompanyScope';
import { recordExternalLegalFiling, verifyExternalLegalFiling, type ExternalFilingProgress } from '@/services/externalLegalFiling';

export type LegalWorkflowStage =
  | 'preparation'
  | 'filed'
  | 'awaiting_acceptance'
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
  { value: 'filed', label: 'تم إيداع الدعوى' },
  { value: 'awaiting_acceptance', label: 'بانتظار قبول الدعوى' },
  { value: 'hearings', label: 'الجلسات' },
  { value: 'reserved_for_judgment', label: 'محجوزة للحكم' },
  { value: 'judgment_issued', label: 'صدر الحكم' },
  { value: 'appeal', label: 'الاستئناف' },
  { value: 'enforcement', label: 'التنفيذ' },
  { value: 'collection', label: 'التحصيل' },
  { value: 'closed', label: 'مغلقة نهائياً' },
  { value: 'cancelled', label: 'ملغاة' },
];

export const REOPENABLE_LEGAL_WORKFLOW_STAGES: LegalWorkflowStage[] = [
  'preparation',
  'filed',
  'awaiting_acceptance',
  'hearings',
  'judgment_issued',
  'appeal',
  'enforcement',
  'collection',
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
  const [filingProgress, setFilingProgress] = useState<ExternalFilingProgress | null>(null);

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

  const publishSavedCase = (data: unknown) => {
    if (data && typeof data === 'object' && 'id' in data && data.id === caseId) {
      queryClient.setQueryData<LegalCaseWorkflowData>(['legal-case-workflow', companyId, caseId],
        (previous) => previous ? { ...previous, legalCase: data } : previous);
    }
  };

  const mutation = useMutation({
    retry: false,
    mutationFn: async ({ name, args }: RpcInput) => {
      if (!companyId || !caseId) throw new Error('تعذر تحديد الشركة أو القضية');
      if (name === 'record_external_legal_filing_v1') {
        try {
          return await recordExternalLegalFiling({ companyId, caseId, reference: String(args.p_reference), date: String(args.p_filing_date) }, setFilingProgress);
        } finally {
          setFilingProgress(null);
        }
      }
      const { data, error } = await db.rpc(name, { p_company_id: companyId, p_case_id: caseId, ...args });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      publishSavedCase(data);
      // The command result confirms saving. Background list refreshes must not
      // keep the save button spinning or turn a committed write into a failure.
      void Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ['legal-case-workflow', companyId, caseId] }),
        queryClient.invalidateQueries({ queryKey: ['legal-cases'] }),
        queryClient.invalidateQueries({ queryKey: ['taqadi-filing-job', companyId, caseId] }),
        queryClient.invalidateQueries({ queryKey: ['taqadi-filing-job-events', companyId] }),
        queryClient.invalidateQueries({ queryKey: ['legal-case', caseId] }),
        queryClient.invalidateQueries({ queryKey: ['legal-case-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['lawsuit-legal-case', companyId] }),
        queryClient.invalidateQueries({ queryKey: ['manual-legal-delinquency-queue', companyId] }),
        queryClient.invalidateQueries({ queryKey: ['opened-legal-cases-count', companyId] }),
        queryClient.invalidateQueries({ queryKey: ['contracts'] }),
        queryClient.invalidateQueries({ queryKey: ['contract-details'] }),
        queryClient.invalidateQueries({ queryKey: ['manual-legal-collections'] }),
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
      ]);
    },
  });

  const run = (name: string, args: Record<string, unknown>) => mutation.mutateAsync({ name, args });

  return {
    ...query,
    isSaving: mutation.isPending,
    filingProgress,
    recordExternalFiling: (reference: string, date: string) => run('record_external_legal_filing_v1', { p_reference: reference, p_filing_date: date }),
    verifyExternalFiling: async (reference: string, date: string) => {
      if (!companyId || !caseId) throw new Error('تعذر تحديد الشركة أو القضية');
      const recorded = await verifyExternalLegalFiling({ companyId, caseId, reference, date });
      if (recorded) publishSavedCase(recorded);
      return recorded;
    },
    transition: (target: LegalWorkflowStage, reason?: string) => run('transition_legal_case_workflow_v1', { p_target_stage: target, p_reason: reason || null }),
    correctUnfiled: (reason: string) => {
      const normalizedReason = reason.trim();
      if (normalizedReason.length < 10) {
        return Promise.reject(new Error('اكتب سبب التصحيح بما لا يقل عن 10 أحرف'));
      }
      return run('correct_unfiled_legal_case_to_preparation_v1', { p_reason: normalizedReason });
    },
    recordHearing: (values: Record<string, unknown>) => run('record_legal_case_hearing_v1', values),
    recordJudgment: (values: Record<string, unknown>) => run('record_legal_case_judgment_v1', values),
    recordAppeal: (values: Record<string, unknown>) => run('record_legal_case_appeal_v1', values),
    startEnforcement: (values: Record<string, unknown>) => run('start_legal_case_enforcement_v1', values),
    closeFinal: (reason: string, overrideUnsettled: boolean) => run('close_legal_case_final_v1', { p_reason: reason, p_override_unsettled: overrideUnsettled }),
    reopen: (target: LegalWorkflowStage, reason: string) => {
      const normalizedReason = reason.trim();
      if (!REOPENABLE_LEGAL_WORKFLOW_STAGES.includes(target)) {
        return Promise.reject(new Error('اختر مرحلة صحيحة لإعادة فتح القضية'));
      }
      if (normalizedReason.length < 10) {
        return Promise.reject(new Error('اكتب سبب إعادة الفتح بما لا يقل عن 10 أحرف'));
      }
      return run('reopen_legal_case_v1', { p_target_stage: target, p_reason: normalizedReason });
    },
  };
};
