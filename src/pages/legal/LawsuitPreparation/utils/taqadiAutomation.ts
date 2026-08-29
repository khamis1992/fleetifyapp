import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { lawsuitService } from '@/services/LawsuitService';
import type {
  DocumentState,
  LawsuitPreparationState,
  ViolationEvidenceDocument,
} from '../store';
import { getLawsuitClaimAmounts } from './claimAmounts';
import { getDefendantContact } from './legalCaseWorkflow';

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
  sourceDocumentId: string | null;
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
    establishmentRegistration: '17201586';
    partyOrder: 1;
  };
  representative: {
    partyOrder: 1;
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

  memoSnapshotId: string;
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
      restart_taqadi_filing_job_v2: {
        Args: {
          p_company_id: string;
          p_job_id: string;
          p_payload: TaqadiFilingPayload;
        };
        Returns: TaqadiFilingJob;
      };
      refresh_taqadi_filing_job_payload_v1: {
        Args: {
          p_company_id: string;
          p_job_id: string;
          p_payload: TaqadiFilingPayload;
        };
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

  sourceDocumentId: document.sourceDocumentId || null,
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
  sourceDocumentId: null,
});

export function getLegalContractIdentityBlockReason(document: DocumentState) {
  const verification = document.identityVerification;
  if (!verification) {
    return 'لم يتم فحص هوية المستأجر في نسخة العقد الموقعة بعد.';
  }
  if (verification.status === 'matched') return null;
  if (verification.status === 'mismatch') {
    const extracted = verification.extractedName || verification.extractedId || 'شخص آخر';
    const expected = verification.expectedName || verification.expectedId || 'المدعى عليه';
    return `نسخة عقد الإيجار تخص «${extracted}» ولا تطابق المدعى عليه «${expected}». استبدل نسخة العقد قبل رفع الدعوى.`;
  }
  if (verification.status === 'unverified') {
    return 'لم يتمكن النظام من إثبات أن نسخة عقد الإيجار تخص المدعى عليه. راجع المستند أو ارفع نسخة أوضح.';
  }
  if (verification.status === 'expired_unverified') {
    return 'انتهت مهلة فحص نسخة عقد الإيجار دون إثبات الهوية. رُفع طلب تلقائي لنسخة أوضح ولا يمكن متابعة الدعوى بهذه النسخة.';
  }
  if (verification.status === 'failed') {
    return `تعذر فحص هوية المستأجر في نسخة العقد: ${verification.reason || 'أعد رفع نسخة واضحة ثم حاول مجددًا.'}`;
  }
  return 'فحص هوية المستأجر في نسخة العقد ما زال قيد التنفيذ.';
}

