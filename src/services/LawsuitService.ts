/**
 * خدمة إدارة الدعاوى القضائية
 * تتعامل مع تجهيز الدعاوى وإدارة المستندات القانونية
 */

import { supabase } from '@/integrations/supabase/client';

// أنواع المستندات القانونية
export type LegalDocumentType = 
  | 'commercial_register'      // السجل التجاري
  | 'establishment_record'     // قيد المنشأة
  | 'iban_certificate'         // شهادة IBAN
  | 'representative_id'        // البطاقة الشخصية للممثل
  | 'authorization_letter'     // خطاب التفويض
  | 'explanatory_memo'         // مذكرة شارحة (تُنشأ لكل دعوى)
  | 'contract_copy'            // صورة من العقد (لكل دعوى)
  | 'documents_list';          // كشف بالمستندات المرفوعة (يُنشأ تلقائياً)

// حالات الدعوى
export type LawsuitStatus = 'draft' | 'prepared' | 'submitted' | 'registered' | 'closed';

// واجهة مستند الشركة القانوني
export interface CompanyLegalDocument {
  id: string;
  company_id: string;
  document_type: LegalDocumentType;
  document_name: string;
  file_url: string;
  file_size?: number;
  expiry_date?: string;
  notes?: string;
  is_active: boolean;
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
}

// واجهة تجهيز الدعوى
export interface LawsuitPreparation {
  id: string;
  company_id: string;
  contract_id?: string;
  customer_id?: string;
  defendant_name: string;
  defendant_id_number?: string;
  defendant_type: 'natural_person' | 'legal_entity';
  overdue_rent: number;
  late_fees: number;
  other_fees: number;
  total_amount: number;
  amount_in_words?: string;
  case_title?: string;
  facts_text?: string;
  claims_text?: string;
  explanatory_memo_url?: string;
  claims_statement_url?: string;
  contract_copy_url?: string;
  status: LawsuitStatus;
  taqadi_case_number?: string;
  taqadi_reference_number?: string;
  prepared_at?: string;
  submitted_at?: string;
  registered_at?: string;
  prepared_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// واجهة بيانات العقد المتعثر
export interface OverdueContract {
  contract_id: string;
  contract_number: string;
  customer_id: string;
  customer_name: string;
  customer_id_number?: string;
  vehicle_info: string;
  total_overdue: number;
  days_overdue: number;
  last_payment_date?: string;
  contract_start_date: string;
  contract_end_date: string;
  has_lawsuit: boolean;
}

// أسماء أنواع المستندات بالعربية
export const DOCUMENT_TYPE_NAMES: Record<LegalDocumentType, string> = {
  commercial_register: 'السجل التجاري',
  establishment_record: 'قيد المنشأة',
  iban_certificate: 'شهادة IBAN',
  representative_id: 'البطاقة الشخصية للممثل',
  authorization_letter: 'خطاب التفويض',
  explanatory_memo: 'المذكرة الشارحة',
  contract_copy: 'صورة من العقد',
  documents_list: 'كشف بالمستندات المرفوعة',
};

// المستندات الثابتة (تُرفع مرة واحدة)
export const FIXED_DOCUMENTS: LegalDocumentType[] = [
  'commercial_register',
  'establishment_record',
  'iban_certificate',
  'representative_id',
];

// المستندات الديناميكية (تُنشأ لكل دعوى)
export const DYNAMIC_DOCUMENTS: LegalDocumentType[] = [
  'explanatory_memo',
  'contract_copy',
  'documents_list',
];

// أسماء حالات الدعوى بالعربية
export const LAWSUIT_STATUS_NAMES: Record<LawsuitStatus, string> = {
  draft: 'مسودة',
  prepared: 'جاهز للرفع',
  submitted: 'تم الرفع',
  registered: 'مسجل في تقاضي',
  closed: 'مغلق',
};

class LawsuitService {
  // ==========================================
  // إدارة مستندات الشركة القانونية
  // ==========================================

  /**
   * جلب جميع مستندات الشركة القانونية
   */
  async getCompanyLegalDocuments(companyId: string): Promise<CompanyLegalDocument[]> {
    const { data, error } = await supabase
      .from('company_legal_documents')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('document_type');

    if (error) throw error;
    return (data || []) as CompanyLegalDocument[];
  }

