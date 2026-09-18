import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { TaqadiFilingJob, TaqadiFilingPayload } from './taqadiAutomation';
import { taqadiErrorMessage } from './taqadiErrorMessage';

export interface VerifiedRestartConfirmation {
  jobId: string;
  expectedUpdatedAt: string;
  requestId: string;
  confirmedNotSubmitted: boolean;
  verificationNote: string;
}

type VerifiedRestartDatabase = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: {
      restart_verified_unsubmitted_taqadi_job_v1: {
        Args: {
          p_company_id: string;
          p_job_id: string;
          p_payload: TaqadiFilingPayload;
          p_expected_updated_at: string;
          p_confirmed_not_submitted: boolean;
          p_verification_note: string;
          p_request_id: string;
        };
        Returns: TaqadiFilingJob;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export async function restartVerifiedUnsubmittedJob(
  companyId: string,
  payload: TaqadiFilingPayload,
  confirmation: VerifiedRestartConfirmation,
): Promise<TaqadiFilingJob> {
  const note = confirmation.verificationNote.trim();
  if (!confirmation.confirmedNotSubmitted || note.length < 10 || note.length > 2000) {
    throw new Error('أكد مراجعة تقاضي وعدم إيداع الطلب، وسجل نتيجة التحقق في 10 أحرف على الأقل');
  }
  const client = supabase as unknown as SupabaseClient<VerifiedRestartDatabase>;
  const { data, error } = await client.rpc('restart_verified_unsubmitted_taqadi_job_v1', {
    p_company_id: companyId,
    p_job_id: confirmation.jobId,
    p_payload: payload,
    p_expected_updated_at: confirmation.expectedUpdatedAt,
    p_confirmed_not_submitted: confirmation.confirmedNotSubmitted,
    p_verification_note: note,
    p_request_id: confirmation.requestId,
  });
  if (error) {
    throw new Error(error.code === 'PGRST202'
      ? 'تحديث إعادة البدء بعد التحقق غير متاح بعد. حدّث الصفحة ثم أعد المحاولة.'
      : taqadiErrorMessage(error) || 'تعذر تأكيد إعادة البدء؛ حدّث حالة العملية قبل المحاولة مجددًا');
  }
  if (!data || data.id !== confirmation.jobId || data.company_id !== companyId || !data.status) {
    throw new Error('لم يؤكد النظام إعادة البدء؛ حدّث حالة العملية للتحقق من النتيجة');
  }
  return data;
}
