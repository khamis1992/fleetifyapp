/**
 * Document Generation Utilities
 * أدوات توليد المستندات
 */

import { supabase } from '@/integrations/supabase/client';
import { generateLegalComplaintHTML } from '@/utils/legal-document-generator';
import {
  generateDocumentsListHtml,
  generateClaimsStatementHtml,
  generateCriminalComplaintHtml,
  generateViolationsTransferHtml,
} from '@/utils/official-letter-generator';
import { formatCustomerName } from '@/utils/formatCustomerName';
import type { LawsuitPreparationState, DocumentsState } from '../store';

// ==========================================
// Helper Functions
// ==========================================

function createBlobUrl(html: string): string {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  return URL.createObjectURL(blob);
}

function saveDocumentToStorage(
  companyId: string,
  contractId: string,
  documentType: keyof DocumentsState,
  html: string,
  userId?: string
): Promise<void> {
  // Fire and forget - don't wait for this
  supabase
    .from('lawsuit_documents')
    .upsert({
      company_id: companyId,
      contract_id: contractId,
      document_type: documentType,
      document_name: getDocumentName(documentType),
      html_content: html,
      created_by: userId,
    }, {
      onConflict: 'contract_id,document_type'
    })
    .then(({ error }) => {
      if (error) console.error(`Error saving ${documentType}:`, error);
    });
  
  return Promise.resolve();
}

function getDocumentName(docType: keyof DocumentsState): string {
  const names: Record<string, string> = {
    memo: 'المذكرة الشارحة',
    claims: 'كشف المطالبات المالية',
    docsList: 'كشف المستندات المرفوعة',
    violations: 'كشف المخالفات المرورية',
    criminalComplaint: 'بلاغ سرقة المركبة',
    violationsTransfer: 'طلب تحويل المخالفات',
  };
  return names[docType] || 'مستند';
}

// ==========================================
// Document Generators
// ==========================================

/**
 * Generate Explanatory Memo (المذكرة الشارحة)
 */
export async function generateExplanatoryMemo(
  state: LawsuitPreparationState
): Promise<{ url: string; html: string }> {
  const { contract, customer, vehicle, calculations } = state;
  
  if (!contract || !calculations) {
    throw new Error('بيانات غير مكتملة');
  }
  
  const customerName = formatCustomerName(customer);
  const damagesAmount = Math.round(calculations.total * 0.3);
  
  const documentData = {
    customer: {
      customer_name: customerName,
      customer_code: customer?.id || '',
      id_number: customer?.national_id || '',
      phone: customer?.phone || '',
      email: customer?.email || '',
      contract_number: contract.contract_number,
      contract_start_date: contract.start_date,
      vehicle_plate: vehicle?.plate_number || (contract as any).license_plate || '',
      monthly_rent: Number(contract.monthly_amount) || 0,
      months_unpaid: state.overdueInvoices.length,
      overdue_amount: calculations.overdueRent,
      late_penalty: calculations.lateFees,
      days_overdue: Math.floor(
        (new Date().getTime() - new Date(contract.start_date).getTime()) / (1000 * 60 * 60 * 24)
      ),
      violations_count: calculations.violationsCount,
      violations_amount: calculations.violationsFines,
      total_debt: calculations.total - calculations.violationsFines,
    },
    companyInfo: {
      name_ar: 'شركة العراف لتأجير السيارات',
      name_en: 'Al-Araf Car Rental',
      address: 'أم صلال محمد – الشارع التجاري – مبنى (79) – الطابق الأول – مكتب (2)',
      cr_number: '146832',
    },
    vehicleInfo: {
      plate: vehicle?.plate_number || (contract as any).license_plate || 'غير محدد',
      make: vehicle?.make || '',
      model: vehicle?.model || '',
      year: vehicle?.year || 0,
    },
    contractInfo: {
      contract_number: contract.contract_number,
      start_date: contract.start_date
        ? new Date(contract.start_date).toLocaleDateString('ar-QA')
        : '',
      monthly_rent: Number(contract.monthly_amount) || 0,
    },
    damages: damagesAmount,
  };
  
  const html = generateLegalComplaintHTML(documentData);
  const url = createBlobUrl(html);
  
  // Save to storage (async, don't wait)
  if (state.companyId && state.contractId) {
    saveDocumentToStorage(
      state.companyId,
      state.contractId,
      'memo',
      html,
      undefined // user id can be passed if needed
    );
  }
  
  return { url, html };
}

/**
 * Generate Claims Statement (كشف المطالبات المالية)
 */
