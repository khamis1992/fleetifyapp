/**
 * مولد المستندات الجماعية للقضايا القانونية
 * يقوم بإنشاء جميع المستندات لمجموعة من العملاء وتحميلها في ملف ZIP
 */

import JSZip from 'jszip';
import { supabase } from '@/integrations/supabase/client';
import {
  generateDocumentsListHtml,
  generateClaimsStatementHtml,
  generateCriminalComplaintHtml,
  generateViolationsTransferHtml,
  type ClaimsStatementData,
  type DocumentsListData,
  type CriminalComplaintData,
  type ViolationsTransferData,
} from './official-letter-generator';
import { generateLegalComplaintHTML, type LegalDocumentData } from './legal-document-generator';
import { lawsuitService } from '@/services/LawsuitService';
import { 
  extractLawsuitData, 
  createLawsuitExcelFile,
  type LawsuitExcelData 
} from './lawsuitExcelGenerator';

// الصور كـ Base64 (لضمان ظهورها في ملفات HTML المحفوظة)
let COMPANY_LOGO_BASE64: string | null = null;
let COMPANY_SIGNATURE_BASE64: string | null = null;
let COMPANY_STAMP_BASE64: string | null = null;

/**
 * تحويل HTML إلى ملف Word (DOCX)
 * Uses the convertHtmlToDocxBlob utility from document-export
 */
async function convertHtmlToDocx(htmlContent: string, title: string = 'Document'): Promise<Blob> {
  try {
    // Use the utility function from document-export (with retry for chunk loading errors)
    const { dynamicImportWithRetry } = await import('@/utils/lazyWithRetry');
    const { convertHtmlToDocxBlob } = await dynamicImportWithRetry(() => import('@/utils/document-export'));
    return await convertHtmlToDocxBlob(htmlContent);
  } catch (error) {
    console.error('Error converting HTML to DOCX:', error);
    throw new Error('فشل تحويل HTML إلى Word');
  }
}

/**
 * تحميل صورة كـ Base64
 */
async function loadImageAsBase64(path: string): Promise<string> {
  try {
    const response = await fetch(path);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(`Failed to load image ${path}:`, error);
    return '';
  }
}

/**
 * تحويل صورة اللوقو إلى Base64
 */
async function loadCompanyLogo(): Promise<string> {
  if (COMPANY_LOGO_BASE64) return COMPANY_LOGO_BASE64;
  COMPANY_LOGO_BASE64 = await loadImageAsBase64('/receipts/logo.png');
  return COMPANY_LOGO_BASE64;
}

/**
 * تحويل صورة التوقيع إلى Base64
 */
async function loadCompanySignature(): Promise<string> {
  if (COMPANY_SIGNATURE_BASE64) return COMPANY_SIGNATURE_BASE64;
  COMPANY_SIGNATURE_BASE64 = await loadImageAsBase64('/receipts/signature.png');
  return COMPANY_SIGNATURE_BASE64;
}

/**
 * تحويل صورة الختم إلى Base64
 */
async function loadCompanyStamp(): Promise<string> {
  if (COMPANY_STAMP_BASE64) return COMPANY_STAMP_BASE64;
  COMPANY_STAMP_BASE64 = await loadImageAsBase64('/receipts/stamp.png');
  return COMPANY_STAMP_BASE64;
}

/**
 * استبدال مسارات اللوقو والتوقيع والختم في HTML بـ Base64
 */
async function embedImagesInHtml(html: string): Promise<string> {
  // تحميل جميع الصور بالتوازي
  const [logoBase64, signatureBase64, stampBase64] = await Promise.all([
    loadCompanyLogo(),
    loadCompanySignature(),
    loadCompanyStamp(),
  ]);

  let result = html;

  // استبدال اللوقو
  if (logoBase64) {
    result = result
      .replace(/src="\/receipts\/logo\.png"/g, `src="${logoBase64}"`)
      .replace(/src='\/receipts\/logo\.png'/g, `src='${logoBase64}'`);
  }

  // استبدال التوقيع
  if (signatureBase64) {
    result = result
      .replace(/src="\/receipts\/signature\.png"/g, `src="${signatureBase64}"`)
      .replace(/src='\/receipts\/signature\.png'/g, `src='${signatureBase64}'`);
  }

  // استبدال الختم
  if (stampBase64) {
    result = result
      .replace(/src="\/receipts\/stamp\.png"/g, `src="${stampBase64}"`)
      .replace(/src='\/receipts\/stamp\.png'/g, `src='${stampBase64}'`);
  }

  return result;
}

