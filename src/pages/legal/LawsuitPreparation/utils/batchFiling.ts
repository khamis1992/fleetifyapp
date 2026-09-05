/**
 * Batch Filing Service — خدمة الرفع الجماعي للدعاوى
 *
 * تُنفذ نفس خط أنابيب صفحة تجهيز الدعوى (تحميل البيانات → توليد المستندات
 * → بناء حزمة تقاضي → إدخال الطابور) لعدة عقود بالتتابع. الوكيل على جهاز
 * Windows يسحب المهام واحدة تلو الأخرى — لا رفع متوازيًا في تقاضي إطلاقًا.
 */

import { supabase } from '@/integrations/supabase/client';
import { calculateDelinquencyAmounts } from '@/utils/calculateDelinquencyAmounts';
import { lawsuitService } from '@/services/LawsuitService';
import {
  normalizeLegalContractDocumentIdentityRow,
  normalizeLegalIdentityMatchStatus,
  toLegalIdentityVerification,
} from '@/services/legalContractIdentityVerifier';
import { formatCustomerName } from '@/utils/formatCustomerName';
import { createInitialState } from '../store/reducer';
import type {
  Contract,
  Customer,
  LawsuitPreparationState,
  OverdueInvoice,
  TrafficViolation,
  Vehicle,
  ViolationEvidenceDocument,
  LegalMemoSnapshot,
} from '../store/types';
import {
  buildMemoDocumentData,
  isMemoSnapshotCurrent,
  prepareCurrentFilingState,
} from './documentGenerators';
import {
  getEffectiveLegalIdentityMatchStatus,
  selectLegalContractDocument,
} from './contractDocumentSelection';
import { registerLegalCase } from './caseRegistration';
import { getCurrentLegalCase, type LawsuitLegalCase } from './taqadiFiling';
import {
  buildTaqadiFilingPayload,
  enqueueTaqadiFilingJob,
  getLatestTaqadiFilingJob,
  TERMINAL_TAQADI_STATUSES,
} from './taqadiAutomation';
import {
  buildFactsAdditions,
  inferTaqadiIdType,
  type TaqadiNarrativeInput,
} from './taqadiNarrative';
import { buildLegalMemoClaimsText } from '@/utils/legal-memo-requests';
import { getLawsuitClaimAmounts } from './claimAmounts';
import { loadLegalClaimProjection } from './legalClaimSources';
import {
  calculateRetentionClaim,
  evaluateLegalCaseReadiness,
  getDefendantContact,
  getVerifiedDamageNet,
} from './legalCaseWorkflow';
import { isTrafficViolationsOnlyScope } from '@/types/legalClaimScope';

// ==========================================
// Candidate listing (قائمة العقود المرشحة)
// ==========================================

export interface BatchCandidate {
  contractId: string;
  contractNumber: string;
  contractStatus: string | null;
  customerName: string;
  hasNationalId: boolean;
  hasSignedContract: boolean;
  overdueInvoicesCount: number;
  totalRemaining: number;
}

interface CandidateInvoiceRow {
  contract_id: string | null;
  total_amount: number | null;
  paid_amount: number | null;
  balance_due?: number | null;
  due_date?: string | null;
  invoice_month?: string | null;
}

interface CandidateScheduleRow {
  contract_id: string;
  amount: number;
  paid_amount: number | null;
  due_date: string;
  invoice_id: string | null;
}

interface CandidateContractRow {
  id: string;
  contract_number: string;
  status: string | null;
  customer_id: string | null;
}

interface CandidateCustomerRow {
  id: string;
  first_name: string | null;
  first_name_ar: string | null;
  last_name: string | null;
  last_name_ar: string | null;
  customer_type: 'individual' | 'corporate' | null;
  company_name: string | null;
  company_name_ar: string | null;
  national_id: string | null;
}

type CandidateDocumentRow = Parameters<typeof selectLegalContractDocument>[0][number] & {
  contract_id: string | null;
};

