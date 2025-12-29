/**
 * Smart Document Generation Service
 * خدمة توليد الكتب الرسمية الذكية
 * 
 * تم تحديث الخدمة لتوليد الكتب محلياً باستخدام قوالب HTML
 */

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
  name_en: 'Al-Araf Car Rental Company',
  address: 'الدوحة - قطر',
  phone: '+974 XXXX XXXX',
  email: 'info@alaraf.qa',
  cr: 'س.ت: XXXXX',
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
 * توليد قالب HTML للكتاب
 */
function generateLetterHTML(
  recipient: string,
  subject: string,
  body: string,
  attachments?: string
): string {
  const refNumber = generateRefNumber();
  const currentDate = formatDate();
  
  return `
<div style="direction: rtl; font-family: 'Arial', 'Tahoma', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 2;">
  
  <!-- الترويسة -->
  <div style="text-align: center; border-bottom: 3px solid #1e40af; padding-bottom: 20px; margin-bottom: 30px;">
    <h1 style="color: #1e40af; margin: 0; font-size: 24px;">${COMPANY_INFO.name_ar}</h1>
    <p style="color: #6b7280; margin: 5px 0; font-size: 14px;">${COMPANY_INFO.name_en}</p>
    <p style="color: #6b7280; margin: 5px 0; font-size: 12px;">${COMPANY_INFO.address} | ${COMPANY_INFO.phone} | ${COMPANY_INFO.email}</p>
  </div>

  <!-- التاريخ والرقم المرجعي -->
  <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
    <div>
      <strong>الرقم المرجعي:</strong> ${refNumber}
    </div>
    <div>
      <strong>التاريخ:</strong> ${currentDate}
    </div>
  </div>

  <!-- المرسل إليه -->
  <div style="margin-bottom: 20px;">
    <p style="margin: 0;"><strong>إلى:</strong> ${recipient}</p>
    <p style="margin: 5px 0 0 0; color: #6b7280;">حفظه الله</p>
  </div>

  <!-- التحية -->
  <p style="margin-bottom: 20px;">السلام عليكم ورحمة الله وبركاته،</p>

  <!-- الموضوع -->
  <div style="background: #f3f4f6; padding: 10px 15px; border-right: 4px solid #1e40af; margin-bottom: 20px;">
    <strong>الموضوع:</strong> ${subject}
  </div>

  <!-- المحتوى -->
  <div style="text-align: justify; margin-bottom: 30px;">
    ${body.split('\n').map(p => `<p style="margin: 10px 0;">${p}</p>`).join('')}
  </div>

  ${attachments ? `
  <!-- المرفقات -->
  <div style="margin-bottom: 30px; background: #fef3c7; padding: 15px; border-radius: 8px;">
    <strong>📎 المرفقات:</strong>
    <p style="margin: 10px 0 0 0;">${attachments}</p>
  </div>
  ` : ''}

  <!-- الختام -->
  <p style="margin-bottom: 40px;">وتفضلوا بقبول فائق الاحترام والتقدير،</p>

  <!-- التوقيع -->
  <div style="margin-top: 60px;">
    <p style="margin: 0;"><strong>${COMPANY_INFO.name_ar}</strong></p>
    <p style="margin: 5px 0; color: #6b7280;">الإدارة</p>
    <div style="margin-top: 40px; border-top: 1px solid #d1d5db; width: 200px; padding-top: 10px;">
      <p style="margin: 0; color: #6b7280; font-size: 12px;">التوقيع والختم</p>
    </div>
  </div>

</div>
  `;
}

/**
 * توليد كتاب رسمي بناءً على القالب والإجابات
 */