  /**
   * رفع مستند قانوني للشركة
   */
  async uploadLegalDocument(
    companyId: string,
    documentType: LegalDocumentType,
    file: File,
    expiryDate?: string,
    notes?: string
  ): Promise<CompanyLegalDocument> {
    // رفع الملف إلى Storage
    const fileName = `${companyId}/${documentType}_${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('legal-documents')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // الحصول على رابط الملف
    const { data: urlData } = supabase.storage
      .from('legal-documents')
      .getPublicUrl(fileName);

    // إلغاء تفعيل المستند القديم إن وجد
    await supabase
      .from('company_legal_documents')
      .update({ is_active: false })
      .eq('company_id', companyId)
      .eq('document_type', documentType);

    // إدراج المستند الجديد
    const { data, error } = await supabase
      .from('company_legal_documents')
      .insert({
        company_id: companyId,
        document_type: documentType,
        document_name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
        expiry_date: expiryDate || null,
        notes: notes || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data as CompanyLegalDocument;
  }

  /**
   * حذف مستند قانوني
   */
  async deleteLegalDocument(documentId: string): Promise<void> {
    const { error } = await supabase
      .from('company_legal_documents')
      .update({ is_active: false })
      .eq('id', documentId);

    if (error) throw error;
  }

  // ==========================================
  // إدارة تجهيز الدعاوى
  // ==========================================

  /**
   * جلب العقود المتعثرة عن الدفع
   */
  async getOverdueContracts(companyId: string, minDaysOverdue: number = 30): Promise<OverdueContract[]> {
    // استعلام للحصول على العقود المتعثرة مع حساب المبالغ
    // نستخدم left join بدون !inner لتجنب فشل الاستعلام عند عدم وجود علاقة
    const { data: contracts, error } = await supabase
      .from('contracts')
      .select(`
        id,
        contract_number,
        customer_id,
        start_date,
        end_date,
        make,
        model,
        year,
        license_plate,
        balance_due,
        days_overdue,
        customers(
          id,
          first_name,
          last_name,
          national_id
        ),
        vehicles(
          make,
          model,
          year,
          plate_number
        )
      `)
      .eq('company_id', companyId)
      .eq('status', 'active');

    if (error) throw error;

    // حساب المبالغ المتأخرة لكل عقد
    const overdueContracts: OverdueContract[] = [];

    for (const contract of contracts || []) {
      // استخدام balance_due و days_overdue من العقد مباشرة إن وجدت
      const balanceDue = (contract as any).balance_due || 0;
      const contractDaysOverdue = (contract as any).days_overdue || 0;
      
      let totalOverdue = balanceDue;
      let daysOverdue = contractDaysOverdue;

      // إذا لم تكن القيم موجودة، نحسبها من الفواتير
      if (totalOverdue <= 0) {
        const { data: invoices } = await supabase
          .from('invoices')
          .select('total_amount, paid_amount, due_date')
          .eq('contract_id', contract.id)
          .lt('due_date', new Date().toISOString().split('T')[0]);

        if (!invoices || invoices.length === 0) continue;

        let oldestDueDate: Date | null = null;

        for (const invoice of invoices) {
          const unpaid = (invoice.total_amount || 0) - (invoice.paid_amount || 0);
          if (unpaid > 0) {
            totalOverdue += unpaid;
            const dueDate = new Date(invoice.due_date);
            if (!oldestDueDate || dueDate < oldestDueDate) {
              oldestDueDate = dueDate;
            }
          }
        }

        daysOverdue = oldestDueDate 
          ? Math.floor((Date.now() - oldestDueDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0;
      }

      if (totalOverdue <= 0) continue;
      if (daysOverdue < minDaysOverdue) continue;

      // التحقق من وجود دعوى سابقة
      const { data: existingLawsuit } = await supabase
        .from('lawsuit_preparations')
        .select('id')
        .eq('contract_id', contract.id)
        .neq('status', 'closed')
        .maybeSingle();

      const customer = (contract as any).customers;
      const vehicle = (contract as any).vehicles;
      
      // استخدام بيانات السيارة من العقد مباشرة كـ fallback
      const vehicleMake = vehicle?.make || (contract as any).make || '';
      const vehicleModel = vehicle?.model || (contract as any).model || '';
      const vehicleYear = vehicle?.year || (contract as any).year || '';
      const vehiclePlate = vehicle?.plate_number || (contract as any).license_plate || '';

      // تجميع اسم العميل من first_name و last_name
      const customerName = customer 
        ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'غير معروف'
        : 'غير معروف';

      overdueContracts.push({
        contract_id: contract.id,
        contract_number: contract.contract_number,
        customer_id: contract.customer_id || '',
        customer_name: customerName,
        customer_id_number: customer?.national_id,
        vehicle_info: `${vehicleMake} ${vehicleModel} ${vehicleYear} - ${vehiclePlate}`.trim(),
        total_overdue: totalOverdue,
        days_overdue: daysOverdue,
        contract_start_date: contract.start_date,
        contract_end_date: contract.end_date,
        has_lawsuit: !!existingLawsuit,
      });
    }

    // ترتيب حسب المبلغ المتأخر
    return overdueContracts.sort((a, b) => b.total_overdue - a.total_overdue);
  }

  /**
   * إنشاء تجهيز دعوى جديد
   */
  async createLawsuitPreparation(
    companyId: string,
    contractId: string,
    customerId: string,
    data: Partial<LawsuitPreparation>
  ): Promise<LawsuitPreparation> {
    const { data: lawsuit, error } = await supabase
      .from('lawsuit_preparations')
      .insert({
        company_id: companyId,
        contract_id: contractId,
        customer_id: customerId,
        defendant_name: data.defendant_name,
        defendant_id_number: data.defendant_id_number,
        defendant_type: data.defendant_type || 'natural_person',
        overdue_rent: data.overdue_rent || 0,
        late_fees: data.late_fees || 0,
        other_fees: data.other_fees || 0,
        total_amount: data.total_amount || 0,
        amount_in_words: data.amount_in_words,
        case_title: data.case_title,
        facts_text: data.facts_text,
        claims_text: data.claims_text,
        status: 'draft',
      })
      .select()
      .single();

    if (error) throw error;
    return lawsuit as LawsuitPreparation;
  }

  /**
   * تحديث تجهيز الدعوى
   */
  async updateLawsuitPreparation(
    lawsuitId: string,
    updates: Partial<LawsuitPreparation>
  ): Promise<LawsuitPreparation> {
    const { data, error } = await supabase
      .from('lawsuit_preparations')
      .update(updates)
      .eq('id', lawsuitId)
      .select()
      .single();

    if (error) throw error;
    return data as LawsuitPreparation;
  }

  /**
   * جلب تجهيز دعوى بالمعرف
   */
  async getLawsuitPreparation(lawsuitId: string): Promise<LawsuitPreparation | null> {
    const { data, error } = await supabase
      .from('lawsuit_preparations')
      .select('*')
      .eq('id', lawsuitId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as LawsuitPreparation;
  }

  /**
   * جلب جميع الدعاوى المجهزة للشركة
   */
  async getLawsuitPreparations(companyId: string): Promise<LawsuitPreparation[]> {
    const { data, error } = await supabase
      .from('lawsuit_preparations')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as LawsuitPreparation[];
  }

  // ==========================================
  // توليد النصوص والمستندات
  // ==========================================

  /**
   * تحويل المبلغ إلى نص عربي
   */
  convertAmountToWords(amount: number): string {
    const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
    const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
    const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
    
    if (amount === 0) return 'صفر ريال قطري';
    
    const intAmount = Math.floor(amount);
    let result = '';
    
    // الآلاف
    const thousands = Math.floor(intAmount / 1000);
    const remainder = intAmount % 1000;
    
    if (thousands > 0) {
      if (thousands === 1) {
        result = 'ألف';
      } else if (thousands === 2) {
        result = 'ألفان';
      } else if (thousands >= 3 && thousands <= 10) {
        result = ones[thousands] + ' آلاف';
      } else {
        result = this.convertHundreds(thousands) + ' ألف';
      }
    }
    
    if (remainder > 0) {
      if (result) result += ' و';
      result += this.convertHundreds(remainder);
    }
    
    return result + ' ريال قطري';
  }

  private convertHundreds(num: number): string {
    const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
    const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
    const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
    
    let result = '';
    const h = Math.floor(num / 100);
    const t = Math.floor((num % 100) / 10);
    const o = num % 10;
    
    if (h > 0) result = hundreds[h];
    
    if (num % 100 >= 10 && num % 100 <= 19) {
      if (result) result += ' و';
      result += teens[num % 100 - 10];
    } else {
      if (o > 0) {
        if (result) result += ' و';
        result += ones[o];
      }
      if (t > 0) {
        if (result) result += ' و';
        result += tens[t];
      }
    }
    
    return result;
  }

  /**
   * توليد عنوان الدعوى
   */
  generateCaseTitle(customerName: string): string {
    const shortName = customerName.split(' ').slice(0, 2).join(' ');
    return `مطالبة مالية-إيجار سيارة-${shortName}`.substring(0, 50);
  }

  /**
   * توليد نص الوقائع
   */
  generateFactsText(
    customerName: string,
    contractDate: string,
    vehicleInfo: string,
    overdueAmount: number
  ): string {
    const formattedDate = new Date(contractDate).toLocaleDateString('en-GB');
    return `بتاريخ ${formattedDate} أبرمت شركة العراف لتأجير السيارات (المدعية) عقد إيجار سيارة مع السيد/ ${customerName} (المدعى عليه) وذلك لاستئجار سيارة ${vehicleInfo}.

وقد التزمت المدعية بتسليم السيارة المؤجرة للمدعى عليه في حالة جيدة وصالحة للاستخدام، إلا أن المدعى عليه أخل بالتزاماته التعاقدية وامتنع عن سداد الإيجارات المستحقة عليه.

وبالرغم من المطالبات الودية المتكررة، إلا أن المدعى عليه لم يقم بسداد المبالغ المستحقة والتي بلغت ${overdueAmount.toLocaleString('en-US')} ريال قطري.`;
  }

  /**
   * توليد نص الطلبات
   */
  generateClaimsText(totalAmount: number): string {
    return `1. إلزام المدعى عليه بأن يؤدي للمدعية مبلغ (${totalAmount.toLocaleString('en-US')}) ريال قطري قيمة الإيجارات المتأخرة.

2. إلزام المدعى عليه بالفوائد القانونية من تاريخ الاستحقاق وحتى تمام السداد.

3. إلزام المدعى عليه بالرسوم والمصاريف ومقابل أتعاب المحاماة.`;
  }
}

export const lawsuitService = new LawsuitService();
export default lawsuitService;