/**
 * جلب ملف من Supabase Storage
 */
async function fetchFileFromStorage(bucket: string, path: string): Promise<Blob | null> {
  try {
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error || !data) return null;
    return data;
  } catch (error) {
    console.error(`Error fetching file from ${bucket}/${path}:`, error);
    return null;
  }
}

/**
 * جلب الملفات المرفوعة لعقد معين
 */
async function fetchContractDocuments(contractId: string, companyId: string): Promise<{name: string, blob: Blob}[]> {
  const documents: {name: string, blob: Blob}[] = [];

  try {
    // 1. جلب العقد من contract-documents bucket
    const { data: contractFiles } = await supabase.storage
      .from('contract_documents')
      .list(`contracts/${companyId}/${contractId}`);

    if (contractFiles && contractFiles.length > 0) {
      for (const file of contractFiles) {
        const blob = await fetchFileFromStorage(
          'contract_documents',
          `contracts/${companyId}/${contractId}/${file.name}`
        );
        if (blob) {
          documents.push({
            name: `عقد_الإيجار.${file.name.split('.').pop() || 'pdf'}`,
            blob
          });
        }
      }
    }

    // 2. جلب المستندات القانونية من legal-documents bucket
    const { data: legalFiles } = await supabase.storage
      .from('documents')
      .list(`contracts/${companyId}/${contractId}`);

    if (legalFiles && legalFiles.length > 0) {
      for (const file of legalFiles) {
        const blob = await fetchFileFromStorage(
          'documents',
          `contracts/${companyId}/${contractId}/${file.name}`
        );
        if (blob) {
          // تحديد نوع المستند من الاسم
          let docName = file.name;
          if (file.name.toLowerCase().includes('memo')) docName = 'المذكرة_الشارحة.pdf';
          else if (file.name.toLowerCase().includes('claim')) docName = 'صحيفة_المطالبات.pdf';
          else if (file.name.toLowerCase().includes('doc')) docName = 'كشف_المستندات.pdf';
          else if (file.name.toLowerCase().includes('violation')) docName = 'كشف_المخالفات.pdf';

          documents.push({ name: docName, blob });
        }
      }
    }
  } catch (error) {
    console.error('Error fetching contract documents:', error);
  }

  return documents;
}

/**
 * جلب مستندات الشركة (السجل التجاري، شهادة IBAN، إلخ)
 * ترجع البيانات الخام من قاعدة البيانات مع معلومات الملفات
 */
async function fetchCompanyDocuments(companyId: string): Promise<any[]> {
  try {
    // جلب من جدول company_legal_documents
    const { data: companyDocs } = await supabase
      .from('company_legal_documents')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true);

    return companyDocs || [];
  } catch (error) {
    console.error('Error fetching company documents:', error);
    return [];
  }
}

/**
 * تحميل ملفات مستندات الشركة كـ Blobs
 */
async function downloadCompanyDocumentBlobs(companyDocs: any[]): Promise<{name: string, blob: Blob, type: string}[]> {
  const documents: {name: string, blob: Blob, type: string}[] = [];

  for (const doc of companyDocs) {
    if (doc.file_url) {
      try {
        const response = await fetch(doc.file_url);
        if (response.ok) {
          const blob = await response.blob();
          let docName = 'مستند_الشركة.pdf';

          switch (doc.document_type) {
            case 'commercial_register':
              docName = 'السجل_التجاري.pdf';
              break;
            case 'iban_certificate':
              docName = 'شهادة_IBAN.pdf';
              break;
            case 'representative_id':
              docName = 'هوية_الممثل.pdf';
              break;
            case 'authorization_letter':
              docName = 'خطاب_التفويض.pdf';
              break;
          }

          documents.push({ name: docName, blob, type: doc.document_type });
        }
      } catch (error) {
        console.warn(`Failed to fetch company document ${doc.document_type}:`, error);
      }
    }
  }

  return documents;
}

export interface BulkCustomerData {
  contract_id: string;
  contract_number: string;
  customer_name: string;
  customer_id?: string;
  national_id?: string;
  phone?: string;
  total_due: number;
  days_overdue: number;
}

export interface BulkGenerationProgress {
  current: number;
  total: number;
  currentCustomer: string;
  status: 'generating' | 'completed' | 'error';
  errors: string[];
}

export interface CustomerDocuments {
  customerName: string;
  contractNumber: string;
  documents: {
    name: string;
    content: string;
  }[];
}

