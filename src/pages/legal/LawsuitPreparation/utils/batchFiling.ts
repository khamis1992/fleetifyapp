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
} from '../store/types';
import { generateDocument } from './documentGenerators';
import { selectLegalContractDocument } from './contractDocumentSelection';
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
  buildTaqadiClaims,
  type TaqadiNarrativeInput,
} from './taqadiNarrative';
import {
  TAQADI_DEFAULT_DEFENDANT_ADDRESS,
  TAQADI_DEFAULT_DEFENDANT_EMAIL,
} from './taqadiDefaults';
import { getLawsuitClaimAmounts } from './claimAmounts';

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
  contracts: CandidateContractRow[];
  customers: CandidateCustomerRow[];
  documents: CandidateDocumentRow[];
}): BatchCandidate[] {
  const remainingByContract = new Map<string, { count: number; total: number }>();
  for (const invoice of input.invoices) {
    const remaining = Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0);
    if (remaining <= 0 || !invoice.contract_id) continue;
    const entry = remainingByContract.get(invoice.contract_id) ?? { count: 0, total: 0 };
    entry.count += 1;
    entry.total += remaining;
    remainingByContract.set(invoice.contract_id, entry);
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

  const { data: invoices, error: invoicesError } = await supabase
    .from('invoices')
    .select('contract_id, total_amount, paid_amount')
    .eq('company_id', companyId)
    .lt('due_date', today)
    .not('contract_id', 'is', null);
  if (invoicesError) throw invoicesError;

  const contractIds = [...new Set(
    (invoices ?? [])
      .filter((invoice) => Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0) > 0)
      .map((invoice) => invoice.contract_id)
      .filter((id): id is string => Boolean(id)),
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

  // الفواتير المتأخرة غير المسددة بالكامل
  const today = new Date().toISOString().split('T')[0];
  const { data: invoiceRows, error: invoicesError } = await supabase
    .from('invoices')
    .select('id, invoice_number, due_date, total_amount, paid_amount')
    .eq('contract_id', contractId)
    .eq('company_id', companyId)
    .lt('due_date', today);
  if (invoicesError) throw invoicesError;
  const overdueInvoices: OverdueInvoice[] = (invoiceRows ?? [])
    .filter((invoice) => Boolean(invoice.due_date)
      && Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0) > 0)
    .map((invoice) => ({
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      due_date: invoice.due_date!,
      total_amount: Number(invoice.total_amount || 0),
      paid_amount: Number(invoice.paid_amount || 0),
    }));
  state.overdueInvoices = overdueInvoices;

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
    .select('id, file_path, document_name, document_type, mime_type')
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

  // الحسابات المالية
  const calculations = calculateDelinquencyAmounts(
    overdueInvoices.map((invoice) => ({
      id: invoice.id,
      invoice_number: invoice.invoice_number || undefined,
      due_date: invoice.due_date,
      total_amount: invoice.total_amount || 0,
      paid_amount: invoice.paid_amount || 0,
    })),
    trafficViolations.map((violation) => ({
      id: violation.id,
      violation_number: violation.violation_number || undefined,
      fine_amount: Number(violation.fine_amount || 0),
      total_amount: Number(violation.total_amount || 0),
      status: violation.status,
    })),
    { includeDamagesFee: true },
  );
  state.calculations = {
    ...calculations,
    amountInWords: lawsuitService.convertAmountToWords(calculations.total),
  };

  // بيانات التقاضي (نفس منطق صفحة التجهيز)
  if (state.contract && state.customer) {
    const customerName = formatCustomerName(state.customer, { preferArabic: true }) || 'غير محدد';
    const { cashClaimAmount, taqadiClaimAmount } = getLawsuitClaimAmounts(state.calculations);

    let factsText = lawsuitService.generateFactsText(
      customerName,
      state.contract.start_date,
      `${vehicle?.make || ''} ${vehicle?.model || ''} ${vehicle?.year || ''}`,
      cashClaimAmount,
    );

    const narrativeInput: TaqadiNarrativeInput = {
      claimAmount: cashClaimAmount,
      violationsCount: state.calculations.violationsCount,
      violationsFines: state.calculations.violationsFines,
      paidTotal: overdueInvoices.reduce(
        (sum, invoice) => sum + Number(invoice.paid_amount || 0),
        0,
      ),
      reminders: state.paymentReminders,
      vehicleStatus: vehicle?.status ?? null,
      contractEndDate: state.contract.end_date,
      contractStatus: state.contract.status ?? null,
    };

    const additions = buildFactsAdditions(narrativeInput);
    if (additions.length > 0) {
      factsText += `\n\n${additions.join('\n\n')}`;
    }

    const fullName = customerName;
    const nameParts = fullName.split(' ');
    let idType = 'بطاقة شخصية';
    if (state.customer.nationality === 'Qatar' || state.customer.nationality === 'قطر') {
      idType = 'بطاقة قطرية';
    } else if (
      state.customer.national_id
      && state.customer.national_id.replace(/\D/g, '').length === 11
    ) {
      idType = 'رخصة مقيم';
    }

    state.taqadiData = {
      caseTitle: lawsuitService.generateCaseTitle(customerName),
      facts: factsText,
      claims: buildTaqadiClaims(narrativeInput),
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
        email: TAQADI_DEFAULT_DEFENDANT_EMAIL,
        address: TAQADI_DEFAULT_DEFENDANT_ADDRESS,
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
        plateNumber: vehicle?.plate_number || null,
        color: vehicle?.color || null,
        vin: vehicle?.vin || null,
        fullDescription: vehicle
          ? `${vehicle.make || ''} ${vehicle.model || ''} ${vehicle.year || ''} - ${vehicle.plate_number || ''}`.trim()
          : 'غير محدد',
      },
    };
  }

  return state;
}

async function generateFilingDocuments(state: LawsuitPreparationState): Promise<void> {
  const memo = await generateDocument('memo', state);
  state.documents.memo = {
    ...state.documents.memo,
    status: 'ready',
    url: memo.url,
    htmlContent: memo.html,
    generatedAt: new Date().toISOString(),
  };

  const claims = await generateDocument('claims', state);
  state.documents.claims = {
    ...state.documents.claims,
    status: 'ready',
    url: claims.url,
    htmlContent: claims.html,
    generatedAt: new Date().toISOString(),
  };

  // كشف المستندات يعتمد على المذكرة وكشف المطالبات الجاهزين أعلاه
  const docsList = await generateDocument('docsList', state);
  state.documents.docsList = {
    ...state.documents.docsList,
    status: 'ready',
    url: docsList.url,
    htmlContent: docsList.html,
    generatedAt: new Date().toISOString(),
  };

  if (state.trafficViolations.length > 0) {
    const violations = await generateDocument('violations', state);
    state.documents.violations = {
      ...state.documents.violations,
      status: 'ready',
      url: violations.url,
      htmlContent: violations.html,
      generatedAt: new Date().toISOString(),
    };
  }
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

    report('generating');
    await generateFilingDocuments(state);

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
    const payload = buildTaqadiFilingPayload(state, sourceUrl);
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
