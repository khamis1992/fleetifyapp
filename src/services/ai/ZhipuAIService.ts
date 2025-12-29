/**
 * Smart Document Generation Service
 * خدمة توليد الكتب الرسمية الذكية
 * 
 * تستخدم OpenAI عبر Supabase Edge Function لتوليد كتب احترافية
 */

// Supabase Edge Function URL
const EDGE_FUNCTION_URL = 'https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/smart-document-generator';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  success: boolean;
  content: string;
  error?: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  description: string;
  questions: Question[];
  systemPrompt: string;
}

export interface Question {
  id: string;
  question: string;
  type: 'text' | 'select' | 'date' | 'number' | 'textarea';
  options?: string[];
  placeholder?: string;
  required?: boolean;
}

// معلومات الشركة
const COMPANY_INFO = {
  name_ar: 'شركة العراف لتأجير السيارات',
  name_en: 'AL-ARAF CAR RENTAL L.L.C',
  address: 'أم صلال محمد – الشارع التجاري – مبنى (79) – الطابق الأول – مكتب (2)',
  phone: ' 3141 1919',
  email: 'info@alaraf.qa',
  cr: 'س.ت: 146832',
  logo: '/receipts/logo.png',
  authorized_signatory: 'أسامة أحمد البشرى',
  authorized_title: 'المخول بالتوقيع',
};

