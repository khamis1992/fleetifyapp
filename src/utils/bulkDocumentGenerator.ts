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
  type ClaimsStatementData,
  type DocumentsListData,
  type CriminalComplaintData,
} from './official-letter-generator';
import { lawsuitService } from '@/services/lawsuitService';

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

/**
 * جلب بيانات العميل الكاملة من قاعدة البيانات
 */
async function fetchCustomerFullData(contractId: string) {
  // جلب بيانات العقد
  const { data: contract, error: contractError } = await supabase
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
        mobile,
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
    .single();

  if (contractError) throw contractError;

  // جلب الفواتير
  const { data: invoices, error: invoicesError } = await supabase
    .from('invoices')
    .select('*')
    .eq('contract_id', contractId)
    .neq('status', 'cancelled')
    .order('due_date', { ascending: true });

  if (invoicesError) throw invoicesError;

  // جلب المخالفات المرورية
  const { data: violations, error: violationsError } = await supabase
    .from('penalties')
    .select('*')
    .eq('contract_id', contractId)
    .neq('payment_status', 'paid');

  if (violationsError) throw violationsError;

  return { contract, invoices: invoices || [], violations: violations || [] };
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
async function generateCustomerDocuments(customer: BulkCustomerData): Promise<CustomerDocuments> {
  const { contract, invoices, violations } = await fetchCustomerFullData(customer.contract_id);
  
  const customerData = contract.customers;
  const vehicleData = contract.vehicles;
  
  const customerFullName = customerData
    ? `${customerData.first_name || ''} ${customerData.last_name || ''}`.trim() || customerData.company_name || customer.customer_name
    : customer.customer_name;

  const nationalId = customerData?.national_id || customer.national_id || 'غير محدد';
  const phone = customerData?.phone || customerData?.mobile || customer.phone || 'غير محدد';
  
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

  const documents: { name: string; content: string }[] = [];

  // 1. كشف المطالبات
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

  // 2. كشف المستندات
  const documentsListData: DocumentsListData = {
    caseTitle: `قضية تحصيل مستحقات - ${customerFullName}`,
    customerName: customerFullName,
    nationalId,
    contractNumber: contract.contract_number || customer.contract_number,
    documents: [
      { name: 'عقد الإيجار الأصلي', type: 'أصل', copies: 1 },
      { name: 'صورة الهوية / جواز السفر', type: 'صورة', copies: 1 },
      { name: 'كشف المطالبات المالية', type: 'أصل', copies: 1 },
      { name: 'إشعارات التحصيل السابقة', type: 'صورة', copies: 1 },
    ],
    totalAmount: grandTotal,
  };

  documents.push({
    name: 'كشف_المستندات.html',
    content: generateDocumentsListHtml(documentsListData),
  });

  // 3. بلاغ جنائي (إذا كانت هناك مخالفات أو مبالغ كبيرة)
  if (grandTotal > 5000 || violations.length > 0) {
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
      name: 'بلاغ_جنائي.html',
      content: generateCriminalComplaintHtml(complaintData),
    });
  }

  return {
    customerName: customerFullName,
    contractNumber: contract.contract_number || customer.contract_number,
    documents,
  };
}

/**
 * إنشاء ملف ZIP يحتوي على جميع المستندات
 */
export async function generateBulkDocumentsZip(
  customers: BulkCustomerData[],
  onProgress?: (progress: BulkGenerationProgress) => void
): Promise<Blob> {
  const zip = new JSZip();
  const errors: string[] = [];

  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];
    
    onProgress?.({
      current: i + 1,
      total: customers.length,
      currentCustomer: customer.customer_name,
      status: 'generating',
      errors,
    });

    try {
      const customerDocs = await generateCustomerDocuments(customer);
      
      // إنشاء مجلد لكل عميل
      const folderName = `${customerDocs.contractNumber}_${customerDocs.customerName}`.replace(/[/\\?%*:|"<>]/g, '_');
      const folder = zip.folder(folderName);
      
      if (folder) {
        for (const doc of customerDocs.documents) {
          folder.file(doc.name, doc.content);
        }
      }
    } catch (error) {
      console.error(`Error generating documents for ${customer.customer_name}:`, error);
      errors.push(`فشل إنشاء مستندات ${customer.customer_name}: ${(error as Error).message}`);
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
      legal_status: 'opening_complaint',
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
      legal_status: 'case_opened',
      updated_at: new Date().toISOString(),
    })
    .eq('id', contractId);

  return caseData.id;
}
