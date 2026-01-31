/**
 * Case Registration Utilities
 * أدوات تسجيل القضية
 */

import { supabase } from '@/integrations/supabase/client';
import { useConvertToLegalCase } from '@/hooks/useConvertToLegalCase';
import type { LawsuitPreparationState, DocumentsState } from '../store';
import { formatCustomerName } from '@/utils/formatCustomerName';

interface RegisterCaseResult {
  caseId: string;
  caseNumber: string;
}

interface CaseDocument {
  case_id: string;
  company_id: string;
  document_type: string;
  document_title: string;
  document_title_ar: string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  description: string;
  is_confidential: boolean;
  created_by: string;
}

/**
 * Upload HTML document to storage
 */
async function uploadHtmlDocument(
  html: string,
  fileName: string,
  companyId: string,
  contractId: string
): Promise<string> {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const filePath = `lawsuits/${companyId}/${contractId}/${Date.now()}-${fileName}`;
  
  const { error: uploadError } = await supabase.storage
    .from('legal-documents')
    .upload(filePath, blob);
  
  if (uploadError) throw uploadError;
  
  return filePath;
}

/**
 * Register legal case in the system
 */
export async function registerLegalCase(
  state: LawsuitPreparationState,
  userId: string
): Promise<RegisterCaseResult> {
  const { 
    contract, 
    customer, 
    vehicle, 
    calculations, 
    taqadiData, 
    documents, 
    overdueInvoices,
    companyId,
    contractId 
  } = state;
  
  if (!contract || !companyId || !contractId || !calculations) {
    throw new Error('بيانات غير مكتملة');
  }
  
  // Check if generated documents are ready
  const generatedDocs = ['memo', 'claims', 'docsList'] as const;
  const readyDocs = generatedDocs.filter(id => documents[id].status === 'ready');
  
  if (readyDocs.length < generatedDocs.length) {
    throw new Error(`يجب تجهيز جميع المستندات المولدة (${readyDocs.length}/${generatedDocs.length})`);
  }
  
  // Prepare delinquent customer data
  const customerName = formatCustomerName(customer);
  
  const delinquentCustomer = {
    customer_id: customer?.id || '',
    customer_name: customerName,
    customer_code: customer?.id || '',
    contract_id: contractId,
    contract_number: contract.contract_number,
    vehicle_id: contract.vehicle_id,
    vehicle_plate: vehicle?.plate_number || (contract as any).license_plate,
    phone: customer?.phone || '',
    email: customer?.email || '',
    total_debt: calculations.total,
    overdue_amount: calculations.overdueRent,
    late_penalty: calculations.lateFees,
    violations_amount: calculations.violationsFines,
    violations_count: calculations.violationsCount,
    days_overdue: Math.floor(
      (new Date().getTime() - new Date(contract.start_date).getTime()) / (1000 * 60 * 60 * 24)
    ),
    months_unpaid: overdueInvoices.length,
    risk_score: calculations.total > 10000 ? 85 : calculations.total > 5000 ? 70 : 60,
    risk_level: calculations.total > 10000 ? 'CRITICAL' : calculations.total > 5000 ? 'HIGH' : 'MEDIUM',
    has_previous_legal_cases: false,
    previous_legal_cases_count: 0,
    is_blacklisted: false,
    last_payment_date: null,
    last_payment_amount: 0,
    recommended_action: { label: 'رفع دعوى' },
  };
  
  // Create the legal case using the hook pattern
  // Note: In actual implementation, this should call the API directly
  const caseData = {
    delinquentCustomer,
    additionalNotes: taqadiData 
      ? `عنوان الدعوى: ${taqadiData.caseTitle}\nالمطالبة: ${taqadiData.claims}`
      : undefined,
  };
  
  // Generate case number using database function
  const { data: caseNumberData, error: caseNumberError } = await supabase
    .rpc('generate_case_number', { company_uuid: companyId });
  
  if (caseNumberError) {
    console.error('Failed to generate case number:', caseNumberError);
  }
  
  // Fallback case number if RPC fails
  const caseNumber = caseNumberData || `LC-${new Date().getFullYear()}-${Date.now()}`;
  
  // Generate case title
  const caseTitle = taqadiData?.caseTitle || `قضية عقد ${contract.contract_number}`;
  
  // Insert into legal_cases directly
  const { data: newCase, error: caseError } = await supabase
    .from('legal_cases')
    .insert({
      case_number: caseNumber,
      title: caseTitle,
      company_id: companyId,
      customer_id: customer?.id,
      contract_id: contractId,
      case_type: 'contract_dispute',
      status: 'open',
      filing_date: new Date().toISOString(),
      claim_amount: calculations.total,
      description: taqadiData?.facts,
      created_by: userId,
    })
    .select('id, case_number')
    .single();
  
  if (caseError || !newCase) {
    throw new Error('فشل في إنشاء القضية: ' + (caseError?.message || 'خطأ غير معروف'));
  }
  
  // Insert into lawsuit_templates for lawsuit-data page
  try {
    const customerName = formatCustomerName(customer);
    const nameParts = customerName.split(' ');
    
    const lawsuitRecord = {
      company_id: companyId,
      case_title: caseTitle,
      facts: taqadiData?.facts || '',
      requests: taqadiData?.claims || '',
      claim_amount: calculations.total,
      claim_amount_words: taqadiData?.amountInWords || '',
      defendant_first_name: nameParts[0] || '',
      defendant_middle_name: nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : null,
      defendant_last_name: nameParts.length > 1 ? nameParts[nameParts.length - 1] : '',
      defendant_nationality: customer?.nationality || customer?.country || null,
      defendant_id_number: customer?.national_id || null,
      defendant_address: customer?.address || null,
      defendant_phone: customer?.phone || null,
      defendant_email: customer?.email || null,
      contract_id: contractId,
      customer_id: customer?.id || null,
      // Contract data
      contract_number: contract.contract_number,
      contract_start_date: contract.start_date,
      contract_end_date: contract.end_date,
      monthly_rent: contract.monthly_amount,
      total_contract_amount: contract.monthly_amount ? contract.monthly_amount * 12 : null,
      // Vehicle data
      vehicle_plate_number: vehicle?.plate_number || (contract as any).license_plate,
      vehicle_type: vehicle?.make,
      vehicle_model: vehicle?.model,
      vehicle_year: vehicle?.year,
      // Financial data
      months_unpaid: overdueInvoices.length,
      overdue_amount: calculations.overdueRent,
      late_penalty: calculations.lateFees,
      days_overdue: Math.floor(
        (new Date().getTime() - new Date(contract.start_date).getTime()) / (1000 * 60 * 60 * 24)
      ),
      compensation_amount: calculations.damagesFee,
      // Invoices data
      invoices_count: overdueInvoices.length,
      total_invoices_amount: calculations.overdueRent,
      total_penalties: calculations.lateFees,
      // Violations data
      violations_count: calculations.violationsCount,
      violations_amount: calculations.violationsFines,
      // Auto-created flag
      auto_created: false,
    };
    
    const { error: lawsuitTemplateError } = await supabase
      .from('lawsuit_templates')
      .insert([lawsuitRecord]);
    
    if (lawsuitTemplateError) {
      console.error('Failed to insert into lawsuit_templates:', lawsuitTemplateError);
      // Don't throw - this is not critical for case registration
    }
  } catch (e) {
    console.error('Error inserting lawsuit template:', e);
    // Don't throw - this is not critical for case registration
  }
  
  // Upload documents
  const documentUploads: CaseDocument[] = [];
  
  // Upload memo
  if (documents.memo.htmlContent) {
    try {
      const filePath = await uploadHtmlDocument(
        documents.memo.htmlContent,
        'المذكرة_الشارحة.html',
        companyId,
        contractId
      );
      
      documentUploads.push({
        case_id: newCase.id,
        company_id: companyId,
        document_type: 'explanatory_memo',
        document_title: 'Explanatory Memo',
        document_title_ar: 'المذكرة الشارحة',
        file_path: filePath,
        file_name: 'المذكرة_الشارحة.html',
        file_type: 'html',
        file_size: new Blob([documents.memo.htmlContent]).size,
        description: 'مذكرة شارحة للدعوى',
        is_confidential: false,
        created_by: userId,
      });
    } catch (e) {
      console.error('Failed to upload memo:', e);
    }
  }
  
  // Upload claims statement
  if (documents.claims.htmlContent) {
    try {
      const filePath = await uploadHtmlDocument(
        documents.claims.htmlContent,
        'كشف_المطالبات.html',
        companyId,
        contractId
      );
      
      documentUploads.push({
        case_id: newCase.id,
        company_id: companyId,
        document_type: 'claims_statement',
        document_title: 'Claims Statement',
        document_title_ar: 'كشف المطالبات المالية',
        file_path: filePath,
        file_name: 'كشف_المطالبات.html',
        file_type: 'html',
        file_size: new Blob([documents.claims.htmlContent]).size,
        description: 'كشف بالمطالبات المالية والفواتير المتأخرة',
        is_confidential: false,
        created_by: userId,
      });
    } catch (e) {
      console.error('Failed to upload claims statement:', e);
    }
  }
  
  // Upload documents list
  if (documents.docsList.htmlContent) {
    try {
      const filePath = await uploadHtmlDocument(
        documents.docsList.htmlContent,
        'كشف_المستندات.html',
        companyId,
        contractId
      );
      
      documentUploads.push({
        case_id: newCase.id,
        company_id: companyId,
        document_type: 'documents_list',
        document_title: 'Documents List',
        document_title_ar: 'كشف المستندات المرفوعة',
        file_path: filePath,
        file_name: 'كشف_المستندات.html',
        file_type: 'html',
        file_size: new Blob([documents.docsList.htmlContent]).size,
        description: 'قائمة بجميع المستندات المرفوعة للقضية',
        is_confidential: false,
        created_by: userId,
      });
    } catch (e) {
      console.error('Failed to upload documents list:', e);
    }
  }
  
  // Upload violations list if exists
  if (documents.violations.htmlContent) {
    try {
      const filePath = await uploadHtmlDocument(
        documents.violations.htmlContent,
        'كشف_المخالفات.html',
        companyId,
        contractId
      );
      
      documentUploads.push({
        case_id: newCase.id,
        company_id: companyId,
        document_type: 'traffic_violations',
        document_title: 'Traffic Violations',
        document_title_ar: 'كشف المخالفات المرورية',
        file_path: filePath,
        file_name: 'كشف_المخالفات.html',
        file_type: 'html',
        file_size: new Blob([documents.violations.htmlContent]).size,
        description: 'كشف بالمخالفات المرورية غير المسددة',
        is_confidential: false,
        created_by: userId,
      });
    } catch (e) {
      console.error('Failed to upload violations list:', e);
    }
  }
  
  // Insert all documents
  if (documentUploads.length > 0) {
    const { error: docsError } = await supabase
      .from('legal_case_documents')
      .insert(documentUploads);
    
    if (docsError) {
      console.error('Failed to insert documents:', docsError);
    }
  }
  
  return {
    caseId: newCase.id,
    caseNumber: newCase.case_number,
  };
}
