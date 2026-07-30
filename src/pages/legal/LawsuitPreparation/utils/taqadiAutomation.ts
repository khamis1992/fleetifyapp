import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type {
  DocumentState,
  LawsuitPreparationState,
  ViolationEvidenceDocument,
} from '../store';
import {
  TAQADI_DEFAULT_DEFENDANT_ADDRESS,
  TAQADI_DEFAULT_DEFENDANT_EMAIL,
} from './taqadiDefaults';

export type TaqadiFilingStatus =
  | 'queued'
  | 'validating'
  | 'waiting_login'
  | 'filling_case'
  | 'validating_parties'
  | 'uploading_documents'
  | 'reviewing'
  | 'submitting'
  | 'filed'
  | 'needs_human'
  | 'failed'
  | 'cancelled';

export interface TaqadiFilingDocument {
  key: string;
  name: string;
  required: boolean;
  ready: boolean;
  url: string | null;
  htmlContent: string | null;
  mimeType: string | null;
}

export interface TaqadiFilingPayload {
  schemaVersion: '1.0';
  classification: {
    litigationDegree: 'ابتدائي';
    caseType: 'عقود الخدمات التجارية';
    caseSubtype: 'عقود إيجار السيارات وخدمات الليموزين';
    applicability: 'لا ينطبق';
  };
  plaintiff: {
    name: 'شركة العراف لتأجير السيارات';
    commercialRegistration: '146832';
    partyOrder: 1;
  };
  representative: {
    partyOrder: 2;
    validateBeforeOtherParties: true;
  };
  case: {
    title: string;
    facts: string;
    claims: string;
    amount: number;
    amountInWords: string;
  };
  defendant: {
    fullName: string;
    firstName: string | null;
    middleName: string | null;
    lastName: string | null;
    idNumber: string | null;
    idType: string | null;
    nationality: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
  contract: {
    id: string;
    number: string;
    startDate: string;
    endDate: string | null;
    monthlyAmount: number | null;
  };
  vehicle: LawsuitPreparationState['vehicle'];
  documents: TaqadiFilingDocument[];
  finalApproval: true;
  sourceUrl: string;
}

export interface TaqadiFilingJob {
  id: string;
  company_id: string;
  legal_case_id: string;
  contract_id: string;
  status: TaqadiFilingStatus;
  current_step: string;
  progress: number;
  result: Record<string, unknown> | null;
  error_code: string | null;
  error_message: string | null;
  attempt_count: number;
  max_attempts: number;
  locked_by: string | null;
  heartbeat_at: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface TaqadiFilingJobEvent {
  id: number;
  job_id: string;
  event_type: string;
  step: string | null;
  status: string | null;
  message: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface TaqadiFilingArtifact {
  id: string;
  job_id: string;
  artifact_type:
    | 'screenshot'
    | 'receipt'
    | 'submission_summary'
    | 'error_snapshot'
    | 'trace'
    | 'heal_proposal';
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface TaqadiAutomationWorker {
  worker_id: string;
  status: 'idle' | 'busy' | 'waiting_login' | 'error' | 'offline';
  version: string;
  current_job_id: string | null;
  hostname: string | null;
  heartbeat_at: string;
  last_error: string | null;
}

// The taqadi_* tables are not part of the generated Supabase types yet, so we
// describe the schema we rely on here to keep column names and RPC signatures
// checked at compile time instead of casting through `any`.
type TaqadiAutomationDatabase = {
  public: {
    Tables: {
      taqadi_filing_jobs: {
        Row: TaqadiFilingJob & { payload: Record<string, unknown> };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      taqadi_filing_job_events: {
        Row: TaqadiFilingJobEvent;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      taqadi_filing_artifacts: {
        Row: TaqadiFilingArtifact & { company_id: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      taqadi_automation_workers: {
        Row: TaqadiAutomationWorker & { started_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      enqueue_taqadi_filing_job_v1: {
        Args: {
          p_company_id: string;
          p_legal_case_id: string;
          p_payload: TaqadiFilingPayload;
          p_idempotency_key: string;
          p_final_approval: boolean;
        };
        Returns: TaqadiFilingJob;
      };
      retry_taqadi_filing_job_v1: {
        Args: { p_company_id: string; p_job_id: string };
        Returns: TaqadiFilingJob;
      };
      resume_taqadi_filing_job_v1: {
        Args: { p_company_id: string; p_job_id: string };
        Returns: TaqadiFilingJob;
      };
      cancel_taqadi_filing_job_v1: {
        Args: { p_company_id: string; p_job_id: string; p_reason: string };
        Returns: TaqadiFilingJob;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const automationClient =
  supabase as unknown as SupabaseClient<TaqadiAutomationDatabase>;

type AutomationRpcResult = PromiseLike<{
  data: unknown;
  error: { message: string } | null;
}>;

const callAutomationRpc = (
  functionName: keyof TaqadiAutomationDatabase['public']['Functions'],
  args: Record<string, unknown>,
) => (
  supabase.rpc as unknown as (
    name: string,
    parameters: Record<string, unknown>,
  ) => AutomationRpcResult
)(functionName, args);

const serializeDocument = (
  document: DocumentState,
  required = true,
): TaqadiFilingDocument => ({
  key: document.id,
  name: document.name,
  required,
  ready: document.status === 'ready',
  url: document.url,
  htmlContent: document.htmlContent,
  mimeType: document.htmlContent ? 'text/html' : null,
});

const serializeViolationEvidence = (
  document: ViolationEvidenceDocument,
): TaqadiFilingDocument => ({
  key: 'violationsEvidence',
  name: document.name,
  required: true,
  ready: Boolean(document.url),
  url: document.url,
  htmlContent: null,
  mimeType: document.mimeType,
});

export function buildTaqadiFilingPayload(
  state: LawsuitPreparationState,
  sourceUrl: string,
): TaqadiFilingPayload {
  if (!state.contract || !state.taqadiData || !state.calculations) {
    throw new Error('بيانات الدعوى غير مكتملة');
  }

  const requiredDocuments = [
    state.documents.memo,
    state.documents.claims,
    state.documents.docsList,
    state.documents.contract,
    state.documents.commercialRegister,
    state.documents.ibanCertificate,
    state.documents.representativeId,
  ].map((document) => serializeDocument(document));

  if (state.trafficViolations.length > 0) {
    requiredDocuments.push(serializeDocument(state.documents.violations));
    requiredDocuments.push(
      ...state.violationEvidenceDocuments.map(serializeViolationEvidence),
    );
  }

  const missing = requiredDocuments
    .filter((document) => !document.ready || (!document.url && !document.htmlContent))
    .map((document) => document.name);

  if (missing.length > 0) {
    throw new Error(`مستندات الدعوى غير مكتملة: ${missing.join('، ')}`);
  }

  const { taqadiData, contract } = state;
  return {
    schemaVersion: '1.0',
    classification: {
      litigationDegree: 'ابتدائي',
      caseType: 'عقود الخدمات التجارية',
      caseSubtype: 'عقود إيجار السيارات وخدمات الليموزين',
      applicability: 'لا ينطبق',
    },
    plaintiff: {
      name: 'شركة العراف لتأجير السيارات',
      commercialRegistration: '146832',
      partyOrder: 1,
    },
    representative: {
      partyOrder: 2,
      validateBeforeOtherParties: true,
    },
    case: {
      title: taqadiData.caseTitle,
      facts: taqadiData.facts,
      claims: taqadiData.claims,
      amount: taqadiData.amount,
      amountInWords: taqadiData.amountInWords,
    },
    defendant: {
      fullName: taqadiData.defendant.fullName,
      firstName: taqadiData.defendant.firstName,
      middleName: taqadiData.defendant.middleName,
      lastName: taqadiData.defendant.lastName,
      idNumber: taqadiData.defendant.idNumber,
      idType: taqadiData.defendant.idType,
      nationality: taqadiData.defendant.nationality,
      phone: taqadiData.defendant.phone,
      email: TAQADI_DEFAULT_DEFENDANT_EMAIL,
      address: TAQADI_DEFAULT_DEFENDANT_ADDRESS,
    },
    contract: {
      id: contract.id,
      number: contract.contract_number,
      startDate: contract.start_date,
      endDate: contract.end_date,
      monthlyAmount: contract.monthly_amount,
    },
    vehicle: state.vehicle,
    documents: requiredDocuments,
    finalApproval: true,
    sourceUrl,
  };
}

export async function enqueueTaqadiFilingJob(input: {
  companyId: string;
  legalCaseId: string;
  payload: TaqadiFilingPayload;
}) {
  const { data, error } = await callAutomationRpc('enqueue_taqadi_filing_job_v1', {
    p_company_id: input.companyId,
    p_legal_case_id: input.legalCaseId,
    p_payload: input.payload,
    p_idempotency_key: `taqadi:${input.legalCaseId}:v1`,
    p_final_approval: true,
  });

  if (error) throw error;
  return data as unknown as TaqadiFilingJob;
}

export async function getLatestTaqadiFilingJob(
  companyId: string,
  legalCaseId: string,
) {
  const { data, error } = await automationClient
    .from('taqadi_filing_jobs')
    .select(
      'id,company_id,legal_case_id,contract_id,status,current_step,progress,result,error_code,error_message,attempt_count,max_attempts,locked_by,heartbeat_at,created_at,updated_at,completed_at',
    )
    .eq('company_id', companyId)
    .eq('legal_case_id', legalCaseId)
    // Daily canary dry-runs share the case's queue; the panel must show the
    // real filing job, not the diagnostics clone.
    .or('payload->canary.is.null,payload->canary.neq.true')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as TaqadiFilingJob | null;
}

export async function getTaqadiFilingJobEvents(
  companyId: string,
  jobId: string,
) {
  const { data, error } = await automationClient
    .from('taqadi_filing_job_events')
    .select('id,job_id,event_type,step,status,message,details,created_at')
    .eq('company_id', companyId)
    .eq('job_id', jobId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as TaqadiFilingJobEvent[];
}

export async function getTaqadiFilingJobArtifacts(
  companyId: string,
  jobId: string,
) {
  const { data, error } = await automationClient
    .from('taqadi_filing_artifacts')
    .select('id,job_id,artifact_type,storage_path,file_name,mime_type,metadata,created_at')
    .eq('company_id', companyId)
    .eq('job_id', jobId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as TaqadiFilingArtifact[];
}

const TAQADI_ARTIFACTS_BUCKET = 'taqadi-automation-artifacts';

export async function getTaqadiArtifactDownloadUrl(storagePath: string) {
  const { data, error } = await supabase.storage
    .from(TAQADI_ARTIFACTS_BUCKET)
    .createSignedUrl(storagePath, 3600);

  if (error) throw error;
  return data.signedUrl;
}

export async function getActiveTaqadiWorker() {  const { data, error } = await automationClient
    .from('taqadi_automation_workers')
    .select(
      'worker_id,status,version,current_job_id,hostname,heartbeat_at,last_error',
    )
    .order('heartbeat_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as TaqadiAutomationWorker | null;
}

export async function retryTaqadiFilingJob(companyId: string, jobId: string) {
  const { data, error } = await callAutomationRpc(
    'retry_taqadi_filing_job_v1',
    {
      p_company_id: companyId,
      p_job_id: jobId,
    },
  );
  if (error) throw error;
  return data as unknown as TaqadiFilingJob;
}

export async function resumeTaqadiFilingJob(companyId: string, jobId: string) {
  const { data, error } = await callAutomationRpc(
    'resume_taqadi_filing_job_v1',
    {
      p_company_id: companyId,
      p_job_id: jobId,
    },
  );
  if (error) throw error;
  return data as unknown as TaqadiFilingJob;
}

export async function cancelTaqadiFilingJob(
  companyId: string,
  jobId: string,
  reason: string,
) {
  const { data, error } = await callAutomationRpc(
    'cancel_taqadi_filing_job_v1',
    {
      p_company_id: companyId,
      p_job_id: jobId,
      p_reason: reason,
    },
  );
  if (error) throw error;
  return data as unknown as TaqadiFilingJob;
}

// Realtime push replaces the panel's 3-second polling. The tables are added
// to the `supabase_realtime` publication in migration
// 20260729200000_taqadi_trace_artifacts_realtime.sql; existing RLS read
// policies scope the events to the user's company.
export function subscribeToTaqadiJobUpdates(input: {
  companyId: string;
  legalCaseId: string;
  onChange: () => void;
  onStatus?: (connected: boolean) => void;
}) {
  const channel = supabase
    .channel(`taqadi-filing-${input.legalCaseId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'taqadi_filing_jobs',
        filter: `legal_case_id=eq.${input.legalCaseId}`,
      },
      () => input.onChange(),
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'taqadi_filing_job_events',
        filter: `company_id=eq.${input.companyId}`,
      },
      () => input.onChange(),
    )
    .subscribe((status) => {
      input.onStatus?.(status === 'SUBSCRIBED');
    });

  return () => {
    input.onStatus?.(false);
    void supabase.removeChannel(channel);
  };
}

export const TERMINAL_TAQADI_STATUSES = new Set<TaqadiFilingStatus>([
  'filed',
  'failed',
  'cancelled',
]);

export const TAQADI_STATUS_LABELS: Record<TaqadiFilingStatus, string> = {
  queued: 'بانتظار الرفع',
  validating: 'فحص حزمة الدعوى',
  waiting_login: 'بانتظار تسجيل الدخول',
  filling_case: 'تعبئة بيانات الدعوى',
  validating_parties: 'مراجعة أطراف الدعوى',
  uploading_documents: 'رفع المستندات',
  reviewing: 'المراجعة النهائية',
  submitting: 'جاري الاعتماد',
  filed: 'تم رفع الدعوى',
  needs_human: 'تحتاج تدخلًا',
  failed: 'فشل الرفع',
  cancelled: 'ملغاة',
};