export async function generateClaimsStatement(
  state: LawsuitPreparationState
): Promise<{ url: string; html: string }> {
  const { contract, customer, calculations, overdueInvoices, trafficViolations } = state;
  
  if (!contract || !calculations) {
    throw new Error('بيانات غير مكتملة');
  }
  
  const customerName = formatCustomerName(customer);
  
  const invoicesData = overdueInvoices.map((inv) => {
    const daysLate = Math.floor(
      (new Date().getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24)
    );
    const remaining = (inv.total_amount || 0) - (inv.paid_amount || 0);
    const penalty = remaining > 0 ? Math.min(daysLate * 120, 3000) : 0;
    
    return {
      invoiceNumber: inv.invoice_number || '-',
      dueDate: inv.due_date,
      totalAmount: inv.total_amount || 0,
      paidAmount: inv.paid_amount || 0,
      daysLate,
      penalty,
    };
  });
  
  const violationsData = trafficViolations.map((v) => ({
    violationNumber: v.violation_number || '-',
    violationDate: v.violation_date || '',
    violationType: v.violation_type || 'غير محدد',
    location: v.location || '-',
    fineAmount: Number(v.total_amount) || Number(v.fine_amount) || 0,
  }));
  
  const totalPenalties = invoicesData.reduce((sum, inv) => sum + (inv.penalty || 0), 0);
  
  const html = generateClaimsStatementHtml({
    customerName,
    nationalId: customer?.national_id || '-',
    phone: customer?.phone || '',
    contractNumber: contract.contract_number,
    contractStartDate: contract.start_date || '',
    contractEndDate: contract.end_date || '',
    invoices: invoicesData,
    violations: violationsData,
    totalOverdue: calculations.overdueRent + calculations.violationsFines + totalPenalties,
    amountInWords: calculations.amountInWords,
    caseTitle: state.taqadiData?.caseTitle,
  });
  
  const url = createBlobUrl(html);
  
  // Save to storage
  if (state.companyId && state.contractId) {
    saveDocumentToStorage(
      state.companyId,
      state.contractId,
      'claims',
      html
    );
  }
  
  return { url, html };
}

/**
 * Generate Documents List (كشف المستندات المرفوعة)
 */
export async function generateDocumentsList(
  state: LawsuitPreparationState
): Promise<{ url: string; html: string }> {
  const { contract, customer, documents, taqadiData, companyDocuments } = state;
  
  if (!contract || !taqadiData) {
    throw new Error('بيانات غير مكتملة');
  }
  
  const customerName = formatCustomerName(customer);
  
  // Build documents list dynamically
  const docsList: { 
    name: string; 
    status: 'مرفق' | 'غير مرفق'; 
    url?: string; 
    type?: string;
    htmlContent?: string;
  }[] = [];
  
  // Add memo if ready
  if (documents.memo.status === 'ready' && documents.memo.url) {
    docsList.push({
      name: 'المذكرة الشارحة',
      status: 'مرفق',
      url: documents.memo.url,
      type: 'html',
      htmlContent: documents.memo.htmlContent || undefined,
    });
  }
  
  // Add claims statement if ready
  if (documents.claims.status === 'ready' && documents.claims.url) {
    docsList.push({
      name: 'كشف المطالبات المالية',
      status: 'مرفق',
      url: documents.claims.url,
      type: 'html',
      htmlContent: documents.claims.htmlContent || undefined,
    });
  }
  
  // Add contract if uploaded
  if (documents.contract.status === 'ready' && documents.contract.url) {
    docsList.push({
      name: 'صورة من العقد',
      status: 'مرفق',
      url: documents.contract.url,
      type: 'image',
    });
  }
  
  // Add company documents
  const fixedDocTypes = [
    { type: 'commercial_register', name: 'السجل التجاري' },
    { type: 'establishment_record', name: 'قيد المنشأة' },
    { type: 'iban_certificate', name: 'شهادة IBAN' },
    { type: 'representative_id', name: 'البطاقة الشخصية للممثل' },
    { type: 'authorization_letter', name: 'خطاب التفويض' },
  ] as const;
  
  for (const docType of fixedDocTypes) {
    const doc = companyDocuments.find(d => d.document_type === docType.type);
    if (doc) {
      docsList.push({
        name: docType.name,
        status: 'مرفق',
        url: doc.file_url,
        type: 'pdf',
      });
    } else {
      docsList.push({
        name: docType.name,
        status: 'غير مرفق',
      });
    }
  }
  
  const html = generateDocumentsListHtml({
    caseTitle: taqadiData.caseTitle,
    customerName,
    amount: taqadiData.amount,
    documents: docsList,
  });
  
  const url = createBlobUrl(html);
  
  return { url, html };
}

/**
 * Generate Violations List (كشف المخالفات المرورية)
 */