export interface DocumentOptions {
  explanatoryMemo: boolean;          // المذكرة الشارحة
  claimsStatement: boolean;          // كشف المطالبات المالية
  documentsList: boolean;            // كشف المستندات المرفوعة
  violationsList: boolean;           // كشف المخالفات المرورية
  criminalComplaint: boolean;        // بلاغ سرقة المركبة
  violationsTransfer: boolean;       // طلب تحويل المخالفات
}

/**
 * جلب بيانات العميل الكاملة من قاعدة البيانات (محسّنة - استعلامات متوازية)
 */
async function fetchCustomerFullData(contractId: string) {
  // جلب جميع البيانات بالتوازي لتحسين الأداء
  const [contractResult, invoicesResult, violationsResult] = await Promise.all([
    // جلب بيانات العقد
    supabase
      .from('contracts')
      .select(`
        *,
        customers (
          id,
          first_name,
          last_name,
          company_name,
          national_id,
          phone,
          email,
          address
        ),
        vehicles (
          id,
          plate_number,
          make,
          model,
          year,
          vin
        )
      `)
      .eq('id', contractId)
      .single(),
    
    // جلب الفواتير
    supabase
      .from('invoices')
      .select('*')
      .eq('contract_id', contractId)
      .neq('status', 'cancelled')
      .order('due_date', { ascending: true }),
    
    // جلب المخالفات المرورية
    supabase
      .from('traffic_violations')
      .select('*')
      .eq('contract_id', contractId)
      .neq('status', 'paid')
      .order('violation_date', { ascending: false })
  ]);

  if (contractResult.error) throw contractResult.error;
  if (invoicesResult.error) throw invoicesResult.error;
  if (violationsResult.error) throw violationsResult.error;

  // جلب معلومات الشركة
  const { data: companyData } = await supabase
    .from('companies')
    .select('*')
    .eq('id', contractResult.data.company_id)
    .single();

  return { 
    contract: contractResult.data, 
    invoices: invoicesResult.data || [], 
    violations: violationsResult.data || [],
    vehicleData: contractResult.data.vehicles,
    companyInfo: companyData || {}
  };
}

/**
 * تحويل المبلغ إلى كلمات عربية
 */
function convertAmountToWords(amount: number): string {
  return lawsuitService.convertAmountToWords(amount);
}

/**
 * إنشاء المستندات لعميل واحد
 * يستخدم نفس منطق التوليد الموجود في صفحة تجهيز الدعوى
 */