// تنسيق التاريخ
const formatDate = (date: Date = new Date()) => {
  return date.toLocaleDateString('ar-QA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// توليد رقم مرجعي
const generateRefNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${year}/${month}/${random}`;
};

// قوالب الكتب الرسمية
export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  // كتب التأمين
  {
    id: 'insurance-deletion',
    name: 'طلب شطب مركبة من التأمين',
    nameEn: 'Vehicle Insurance Deletion Request',
    category: 'insurance',
    description: 'كتاب رسمي لشركة التأمين لطلب شطب مركبة من البوليصة',
    questions: [
      { id: 'insurance_company', question: 'ما هي شركة التأمين؟', type: 'select', options: ['QIC', 'Qatar Insurance', 'Doha Insurance', 'Al Khaleej Insurance', 'أخرى'], required: true },
      { id: 'policy_number', question: 'ما هو رقم البوليصة؟', type: 'text', placeholder: 'مثال: POL-2024-12345', required: true },
      { id: 'vehicle_plate', question: 'ما هو رقم لوحة المركبة؟', type: 'text', placeholder: 'مثال: 12345', required: true },
      { id: 'vehicle_type', question: 'ما هو نوع المركبة؟', type: 'text', placeholder: 'مثال: تويوتا كامري 2023', required: true },
      { id: 'chassis_number', question: 'ما هو رقم الشاصي؟', type: 'text', placeholder: 'رقم الشاصي', required: true },
      { id: 'deletion_reason', question: 'ما هو سبب الشطب؟', type: 'select', options: ['بيع المركبة', 'حادث كلي', 'إلغاء التسجيل', 'نقل الملكية', 'أخرى'], required: true },
      { id: 'deletion_date', question: 'تاريخ الشطب المطلوب؟', type: 'date', required: true },
    ],
    systemPrompt: 'insurance-deletion',
  },
  {
    id: 'insurance-accident',
    name: 'إخطار بحادث مروري',
    nameEn: 'Traffic Accident Notification',
    category: 'insurance',
    description: 'كتاب إخطار شركة التأمين بوقوع حادث مروري',
    questions: [
      { id: 'insurance_company', question: 'ما هي شركة التأمين؟', type: 'select', options: ['QIC', 'Qatar Insurance', 'Doha Insurance', 'Al Khaleej Insurance', 'أخرى'], required: true },
      { id: 'policy_number', question: 'ما هو رقم البوليصة؟', type: 'text', required: true },
      { id: 'vehicle_plate', question: 'ما هو رقم لوحة المركبة؟', type: 'text', required: true },
      { id: 'accident_date', question: 'تاريخ الحادث؟', type: 'date', required: true },
      { id: 'accident_location', question: 'مكان الحادث؟', type: 'text', placeholder: 'العنوان التفصيلي', required: true },
      { id: 'accident_description', question: 'وصف الحادث؟', type: 'textarea', placeholder: 'اشرح ما حدث بالتفصيل', required: true },
      { id: 'police_report', question: 'رقم تقرير الشرطة؟', type: 'text', required: true },
      { id: 'damages', question: 'وصف الأضرار؟', type: 'textarea', required: true },
    ],
    systemPrompt: 'insurance-accident',
  },
  {
    id: 'insurance-claim',
    name: 'طلب تعويض من التأمين',
    nameEn: 'Insurance Claim Request',
    category: 'insurance',
    description: 'كتاب رسمي لطلب تعويض من شركة التأمين',
    questions: [
      { id: 'insurance_company', question: 'ما هي شركة التأمين؟', type: 'select', options: ['QIC', 'Qatar Insurance', 'Doha Insurance', 'Al Khaleej Insurance', 'أخرى'], required: true },
      { id: 'policy_number', question: 'ما هو رقم البوليصة؟', type: 'text', required: true },
      { id: 'claim_type', question: 'نوع التعويض المطلوب؟', type: 'select', options: ['تعويض حادث', 'تعويض سرقة', 'تعويض أضرار طبيعية', 'أخرى'], required: true },
      { id: 'claim_amount', question: 'مبلغ التعويض المطلوب (بالريال)؟', type: 'number', required: true },
      { id: 'claim_reason', question: 'سبب طلب التعويض؟', type: 'textarea', required: true },
      { id: 'supporting_docs', question: 'المستندات المرفقة؟', type: 'textarea', placeholder: 'اذكر المستندات المرفقة', required: true },
    ],
    systemPrompt: 'insurance-claim',
  },
  // كتب المرور
  {
    id: 'traffic-ownership-transfer',
    name: 'طلب نقل ملكية مركبة',
    nameEn: 'Vehicle Ownership Transfer Request',
    category: 'traffic',
    description: 'كتاب رسمي لإدارة المرور لنقل ملكية مركبة',
    questions: [
      { id: 'vehicle_plate', question: 'ما هو رقم لوحة المركبة؟', type: 'text', required: true },
      { id: 'vehicle_type', question: 'ما هو نوع المركبة وموديلها؟', type: 'text', required: true },
      { id: 'chassis_number', question: 'ما هو رقم الشاصي؟', type: 'text', required: true },
      { id: 'current_owner', question: 'اسم المالك الحالي؟', type: 'text', required: true },
      { id: 'new_owner', question: 'اسم المالك الجديد؟', type: 'text', required: true },
      { id: 'new_owner_id', question: 'رقم هوية المالك الجديد؟', type: 'text', required: true },
      { id: 'transfer_reason', question: 'سبب نقل الملكية؟', type: 'select', options: ['بيع', 'هبة', 'إرث', 'أخرى'], required: true },
    ],
    systemPrompt: 'traffic-ownership-transfer',
  },
  {
    id: 'traffic-license-renewal',
    name: 'طلب تجديد رخصة مركبة',
    nameEn: 'Vehicle License Renewal Request',
    category: 'traffic',
    description: 'كتاب رسمي لتجديد رخصة سير مركبة',
    questions: [
      { id: 'vehicle_plate', question: 'ما هو رقم لوحة المركبة؟', type: 'text', required: true },
      { id: 'vehicle_type', question: 'ما هو نوع المركبة؟', type: 'text', required: true },
      { id: 'license_expiry', question: 'تاريخ انتهاء الرخصة الحالية؟', type: 'date', required: true },
      { id: 'renewal_period', question: 'مدة التجديد المطلوبة؟', type: 'select', options: ['سنة واحدة', 'سنتان', 'ثلاث سنوات'], required: true },
    ],
    systemPrompt: 'traffic-license-renewal',
  },
  {
    id: 'traffic-violation-objection',
    name: 'اعتراض على مخالفة مرورية',
    nameEn: 'Traffic Violation Objection',
    category: 'traffic',
    description: 'كتاب اعتراض رسمي على مخالفة مرورية',
    questions: [
      { id: 'violation_number', question: 'ما هو رقم المخالفة؟', type: 'text', required: true },
      { id: 'violation_date', question: 'تاريخ المخالفة؟', type: 'date', required: true },
      { id: 'vehicle_plate', question: 'رقم لوحة المركبة؟', type: 'text', required: true },
      { id: 'violation_type', question: 'نوع المخالفة؟', type: 'text', required: true },
      { id: 'objection_reason', question: 'سبب الاعتراض؟', type: 'textarea', required: true },
      { id: 'supporting_evidence', question: 'الأدلة المؤيدة؟', type: 'textarea', placeholder: 'اذكر أي أدلة أو شهود', required: false },
    ],
    systemPrompt: 'traffic-violation-objection',
  },
  // كتب العملاء
  {
    id: 'customer-payment-warning',
    name: 'إنذار سداد للعميل',
    nameEn: 'Payment Warning Notice',
    category: 'customer',
    description: 'كتاب إنذار رسمي للعميل بضرورة السداد',
    questions: [
      { id: 'customer_name', question: 'اسم العميل؟', type: 'text', required: true },
      { id: 'contract_number', question: 'رقم العقد؟', type: 'text', required: true },
      { id: 'amount_due', question: 'المبلغ المستحق (بالريال)؟', type: 'number', required: true },
      { id: 'due_date', question: 'تاريخ الاستحقاق؟', type: 'date', required: true },
      { id: 'days_overdue', question: 'عدد أيام التأخير؟', type: 'number', required: true },
      { id: 'payment_deadline', question: 'مهلة السداد النهائية؟', type: 'date', required: true },
      { id: 'consequences', question: 'الإجراءات في حالة عدم السداد؟', type: 'textarea', placeholder: 'مثال: إجراءات قانونية، إلغاء العقد...', required: true },
    ],
    systemPrompt: 'customer-payment-warning',
  },
  {
    id: 'customer-contract-termination',
    name: 'إشعار إنهاء عقد',
    nameEn: 'Contract Termination Notice',
    category: 'customer',
    description: 'كتاب رسمي لإبلاغ العميل بإنهاء العقد',
    questions: [
      { id: 'customer_name', question: 'اسم العميل؟', type: 'text', required: true },
      { id: 'contract_number', question: 'رقم العقد؟', type: 'text', required: true },
      { id: 'contract_start', question: 'تاريخ بداية العقد؟', type: 'date', required: true },
      { id: 'termination_date', question: 'تاريخ الإنهاء؟', type: 'date', required: true },
      { id: 'termination_reason', question: 'سبب الإنهاء؟', type: 'textarea', required: true },
      { id: 'final_settlement', question: 'التسوية النهائية؟', type: 'textarea', placeholder: 'تفاصيل المبالغ المستحقة أو المستردة', required: true },
    ],
    systemPrompt: 'customer-contract-termination',
  },
  // كتب عامة
  {
    id: 'general-official',
    name: 'كتاب رسمي عام',
    nameEn: 'General Official Letter',
    category: 'general',
    description: 'كتاب رسمي عام لأي جهة',
    questions: [
      { id: 'recipient', question: 'الجهة المرسل إليها؟', type: 'text', required: true },
      { id: 'recipient_title', question: 'المسمى الوظيفي للمستلم؟', type: 'text', placeholder: 'مثال: مدير عام، رئيس قسم...', required: false },
      { id: 'subject', question: 'موضوع الكتاب؟', type: 'text', required: true },
      { id: 'content', question: 'محتوى الكتاب؟', type: 'textarea', placeholder: 'اكتب المحتوى الرئيسي للكتاب', required: true },
      { id: 'attachments', question: 'المرفقات (إن وجدت)؟', type: 'textarea', required: false },
    ],
    systemPrompt: 'general-official',
  },
];

// الفئات المتاحة
export const DOCUMENT_CATEGORIES = [
  { id: 'insurance', name: 'التأمين', icon: '🏢', color: 'blue' },
  { id: 'traffic', name: 'المرور', icon: '🚗', color: 'green' },
  { id: 'customer', name: 'العملاء', icon: '👤', color: 'purple' },
  { id: 'general', name: 'عام', icon: '📋', color: 'gray' },
];

/**
 * التحقق من نوع المستلم (جهة/محكمة أو شخص)
 */
function isOrganization(recipient: string): boolean {
  const orgKeywords = [
    'محكمة', 'إدارة', 'وزارة', 'هيئة', 'مؤسسة', 'شركة', 'بنك', 'مصرف',
    'جامعة', 'كلية', 'مدرسة', 'مستشفى', 'مركز', 'قسم', 'دائرة', 'مكتب',
    'سفارة', 'قنصلية', 'نيابة', 'تنفيذ', 'استئناف', 'تمييز', 'مرور', 'شرطة'
  ];
  return orgKeywords.some(keyword => recipient.includes(keyword));
}

/**
 * تنسيق المستلم بشكل صحيح
 */
function formatRecipient(recipient: string): { formatted: string; greeting: string } {
  const isOrg = isOrganization(recipient);
  
  if (isOrg) {
    return {
      formatted: recipient,
      greeting: '' // لا نضع "حفظه الله" للجهات
    };
  } else {
    return {
      formatted: `السيد / ${recipient}`,
      greeting: 'حفظه الله ورعاه'
    };
  }
}

/**
 * توليد قالب HTML احترافي للكتاب الرسمي - مُحسّن للطباعة على A4
 */
function generateLetterHTML(
  recipient: string,
  subject: string,
  body: string,
  attachments?: string
): string {
  const refNumber = generateRefNumber();
  const currentDate = formatDate();
  const recipientInfo = formatRecipient(recipient);
  
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>كتاب رسمي - ${COMPANY_INFO.name_ar}</title>
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
        padding: 0;
      }
      
      .letter-container {
        width: 100% !important;
        max-width: none !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        box-shadow: none !important;
      }
      
      .no-print {
        display: none !important;
      }
    }
    
    body {
      font-family: 'Traditional Arabic', 'Times New Roman', 'Arial', serif;
      font-size: 14px;
      line-height: 1.8;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 20px;
      direction: rtl;
    }
    
    .letter-container {
      max-width: 210mm;
      margin: 0 auto;
      padding: 20px 30px;
      background: #fff;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px double #1e3a5f;
      padding-bottom: 15px;
      margin-bottom: 15px;
    }
    
    .company-ar {
      flex: 1;
      text-align: right;
    }
    
    .company-ar h1 {
      color: #1e3a5f;
      margin: 0;
      font-size: 20px;
      font-weight: bold;
    }
    
    .company-ar p {
      color: #000;
      margin: 2px 0;
      font-size: 11px;
    }
    
    .logo-container {
      flex: 0 0 130px;
      text-align: center;
      padding: 0 15px;
    }
    
    .logo-container img {
      max-height: 70px;
      max-width: 120px;
    }
    
    .company-en {
      flex: 1;
      text-align: left;
    }
    
    .company-en h1 {
      color: #1e3a5f;
      margin: 0;
      font-size: 14px;
      font-weight: bold;
    }
    
    .company-en p {
      color: #000;
      margin: 2px 0;
      font-size: 10px;
    }
    
    .address-bar {
      text-align: center;
      color: #000;
      font-size: 10px;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #ccc;
    }
    
    .ref-date {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      font-size: 13px;
      color: #000;
    }
    
    .recipient-box {
      margin-bottom: 15px;
      padding: 12px 15px;
      border-right: 4px solid #1e3a5f;
      background: #f5f5f5;
    }
    
    .recipient-box p {
      margin: 0;
      font-size: 15px;
      color: #000;
    }
    
    .recipient-box .greeting {
      margin-top: 5px;
      font-size: 13px;
    }
    
    .salutation {
      margin: 20px 0 10px 0;
      font-size: 15px;
      color: #000;
    }
    
    .subject-box {
      background: #1e3a5f;
      color: #fff;
      padding: 10px 15px;
      margin-bottom: 20px;
      font-size: 14px;
    }
    
    .intro {
      margin-bottom: 15px;
      font-size: 14px;
      color: #000;
    }
    
    .content {
      text-align: justify;
      margin-bottom: 25px;
      font-size: 14px;
      color: #000;
      padding: 15px;
      background: #fafafa;
      border: 1px solid #e0e0e0;
    }
    
    .content p {
      margin: 10px 0;
      line-height: 2;
    }
    
    .attachments {
      margin-bottom: 20px;
      background: #fffbeb;
      padding: 12px 15px;
      border: 1px solid #fcd34d;
    }
    
    .attachments strong {
      color: #92400e;
      font-size: 13px;
    }
    
    .attachments ul {
      margin: 8px 0 0 0;
      padding-right: 20px;
      color: #000;
    }
    
    .attachments li {
      margin: 4px 0;
    }
    
    .closing {
      text-align: center;
      margin: 25px 0;
      font-size: 14px;
      color: #000;
    }
    
    .signature-section {
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    
    .stamp-area {
      text-align: center;
      width: 120px;
    }
    
    .stamp-circle {
      width: 100px;
      height: 100px;
      border: 2px dashed #999;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
    }
    
    .stamp-circle span {
      color: #666;
      font-size: 10px;
    }
    
    .signatory {
      text-align: center;
      flex: 1;
    }
    
    .signatory .company-name {
      color: #1e3a5f;
      font-weight: bold;
      font-size: 15px;
      margin-bottom: 35px;
    }
    
    .signatory .line {
      border-top: 2px solid #1e3a5f;
      width: 200px;
      margin: 0 auto;
      padding-top: 8px;
    }
    
    .signatory .name {
      font-size: 15px;
      font-weight: bold;
      color: #000;
      margin: 0;
    }
    
    .signatory .title {
      font-size: 12px;
      color: #000;
      margin-top: 3px;
    }
    
    .sign-area {
      text-align: center;
      width: 120px;
    }
    
    .sign-line {
      width: 100px;
      height: 50px;
      border-bottom: 2px solid #999;
      margin: 0 auto 8px auto;
    }
    
    .sign-area span {
      color: #666;
      font-size: 10px;
    }
    
    .footer {
      margin-top: 30px;
      padding-top: 10px;
      border-top: 1px solid #ccc;
      text-align: center;
      font-size: 9px;
      color: #000;
    }
  </style>
</head>
<body>
  <div class="letter-container">
    
    <!-- الترويسة -->
    <div class="header">
      <div class="company-ar">
        <h1>${COMPANY_INFO.name_ar}</h1>
        <p>ذ.م.م</p>
        <p>${COMPANY_INFO.cr}</p>
      </div>
      
      <div class="logo-container">
        <img src="${COMPANY_INFO.logo}" alt="شعار الشركة" onerror="this.style.display='none'" />
      </div>
      
      <div class="company-en" dir="ltr">
        <h1>${COMPANY_INFO.name_en}</h1>
        <p>C.R: 146832</p>
      </div>
    </div>
    
    <!-- العنوان -->
    <div class="address-bar">
      ${COMPANY_INFO.address}<br/>
      هاتف: ${COMPANY_INFO.phone} | البريد الإلكتروني: ${COMPANY_INFO.email}
    </div>
    
    <!-- التاريخ والرقم المرجعي -->
    <div class="ref-date">
      <div><strong>الرقم المرجعي:</strong> ${refNumber}</div>
      <div><strong>التاريخ:</strong> ${currentDate}</div>
    </div>
    
    <!-- المرسل إليه -->
    <div class="recipient-box">
      <p><strong>إلى / </strong> ${recipientInfo.formatted}</p>
      ${recipientInfo.greeting ? `<p class="greeting">${recipientInfo.greeting}</p>` : ''}
    </div>
    
    <!-- التحية -->
    <p class="salutation">السلام عليكم ورحمة الله وبركاته،</p>
    <p class="salutation" style="margin-top: 0;">تحية طيبة وبعد،،،</p>
    
    <!-- الموضوع -->
    <div class="subject-box">
      <strong>الموضوع: </strong>${subject}
    </div>
    
    <!-- المقدمة -->
    <p class="intro">
      نحن <strong>${COMPANY_INFO.name_ar}</strong>، نتقدم إليكم بهذا الكتاب الرسمي بخصوص الموضوع المذكور أعلاه، ونفيدكم بالآتي:
    </p>
    
    <!-- المحتوى -->
    <div class="content">
      ${body.split('\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('')}
    </div>
    
    ${attachments ? `
    <!-- المرفقات -->
    <div class="attachments">
      <strong>📎 المرفقات:</strong>
      <ul>
        ${attachments.split('،').map(att => `<li>${att.trim()}</li>`).join('')}
      </ul>
    </div>
    ` : ''}
    
    <!-- الختام -->
    <div class="closing">
      <p>وتفضلوا بقبول فائق الاحترام والتقدير،،،</p>
    </div>
    
    <!-- التوقيع -->
    <div class="signature-section">
      <div class="stamp-area">
        <div class="stamp-circle">
          <span>مكان الختم</span>
        </div>
      </div>
      
      <div class="signatory">
        <p class="company-name">${COMPANY_INFO.name_ar}</p>
        <div class="line">
          <p class="name">${COMPANY_INFO.authorized_signatory}</p>
          <p class="title">${COMPANY_INFO.authorized_title}</p>
        </div>
      </div>
      
      <div class="sign-area">
        <div class="sign-line"></div>
        <span>التوقيع</span>
      </div>
    </div>
    
    <!-- الذيل -->
    <div class="footer">
      ${COMPANY_INFO.address}<br/>
      هاتف: ${COMPANY_INFO.phone} | البريد: ${COMPANY_INFO.email}
    </div>
    
  </div>
</body>
</html>
  `;
}

/**
 * توليد كتاب رسمي باستخدام OpenAI عبر Edge Function
 */
export async function generateOfficialDocument(
  template: DocumentTemplate,
  answers: Record<string, string>
): Promise<ChatResponse & { aiPowered?: boolean }> {
  
  // أولاً: محاولة استخدام OpenAI عبر Edge Function
  try {
    console.log('🤖 Calling OpenAI via Edge Function...');
    
    // تحضير البيانات للإرسال
    const requestData = {
      templateName: template.name,
      answers: {
        ...answers,
        recipient: getRecipientFromTemplate(template.id, answers),
        subject: getSubjectFromTemplate(template.id, answers),
        content: getContentHintFromTemplate(template.id, answers),
      },
    };
    
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });
    
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.content) {
        console.log('✅ OpenAI document generated successfully, AI powered:', result.aiPowered);
        return {
          success: true,
          content: result.content,
          aiPowered: result.aiPowered,
        };
      }
    }
    
    console.log('⚠️ Edge function failed, falling back to local generation');
  } catch (error) {
    console.log('⚠️ Edge function error, falling back to local generation:', error);
  }
  
  // Fallback: توليد محلي في حالة فشل Edge Function
  return generateLocalDocument(template, answers);
}

