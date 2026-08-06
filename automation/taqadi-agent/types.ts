export type FilingStatus =
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

export interface FilingDocument {
  key: string;
  name: string;
  required: boolean;
  ready: boolean;
  url: string | null;
  htmlContent: string | null;
  mimeType: string | null;
}

export interface FilingPayload {
  schemaVersion: '1.0';
  classification: {
    litigationDegree: string;
    caseType: string;
    caseSubtype: string;
    applicability: string;
  };
  plaintiff: {
    name: string;
    commercialRegistration: string;
    establishmentRegistration?: string;
    partyOrder: number;
  };
  representative: {
    partyOrder: number;
    validateBeforeOtherParties: boolean;
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
  vehicle: Record<string, unknown> | null;
  documents: FilingDocument[];
  finalApproval: boolean;
  sourceUrl: string;
  // Canary jobs re-run the portal flow up to the parties page and never
  // approve; they exist to detect Taqadi UI changes before real filings fail.
  canary?: boolean;
}

export interface FilingJob {
  id: string;
  company_id: string;
  legal_case_id: string;
  contract_id: string;
  status: FilingStatus;
  current_step: string;
  progress: number;
  payload: FilingPayload;
  result: Record<string, unknown> | null;
  attempt_count: number;
  max_attempts: number;
  final_approval: boolean;
  requested_by: string;
}

export interface MaterializedDocument {
  key: string;
  name: string;
  filePath: string;
  mimeType:
    | 'application/pdf'
    | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
}

export interface FilingResult {
  caseNumber: string | null;
  referenceNumber: string | null;
  courtFees: number | null;
  confirmationText: string;
}

export interface ProgressUpdate {
  status: Exclude<FilingStatus, 'queued' | 'filed' | 'cancelled'>;
  step: string;
  progress: number;
  message: string;
  details?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
}

export class HumanInterventionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'HumanInterventionError';
  }
}

export class SubmissionUncertainError extends HumanInterventionError {
  constructor(
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super(message, 'SUBMISSION_UNCERTAIN', details);
    this.name = 'SubmissionUncertainError';
  }
}
