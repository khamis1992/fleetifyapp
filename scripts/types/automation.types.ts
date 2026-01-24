/**
 * TypeScript Types for Legal Case Automation System
 * Qatar Court System Automation
 */

export interface CustomerData {
  firstName: string;
  familyName: string;
  nationality: string;
  idNumber: string;
  mobile: string;
  amount: number;
  facts: string;
  requests: string;
}

export interface AutomationConfig {
  credentials: {
    username: string;
    password: string;
  };
  court: {
    courtName: string;
    proceedingType: string;
    litigationDegree: string;
    type: string;
    subtype: string;
    subject: string;
    classification: string;
  };
  case: {
    title: string;
    claimType: string;
    address: string;
    email: string;
  };
  documents: {
    memo: { pdf: string; docx: string };
    portfolio: string;
    iban: string;
    idCard: string;
    commercialRecord: string;
  };
  automation: {
    headless: boolean;
    slowMo: number;
    timeout: number;
    screenshotsDir: string;
    logsDir: string;
    retryAttempts: number;
    retryDelay: number;
  };
}

export interface TestCase {
  customerName: string;
  data: CustomerData;
  documents: string[];
}

export interface AutomationResult {
  success: boolean;
  caseReference?: string;
  customerName: string;
  steps: StepResult[];
  errors: string[];
  timestamp: Date;
  duration: number;
}

export interface StepResult {
  stepNumber: number;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  timestamp: Date;
  error?: string;
  screenshot?: string;
}

export enum StepStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

export interface DocumentUpload {
  type: string;
  description: string;
  files: string[];
}

export interface PartyDetails {
  classification: string;
  capacity: string;
  order: number;
  familyName: string;
  firstName: string;
  gender: string;
  nationality: string;
  cardType: string;
  idNumber: string;
  translatorRequired: string;
  heir: string;
  address: string;
  mobile: string;
  email: string;
}

export interface TestCaseData {
  customerData: CustomerData;
  partyDetails: PartyDetails;
  documents: DocumentUpload[];
}