/**
 * استخراج المستلم من القالب
 */
function getRecipientFromTemplate(templateId: string, answers: Record<string, string>): string {
  switch (templateId) {
    case 'insurance-deletion':
    case 'insurance-accident':
    case 'insurance-claim':
      return `شركة ${answers.insurance_company} للتأمين`;
    case 'traffic-ownership-transfer':
    case 'traffic-license-renewal':
    case 'traffic-violation-objection':
      return 'إدارة المرور - وزارة الداخلية';
    case 'customer-payment-warning':
    case 'customer-contract-termination':
      return answers.customer_name || 'العميل';
    case 'general-official':
      return answers.recipient || 'الجهة المعنية';
    default:
      return 'الجهة المعنية';
  }
}

/**
 * استخراج الموضوع من القالب
 */
function getSubjectFromTemplate(templateId: string, answers: Record<string, string>): string {
  switch (templateId) {
    case 'insurance-deletion':
      return `طلب شطب مركبة رقم ${answers.vehicle_plate} من بوليصة التأمين رقم ${answers.policy_number}`;
    case 'insurance-accident':
      return `إخطار بحادث مروري للمركبة رقم ${answers.vehicle_plate}`;
    case 'insurance-claim':
      return `طلب تعويض تأميني - بوليصة رقم ${answers.policy_number}`;
    case 'traffic-ownership-transfer':
      return `طلب نقل ملكية مركبة رقم ${answers.vehicle_plate}`;
    case 'traffic-license-renewal':
      return `طلب تجديد رخصة مركبة رقم ${answers.vehicle_plate}`;
    case 'traffic-violation-objection':
      return `اعتراض على مخالفة مرورية رقم ${answers.violation_number}`;
    case 'customer-payment-warning':
      return `إنذار سداد - عقد رقم ${answers.contract_number}`;
    case 'customer-contract-termination':
      return `إشعار إنهاء عقد رقم ${answers.contract_number}`;
    case 'general-official':
      return answers.subject || 'كتاب رسمي';
    default:
      return 'كتاب رسمي';
  }
}