/** دالة نقية: تجمع الفواتير المتأخرة لكل عقد وتبني صفوف المرشحين */
export function buildBatchCandidates(input: {
  invoices: CandidateInvoiceRow[];
  schedules?: CandidateScheduleRow[];
  contracts: CandidateContractRow[];
  customers: CandidateCustomerRow[];
  documents: CandidateDocumentRow[];
}): BatchCandidate[] {
  const remainingByContract = new Map<string, { count: number; total: number }>();
  const invoiceMonthsByContract = new Map<string, Set<string>>();
  for (const invoice of input.invoices) {
    const remaining = invoice.balance_due == null
      ? Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0)
      : Number(invoice.balance_due || 0);
    if (remaining <= 0 || !invoice.contract_id) continue;
    const entry = remainingByContract.get(invoice.contract_id) ?? { count: 0, total: 0 };
    entry.count += 1;
    entry.total += remaining;
    remainingByContract.set(invoice.contract_id, entry);
    const month = (invoice.invoice_month || invoice.due_date || '').slice(0, 7);
    if (month) {
      const months = invoiceMonthsByContract.get(invoice.contract_id) ?? new Set<string>();
      months.add(month);
      invoiceMonthsByContract.set(invoice.contract_id, months);
    }
  }

  for (const schedule of input.schedules ?? []) {
    if (schedule.invoice_id) continue;
    const remaining = Number(schedule.amount || 0) - Number(schedule.paid_amount || 0);
    if (remaining <= 0) continue;
    const month = schedule.due_date.slice(0, 7);
    if (invoiceMonthsByContract.get(schedule.contract_id)?.has(month)) continue;
    const entry = remainingByContract.get(schedule.contract_id) ?? { count: 0, total: 0 };
    entry.count += 1;
    entry.total += remaining;
    remainingByContract.set(schedule.contract_id, entry);
  }

  const customerById = new Map(input.customers.map((customer) => [customer.id, customer]));
  const documentsByContract = new Map<string, CandidateDocumentRow[]>();
  for (const document of input.documents) {
    if (!document.contract_id) continue;
    const list = documentsByContract.get(document.contract_id) ?? [];
    list.push(document);
    documentsByContract.set(document.contract_id, list);
  }

  return input.contracts
    .filter((contract) => remainingByContract.has(contract.id))
    .map((contract) => {
      const customer = contract.customer_id ? customerById.get(contract.customer_id) : null;
      const totals = remainingByContract.get(contract.id)!;
      return {
        contractId: contract.id,
        contractNumber: contract.contract_number,
        contractStatus: contract.status,
        customerName: customer ? formatCustomerName(customer as Customer) : 'عميل غير محدد',
        hasNationalId: Boolean(customer?.national_id),
        hasSignedContract: Boolean(
          selectLegalContractDocument(documentsByContract.get(contract.id) ?? []),
        ),
        overdueInvoicesCount: totals.count,
        totalRemaining: totals.total,
      };
    })
    .sort((a, b) => b.totalRemaining - a.totalRemaining);
}

export async function listBatchCandidates(companyId: string): Promise<BatchCandidate[]> {
  const today = new Date().toISOString().split('T')[0];

  const [invoiceResult, scheduleResult] = await Promise.all([
    supabase
      .from('invoices')
      .select('contract_id, total_amount, paid_amount, balance_due, due_date, invoice_month')
      .eq('company_id', companyId)
      .lte('due_date', today)
      .not('contract_id', 'is', null),
    supabase
      .from('contract_payment_schedules')
      .select('contract_id, amount, paid_amount, due_date, invoice_id')
      .eq('company_id', companyId)
      .lte('due_date', today),
  ]);
  const { data: invoices, error: invoicesError } = invoiceResult;
  if (invoicesError) throw invoicesError;
  if (scheduleResult.error) throw scheduleResult.error;

  const contractIds = [...new Set(
    [
      ...(invoices ?? []).map((invoice) => invoice.contract_id),
      ...(scheduleResult.data ?? []).map((schedule) => schedule.contract_id),
    ].filter((id): id is string => Boolean(id)),
  )];
  if (contractIds.length === 0) return [];

  const { data: contracts, error: contractsError } = await supabase
    .from('contracts')
    .select('id, contract_number, status, customer_id')
    .eq('company_id', companyId)
    .in('id', contractIds);
  if (contractsError) throw contractsError;

  const customerIds = [...new Set(
    (contracts ?? []).map((contract) => contract.customer_id).filter(Boolean),
  )] as string[];

  const [{ data: customers, error: customersError }, { data: documents, error: documentsError }] =
    await Promise.all([
      customerIds.length > 0
        ? supabase
          .from('customers')
          .select('id, first_name, first_name_ar, last_name, last_name_ar, customer_type, company_name, company_name_ar, national_id')
          .eq('company_id', companyId)
          .in('id', customerIds)
        : Promise.resolve({ data: [] as never[], error: null }),
      supabase
        .from('contract_documents')
        .select('id, contract_id, document_name, document_type, file_path, mime_type')
        .eq('company_id', companyId)
        .in('contract_id', contractIds),
    ]);
  if (customersError) throw customersError;
  if (documentsError) throw documentsError;

  return buildBatchCandidates({
    invoices: invoices ?? [],
    schedules: scheduleResult.data ?? [],
    contracts: contracts ?? [],
    customers: (customers ?? []) as CandidateCustomerRow[],
    documents: documents ?? [],
  });
}

