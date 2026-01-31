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

// لوقو الشركة كـ Base64 (لضمان ظهوره في ملفات HTML المحفوظة)
let COMPANY_LOGO_BASE64: string | null = null;

/**
 * تحويل HTML إلى ملف Word (DOCX)
 */
async function convertHtmlToDocx(htmlContent: string, title: string = 'Document'): Promise<Blob> {
  try {
    const { default: HTMLtoDOCX } = await import('html-to-docx');
    
    // Wrap HTML in complete document structure
    const completeHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { 
      font-family: Arial, sans-serif; 
      direction: rtl;
      text-align: right;
    }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #000; padding: 8px; }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;
    
    // Convert HTML to DOCX
    const fileBuffer = await HTMLtoDOCX(completeHtml, null, {
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
      font: 'Arial',
      fontSize: 24,
      orientation: 'portrait',
      margins: {
        top: 720,
        right: 720,
        bottom: 720,
        left: 720
      }
    });
    
    // Create blob from buffer
    return new Blob([fileBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    });
  } catch (error) {
    console.error('Error converting HTML to DOCX:', error);
    throw new Error('فشل تحويل HTML إلى Word');
  }
}

/**
 * تحويل صورة اللوقو إلى Base64
 */
async function loadCompanyLogo(): Promise<string> {
  if (COMPANY_LOGO_BASE64) return COMPANY_LOGO_BASE64;
  
  try {
    const response = await fetch('/receipts/logo.png');
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        COMPANY_LOGO_BASE64 = reader.result as string;
        resolve(COMPANY_LOGO_BASE64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to load company logo:', error);
    return ''; // إرجاع قيمة فارغة في حالة الفشل
  }
}

/**
 * استبدال مسار اللوقو في HTML بـ Base64
 */
async function embedLogoInHtml(html: string): Promise<string> {
  const logoBase64 = await loadCompanyLogo();
  if (!logoBase64) return html;

  // استبدال جميع مسارات اللوقو بـ Base64
  return html
    .replace(/src="\/receipts\/logo\.png"/g, `src="${logoBase64}"`)
    .replace(/src='\/receipts\/logo\.png'/g, `src='${logoBase64}'`);
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
      .from('contract-documents')
      .list(`contracts/${companyId}/${contractId}`);

    if (contractFiles && contractFiles.length > 0) {
      for (const file of contractFiles) {
        const blob = await fetchFileFromStorage(
          'contract-documents',
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
      .from('legal-documents')
      .list(`contracts/${companyId}/${contractId}`);

    if (legalFiles && legalFiles.length > 0) {
      for (const file of legalFiles) {
        const blob = await fetchFileFromStorage(
          'legal-documents',
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
 */
async function fetchCompanyDocuments(companyId: string): Promise<{name: string, blob: Blob, type: string}[]> {
  const documents: {name: string, blob: Blob, type: string}[] = [];

  try {
    // جلب من جدول company_legal_documents
    const { data: companyDocs } = await supabase
      .from('company_legal_documents')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true);

    if (companyDocs && companyDocs.length > 0) {
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
    }
  } catch (error) {
    console.error('Error fetching company documents:', error);
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
      .from('penalties')
      .select('*')
      .eq('contract_id', contractId)
      .neq('payment_status', 'paid')
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
 */
async function generateCustomerDocuments(
  customer: BulkCustomerData,
  companyId: string,
  options: DocumentOptions = {
    explanatoryMemo: true,
    claimsStatement: true,
    documentsList: true,
    violationsList: true,
    criminalComplaint: true,
    violationsTransfer: true
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

  // حساب المبالغ المستحقة
  const unpaidInvoices = invoices.filter(inv =>
    (inv.total_amount || 0) - (inv.paid_amount || 0) > 0
  );
  
  const totalOverdue = unpaidInvoices.reduce((sum, inv) => 
    sum + ((inv.total_amount || 0) - (inv.paid_amount || 0)), 0
  );

  const violationsTotal = violations.reduce((sum, v) => 
    sum + (Number(v.amount) || 0), 0
  );

  const grandTotal = totalOverdue + violationsTotal;

  const documents: { name: string; content: string | Blob; type?: 'html' | 'docx' }[] = [];

  // 1. المذكرة الشارحة (باستخدام نفس التنسيق المستخدم في صفحة تجهيز الدعوى)
  if (options.explanatoryMemo) {
    const damagesAmount = Math.round(grandTotal * 0.3);
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
        monthly_rent: Number(contract.monthly_rent) || 0,
        months_unpaid: unpaidInvoices.length,
        overdue_amount: totalOverdue,
        late_penalty: 0, // يمكن حسابه لاحقاً
        days_overdue: daysOverdue,
        violations_count: violations.length,
        violations_amount: violationsTotal,
        total_debt: grandTotal,
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
        monthly_rent: Number(contract.monthly_rent) || 0,
      },
      damages: damagesAmount,
    };

    const memoHtml = generateLegalComplaintHTML(documentData);
    
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

  // 2. كشف المطالبات
  if (options.claimsStatement) {
    const claimsData: ClaimsStatementData = {
    customerName: customerFullName,
    nationalId,
    phone,
    contractNumber: contract.contract_number || customer.contract_number,
    contractStartDate: contract.start_date 
      ? new Date(contract.start_date).toLocaleDateString('ar-QA')
      : 'غير محدد',
    contractEndDate: contract.end_date 
      ? new Date(contract.end_date).toLocaleDateString('ar-QA')
      : 'غير محدد',
    invoices: unpaidInvoices.map(inv => {
      const dueDate = new Date(inv.due_date);
      const today = new Date();
      const daysLate = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
      return {
        invoiceNumber: inv.invoice_number || `INV-${inv.id.slice(0, 8)}`,
        dueDate: dueDate.toLocaleDateString('ar-QA'),
        totalAmount: inv.total_amount || 0,
        paidAmount: inv.paid_amount || 0,
        daysLate,
      };
    }),
    violations: violations.map(v => ({
      violationNumber: v.penalty_number || v.violation_number || 'غير محدد',
      violationDate: v.penalty_date 
        ? new Date(v.penalty_date).toLocaleDateString('ar-QA')
        : 'غير محدد',
      violationType: v.violation_type || 'مخالفة مرورية',
      location: v.location || 'غير محدد',
      fineAmount: Number(v.amount) || 0,
    })),
    totalOverdue: grandTotal,
    amountInWords: convertAmountToWords(grandTotal),
    caseTitle: `قضية تحصيل مستحقات - ${customerFullName}`,
  };

    documents.push({
      name: 'كشف_المطالبات.html',
      content: generateClaimsStatementHtml(claimsData),
    });
  }

  // 3. كشف المستندات (يجب أن يُنشأ في النهاية ليشمل جميع المستندات المولدة)
  // سيتم إنشاؤه لاحقاً بعد توليد جميع المستندات الأخرى

  // 4. كشف المخالفات المرورية
  if (options.violationsList && violations.length > 0) {
    const violationsListHtml = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>كشف المخالفات المرورية</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 20mm 20mm 20mm;
    }
    
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      
      body {
        margin: 0;
        padding: 20px;
      }
      
      table {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      
      tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      
      .info-section {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      
      thead {
        display: table-header-group !important;
      }
    }
    
    body { font-family: 'Traditional Arabic', 'Times New Roman', 'Arial', serif; direction: rtl; padding: 40px; line-height: 1.8; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #0d9488; padding-bottom: 20px; }
    .header h1 { color: #0d9488; font-size: 28px; margin: 10px 0; }
    .info-section { margin: 20px 0; padding: 15px; background: #f0fdfa; border-right: 4px solid #0d9488; page-break-inside: avoid; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; page-break-inside: avoid; }
    th, td { padding: 12px; text-align: right; border: 1px solid #ddd; }
    th { background-color: #0d9488; color: white; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    tr { page-break-inside: avoid; }
    .total-row { background-color: #fef3c7; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚗 كشف المخالفات المرورية</h1>
    <p>العقد رقم: ${contract.contract_number || customer.contract_number}</p>
  </div>

  <div class="info-section">
    <p><strong>اسم المستأجر:</strong> ${customerFullName}</p>
    <p><strong>رقم الهوية:</strong> ${nationalId}</p>
    <p><strong>رقم اللوحة:</strong> ${vehicleData?.plate_number || 'غير محدد'}</p>
    <p><strong>نوع المركبة:</strong> ${vehicleData ? `${vehicleData.make || ''} ${vehicleData.model || ''}`.trim() : 'غير محدد'}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>رقم المخالفة</th>
        <th>التاريخ</th>
        <th>نوع المخالفة</th>
        <th>الموقع</th>
        <th>المبلغ (ريال)</th>
      </tr>
    </thead>
    <tbody>
      ${violations.map((v, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${v.penalty_number || v.violation_number || 'غير محدد'}</td>
          <td>${v.penalty_date ? new Date(v.penalty_date).toLocaleDateString('ar-QA') : 'غير محدد'}</td>
          <td>${v.violation_type || 'مخالفة مرورية'}</td>
          <td>${v.location || 'غير محدد'}</td>
          <td>${(Number(v.amount) || 0).toFixed(2)}</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td colspan="5" style="text-align: left;">الإجمالي:</td>
        <td>${violationsTotal.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <div class="info-section">
    <p><strong>إجمالي المخالفات:</strong> ${violations.length} مخالفة</p>
    <p><strong>المبلغ الإجمالي:</strong> ${violationsTotal.toFixed(2)} ريال قطري</p>
    <p><strong>التاريخ:</strong> ${new Date().toLocaleDateString('ar-QA')}</p>
  </div>
</body>
</html>
    `;

    documents.push({
      name: 'كشف_المخالفات.html',
      content: violationsListHtml,
    });
  }

  // 5. بلاغ سرقة المركبة (إذا كانت هناك مخالفات أو مبالغ كبيرة)
  if (options.criminalComplaint && (grandTotal > 5000 || violations.length > 0)) {
    const complaintData: CriminalComplaintData = {
      customerName: customerFullName,
      nationalId,
      phone,
      contractNumber: contract.contract_number || customer.contract_number,
      contractStartDate: contract.start_date 
        ? new Date(contract.start_date).toLocaleDateString('ar-QA')
        : 'غير محدد',
      vehiclePlate: vehicleData?.plate_number || 'غير محدد',
      vehicleModel: vehicleData 
        ? `${vehicleData.make || ''} ${vehicleData.model || ''} ${vehicleData.year || ''}`.trim()
        : 'غير محدد',
      totalDebt: grandTotal,
      amountInWords: convertAmountToWords(grandTotal),
      complaintType: violations.length > 0 ? 'مخالفات مرورية وديون' : 'ديون متراكمة',
    };

    documents.push({
      name: 'بلاغ_سرقة_المركبة.html',
      content: generateCriminalComplaintHtml(complaintData),
    });
  }

  // 6. طلب تحويل المخالفات
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
      totalFines: violationsTotal, // إضافة إجمالي المخالفات
    };

    documents.push({
      name: 'طلب_تحويل_المخالفات.html',
      content: generateViolationsTransferHtml(transferData),
    });
  }

  // 7. كشف المستندات المرفوعة (يُنشأ في النهاية ليشمل جميع المستندات المولدة)
  if (options.documentsList) {
    // بناء قائمة المستندات المولدة
    const generatedDocuments: { name: string; status: 'مرفق' | 'غير مرفق' }[] = [];
    
    // إضافة المستندات المولدة حسب الخيارات
    if (options.explanatoryMemo) {
      generatedDocuments.push({ name: 'المذكرة الشارحة', status: 'مرفق' });
    }
    
    if (options.claimsStatement) {
      generatedDocuments.push({ name: 'كشف المطالبات المالية', status: 'مرفق' });
    }
    
    // إضافة صورة العقد (دائماً موجودة)
    generatedDocuments.push({ name: 'صورة من العقد', status: 'مرفق' });
    
    if (options.violationsList && violations.length > 0) {
      generatedDocuments.push({ name: 'كشف المخالفات المرورية', status: 'مرفق' });
    }
    
    if (options.criminalComplaint && (grandTotal > 5000 || violations.length > 0)) {
      generatedDocuments.push({ name: 'بلاغ سرقة المركبة', status: 'مرفق' });
    }
    
    if (options.violationsTransfer && violations.length > 0) {
      generatedDocuments.push({ name: 'طلب تحويل المخالفات', status: 'مرفق' });
    }
    
    // إضافة المستندات الثابتة للشركة
    generatedDocuments.push(
      { name: 'السجل التجاري', status: 'مرفق' },
      { name: 'شهادة IBAN', status: 'مرفق' },
      { name: 'البطاقة الشخصية للممثل', status: 'مرفق' },
      { name: 'صورة الهوية / جواز السفر', status: 'مرفق' }
    );

    const documentsListData: DocumentsListData = {
      caseTitle: `قضية تحصيل مستحقات - ${customerFullName}`,
      customerName: customerFullName,
      amount: grandTotal,
      documents: generatedDocuments,
    };

    documents.push({
      name: 'كشف_المستندات.html',
      content: generateDocumentsListHtml(documentsListData),
    });
  }

  // تضمين اللوقو في جميع المستندات HTML فقط
  const documentsWithLogo = await Promise.all(
    documents.map(async (doc) => {
      if (typeof doc.content === 'string') {
        return {
          ...doc,
          content: await embedLogoInHtml(doc.content),
        };
      }
      return doc;
    })
  );

  // جلب الملفات الفعلية المرفوعة للعميل
  try {
    // 1. جلب مستندات العقد (العقد + المستندات القانونية المرفوعة)
    const contractDocs = await fetchContractDocuments(customer.contract_id, companyId);
    for (const doc of contractDocs) {
      documentsWithLogo.push({
        name: doc.name,
        content: doc.blob,
      });
    }

    // 2. جلب مستندات الشركة (مرة واحدة فقط - ستكون مكررة لكل عميل لكنها ضرورية)
    // نجلبها في generateBulkDocumentsZip مرة واحدة ونوزعها على جميع العملاء
  } catch (error) {
    console.warn('فشل جلب الملفات المرفوعة:', error);
  }

  return {
    customerName: customerFullName,
    contractNumber: contract.contract_number || customer.contract_number,
    documents: documentsWithLogo,
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
        const customerDocs = await generateCustomerDocuments(customer, companyId, options);

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

  return await zip.generateAsync({ type: 'blob' });
}

/**
 * تحميل ملف ZIP
 */
export function downloadZipFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