export function buildTaqadiFilingPayload(
  state: LawsuitPreparationState,
  sourceUrl: string,
): TaqadiFilingPayload {
  if (!state.contract || !state.taqadiData || !state.calculations) {
    throw new Error('بيانات الدعوى غير مكتملة');
  }

  const defendantNameParts = [
    state.taqadiData.defendant.firstName,
    state.taqadiData.defendant.middleName,
    state.taqadiData.defendant.lastName,
  ].filter((part): part is string => Boolean(part?.trim()));
  const hasInvalidDefendantName = defendantNameParts.length < 2
    || defendantNameParts.some((part) => !/[\u0600-\u06FF]/.test(part) || /[A-Za-z]/.test(part));
  if (hasInvalidDefendantName) {
    throw new Error(
      'اسم المدعى عليه يجب أن يكون مسجلًا بالعربية (الاسم الأول واسم العائلة) قبل الإرسال إلى تقاضي',
    );
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

  if (state.calculations.violationsCount > 0) {
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

  // Identity check only after the signed contract file itself is present/ready,
  // otherwise the toast misleadingly says identity-not-checked when the file
  // is simply missing from the portfolio.
  const contractIdentityBlockReason = getLegalContractIdentityBlockReason(
    state.documents.contract,
  );
  if (contractIdentityBlockReason) throw new Error(contractIdentityBlockReason);

  const { taqadiData, contract } = state;

  if (!taqadiData.defendant.address?.trim()) {
    throw new Error('عنوان تبليغ المدعى عليه مطلوب قبل الإرسال إلى تقاضي');
  }
  if (state.litigationProfile?.defendant_email_status === 'unavailable') {
    throw new Error('بريد المدعى عليه غير متوفر لدى الشركة؛ لا يجوز استخدام بريد المدعية بدلاً منه ويلزم استكماله أو مراجعة الرفع يدوياً');
  }
  if (state.litigationProfile?.defendant_email_status !== 'verified') {
    throw new Error('يجب تحديد بريد المدعى عليه كمتوفر ومتحقق قبل الإرسال إلى تقاضي');
  }
  const verifiedDefendantEmail = getDefendantContact(state).email;
  if (!taqadiData.defendant.email?.trim()) {
    throw new Error('البريد الإلكتروني للمدعى عليه مطلوب قبل الإرسال إلى تقاضي');
  }
  if (taqadiData.defendant.email.trim().toLowerCase() !== verifiedDefendantEmail.toLowerCase()) {
    throw new Error('بريد المدعى عليه في بيانات تقاضي لا يطابق البريد المتحقق في ملف القضية');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(taqadiData.defendant.email.trim())) {
    throw new Error('البريد الإلكتروني للمدعى عليه غير صالح للإرسال إلى تقاضي');
  }
  if (!contract.vehicle_id || !(state.vehicle?.plate_number || contract.license_plate)?.trim()) {
    throw new Error('يجب ربط العقد بسجل مركبة صحيح قبل الإرسال إلى تقاضي');
  }
  const { taqadiClaimAmount } = getLawsuitClaimAmounts(state.calculations);
  const currentMemoSnapshot = state.memoSnapshots[0];
  if (!currentMemoSnapshot?.id) {
    throw new Error('لم تُثبّت نسخة حديثة من المذكرة بعد؛ أعد المحاولة بعد اكتمال تجهيز الصفحة');
  }
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
      establishmentRegistration: '17201586',
      partyOrder: 1,
    },
    representative: {
      partyOrder: 1,
      validateBeforeOtherParties: true,
    },
    case: {
      title: taqadiData.caseTitle,
      facts: taqadiData.facts,
      claims: taqadiData.claims,
      amount: taqadiClaimAmount,
      amountInWords: lawsuitService.convertAmountToWords(taqadiClaimAmount),
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
      email: taqadiData.defendant.email,
      address: taqadiData.defendant.address,
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

    memoSnapshotId: currentMemoSnapshot.id,
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

export function isSafeLegacyReviewMismatchRetry(
  job: TaqadiFilingJob | null | undefined,
  events: TaqadiFilingJobEvent[],
  expected: { caseTitle: string | null | undefined; contractNumber: string | null | undefined },
): boolean {
  if (
    !job
    || job.status !== 'needs_human'
    || job.error_code !== 'REVIEW_MISMATCH'
    || job.current_step !== 'review_mismatch'
    || job.attempt_count >= job.max_attempts
  ) {
    return false;
  }

  const diagnostic = [...events]
    .reverse()
    .find((event) => (
      event.job_id === job.id
      && event.status === 'needs_human'
      && event.step === 'review_mismatch'
      && event.details?.claimAmountMatches !== undefined
    ));
  if (!diagnostic) return false;

  const { details } = diagnostic;
  const requiredActions = details.requiredActions;
  const validationMessages = details.validationMessages;
  const missing = details.missing;
  if (
    details.claimAmountMatches !== true
    || details.portalStage !== 'review'
    || details.portalConfidence !== 'high'
    || !Array.isArray(requiredActions)
    || requiredActions.length > 0
    || !Array.isArray(validationMessages)
    || validationMessages.length > 0
    || !Array.isArray(missing)
    || missing.length === 0
    || missing.some((value) => typeof value !== 'string')
  ) {
    return false;
  }

  const legacyOnlyExpectations = new Set(
    [expected.caseTitle, expected.contractNumber]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value)),
  );
  return legacyOnlyExpectations.size > 0
    && missing.every((value) => legacyOnlyExpectations.has(value.trim()));
}

export function isSafePartyIdentityTypeRetry(
  job: TaqadiFilingJob | null | undefined,
  events: TaqadiFilingJobEvent[],
): boolean {
  if (
    !job
    || job.status !== 'needs_human'
    || job.error_code !== 'PARTY_IDENTITY_TYPE_UNAVAILABLE'
    || job.current_step !== 'party_identity_type_unavailable'
    || job.attempt_count >= job.max_attempts
  ) {
    return false;
  }

  const diagnostic = [...events]
    .reverse()
    .find((event) => (
      event.job_id === job.id
      && event.status === 'needs_human'
      && event.step === 'party_identity_type_unavailable'
    ));
  if (!diagnostic) return false;

  const { details } = diagnostic;
  const requestedType = String(details.requestedType || '');
  const nationality = String(details.nationality || '');
  const availableOptions = Array.isArray(details.availableOptions)
    ? details.availableOptions.filter((option): option is string => typeof option === 'string')
    : [];
  const requiredActions = details.requiredActions;
  const requestsQatariIdentity = /بطاقه?\s*(?:شخصيه?|هويه)|هوية\s*قطري/u.test(
    requestedType.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه'),
  );
  const isQatariNational = /^(?:قطر|قطري|قطرية)$/u.test(nationality.trim());
  const offersResidentLicense = availableOptions.some((option) =>
    /رخصه?\s*(?:مقيم|اقامه)|بطاقه?\s*مقيم|هويه?\s*مقيم/u.test(
      option.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه'),
    ));

  return details.partyKind === 'defendant'
    && details.portalStage === 'parties'
    && details.portalConfidence === 'high'
    && details.resumeSupported === true
    && Array.isArray(requiredActions)
    && requiredActions.length === 0
    && requestsQatariIdentity
    && !isQatariNational
    && offersResidentLicense;
}

export async function getTaqadiFilingJobCaseSnapshot(
  companyId: string,
  jobId: string,
) {
  const { data, error } = await automationClient
    .from('taqadi_filing_jobs')
    .select('case_payload:payload->case')
    .eq('company_id', companyId)
    .eq('id', jobId)
    .single();
  if (error) throw error;
  return (data as unknown as {
    case_payload: TaqadiFilingPayload['case'];
  }).case_payload;
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

export async function refreshTaqadiFilingJobPayload(
  companyId: string,
  jobId: string,
  payload: TaqadiFilingPayload,
) {
  const { data, error } = await callAutomationRpc(
    'refresh_taqadi_filing_job_payload_v1',
    {
      p_company_id: companyId,
      p_job_id: jobId,
      p_payload: payload,
    },
  );
  if (error) throw error;
  return data as unknown as TaqadiFilingJob;
}

export async function syncLegalCaseWithTaqadiPayload(
  companyId: string,
  contractId: string,
  legalCaseId: string,
  payload: TaqadiFilingPayload,
) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    throw new Error('تعذر تحديد المستخدم لمزامنة قيمة القضية');
  }

  const { error } = await supabase.rpc('sync_lawsuit_preparation_to_legal_case_v1', {
    p_actor_id: authData.user.id,
    p_case_id: legalCaseId,
    p_case_title: payload.case.title,
    p_claim_amount: payload.case.amount,
    p_claims: payload.case.claims,
    p_company_id: companyId,
    p_contract_id: contractId,
    p_facts: payload.case.facts,
  });
  if (error) throw error;

  const { data: legalCase, error: readError } = await supabase
    .from('legal_cases')
    .select('notes')
    .eq('company_id', companyId)
    .eq('contract_id', contractId)
    .eq('id', legalCaseId)
    .single();
  if (readError) throw readError;

  const notesPrefix = (legalCase.notes || '')
    .split(/\n\s*\n(?=1\.\s)/u, 1)[0]
    .trim();
  const normalizedNotes = [notesPrefix, payload.case.claims.trim()]
    .filter(Boolean)
    .join('\n\n');
  const { error: updateError } = await supabase
    .from('legal_cases')
    .update({ notes: normalizedNotes })
    .eq('company_id', companyId)
    .eq('contract_id', contractId)
    .eq('id', legalCaseId);
  if (updateError) throw updateError;
}

export async function retryTaqadiFilingJob(
  companyId: string,
  jobId: string,
  refreshedPayload?: TaqadiFilingPayload,
) {
  if (refreshedPayload) {
    const { data, error } = await callAutomationRpc(
      'restart_taqadi_filing_job_v2',
      {
        p_company_id: companyId,
        p_job_id: jobId,
        p_payload: refreshedPayload,
      },
    );
    if (error) throw error;
    return data as unknown as TaqadiFilingJob;
  }
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