/**
 * استخراج تلميح المحتوى من القالب
 */
function getContentHintFromTemplate(templateId: string, answers: Record<string, string>): string {
  const parts: string[] = [];
  
  Object.entries(answers).forEach(([key, value]) => {
    if (value && key !== 'recipient' && key !== 'subject') {
      parts.push(`${key}: ${value}`);
    }
  });
  
  return parts.join('\n');
}

/**
 * توليد كتاب محلياً (Fallback)
 */
async function generateLocalDocument(
  template: DocumentTemplate,
  answers: Record<string, string>
): Promise<ChatResponse> {
  try {
    let recipient = '';
    let subject = '';
    let body = '';
    let attachments = '';

    switch (template.id) {
      case 'insurance-deletion':
        recipient = `سعادة السيد مدير عام شركة ${answers.insurance_company} للتأمين`;
        subject = `طلب شطب مركبة من بوليصة التأمين رقم (${answers.policy_number})`;
        body = `إشارةً إلى بوليصة التأمين الشامل رقم <strong>(${answers.policy_number})</strong> الصادرة من شركتكم الموقرة والسارية المفعول، والتي تغطي أسطول مركبات شركتنا.

يسرنا أن نتقدم إلى سيادتكم بطلب شطب المركبة المبينة بياناتها أدناه من البوليصة المذكورة:

<table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 14px;">
  <tr style="background: #f1f5f9;">
    <td style="padding: 10px; border: 1px solid #e2e8f0; width: 35%;"><strong>نوع المركبة وموديلها:</strong></td>
    <td style="padding: 10px; border: 1px solid #e2e8f0;">${answers.vehicle_type}</td>
  </tr>
  <tr>
    <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>رقم اللوحة:</strong></td>
    <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #1e3a5f;">${answers.vehicle_plate}</td>
  </tr>
  <tr style="background: #f1f5f9;">
    <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>رقم الشاصي (VIN):</strong></td>
    <td style="padding: 10px; border: 1px solid #e2e8f0; font-family: monospace;">${answers.chassis_number}</td>
  </tr>
  <tr>
    <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>تاريخ الشطب المطلوب:</strong></td>
    <td style="padding: 10px; border: 1px solid #e2e8f0;">${answers.deletion_date || 'فوري'}</td>
  </tr>
  <tr style="background: #f1f5f9;">
    <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>سبب طلب الشطب:</strong></td>
    <td style="padding: 10px; border: 1px solid #e2e8f0;">${answers.deletion_reason || 'بيع المركبة'}</td>
  </tr>
</table>

وعليه، نأمل من سيادتكم التكرم بالموافقة على هذا الطلب، واتخاذ الإجراءات اللازمة لشطب المركبة من البوليصة اعتباراً من التاريخ المحدد أعلاه.

كما نرجو إفادتنا خطياً بما يلي:
• تأكيد إتمام عملية الشطب
• أي مبالغ مستردة من قسط التأمين (إن وجدت)
• أي متطلبات أو مستندات إضافية

نشكر لكم تعاونكم الدائم، ونتطلع إلى استمرار شراكتنا المثمرة.`;
        attachments = 'صورة من رخصة المركبة، صورة من البوليصة';
        break;

      case 'insurance-accident':
        recipient = `سعادة السيد مدير قسم المطالبات والتعويضات - شركة ${answers.insurance_company} للتأمين`;
        subject = `إخطار رسمي بوقوع حادث مروري - بوليصة رقم (${answers.policy_number})`;
        body = `عملاً بأحكام بوليصة التأمين الشامل رقم <strong>(${answers.policy_number})</strong>، والتي تلزمنا بالإخطار الفوري عن أي حوادث، يسرنا إحاطتكم علماً بوقوع حادث مروري لإحدى مركبات أسطولنا المؤمنة لديكم.

<div style="background: #fef2f2; border: 2px solid #fecaca; padding: 15px; border-radius: 8px; margin: 15px 0;">
  <strong style="color: #dc2626;">⚠️ بيانات الحادث:</strong>
</div>

<table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 14px;">
  <tr style="background: #fee2e2;">
    <td style="padding: 10px; border: 1px solid #fecaca; width: 35%;"><strong>تاريخ ووقت الحادث:</strong></td>
    <td style="padding: 10px; border: 1px solid #fecaca;">${answers.accident_date}</td>
  </tr>
  <tr>
    <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>موقع الحادث:</strong></td>
    <td style="padding: 10px; border: 1px solid #e2e8f0;">${answers.accident_location}</td>
  </tr>
  <tr style="background: #f1f5f9;">
    <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>رقم لوحة المركبة:</strong></td>
    <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">${answers.vehicle_plate}</td>
  </tr>
  <tr>
    <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>رقم تقرير الشرطة:</strong></td>
    <td style="padding: 10px; border: 1px solid #e2e8f0; font-family: monospace; color: #1e3a5f;">${answers.police_report}</td>
  </tr>
</table>

<strong>وصف الحادث:</strong>
<div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 10px 0; border-right: 4px solid #64748b;">
${answers.accident_description}
</div>

<strong>الأضرار الناتجة:</strong>
<div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 10px 0; border-right: 4px solid #f59e0b;">
${answers.damages}
</div>

بناءً على ما سبق، نرجو من سيادتكم التكرم بإيفاد مندوبكم المختص لمعاينة المركبة وتقدير الأضرار، وذلك تمهيداً لاتخاذ إجراءات التعويض وفق أحكام البوليصة.

نؤكد استعدادنا التام للتعاون وتقديم أي معلومات أو مستندات إضافية قد تطلبونها.`;
        attachments = 'نسخة من تقرير الشرطة، صور فوتوغرافية للأضرار، نسخة من رخصة القيادة';
        break;

      case 'insurance-claim':
        recipient = `سعادة السيد مدير إدارة المطالبات والتعويضات - شركة ${answers.insurance_company} للتأمين`;
        subject = `طلب صرف تعويض تأميني - بوليصة رقم (${answers.policy_number})`;
        body = `استناداً إلى بوليصة التأمين الشامل رقم <strong>(${answers.policy_number})</strong> السارية المفعول، والتي تغطي المخاطر المشار إليها في شروط وأحكام البوليصة.

يسرنا أن نتقدم إلى سيادتكم بطلب صرف تعويض عن الأضرار/الخسائر التي لحقت بنا، وفيما يلي تفاصيل المطالبة:

<table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 14px;">
  <tr style="background: #f1f5f9;">
    <td style="padding: 10px; border: 1px solid #e2e8f0; width: 35%;"><strong>نوع التعويض:</strong></td>
    <td style="padding: 10px; border: 1px solid #e2e8f0;">${answers.claim_type}</td>
  </tr>
  <tr>
    <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>مبلغ التعويض المطلوب:</strong></td>
    <td style="padding: 10px; border: 1px solid #e2e8f0;">
      <span style="font-size: 18px; font-weight: bold; color: #059669;">${Number(answers.claim_amount).toLocaleString('ar-QA')} ريال قطري</span>
    </td>
  </tr>
</table>

<strong>أسباب ومبررات طلب التعويض:</strong>
<div style="background: #f0fdf4; padding: 15px; border-radius: 6px; margin: 10px 0; border-right: 4px solid #10b981;">
${answers.claim_reason}
</div>

نرفق لسيادتكم كافة المستندات الثبوتية المؤيدة لهذه المطالبة، ونؤكد صحة البيانات المذكورة أعلاه، ونتحمل المسؤولية الكاملة عن أي معلومات غير دقيقة.

نأمل من سيادتكم سرعة البت في هذا الطلب، وإفادتنا بالموافقة وآلية صرف التعويض في أقرب وقت ممكن.`;
        attachments = answers.supporting_docs;
        break;

      case 'traffic-ownership-transfer':
        recipient = 'سعادة السيد مدير عام الإدارة العامة للمرور - وزارة الداخلية';
        subject = `طلب الموافقة على نقل ملكية مركبة - لوحة رقم (${answers.vehicle_plate})`;
        body = `نتقدم إلى إدارتكم الموقرة بطلب الموافقة على نقل ملكية المركبة المبينة بياناتها أدناه، وذلك وفقاً للأنظمة واللوائح المعمول بها في دولة قطر.

<div style="background: #eff6ff; border: 2px solid #3b82f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
  <strong style="color: #1d4ed8;">🚗 بيانات المركبة:</strong>
</div>

<table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 14px;">
  <tr style="background: #f1f5f9;">
    <td style="padding: 10px; border: 1px solid #e2e8f0; width: 35%;"><strong>نوع المركبة وموديلها:</strong></td>
    <td style="padding: 10px; border: 1px solid #e2e8f0;">${answers.vehicle_type}</td>
  </tr>
  <tr>
    <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>رقم اللوحة:</strong></td>
    <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; font-size: 16px; color: #1e3a5f;">${answers.vehicle_plate}</td>
  </tr>
  <tr style="background: #f1f5f9;">
    <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>رقم الشاصي (VIN):</strong></td>
    <td style="padding: 10px; border: 1px solid #e2e8f0; font-family: monospace;">${answers.chassis_number}</td>
  </tr>
</table>

<div style="display: flex; gap: 20px; margin: 20px 0;">
  <div style="flex: 1; background: #fef2f2; padding: 15px; border-radius: 8px; border: 1px solid #fecaca;">
    <strong style="color: #dc2626;">المالك الحالي (البائع):</strong>
    <p style="margin: 10px 0 0 0; font-size: 15px;">${answers.current_owner}</p>
  </div>
  <div style="flex: 1; background: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #86efac;">
    <strong style="color: #16a34a;">المالك الجديد (المشتري):</strong>
    <p style="margin: 10px 0 0 0; font-size: 15px;">${answers.new_owner}</p>
    <p style="margin: 5px 0 0 0; font-size: 13px; color: #4b5563;">رقم الهوية: ${answers.new_owner_id}</p>
  </div>
</div>

<strong>سبب نقل الملكية:</strong> ${answers.transfer_reason}

نلتزم بتقديم كافة المستندات المطلوبة لإتمام إجراءات النقل، ونتعهد بصحة البيانات المذكورة أعلاه.`;
        attachments = 'صورة من البطاقة الشخصية للطرفين، رخصة المركبة الأصلية، شهادة الفحص الفني، بوليصة التأمين السارية، عقد البيع الموثق';
        break;

      case 'traffic-license-renewal':
        recipient = 'سعادة السيد مدير إدارة تراخيص المركبات - الإدارة العامة للمرور';
        subject = `طلب تجديد رخصة سير مركبة - لوحة رقم (${answers.vehicle_plate})`;
        body = `نتقدم إلى إدارتكم الموقرة بطلب تجديد رخصة سير المركبة المملوكة لشركتنا، والمبينة بياناتها أدناه:

<table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 14px;">
  <tr style="background: #f1f5f9;">
    <td style="padding: 10px; border: 1px solid #e2e8f0; width: 35%;"><strong>نوع المركبة:</strong></td>
    <td style="padding: 10px; border: 1px solid #e2e8f0;">${answers.vehicle_type}</td>
  </tr>
  <tr>
    <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>رقم اللوحة:</strong></td>
    <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #1e3a5f;">${answers.vehicle_plate}</td>
  </tr>
  <tr style="background: #fef2f2;">
    <td style="padding: 10px; border: 1px solid #fecaca;"><strong>تاريخ انتهاء الرخصة الحالية:</strong></td>
    <td style="padding: 10px; border: 1px solid #fecaca; color: #dc2626; font-weight: bold;">${answers.license_expiry}</td>
  </tr>
  <tr style="background: #f0fdf4;">
    <td style="padding: 10px; border: 1px solid #86efac;"><strong>مدة التجديد المطلوبة:</strong></td>
    <td style="padding: 10px; border: 1px solid #86efac; color: #16a34a; font-weight: bold;">${answers.renewal_period}</td>
  </tr>
</table>

نؤكد لسيادتكم استيفاء جميع الشروط والمتطلبات النظامية للتجديد، بما في ذلك:
• سداد كافة المخالفات المرورية (إن وجدت)
• اجتياز الفحص الفني الدوري
• سريان بوليصة التأمين على المركبة

نرجو التكرم بالموافقة على تجديد الرخصة للمدة المطلوبة، ونتعهد بالالتزام بكافة الأنظمة واللوائح المرورية.`;
        attachments = 'رخصة المركبة الحالية، شهادة الفحص الفني الدوري، بوليصة التأمين السارية، السجل التجاري للشركة';
        break;

      case 'traffic-violation-objection':
        recipient = 'سعادة السيد رئيس لجنة التظلمات والاعتراضات - الإدارة العامة للمرور';
        subject = `تظلم رسمي من مخالفة مرورية - رقم المخالفة (${answers.violation_number})`;
        body = `استناداً إلى حق التظلم المكفول بموجب القانون، نتقدم إلى سيادتكم بهذا الاعتراض الرسمي على المخالفة المرورية الصادرة بحق مركبتنا، والمبينة تفاصيلها أدناه:

<div style="background: #fef2f2; border: 2px solid #fecaca; padding: 15px; border-radius: 8px; margin: 15px 0;">
  <strong style="color: #dc2626;">📋 بيانات المخالفة محل الاعتراض:</strong>
</div>

<table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 14px;">
  <tr style="background: #fee2e2;">
    <td style="padding: 10px; border: 1px solid #fecaca; width: 35%;"><strong>رقم المخالفة:</strong></td>
    <td style="padding: 10px; border: 1px solid #fecaca; font-weight: bold; font-family: monospace; font-size: 16px;">${answers.violation_number}</td>
  </tr>
  <tr>
    <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>تاريخ المخالفة:</strong></td>
    <td style="padding: 10px; border: 1px solid #e2e8f0;">${answers.violation_date}</td>
  </tr>
  <tr style="background: #f1f5f9;">
    <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>رقم لوحة المركبة:</strong></td>
    <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">${answers.vehicle_plate}</td>
  </tr>
  <tr>
    <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>نوع المخالفة:</strong></td>
    <td style="padding: 10px; border: 1px solid #e2e8f0;">${answers.violation_type}</td>
  </tr>
</table>

<strong style="color: #1e3a5f;">أسباب ومبررات الاعتراض:</strong>
<div style="background: #eff6ff; padding: 15px; border-radius: 6px; margin: 10px 0; border-right: 4px solid #3b82f6;">
${answers.objection_reason}
</div>

${answers.supporting_evidence ? `
<strong style="color: #1e3a5f;">الأدلة والشواهد المؤيدة للاعتراض:</strong>
<div style="background: #f0fdf4; padding: 15px; border-radius: 6px; margin: 10px 0; border-right: 4px solid #10b981;">
${answers.supporting_evidence}
</div>
` : ''}

بناءً على ما تقدم، نلتمس من سيادتكم التكرم بدراسة اعتراضنا والنظر في إلغاء المخالفة أو تخفيض قيمتها، وذلك للأسباب الموضحة أعلاه.

نثق في عدالة لجنتكم الموقرة، ونتطلع إلى قراركم الكريم.`;
        attachments = answers.supporting_evidence ? 'المستندات والأدلة المؤيدة للاعتراض' : '';
        break;

      case 'customer-payment-warning':
        recipient = `السيد / السيدة ${answers.customer_name} المحترم/ة`;
        subject = `إنذار رسمي بالسداد - عقد الإيجار رقم (${answers.contract_number})`;
        body = `تحية طيبة،

إشارةً إلى عقد تأجير المركبات المبرم بيننا تحت رقم <strong>(${answers.contract_number})</strong>، والذي ينظم العلاقة التعاقدية بين الطرفين ويحدد الالتزامات المالية المترتبة على كل منهما.

نود إحاطة سيادتكم علماً بأن سجلاتنا المالية تُظهر وجود مستحقات مالية متأخرة السداد، وتفاصيلها كالتالي:

<div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 2px solid #dc2626; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
  <p style="margin: 0 0 10px 0; color: #991b1b; font-size: 14px;">المبلغ المستحق</p>
  <strong style="font-size: 28px; color: #dc2626;">${Number(answers.amount_due).toLocaleString('ar-QA')} ريال قطري</strong>
</div>

<table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 14px;">
  <tr style="background: #fef2f2;">
    <td style="padding: 10px; border: 1px solid #fecaca; width: 40%;"><strong>تاريخ الاستحقاق الأصلي:</strong></td>
    <td style="padding: 10px; border: 1px solid #fecaca;">${answers.due_date}</td>
  </tr>
  <tr>
    <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>عدد أيام التأخير:</strong></td>
    <td style="padding: 10px; border: 1px solid #e2e8f0; color: #dc2626; font-weight: bold;">${answers.days_overdue} يوم</td>
  </tr>
  <tr style="background: #fef3c7;">
    <td style="padding: 10px; border: 1px solid #fcd34d;"><strong>المهلة النهائية للسداد:</strong></td>
    <td style="padding: 10px; border: 1px solid #fcd34d; font-weight: bold; color: #92400e;">${answers.payment_deadline}</td>
  </tr>
</table>

<div style="background: #fef2f2; border-right: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
  <strong style="color: #dc2626;">⚠️ تنبيه هام:</strong>
  <p style="margin: 10px 0 0 0;">في حالة عدم الالتزام بالسداد خلال المهلة المحددة أعلاه، فإننا نحتفظ بحقنا في اتخاذ كافة الإجراءات القانونية اللازمة، والتي تشمل:</p>
  <div style="margin: 10px 0 0 20px; color: #7f1d1d;">
    ${answers.consequences}
  </div>
</div>

نأمل منكم المبادرة بتسوية هذه المستحقات في أقرب وقت ممكن، تجنباً لأي إجراءات قد تترتب عليها تبعات قانونية ومالية إضافية.

<strong>طرق السداد المتاحة:</strong>
• الحضور لمقر الشركة
• التحويل البنكي على حساب الشركة
• الدفع الإلكتروني

نبقى على استعداد للتواصل معكم لتسوية أي خلاف بشكل ودي.`;
        break;

      case 'customer-contract-termination':
        recipient = `السيد / السيدة ${answers.customer_name} المحترم/ة`;
        subject = `إشعار رسمي بإنهاء عقد الإيجار رقم (${answers.contract_number})`;
        body = `تحية طيبة،

بالإشارة إلى عقد تأجير المركبات المبرم بين شركتنا وبين سيادتكم تحت رقم <strong>(${answers.contract_number})</strong>، والمؤرخ في <strong>${answers.contract_start}</strong>.

يؤسفنا إبلاغكم بقرارنا إنهاء العلاقة التعاقدية بموجب العقد المذكور أعلاه، وذلك وفقاً للشروط والأحكام المنصوص عليها في العقد.

<div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
  <p style="margin: 0 0 10px 0; color: #92400e; font-size: 14px;">تاريخ سريان الإنهاء</p>
  <strong style="font-size: 24px; color: #b45309;">${answers.termination_date}</strong>
</div>

<strong style="color: #1e3a5f;">أسباب الإنهاء:</strong>
<div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 10px 0; border-right: 4px solid #64748b;">
${answers.termination_reason}
</div>

<strong style="color: #1e3a5f;">التسوية المالية النهائية:</strong>
<div style="background: #eff6ff; padding: 15px; border-radius: 6px; margin: 10px 0; border-right: 4px solid #3b82f6;">
${answers.final_settlement}
</div>

<div style="background: #fef2f2; border-right: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
  <strong style="color: #dc2626;">📌 الإجراءات المطلوبة من سيادتكم:</strong>
  <ol style="margin: 10px 0 0 0; padding-right: 20px; color: #7f1d1d;">
    <li>تسليم المركبة/المركبات المستأجرة في الموعد المحدد</li>
    <li>تسوية كافة المستحقات المالية المتبقية</li>
    <li>إعادة جميع المستندات والمفاتيح</li>
    <li>التوقيع على محضر الاستلام النهائي</li>
  </ol>
</div>

نأمل منكم الالتزام بالموعد المحدد لتسليم المركبة وإتمام إجراءات التسوية النهائية، علماً بأن أي تأخير قد يترتب عليه رسوم إضافية وفقاً لشروط العقد.

نشكر لكم تعاملكم معنا، ونتمنى لكم التوفيق.`;
        break;

      case 'general-official':
        // التعامل مع الجهات والمحاكم بشكل صحيح
        const isRecipientOrg = isOrganization(answers.recipient);
        if (isRecipientOrg) {
          recipient = answers.recipient_title 
            ? `${answers.recipient_title} - ${answers.recipient}`
            : answers.recipient;
        } else {
          recipient = answers.recipient_title 
            ? `سعادة ${answers.recipient_title} / ${answers.recipient}`
            : answers.recipient;
        }
        subject = answers.subject;
        body = `بالإشارة إلى الموضوع المذكور أعلاه، يسرنا أن نتقدم إليكم بهذا الكتاب الرسمي.

${answers.content}

نأمل التكرم بالاطلاع والتفضل بالرد أو اتخاذ الإجراء المناسب.

نشكر لكم تعاونكم الدائم، ونتطلع إلى استمرار العلاقة الإيجابية بين الطرفين.`;
        attachments = answers.attachments || '';
        break;

      default:
        throw new Error('قالب غير معروف');
    }

    const html = generateLetterHTML(recipient, subject, body, attachments);

    return {
      success: true,
      content: html,
    };
  } catch (error: any) {
    console.error('Document generation error:', error);
    return {
      success: false,
      content: '',
      error: error.message || 'حدث خطأ أثناء إنشاء الكتاب',
    };
  }
}

/**
 * تحسين نص الكتاب (للتوافق مع الواجهة)
 */
export async function improveDocumentText(text: string): Promise<ChatResponse> {
  return {
    success: true,
    content: text,
  };
}

/**
 * اقتراح محتوى إضافي (للتوافق مع الواجهة)
 */
export async function suggestContent(
  templateId: string,
  currentAnswers: Record<string, string>
): Promise<ChatResponse> {
  return {
    success: true,
    content: JSON.stringify(currentAnswers),
  };
}

export default {
  generateOfficialDocument,
  improveDocumentText,
  suggestContent,
  DOCUMENT_TEMPLATES,
  DOCUMENT_CATEGORIES,
};