async function generateCustomerDocuments(
  customer: BulkCustomerData,
  companyId: string,
  companyDocuments: any[], // Add companyDocuments parameter
  options: DocumentOptions = {
    explanatoryMemo: true,
    claimsStatement: true,
    documentsList: true,
    violationsList: true,
    criminalComplaint: false, // بلاغ السرقة اختياري - لا يتم تحميله تلقائياً
    violationsTransfer: false // طلب تحويل المخالفات اختياري - لا يتم تحميله تلقائياً
  }
): Promise<CustomerDocuments> {
  const { contract, invoices, violations, companyInfo } = await fetchCustomerFullData(customer.contract_id);

  const customerData = contract.customers;
  const vehicleData = contract.vehicles;

  const customerFullName = customerData
    ? `${customerData.first_name || ''} ${customerData.last_name || ''}`.trim() || customerData.company_name || customer.customer_name
    : customer.customer_name;

  const nationalId = customerData?.national_id || customer.national_id || 'غير محدد';
  const phone = customerData?.phone || customer.phone || 'غير محدد';

  // حساب المبالغ المستحقة - نفس المنطق المستخدم في صفحة تجهيز الدعوى
  const unpaidInvoices = invoices.filter(inv =>
    (inv.total_amount || 0) - (inv.paid_amount || 0) > 0
  );
  
  // حساب غرامات التأخير لكل فاتورة (120 ريال/يوم، حد أقصى 3000)
  const invoicesWithPenalties = unpaidInvoices.map(inv => {
    const dueDate = new Date(inv.due_date);
    const today = new Date();
    const daysLate = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
    const remaining = (inv.total_amount || 0) - (inv.paid_amount || 0);
    const penalty = remaining > 0 ? Math.min(daysLate * 120, 3000) : 0;
    
    return {
      ...inv,
      daysLate,
      penalty,
      remaining,
    };
  });
  
  const totalOverdue = invoicesWithPenalties.reduce((sum, inv) => sum + inv.remaining, 0);
  const totalPenalties = invoicesWithPenalties.reduce((sum, inv) => sum + inv.penalty, 0);
  const violationsTotal = violations.reduce((sum, v) => sum + (Number(v.total_amount) || Number(v.fine_amount) || 0), 0);
  const damagesFee = 10000; // رسوم الأضرار الثابتة
  
  // الإجمالي الكلي (بدون المخالفات للمطالبة الأساسية)
  const claimAmount = totalOverdue + totalPenalties + damagesFee;
  const grandTotal = claimAmount + violationsTotal;

  const documents: { name: string; content: string | Blob; type?: 'html' | 'docx' }[] = [];

  // 1. المذكرة الشارحة - نفس التنسيق المستخدم في صفحة تجهيز الدعوى
  // Prepare memo data outside if block so it's accessible in documentsList section
  const daysOverdue = contract.start_date 
    ? Math.floor((new Date().getTime() - new Date(contract.start_date).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const documentData: LegalDocumentData = {
    customer: {
      customer_name: customerFullName,
      customer_code: customerData?.id || customer.customer_id || '',
      id_number: nationalId,
      phone: phone,
      email: customerData?.email || '',
      contract_number: contract.contract_number || customer.contract_number,
      contract_start_date: contract.start_date || '',
      vehicle_plate: vehicleData?.plate_number || 'غير محدد',
      monthly_rent: Number(contract.monthly_amount) || 0,
      months_unpaid: unpaidInvoices.length,
      overdue_amount: totalOverdue,
      late_penalty: totalPenalties,
      days_overdue: daysOverdue,
      violations_count: violations.length,
      violations_amount: violationsTotal,
      total_debt: claimAmount, // المبلغ بدون المخالفات
    } as any,
    companyInfo: {
      name_ar: 'شركة العراف لتأجير السيارات',
      name_en: 'Al-Araf Car Rental',
      address: 'أم صلال محمد – الشارع التجاري – مبنى (79) – الطابق الأول – مكتب (2)',
      cr_number: '146832',
    },
    vehicleInfo: {
      plate: vehicleData?.plate_number || 'غير محدد',
      make: vehicleData?.make || '',
      model: vehicleData?.model || '',
      year: vehicleData?.year || 0,
    },
    contractInfo: {
      contract_number: contract.contract_number || customer.contract_number,
      start_date: contract.start_date 
        ? new Date(contract.start_date).toLocaleDateString('ar-QA')
        : '',
      monthly_rent: Number(contract.monthly_amount) || 0,
    },
    damages: damagesFee,
  };

  const memoHtml = generateLegalComplaintHTML(documentData);
  
  if (options.explanatoryMemo) {
    // إضافة نسخة HTML
    documents.push({
      name: 'المذكرة_الشارحة.html',
      content: memoHtml,
      type: 'html',
    });
    
    // إضافة نسخة Word (DOCX)
    try {
      const memoDocxBlob = await convertHtmlToDocx(memoHtml, 'المذكرة الشارحة');
      documents.push({
        name: 'المذكرة_الشارحة.docx',
        content: memoDocxBlob,
        type: 'docx',
      });
    } catch (error) {
      console.warn('فشل إنشاء نسخة Word من المذكرة الشارحة:', error);
    }
  }

  // 2. كشف المطالبات - نفس التنسيق المستخدم في صفحة تجهيز الدعوى
  // Define claimsData outside the if block so it's accessible in documentsList section
  const claimsData: ClaimsStatementData = {
    customerName: customerFullName,
    nationalId,
    phone,
    contractNumber: contract.contract_number || customer.contract_number,
    contractStartDate: contract.start_date || '',  // نفس صفحة تجهيز الدعوى
    contractEndDate: contract.end_date || '',  // نفس صفحة تجهيز الدعوى
    invoices: invoicesWithPenalties.map(inv => ({
      invoiceNumber: inv.invoice_number || `INV-${inv.id.slice(0, 8)}`,
      dueDate: inv.due_date,  // نفس صفحة تجهيز الدعوى - تُمرر كـ string
      totalAmount: inv.total_amount || 0,
      paidAmount: inv.paid_amount || 0,
      daysLate: inv.daysLate,
      penalty: inv.penalty,
    })),
    violations: violations.map(v => ({
      violationNumber: v.violation_number || 'غير محدد',
      violationDate: v.violation_date || '',  // نفس صفحة تجهيز الدعوى - تُمرر كـ string
      violationType: v.violation_type || 'مخالفة مرورية',
      location: v.location || 'غير محدد',
      fineAmount: Number(v.total_amount) || Number(v.fine_amount) || 0,
    })),
    totalOverdue: totalOverdue + violationsTotal + totalPenalties, // نفس صفحة تجهيز الدعوى
    amountInWords: convertAmountToWords(totalOverdue + violationsTotal + totalPenalties),
    caseTitle: `قضية تحصيل مستحقات - ${customerFullName}`,
  };

  if (options.claimsStatement) {
    documents.push({
      name: 'كشف_المطالبات.html',
      content: generateClaimsStatementHtml(claimsData),
    });
  }

  // 3. كشف المستندات المرفوعة - يحتوي على نسخ من جميع المستندات الأساسية مدمجة
  if (options.documentsList) {
    // بناء قائمة المستندات مع المحتوى الفعلي
    // ملاحظة: يتم تضمين جميع المستندات الأساسية دائماً (بغض النظر عن options)
    // باستثناء بلاغ السرقة وطلب تحويل المخالفات (اختياريان)
    const generatedDocuments: { 
      name: string; 
      status: 'مرفق' | 'غير مرفق';
      url?: string;
      type?: string;
      htmlContent?: string;
    }[] = [];
    
    console.log('[كشف المستندات] عدد مستندات الشركة المتاحة:', companyDocuments?.length || 0);
    console.log('[كشف المستندات] معرف العقد:', customer.contract_id);
    
    // 1. كشف المطالبات المالية (مع المحتوى) - دائماً مرفق
    const claimsHtml = generateClaimsStatementHtml(claimsData);
    generatedDocuments.push({ 
      name: 'كشف المطالبات المالية', 
      status: 'مرفق',
      type: 'html',
      htmlContent: claimsHtml,
    });
    
    // 2. صورة من عقد الإيجار الموقع - جلب من مستندات العقد (نفس منطق صفحة تجهيز الدعوى)
    {
      const { data: signedContract } = await supabase
        .from('contract_documents')
        .select('id, file_path, document_name')
        .eq('contract_id', customer.contract_id)
        .eq('company_id', companyId)
        .eq('document_type', 'signed_contract')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (signedContract?.file_path) {
        const { data: urlData } = supabase.storage
          .from('contract-documents')
          .getPublicUrl(signedContract.file_path);
        
        generatedDocuments.push({ 
          name: 'صورة من عقد الإيجار الموقع', 
          status: 'مرفق',
          type: 'pdf',
          url: urlData?.publicUrl,
        });
      } else {
        generatedDocuments.push({ 
          name: 'صورة من عقد الإيجار الموقع', 
          status: 'غير مرفق',
        });
      }
    }
    
    // 3. المذكرة الشارحة (مع المحتوى) - دائماً مرفق
    generatedDocuments.push({ 
      name: 'المذكرة الشارحة', 
      status: 'مرفق',
      type: 'html',
      htmlContent: memoHtml,
    });
    
    // 4-8. مستندات الشركة - نفس الترتيب المستخدم في صفحة تجهيز الدعوى
    const companyDocTypes = [
      { type: 'commercial_register', name: 'السجل التجاري' },
      { type: 'establishment_record', name: 'قيد المنشأة' },
      { type: 'iban_certificate', name: 'شهادة IBAN' },
      { type: 'representative_id', name: 'البطاقة الشخصية للممثل' },
      { type: 'authorization_letter', name: 'خطاب التفويض' },
    ] as const;
    
    for (const docType of companyDocTypes) {
      const doc = companyDocuments?.find(d => d.document_type === docType.type);
      generatedDocuments.push({ 
        name: docType.name, 
        status: doc ? 'مرفق' : 'غير مرفق',
        type: 'pdf',
        url: doc?.file_url,
      });
    }
    
    // ملاحظة: بلاغ السرقة وطلب تحويل المخالفات لا يتم تضمينهم في كشف المستندات
    // لأنهم اختياريان وليسوا من المستندات الأساسية

    console.log('[كشف المستندات] إجمالي المستندات:', generatedDocuments.length);
    console.log('[كشف المستندات] المستندات المرفقة:', generatedDocuments.filter(d => d.status === 'مرفق').length);
    console.log('[كشف المستندات] المستندات مع محتوى:', generatedDocuments.filter(d => d.htmlContent || d.url).length);
    
    const documentsListData: DocumentsListData = {
      caseTitle: `قضية تحصيل مستحقات - ${customerFullName}`,
      customerName: customerFullName,
      amount: claimAmount,
      documents: generatedDocuments,
    };

    documents.push({
      name: 'كشف_المستندات.html',
      content: generateDocumentsListHtml(documentsListData),
    });
  }

  // ملاحظة: كشف المخالفات المرورية مدمج داخل كشف المطالبات المالية
  // لا حاجة لمستند منفصل - نفس منطق صفحة تجهيز الدعوى
  
  // 5. بلاغ سرقة المركبة - نفس التنسيق المستخدم في صفحة تجهيز الدعوى
  if (options.criminalComplaint) {
    const complaintData: CriminalComplaintData = {
      customerName: customerFullName,
      customerNationality: customerData?.nationality || '',
      customerId: nationalId,
      customerMobile: phone,
      contractDate: contract.start_date 
        ? new Date(contract.start_date).toLocaleDateString('ar-QA')
        : 'غير محدد',
      contractEndDate: contract.end_date 
        ? new Date(contract.end_date).toLocaleDateString('ar-QA')
        : 'غير محدد',
      vehicleType: vehicleData 
        ? `${vehicleData.make || ''} ${vehicleData.model || ''} ${vehicleData.year || ''}`.trim()
        : 'غير محدد',
      plateNumber: vehicleData?.plate_number || 'غير محدد',
      plateType: 'خصوصي',
      manufactureYear: vehicleData?.year?.toString() || '',
      chassisNumber: vehicleData?.vin || '',
    };

    documents.push({
      name: 'بلاغ_سرقة_المركبة.html',
      content: generateCriminalComplaintHtml(complaintData),
    });
  }

  // 6. طلب تحويل المخالفات - نفس التنسيق المستخدم في صفحة تجهيز الدعوى
  if (options.violationsTransfer && violations.length > 0) {
    const transferData: ViolationsTransferData = {
      customerName: customerFullName,
      customerId: nationalId,
      customerMobile: phone,
      contractNumber: contract.contract_number || customer.contract_number,
      contractDate: contract.start_date 
        ? new Date(contract.start_date).toLocaleDateString('ar-QA')
        : 'غير محدد',
      contractEndDate: contract.end_date 
        ? new Date(contract.end_date).toLocaleDateString('ar-QA')
        : 'غير محدد',
      vehicleType: vehicleData 
        ? `${vehicleData.make || ''} ${vehicleData.model || ''}`.trim()
        : 'غير محدد',
      plateNumber: vehicleData?.plate_number || 'غير محدد',
      violations: violations.map(v => ({
        violationNumber: v.penalty_number || v.violation_number || 'غير محدد',
        violationDate: v.penalty_date 
          ? new Date(v.penalty_date).toLocaleDateString('ar-QA')
          : 'غير محدد',
        violationType: v.violation_type || 'مخالفة مرورية',
        location: v.location || 'غير محدد',
        fineAmount: Number(v.amount) || 0,
      })),
      totalFines: violationsTotal,
    };

    documents.push({
      name: 'طلب_تحويل_المخالفات.html',
      content: generateViolationsTransferHtml(transferData),
    });
  }

  // تضمين اللوقو والتوقيع والختم في جميع المستندات HTML
  const documentsWithImages = await Promise.all(
    documents.map(async (doc) => {
      if (typeof doc.content === 'string') {
        return {
          ...doc,
          content: await embedImagesInHtml(doc.content),
        };
      }
      return doc;
    })
  );

  // جلب الملفات الفعلية المرفوعة للعميل
  try {
    // 1. جلب عقد الإيجار بشكل منفصل وإضافته كملف PDF مستقل
    console.log('[إضافة العقد] محاولة جلب عقد الإيجار للعميل:', customer.customer_name);
    console.log('[إضافة العقد] معرف العقد:', customer.contract_id);
    console.log('[إضافة العقد] معرف الشركة:', companyId);
    
    try {
      const { data: contractFiles, error: listError } = await supabase.storage
        .from('contract_documents')
        .list(`contracts/${companyId}/${customer.contract_id}`);
      
      console.log('[إضافة العقد] عدد ملفات العقد المتاحة:', contractFiles?.length || 0);
      if (listError) console.error('[إضافة العقد] خطأ في قائمة الملفات:', listError);
      
      if (contractFiles && contractFiles.length > 0 && !listError) {
        const contractFile = contractFiles[0];
        console.log('[إضافة العقد] اسم ملف العقد:', contractFile.name);
        
        const { data: contractBlob, error: downloadError } = await supabase.storage
          .from('contract_documents')
          .download(`contracts/${companyId}/${customer.contract_id}/${contractFile.name}`);
        
        if (contractBlob && !downloadError) {
          console.log('[إضافة العقد] ✅ تم تحميل العقد بنجاح - الحجم:', contractBlob.size, 'بايت');
          
          // إضافة العقد كملف PDF منفصل في مجلد العميل
          const fileExtension = contractFile.name.split('.').pop() || 'pdf';
          documentsWithImages.push({
            name: `عقد_الإيجار.${fileExtension}`,
            content: contractBlob,
            type: 'pdf' as any,
          });
          
          console.log('[إضافة العقد] ✅ تمت إضافة العقد إلى قائمة المستندات');
        } else {
          console.error('[إضافة العقد] ❌ فشل تحميل العقد:', downloadError);
        }
      } else {
        console.warn('[إضافة العقد] ⚠️ لا توجد ملفات عقد متاحة في المسار');
      }
    } catch (contractError) {
      console.error('[إضافة العقد] ❌ خطأ في جلب عقد الإيجار:', contractError);
    }
    
    // 2. جلب المستندات القانونية الأخرى المرفوعة
    const contractDocs = await fetchContractDocuments(customer.contract_id, companyId);
    console.log('[المستندات الأخرى] عدد المستندات المرفوعة:', contractDocs.length);
    
    for (const doc of contractDocs) {
      // تجنب تكرار العقد إذا كان موجوداً بالفعل
      if (!doc.name.includes('عقد_الإيجار')) {
        documentsWithImages.push({
          name: doc.name,
          content: doc.blob,
        });
      }
    }

    // 3. جلب مستندات الشركة (مرة واحدة فقط - ستكون مكررة لكل عميل لكنها ضرورية)
    // نجلبها في generateBulkDocumentsZip مرة واحدة ونوزعها على جميع العملاء
  } catch (error) {
    console.error('[جلب الملفات] ❌ فشل جلب الملفات المرفوعة:', error);
  }

  return {
    customerName: customerFullName,
    contractNumber: contract.contract_number || customer.contract_number,
    documents: documentsWithImages,
  };
}

/**
 * إنشاء ملف ZIP يحتوي على جميع المستندات (محسّنة - معالجة متوازية)
 */
export async function generateBulkDocumentsZip(
  customers: BulkCustomerData[],
  companyId: string,
  onProgress?: (progress: BulkGenerationProgress) => void,
  options?: DocumentOptions
): Promise<Blob> {
  const zip = new JSZip();
  const errors: string[] = [];
  let completed = 0;
  const lawsuitDataList: LawsuitExcelData[] = [];

  // جلب مستندات الشركة مرة واحدة (مشتركة بين جميع العملاء)
  const companyDocuments = await fetchCompanyDocuments(companyId);

  // معالجة العملاء بالتوازي (5 عملاء في نفس الوقت لتحسين الأداء)
  const BATCH_SIZE = 5;

  for (let i = 0; i < customers.length; i += BATCH_SIZE) {
    const batch = customers.slice(i, i + BATCH_SIZE);

    // معالجة الدفعة الحالية بالتوازي
    const results = await Promise.allSettled(
      batch.map(async (customer) => {
        const customerDocs = await generateCustomerDocuments(customer, companyId, companyDocuments, options);

        // استخراج بيانات القضية للـ Excel
        const contractId = customer.contract_id || customer.id;
        const fullData = await fetchCustomerFullData(contractId);
        const lawsuitData = extractLawsuitData(
          customer,
          fullData.contract,
          fullData.vehicleData,
          fullData.invoices,
          fullData.violations,
          fullData.companyInfo
        );

        return { customer, customerDocs, lawsuitData };
      })
    );

    // إضافة النتائج إلى ZIP
    for (const result of results) {
      completed++;
      
      if (result.status === 'fulfilled') {
        const { customer, customerDocs, lawsuitData } = result.value;
        
        // إضافة بيانات القضية إلى القائمة
        lawsuitDataList.push(lawsuitData);
        
        onProgress?.({
          current: completed,
          total: customers.length,
          currentCustomer: customer.customer_name,
          status: 'generating',
          errors,
        });

        // إنشاء مجلد لكل عميل
        const folderName = `${customerDocs.contractNumber}_${customerDocs.customerName}`.replace(/[/\\?%*:|"<>]/g, '_');
        const folder = zip.folder(folderName);
        
        if (folder) {
          for (const doc of customerDocs.documents) {
            // التحقق من نوع المحتوى (Blob للـ Word، string للـ HTML)
            if (doc.content instanceof Blob) {
              folder.file(doc.name, doc.content);
            } else {
              folder.file(doc.name, doc.content);
            }
          }
        }
      } else {
        const customer = batch[results.indexOf(result)];
        console.error(`Error generating documents for ${customer.customer_name}:`, result.reason);
        errors.push(`فشل إنشاء مستندات ${customer.customer_name}: ${result.reason?.message || 'خطأ غير معروف'}`);
        
        onProgress?.({
          current: completed,
          total: customers.length,
          currentCustomer: customer.customer_name,
          status: 'generating',
          errors,
        });
      }
    }
  }

  // إنشاء ملف Excel وحفظ البيانات في قاعدة البيانات
  if (lawsuitDataList.length > 0) {
    try {
      onProgress?.({
        current: customers.length,
        total: customers.length,
        currentCustomer: 'إنشاء ملف Excel وحفظ البيانات...',
        status: 'generating',
        errors,
      });
      
      // إنشاء ملف Excel
      const excelBuffer = createLawsuitExcelFile(lawsuitDataList);
      zip.file('بيانات_القضايا.xlsx', excelBuffer);
      
      // حفظ البيانات في قاعدة البيانات
      const { data: companyData } = await supabase.auth.getUser();
      if (companyData.user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('company_id')
          .eq('user_id', companyData.user.id)
          .single();
        
        if (profile?.company_id) {
          // تحويل بيانات Excel إلى صيغة قاعدة البيانات
          const lawsuitRecords = lawsuitDataList.map(lawsuit => ({
            company_id: profile.company_id,
            case_title: lawsuit.case_title,
            facts: lawsuit.facts,
            requests: lawsuit.requests,
            claim_amount: lawsuit.claim_amount,
            claim_amount_words: lawsuit.claim_amount_words,
            defendant_first_name: lawsuit.defendant_first_name,
            defendant_middle_name: lawsuit.defendant_middle_name,
            defendant_last_name: lawsuit.defendant_last_name,
            defendant_nationality: lawsuit.defendant_nationality,
            defendant_id_number: lawsuit.defendant_id_number,
            defendant_address: lawsuit.defendant_address,
            defendant_phone: lawsuit.defendant_phone,
            defendant_email: lawsuit.defendant_email,
          }));
          
          const { error: insertError } = await supabase
            .from('lawsuit_templates')
            .insert(lawsuitRecords);
          
          if (insertError) {
            console.error('Error saving lawsuit data to database:', insertError);
            errors.push('فشل حفظ البيانات في قاعدة البيانات');
          }
        }
      }
    } catch (error) {
      console.error('Error creating Excel file or saving data:', error);
      errors.push('فشل إنشاء ملف Excel أو حفظ البيانات');
    }
  }

  // إضافة مستندات الشركة المشتركة في مجلد منفصل
  if (companyDocuments.length > 0) {
    const companyFolder = zip.folder('مستندات_الشركة');
    if (companyFolder) {
      for (const doc of companyDocuments) {
        companyFolder.file(doc.name, doc.blob);
      }
    }
  }

  onProgress?.({
    current: customers.length,
    total: customers.length,
    currentCustomer: '',
    status: errors.length > 0 ? 'error' : 'completed',
    errors,
  });

  // توليد ملف ZIP مع ضغط أفضل
  return await zip.generateAsync({ 
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 6
    },
    mimeType: 'application/zip'
  });
}

/**
 * تحميل ملف ZIP
 */
export function downloadZipFile(blob: Blob, filename: string): void {
  // التأكد من أن الملف له امتداد .zip
  if (!filename.endsWith('.zip')) {
    filename = filename + '.zip';
  }
  
  // إنشاء Blob جديد مع نوع MIME صحيح
  const zipBlob = new Blob([blob], { type: 'application/zip' });
  
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.setAttribute('type', 'application/zip');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // تنظيف URL بعد فترة قصيرة
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * تحديث حالة العملاء إلى "جاري فتح بلاغ"
 */
export async function updateCustomersToOpeningComplaint(contractIds: string[]): Promise<void> {
  // تحديث حالة العقود
  const { error } = await supabase
    .from('contracts')
    .update({ 
      status: 'under_legal_procedure',
      updated_at: new Date().toISOString(),
    })
    .in('id', contractIds);

  if (error) throw error;
}

/**
 * تحويل العميل إلى قضية رسمية
 */
export async function convertToOfficialCase(contractId: string, companyId: string): Promise<string> {
  // إنشاء قضية جديدة
  const { data: caseData, error: caseError } = await supabase
    .from('legal_cases')
    .insert({
      contract_id: contractId,
      company_id: companyId,
      status: 'open',
      case_type: 'debt_collection',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (caseError) throw caseError;

  // تحديث حالة العقد
  await supabase
    .from('contracts')
    .update({ 
      status: 'under_legal_procedure',
      updated_at: new Date().toISOString(),
    })
    .eq('id', contractId);

  return caseData.id;
}
