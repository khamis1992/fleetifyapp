import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type LegalCase = Database['public']['Tables']['legal_cases']['Row'];
type FilingDatabase = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Functions'> & {
    Functions: Database['public']['Functions'] & {
      record_external_legal_filing_v1: {
        Args: { p_company_id: string; p_case_id: string; p_reference: string; p_filing_date: string };
        Returns: LegalCase;
      };
      record_external_legal_filing_v2: {
        Args: { p_company_id: string; p_case_id: string; p_reference: string; p_filing_date: string };
        Returns: { state: 'recorded'; legalCase: LegalCase } | { state: 'waiting_for_stop' | 'waiting_for_receipt' };
      };
    };
  };
};

export interface ExternalFilingInput {
  companyId: string;
  caseId: string;
  reference: string;
  date: string;
}

export type ExternalFilingProgress = 'recording' | 'waiting_for_stop' | 'waiting_for_receipt';

export class ExternalFilingWaitError extends Error {
  constructor(receiptPending: boolean) {
    super(receiptPending
      ? 'لم تكتمل مزامنة الإيصال بعد. بياناتك محفوظة؛ اضغط اعتماد الإجراء لمتابعة التحقق والتسجيل دون إعادة إرسال الدعوى.'
      : 'طُلب إيقاف الوكيل تلقائيًا ولم يصل تأكيد توقفه بعد. بياناتك محفوظة؛ اضغط اعتماد الإجراء لمتابعة الانتظار والتسجيل.');
    this.name = 'ExternalFilingWaitError';
  }
}

export class ExternalFilingUncertainError extends Error {
  constructor(public readonly canRetry = false) {
    super(canRetry
      ? 'انقطع الرد ولم يظهر تسجيل الإيداع عند التحقق. يمكنك التحقق مجددًا أو إعادة محاولة التسجيل بنفس البيانات.'
      : 'تعذر تأكيد نتيجة تسجيل الإيداع بسبب انقطاع الاتصال. بياناتك محفوظة في النافذة؛ اضغط «التحقق من التسجيل» قبل إعادة المحاولة.');
    this.name = 'ExternalFilingUncertainError';
  }
}

function isAmbiguousFailure(error: unknown, status?: number): boolean {
  const value = error as { name?: string; message?: string; code?: string } | null;
  return status === 0 || (status !== undefined && status >= 500)
    || ['AbortError', 'TimeoutError', 'TypeError'].includes(value?.name ?? '')
    || /abort|timed?\s*out|timeout|fetch failed|failed to fetch|network|connection|load failed/i.test(value?.message ?? '');
}

function matchesFiling(row: LegalCase | null, input: ExternalFilingInput): boolean {
  return Boolean(row && row.id === input.caseId && row.company_id === input.companyId
    && row.case_reference === input.reference.trim() && row.filing_date === input.date
    && ['awaiting_acceptance', 'hearings', 'reserved_for_judgment', 'judgment_issued',
      'appeal', 'enforcement', 'collection', 'closed'].includes(row.workflow_stage));
}

/** Fresh, company-scoped read; never writes or invokes the filing command. */
export async function verifyExternalLegalFiling(input: ExternalFilingInput): Promise<LegalCase | null> {
  let result;
  try {
    result = await supabase.from('legal_cases').select('*')
      .eq('company_id', input.companyId).eq('id', input.caseId).maybeSingle();
  } catch {
    throw new ExternalFilingUncertainError();
  }
  if (result.error || !result.data || result.data.id !== input.caseId || result.data.company_id !== input.companyId) throw new ExternalFilingUncertainError();
  if (matchesFiling(result.data, input)) return result.data;
  // Only permit a deliberate retry when a fresh read still allows the same
  // command. The RPC locks the row and is idempotent for this reference/date.
  if (['preparation', 'filed'].includes(result.data.workflow_stage)
    && (!result.data.case_reference || result.data.case_reference === input.reference.trim())) return null;
  throw new Error('توجد بيانات إيداع أو مرحلة مختلفة مسجلة لهذه القضية. راجع سجل القضية قبل أي تسجيل جديد.');
}

export async function recordExternalLegalFiling(
  input: ExternalFilingInput,
  onProgress?: (progress: ExternalFilingProgress) => void,
): Promise<LegalCase> {
  const db = supabase as unknown as SupabaseClient<FilingDatabase>;
  const deadline = Date.now() + 90_000;
  onProgress?.('recording');
  try {
    while (true) {
      const args = {
        p_company_id: input.companyId, p_case_id: input.caseId,
        p_reference: input.reference.trim(), p_filing_date: input.date,
      };
      let { data, error, status } = await db.rpc('record_external_legal_filing_v2', args);
      // During staged deployment/rollback, an absent RPC cannot have executed.
      // Preserve the existing filing command and its guards until v2 is installed.
      if (error?.code === 'PGRST202') {
        const previous = await db.rpc('record_external_legal_filing_v1', args);
        data = previous.data ? { state: 'recorded', legalCase: previous.data } : null;
        error = previous.error;
        status = previous.status;
      }
      if (error) {
        if (isAmbiguousFailure(error, status)) throw new ExternalFilingUncertainError();
        // Keep actionable Arabic validation from PostgreSQL, not transport internals.
        throw new Error(/[\u0600-\u06ff]/.test(error.message)
          ? error.message : 'تعذر تسجيل الإيداع. تحقق من صلاحيتك وحالة القضية ثم أعد المحاولة.');
      }
      if (data?.state === 'recorded' && matchesFiling(data.legalCase, input)) return data.legalCase;
      if (data?.state !== 'waiting_for_stop' && data?.state !== 'waiting_for_receipt') break;
      onProgress?.(data.state);
      if (Date.now() >= deadline) throw new ExternalFilingWaitError(data.state === 'waiting_for_receipt');
      // Only a confirmed pending response permits continuation. Network failures
      // still use read-back below, never an automatic replay of an uncertain write.
      await new Promise(resolve => setTimeout(resolve, 2_000));
    }
  } catch (error) {
    if (!(error instanceof ExternalFilingUncertainError) && !isAmbiguousFailure(error)) throw error;
  }
  const recorded = await verifyExternalLegalFiling(input);
  if (recorded) return recorded;
  throw new ExternalFilingUncertainError(true);
}