export async function generateOfficialDocument(
  template: DocumentTemplate,
  answers: Record<string, string>
): Promise<ChatResponse> {
  try {
    // محاكاة تأخير قصير لتجربة مستخدم أفضل
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    let recipient = '';
    let subject = '';
    let body = '';
    let attachments = '';

    switch (template.id) {
      case 'insurance-deletion':
        recipient = `سعادة مدير ${answers.insurance_company}`;
        subject = `طلب شطب مركبة من بوليصة التأمين رقم ${answers.policy_number}`;
        body = `نشير إلى بوليصة التأمين رقم (${answers.policy_number}) الصادرة من شركتكم الموقرة، والخاصة بالمركبة التالية:

• نوع المركبة: ${answers.vehicle_type}
• رقم اللوحة: ${answers.vehicle_plate}
• رقم الشاصي: ${answers.chassis_number}

نرجو التكرم بشطب المركبة المذكورة أعلاه من البوليصة اعتباراً من تاريخ ${answers.deletion_date || 'المحدد'}، وذلك بسبب: ${answers.deletion_reason || 'السبب المذكور'}.

كما نرجو إفادتنا بأي مبالغ مستحقة أو مستردة نتيجة لهذا الإجراء.

شاكرين لكم تعاونكم الدائم معنا.`;
        break;

      case 'insurance-accident':
        recipient = `سعادة مدير قسم المطالبات - ${answers.insurance_company}`;
        subject = `إخطار بحادث مروري - بوليصة رقم ${answers.policy_number}`;
        body = `نود إخطاركم بوقوع حادث مروري للمركبة المؤمنة لدى شركتكم، وفيما يلي التفاصيل:

• رقم البوليصة: ${answers.policy_number}
• رقم لوحة المركبة: ${answers.vehicle_plate}
• تاريخ الحادث: ${answers.accident_date}
• مكان الحادث: ${answers.accident_location}
• رقم تقرير الشرطة: ${answers.police_report}

وصف الحادث:
${answers.accident_description}

وصف الأضرار:
${answers.damages}

نرجو التكرم بإرسال مندوبكم لمعاينة الأضرار واتخاذ الإجراءات اللازمة.`;
        attachments = 'صورة من تقرير الشرطة، صور الأضرار';
        break;

      case 'insurance-claim':
        recipient = `سعادة مدير قسم المطالبات - ${answers.insurance_company}`;
        subject = `طلب تعويض - بوليصة رقم ${answers.policy_number}`;
        body = `نتقدم إليكم بطلب تعويض عن الأضرار المشمولة ببوليصة التأمين رقم (${answers.policy_number})، وفيما يلي التفاصيل:

• نوع التعويض: ${answers.claim_type}
• مبلغ التعويض المطلوب: ${Number(answers.claim_amount).toLocaleString('ar-QA')} ريال قطري

سبب طلب التعويض:
${answers.claim_reason}

نرفق لكم المستندات المؤيدة لطلبنا، ونرجو التكرم بدراسة الطلب وإفادتنا بالموافقة في أقرب وقت.`;
        attachments = answers.supporting_docs;
        break;

      case 'traffic-ownership-transfer':
        recipient = 'سعادة مدير إدارة المرور - قطر';
        subject = `طلب نقل ملكية مركبة - لوحة رقم ${answers.vehicle_plate}`;
        body = `نتقدم إلى إدارتكم الموقرة بطلب نقل ملكية المركبة التالية:

• نوع المركبة: ${answers.vehicle_type}
• رقم اللوحة: ${answers.vehicle_plate}
• رقم الشاصي: ${answers.chassis_number}

من: ${answers.current_owner}
إلى: ${answers.new_owner}
رقم هوية المالك الجديد: ${answers.new_owner_id}

سبب نقل الملكية: ${answers.transfer_reason}

نرجو التكرم باتخاذ الإجراءات اللازمة لإتمام عملية النقل.`;
        attachments = 'صورة من بطاقة الهوية، صورة من رخصة المركبة، عقد البيع';
        break;

      case 'traffic-license-renewal':
        recipient = 'سعادة مدير إدارة المرور - قطر';
        subject = `طلب تجديد رخصة مركبة - لوحة رقم ${answers.vehicle_plate}`;
        body = `نتقدم إلى إدارتكم الموقرة بطلب تجديد رخصة سير المركبة التالية:

• نوع المركبة: ${answers.vehicle_type}
• رقم اللوحة: ${answers.vehicle_plate}
• تاريخ انتهاء الرخصة الحالية: ${answers.license_expiry}
• مدة التجديد المطلوبة: ${answers.renewal_period}

نرجو التكرم باتخاذ الإجراءات اللازمة لتجديد الرخصة.`;
        attachments = 'صورة من الرخصة الحالية، شهادة الفحص الفني، بوليصة التأمين';
        break;

      case 'traffic-violation-objection':
        recipient = 'سعادة مدير إدارة المرور - قطر';
        subject = `اعتراض على مخالفة مرورية رقم ${answers.violation_number}`;
        body = `نتقدم إلى إدارتكم الموقرة باعتراض على المخالفة المرورية التالية:

• رقم المخالفة: ${answers.violation_number}
• تاريخ المخالفة: ${answers.violation_date}
• رقم لوحة المركبة: ${answers.vehicle_plate}
• نوع المخالفة: ${answers.violation_type}

سبب الاعتراض:
${answers.objection_reason}

${answers.supporting_evidence ? `الأدلة المؤيدة:\n${answers.supporting_evidence}` : ''}

نرجو التكرم بدراسة اعتراضنا والنظر في إلغاء المخالفة أو تخفيضها.`;
        break;

      case 'customer-payment-warning':
        recipient = `السيد / ${answers.customer_name}`;
        subject = `إنذار أول بسداد مبلغ مستحق - عقد رقم ${answers.contract_number}`;
        body = `نشير إلى عقد الإيجار المبرم بيننا رقم (${answers.contract_number})، ونود إفادتكم بأنه ترصد عليكم مبلغ وقدره:

<div style="background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
  <strong style="font-size: 24px; color: #dc2626;">${Number(answers.amount_due).toLocaleString('ar-QA')} ريال قطري</strong>
</div>

• تاريخ الاستحقاق: ${answers.due_date}
• عدد أيام التأخير: ${answers.days_overdue} يوم
• المهلة النهائية للسداد: ${answers.payment_deadline}

<strong style="color: #dc2626;">⚠️ تحذير هام:</strong>
في حالة عدم السداد خلال المهلة المحددة، سيتم اتخاذ الإجراءات التالية:
${answers.consequences}

نأمل المبادرة بالسداد تجنباً لأي إجراءات قد لا ترغبون بها.`;
        break;

      case 'customer-contract-termination':
        recipient = `السيد / ${answers.customer_name}`;
        subject = `إشعار إنهاء عقد الإيجار رقم ${answers.contract_number}`;
        body = `نشير إلى عقد الإيجار المبرم بيننا رقم (${answers.contract_number}) والمؤرخ في ${answers.contract_start}، ونود إفادتكم بأنه قد تقرر إنهاء العقد المذكور اعتباراً من تاريخ:

<div style="background: #fef3c7; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
  <strong style="font-size: 20px;">${answers.termination_date}</strong>
</div>

سبب الإنهاء:
${answers.termination_reason}

التسوية النهائية:
${answers.final_settlement}

نرجو التكرم بتسليم المركبة وتسوية أي مستحقات متبقية في الموعد المحدد.`;
        break;

      case 'general-official':
        recipient = answers.recipient_title 
          ? `سعادة ${answers.recipient_title} - ${answers.recipient}`
          : answers.recipient;
        subject = answers.subject;
        body = answers.content;
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