export async function generateViolationsList(
  state: LawsuitPreparationState
): Promise<{ url: string; html: string }> {
  const { contract, customer, trafficViolations, calculations } = state;
  
  if (!contract || trafficViolations.length === 0) {
    throw new Error('لا توجد مخالفات مرورية');
  }
  
  const customerName = formatCustomerName(customer);
  
  const violationsData = trafficViolations.map((v) => ({
    violationNumber: v.violation_number || '-',
    violationDate: v.violation_date || '',
    violationType: v.violation_type || 'غير محدد',
    location: v.location || '-',
    fineAmount: Number(v.total_amount) || Number(v.fine_amount) || 0,
  }));
  
  const html = generateClaimsStatementHtml({
    customerName,
    nationalId: customer?.national_id || '-',
    phone: customer?.phone || '',
    contractNumber: contract.contract_number,
    contractStartDate: contract.start_date || '',
    contractEndDate: contract.end_date || '',
    invoices: [], // Empty for violations-only view
    violations: violationsData,
    totalOverdue: calculations?.violationsFines || 0,
    amountInWords: '', // Will be generated in the function
    caseTitle: `كشف المخالفات المرورية - ${customerName}`,
  });
  
  const url = createBlobUrl(html);
  
  return { url, html };
}

/**
 * Generate Criminal Complaint (بلاغ سرقة المركبة)
 */
export async function generateCriminalComplaint(
  state: LawsuitPreparationState
): Promise<{ url: string; html: string }> {
  const { contract, customer, vehicle } = state;
  
  if (!contract) {
    throw new Error('بيانات العقد غير متوفرة');
  }
  
  const customerName = formatCustomerName(customer);
  
  const html = generateCriminalComplaintHtml({
    customerName,
    customerNationality: customer?.nationality || '',
    customerId: customer?.national_id || '-',
    customerMobile: customer?.phone || '',
    contractDate: contract.start_date
      ? new Date(contract.start_date).toLocaleDateString('ar-QA')
      : '-',
    contractEndDate: contract.end_date
      ? new Date(contract.end_date).toLocaleDateString('ar-QA')
      : '-',
    vehicleType: vehicle
      ? `${vehicle.make || ''} ${vehicle.model || ''} ${vehicle.year || ''}`.trim()
      : '-',
    plateNumber: vehicle?.plate_number || '-',
    plateType: 'خصوصي',
    manufactureYear: vehicle?.year?.toString() || '',
    chassisNumber: vehicle?.vin || '',
  });
  
  const url = createBlobUrl(html);
  
  // Save to storage
  if (state.companyId && state.contractId) {
    saveDocumentToStorage(
      state.companyId,
      state.contractId,
      'criminalComplaint',
      html
    );
  }
  
  return { url, html };
}

/**
 * Generate Violations Transfer Request (طلب تحويل المخالفات)
 */
export async function generateViolationsTransfer(
  state: LawsuitPreparationState
): Promise<{ url: string; html: string }> {
  const { contract, customer, vehicle, trafficViolations } = state;
  
  if (!contract || trafficViolations.length === 0) {
    throw new Error('لا توجد مخالفات مرورية');
  }
  
  const customerName = formatCustomerName(customer);
  
  const html = generateViolationsTransferHtml({
    customerName,
    customerId: customer?.national_id || '-',
    customerMobile: customer?.phone || '',
    contractNumber: contract.contract_number,
    contractDate: contract.start_date
      ? new Date(contract.start_date).toLocaleDateString('ar-QA')
      : '-',
    contractEndDate: contract.end_date
      ? new Date(contract.end_date).toLocaleDateString('ar-QA')
      : '-',
    vehicleType: vehicle
      ? `${vehicle.make || ''} ${vehicle.model || ''} ${vehicle.year || ''}`.trim()
      : '-',
    plateNumber: vehicle?.plate_number || '-',
    violations: trafficViolations.map(v => ({
      violationNumber: v.violation_number || '-',
      violationDate: v.violation_date
        ? new Date(v.violation_date).toLocaleDateString('ar-QA')
        : '-',
      violationType: v.violation_type || 'مخالفة مرورية',
      location: v.location || '',
      fineAmount: v.fine_amount || 0,
    })),
    totalFines: trafficViolations.reduce((sum, v) => sum + (v.fine_amount || 0), 0),
  });
  
  const url = createBlobUrl(html);
  
  // Save to storage
  if (state.companyId && state.contractId) {
    saveDocumentToStorage(
      state.companyId,
      state.contractId,
      'violationsTransfer',
      html
    );
  }
  
  return { url, html };
}

// ==========================================
// Main Generator Function
// ==========================================

export async function generateDocument(
  docId: keyof DocumentsState,
  state: LawsuitPreparationState
): Promise<{ url: string; html: string }> {
  switch (docId) {
    case 'memo':
      return generateExplanatoryMemo(state);
    case 'claims':
      return generateClaimsStatement(state);
    case 'docsList':
      return generateDocumentsList(state);
    case 'violations':
      return generateViolationsList(state);
    case 'criminalComplaint':
      return generateCriminalComplaint(state);
    case 'violationsTransfer':
      return generateViolationsTransfer(state);
    default:
      throw new Error(`Unknown document type: ${docId}`);
  }
}