// ==========================================
// Per-contract pipeline state loading
// ==========================================

async function loadBatchContractState(
  companyId: string,
  contractId: string,
): Promise<LawsuitPreparationState> {
  const state = createInitialState(contractId);
  state.companyId = companyId;

  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .select('*')
    .eq('id', contractId)
    .eq('company_id', companyId)
    .single();
  if (contractError) throw contractError;
  if (!contract) throw new Error('لم يتم العثور على العقد');

  let customer: Customer | null = null;
  if (contract.customer_id) {
    const { data } = await supabase
      .from('customers')
      .select('id, first_name, first_name_ar, last_name, last_name_ar, customer_type, company_name, company_name_ar, national_id, nationality, phone, email, address, country')
      .eq('id', contract.customer_id)
      .eq('company_id', companyId)
      .single();
    customer = data;
  }

  let vehicle: Vehicle | null = null;
  if (contract.vehicle_id) {
    const { data } = await supabase
      .from('vehicles')
      .select('make, model, year, plate_number, color, vin, status')
      .eq('id', contract.vehicle_id)
      .eq('company_id', companyId)
      .single();
    vehicle = data;
  }

  state.contract = contract as Contract;
  state.customer = customer;
  state.vehicle = vehicle;

  const currentLegalCase = await getCurrentLegalCase(companyId, contractId);
  state.legalCase = currentLegalCase
    ? {
        id: currentLegalCase.id,
        case_number: currentLegalCase.case_number,
        case_reference: currentLegalCase.case_reference,
        filing_date: currentLegalCase.filing_date,
        case_status: currentLegalCase.case_status || 'pending',
        workflow_stage: currentLegalCase.workflow_stage || 'preparation',
        claim_scope: currentLegalCase.claim_scope,
      }
    : null;
  const trafficOnlyClaim = isTrafficViolationsOnlyScope(currentLegalCase?.claim_scope);

  // المصدر الموحد: الفواتير، ثم الاستحقاقات القديمة غير المفوترة دون ازدواج.
  const claimProjection = await loadLegalClaimProjection(contractId, companyId);
  const overdueInvoices: OverdueInvoice[] = claimProjection.rows;
  state.overdueInvoices = overdueInvoices;
  state.financialClaimSource = claimProjection.summary;

  // المخالفات المرورية غير المسددة
  const { data: penaltyRows, error: penaltiesError } = await supabase
    .from('penalties')
    .select('*')
    .eq('contract_id', contractId)
    .eq('company_id', companyId)
    .neq('payment_status', 'paid')
    .neq('status', 'cancelled')
    .order('penalty_date', { ascending: false });
  if (penaltiesError) throw penaltiesError;
  const trafficViolations: TrafficViolation[] = (penaltyRows ?? []).map((violation) => ({
    id: violation.id,
    violation_number: violation.penalty_number,
    violation_date: violation.penalty_date,
    violation_type: violation.violation_type,
    location: violation.location,
    fine_amount: violation.amount,
    total_amount: violation.amount,
    status: violation.status || 'pending',
  }));
  state.trafficViolations = trafficViolations;

  // سجل الإعذار القانوني
  const { data: reminderRows } = await supabase
    .from('reminder_history')
    .select('sent_at, reminder_type')
    .eq('contract_id', contractId)
    .eq('success', true)
    .order('sent_at', { ascending: false });
  state.paymentReminders = {
    count: reminderRows?.length ?? 0,
    lastSentDate: reminderRows?.[0]?.sent_at ?? null,
    sendMethods: [...new Set(
      (reminderRows ?? [])
        .map((reminder) => reminder.reminder_type)
        .filter((type): type is string => Boolean(type)),
    )],
  };

  // مستندات الشركة القانونية
  state.companyDocuments = await lawsuitService.getCompanyLegalDocuments(companyId);
  for (const document of state.companyDocuments) {
    if (document.document_type === 'commercial_register') {
      state.documents.commercialRegister = {
        ...state.documents.commercialRegister,
        status: 'ready',
        url: document.file_url,
      };
    } else if (document.document_type === 'iban_certificate') {
      state.documents.ibanCertificate = {
        ...state.documents.ibanCertificate,
        status: 'ready',
        url: document.file_url,
      };
    } else if (document.document_type === 'representative_id') {
      state.documents.representativeId = {
        ...state.documents.representativeId,
        status: 'ready',
        url: document.file_url,
      };
    }
  }

  // العقد الموقع + أدلة المخالفات من contract_documents
  const { data: contractDocumentRows } = await supabase
    .from('contract_documents')
    .select('id, file_path, document_name, document_type, mime_type, legal_identity_match_status, legal_evidence_state, legal_identity_expected_name, legal_identity_extracted_name, legal_identity_expected_id, legal_identity_extracted_id, legal_identity_match_reason, legal_identity_checked_at')
    .eq('contract_id', contractId)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  const signedContract = selectLegalContractDocument(contractDocumentRows ?? []);
  if (signedContract?.file_path) {
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('contract-documents')
      .createSignedUrl(signedContract.file_path, 3600);
    const publicUrl = signedUrlError
      ? supabase.storage.from('contract-documents').getPublicUrl(signedContract.file_path).data.publicUrl
      : null;
    const documentUrl = signedUrlData?.signedUrl || publicUrl;
    if (documentUrl) {
      state.documents.contract = {
        ...state.documents.contract,
        status: 'ready',
        url: documentUrl,
        sourceDocumentId: signedContract.id,
        identityVerification: toLegalIdentityVerification(
          normalizeLegalContractDocumentIdentityRow(signedContract),
        ),
      };
    }
  }

  const evidenceDocuments: ViolationEvidenceDocument[] = (await Promise.all(
    (contractDocumentRows ?? [])
      .filter((document) => document.document_type === 'violations_proof' && document.file_path)
      .map(async (document) => {
        const { data: signedUrl, error: signedUrlError } = await supabase.storage
          .from('contract-documents')
          .createSignedUrl(document.file_path!, 3600);
        if (signedUrlError || !signedUrl?.signedUrl) return null;
        return {
          id: document.id,
          name: document.document_name,
          url: signedUrl.signedUrl,
          mimeType: document.mime_type,
        };
      }),
  )).filter((document): document is ViolationEvidenceDocument => Boolean(document));
  state.violationEvidenceDocuments = evidenceDocuments;
  state.documents.violationsEvidence = {
    ...state.documents.violationsEvidence,
    status: evidenceDocuments.length > 0 ? 'ready' : 'missing',
    url: evidenceDocuments[0]?.url || null,
  };

  state.contractEvidenceDocuments = (contractDocumentRows ?? []).map((document) => ({
    id: document.id,
    document_name: document.document_name,
    document_type: document.document_type,
    file_path: document.file_path,
    mime_type: document.mime_type,
    legal_identity_match_status: normalizeLegalIdentityMatchStatus(
      getEffectiveLegalIdentityMatchStatus(document),
    ),
    legal_identity_expected_id: document.legal_identity_expected_id,
    legal_identity_extracted_id: document.legal_identity_extracted_id,
  }));

  const [profileResult, noticesResult, damagesResult, snapshotsResult] = await Promise.all([
    supabase
      .from('legal_case_litigation_profile')
      .select('*')
      .eq('contract_id', contractId)
      .eq('company_id', companyId)
      .maybeSingle(),
    supabase
      .from('legal_case_formal_notices')
      .select('*')
      .eq('contract_id', contractId)
      .eq('company_id', companyId)
      .order('sent_on'),
    supabase
      .from('legal_case_damage_costs')
      .select('*')
      .eq('contract_id', contractId)
      .eq('company_id', companyId)
      .order('created_at'),
    supabase
      .from('legal_case_memo_snapshots')
      .select('*')
      .eq('contract_id', contractId)
      .eq('company_id', companyId)
      .order('version', { ascending: false }),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (noticesResult.error) throw noticesResult.error;
  if (damagesResult.error) throw damagesResult.error;
  if (snapshotsResult.error) throw snapshotsResult.error;
  state.litigationProfile = profileResult.data as typeof state.litigationProfile;
  state.formalNotices = (noticesResult.data || []) as typeof state.formalNotices;
  state.damageCosts = (damagesResult.data || []) as typeof state.damageCosts;
  state.memoSnapshots = (snapshotsResult.data || []) as unknown as LegalMemoSnapshot[];

  // الحسابات المالية
  const profile = state.litigationProfile;
  const compensation = !trafficOnlyClaim && profile?.contractual_compensation_enabled
    && profile.contractual_compensation_method
    && profile.contractual_compensation_document_id
    && profile.contractual_compensation_clause_number?.trim()
    && profile.contractual_compensation_clause_text?.trim()
    && Number(profile.contractual_compensation_rate) > 0
    ? {
        enabled: true,
        method: profile.contractual_compensation_method,
        rate: Number(profile.contractual_compensation_rate),
        cap: profile.contractual_compensation_cap,
      }
    : null;
  const verifiedDamages = trafficOnlyClaim ? 0 : getVerifiedDamageNet(state);
  const calculations = calculateDelinquencyAmounts(
    (trafficOnlyClaim ? [] : overdueInvoices).map((invoice) => ({
      id: invoice.id,
      invoice_number: invoice.invoice_number || undefined,
      due_date: invoice.due_date,
      total_amount: invoice.total_amount || 0,
      paid_amount: invoice.paid_amount || 0,
    })),
    (evidenceDocuments.length > 0 ? trafficViolations : []).map((violation) => ({
      id: violation.id,
      violation_number: violation.violation_number || undefined,
      fine_amount: Number(violation.fine_amount || 0),
      total_amount: Number(violation.total_amount || 0),
      status: violation.status,
    })),
    { documentedDamagesAmount: verifiedDamages, contractualCompensation: compensation },
  );
  const readiness = evaluateLegalCaseReadiness(state);
  const retention = trafficOnlyClaim
    ? { amount: 0, days: 0, from: null, to: null }
    : calculateRetentionClaim(profile, readiness.legalPath);
  const deposit = !trafficOnlyClaim && profile?.apply_security_deposit
    ? Number(profile.security_deposit_amount || 0)
    : 0;
  const total = getLawsuitClaimAmounts(
    { ...calculations, retentionCompensation: retention.amount },
    { securityDepositDeduction: deposit },
  ).cashClaimAmount;
  state.calculations = {
    ...calculations,
    retentionCompensation: retention.amount,
    securityDepositDeduction: deposit,
    total,
    amountInWords: lawsuitService.convertAmountToWords(total),
  };

  // بيانات التقاضي (نفس منطق صفحة التجهيز)
  if (state.contract && state.customer) {
    const customerName = formatCustomerName(state.customer, { preferArabic: true }) || 'غير محدد';
    const { taqadiClaimAmount } = getLawsuitClaimAmounts(state.calculations!);

    let factsText = lawsuitService.generateFactsText(
      customerName,
      state.contract.start_date,
      `${vehicle?.make || ''} ${vehicle?.model || ''} ${vehicle?.year || ''}`,
      taqadiClaimAmount,
      state.legalCase?.claim_scope,
    );

    const narrativeInput: TaqadiNarrativeInput = {
      claimAmount: taqadiClaimAmount,
      violationsCount: state.calculations!.violationsCount,
      violationsFines: state.calculations!.violationsFines,
      paidTotal: (trafficOnlyClaim ? [] : overdueInvoices).reduce(
        (sum, invoice) => sum + Number(invoice.paid_amount || 0),
        0,
      ),
      reminders: trafficOnlyClaim
        ? { count: 0, lastSentDate: null, sendMethods: [] }
        : state.paymentReminders,
      vehicleStatus: vehicle?.status ?? null,
      vehicleCustody: trafficOnlyClaim
        ? 'unknown'
        : profile?.vehicle_custody === 'with_defendant'
          ? 'with_defendant'
          : profile?.vehicle_custody === 'returned' || profile?.vehicle_custody === 'recovered_by_company'
            ? 'returned'
            : 'unknown',
      contractEndDate: trafficOnlyClaim ? null : state.contract.end_date,
      contractStatus: trafficOnlyClaim ? null : state.contract.status ?? null,
      legalPath: trafficOnlyClaim ? undefined : readiness.legalPath.effectivePath,
      terminationDate: trafficOnlyClaim ? null : readiness.legalPath.effectiveTerminationDate,
      formalNoticeCount: (trafficOnlyClaim ? [] : state.formalNotices).filter(
        (notice) => notice.delivery_confirmed && notice.proof_document_id,
      ).length,
      retentionCompensation: retention.amount,
      documentedDamages: calculations.damagesFee,
      monetaryDelayDamage: (trafficOnlyClaim ? [] : state.damageCosts)
        .filter((cost) => cost.verified && cost.cost_type === 'monetary_delay_damage')
        .reduce((sum, cost) => sum + Math.max(
          0,
          Number(cost.amount || 0)
            - Number(cost.depreciation_deduction || 0)
            - Number(cost.insurance_recovery || 0),
        ), 0),
      contractualCompensation: calculations.lateFees,
    };

    const additions = buildFactsAdditions(narrativeInput);
    if (additions.length > 0) {
      factsText += `\n\n${additions.join('\n\n')}`;
    }

    const fullName = customerName;
    const defendantContact = getDefendantContact(state);
    const nameParts = fullName.split(' ');
    const idType = inferTaqadiIdType(
      state.customer.national_id,
      state.customer.nationality || state.customer.country,
    );

    state.taqadiData = {
      caseTitle: lawsuitService.generateCaseTitle(customerName, state.legalCase?.claim_scope),
      facts: factsText,
      claims: buildLegalMemoClaimsText(buildMemoDocumentData(state)),
      amount: taqadiClaimAmount,
      amountInWords: lawsuitService.convertAmountToWords(taqadiClaimAmount),
      defendant: {
        fullName,
        firstName: nameParts[0] || null,
        middleName: nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : null,
        lastName: nameParts.length > 1 ? nameParts[nameParts.length - 1] : null,
        idNumber: state.customer.national_id,
        idType,
        nationality: state.customer.nationality || state.customer.country,
        phone: state.customer.phone,
        email: defendantContact.email,
        address: defendantContact.address,
      },
      contract: {
        contractNumber: state.contract.contract_number,
        startDate: state.contract.start_date,
        endDate: state.contract.end_date,
        monthlyAmount: state.contract.monthly_amount,
      },
      vehicle: {
        make: vehicle?.make || null,
        model: vehicle?.model || null,
        year: vehicle?.year || null,
        plateNumber: vehicle?.plate_number || state.contract.license_plate || null,
        color: vehicle?.color || null,
        vin: vehicle?.vin || null,
        fullDescription: vehicle
          ? `${vehicle.make || ''} ${vehicle.model || ''} ${vehicle.year || ''} - ${vehicle.plate_number || state.contract.license_plate || ''}`.trim()
          : state.contract.license_plate
            ? `المركبة ذات اللوحة ${state.contract.license_plate}`
            : 'غير محدد',
      },
    };
  }

  return state;
}

// ==========================================
// Enqueue pipeline
// ==========================================

export type BatchItemStatus = 'enqueued' | 'skipped' | 'failed';

export interface BatchFilingItemResult {
  contractId: string;
  contractNumber: string;
  customerName: string;
  status: BatchItemStatus;
  reason: string | null;
  jobId: string | null;
  legalCaseId: string | null;
}

export interface BatchFilingProgress {
  contractId: string;
  stage: 'loading' | 'generating' | 'registering' | 'enqueuing';
}

async function resolveLegalCase(
  companyId: string,
  contractId: string,
  state: LawsuitPreparationState,
  userId: string,
): Promise<LawsuitLegalCase> {
  const existing = await getCurrentLegalCase(companyId, contractId);
  if (existing) return existing;

  const registered = await registerLegalCase(state, userId);
  return {
    id: registered.caseId,
    case_number: registered.caseNumber,
    case_status: 'pending',
    workflow_stage: 'preparation',
    case_reference: null,
    court_fees: null,
    filing_date: null,
    created_at: null,
    claim_scope: state.legalCase?.claim_scope ?? 'full_outstanding',
  };
}

export async function enqueueContractFiling(input: {
  companyId: string;
  contractId: string;
  userId: string;
  sourceUrl: string;
  onProgress?: (progress: BatchFilingProgress) => void;
}): Promise<BatchFilingItemResult> {
  const { companyId, contractId, userId, sourceUrl } = input;
  const report = (stage: BatchFilingProgress['stage']) =>
    input.onProgress?.({ contractId, stage });

  const base: {
    contractId: string;
    contractNumber: string;
    customerName: string;
    jobId: string | null;
    legalCaseId: string | null;
  } = {
    contractId,
    contractNumber: '',
    customerName: '',
    jobId: null,
    legalCaseId: null,
  };

  try {
    report('loading');
    const state = await loadBatchContractState(companyId, contractId);
    base.contractNumber = state.contract?.contract_number ?? '';
    base.customerName = state.customer ? formatCustomerName(state.customer) : '';

    if (!state.customer) {
      return { ...base, status: 'skipped', reason: 'لا يوجد عميل مرتبط بالعقد' };
    }
    if (!state.calculations || state.calculations.total <= 0) {
      return { ...base, status: 'skipped', reason: 'مبلغ المطالبة صفر — لا مديونية متأخرة' };
    }
    const readiness = evaluateLegalCaseReadiness(state);
    if (readiness.status === 'not_ready') {
      return { ...base, status: 'skipped', reason: `الملف القانوني غير جاهز: ${readiness.issues.join('، ')}` };
    }
    if (
      state.litigationProfile?.legal_review_status !== 'approved'
      || state.memoSnapshots[0]?.readiness_status !== 'approved'
      || !isMemoSnapshotCurrent(state, state.memoSnapshots[0])
    ) {
      return { ...base, status: 'skipped', reason: 'لا توجد نسخة مذكرة معتمدة وحديثة لهذا العقد' };
    }

    report('generating');
    const filingState = await prepareCurrentFilingState(state);

    report('registering');
    const legalCase = await resolveLegalCase(companyId, contractId, state, userId);
    base.legalCaseId = legalCase.id;

    // نفس حراسة الرفع الفردي
    const currentStage = legalCase.workflow_stage || 'preparation';
    if (['closed', 'cancelled'].includes(currentStage)) {
      return { ...base, status: 'skipped', reason: 'القضية مغلقة أو ملغاة' };
    }
    if (!['preparation', 'filed'].includes(currentStage)) {
      return { ...base, status: 'skipped', reason: 'القضية تجاوزت مرحلة الرفع' };
    }
    if (currentStage === 'filed' && legalCase.case_reference) {
      return { ...base, status: 'skipped', reason: `مرفوعة مسبقًا بالمرجع ${legalCase.case_reference}` };
    }

    const existingJob = await getLatestTaqadiFilingJob(companyId, legalCase.id);
    if (existingJob && !TERMINAL_TAQADI_STATUSES.has(existingJob.status)) {
      return { ...base, status: 'skipped', reason: 'مهمة رفع قائمة بالفعل في الطابور' };
    }

    report('enqueuing');
    // يرمي خطأً برسالة المستندات الناقصة عند عدم اكتمال الحزمة
    const payload = buildTaqadiFilingPayload(filingState, sourceUrl);
    const job = await enqueueTaqadiFilingJob({
      companyId,
      legalCaseId: legalCase.id,
      payload,
    });

    return { ...base, status: 'enqueued', reason: null, jobId: job.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'خطأ غير معروف';
    // نقص المستندات = تخطٍّ لا فشل (يمكن استكماله من صفحة التجهيز)
    const status: BatchItemStatus = message.includes('مستندات الدعوى غير مكتملة')
      ? 'skipped'
      : 'failed';
    return { ...base, status, reason: message };
  }
}

/**
 * يرفع مجموعة عقود بالتتابع — مهمة واحدة في كل لحظة احترامًا لطبيعة
 * بوابة تقاضي ولتصميم الوكيل الذي يعالج قضية واحدة في كل مرة.
 */
export async function runBatchFiling(input: {
  companyId: string;
  contractIds: string[];
  userId: string;
  sourceUrl: string;
  onItemStart?: (contractId: string) => void;
  onItemDone?: (result: BatchFilingItemResult) => void;
  onProgress?: (progress: BatchFilingProgress) => void;
  shouldStop?: () => boolean;
}): Promise<BatchFilingItemResult[]> {
  const results: BatchFilingItemResult[] = [];

  for (const contractId of input.contractIds) {
    if (input.shouldStop?.()) break;
    input.onItemStart?.(contractId);
    const result = await enqueueContractFiling({
      companyId: input.companyId,
      contractId,
      userId: input.userId,
      sourceUrl: input.sourceUrl,
      onProgress: input.onProgress,
    });
    results.push(result);
    input.onItemDone?.(result);
  }

  return results;
}
