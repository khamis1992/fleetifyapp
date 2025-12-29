/**
 * Zhipu AI (GLM) Service for Smart Document Generation
 * خدمة الذكاء الاصطناعي لتوليد الكتب الرسمية
 */

const ZHIPU_API_KEY = '136e9f29ddd445c0a5287440f6ab13e0.DSO2qKJ4AiP1SRrH';
const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

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
    systemPrompt: `أنت مساعد قانوني متخصص في كتابة الكتب الرسمية لشركات التأمين.
اكتب كتاباً رسمياً لطلب شطب مركبة من بوليصة التأمين.
الكتاب يجب أن يكون:
- مكتوباً باللغة العربية الفصحى الرسمية
- يحتوي على ترويسة الشركة (شركة العراف لتأجير السيارات)
- يتضمن التاريخ الهجري والميلادي
- يحتوي على جميع البيانات المطلوبة
- ينتهي بالتحية والتوقيع`
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
    systemPrompt: `أنت مساعد قانوني متخصص في كتابة إخطارات الحوادث المرورية.
اكتب كتاباً رسمياً لإخطار شركة التأمين بوقوع حادث مروري.
يجب أن يتضمن الكتاب جميع التفاصيل المطلوبة وأن يكون واضحاً ومهنياً.`
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
    systemPrompt: `أنت مساعد قانوني متخصص في كتابة طلبات التعويض من شركات التأمين.
اكتب كتاباً رسمياً لطلب تعويض مع ذكر جميع التفاصيل والمستندات المرفقة.`
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
    systemPrompt: `أنت مساعد قانوني متخصص في كتابة طلبات نقل الملكية لإدارة المرور.
اكتب كتاباً رسمياً موجهاً لإدارة المرور لطلب نقل ملكية مركبة.`
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
    systemPrompt: `أنت مساعد قانوني متخصص في كتابة طلبات تجديد رخص المركبات.
اكتب كتاباً رسمياً لإدارة المرور لطلب تجديد رخصة سير.`
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
    systemPrompt: `أنت مساعد قانوني متخصص في كتابة اعتراضات المخالفات المرورية.
اكتب كتاب اعتراض رسمي مقنع ومهني على مخالفة مرورية.`
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
    systemPrompt: `أنت مساعد قانوني متخصص في كتابة إنذارات السداد.
اكتب كتاب إنذار رسمي للعميل بضرورة سداد المبالغ المستحقة.
الكتاب يجب أن يكون حازماً ولكن مهنياً ويوضح العواقب بشكل واضح.`
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
    systemPrompt: `أنت مساعد قانوني متخصص في كتابة إشعارات إنهاء العقود.
اكتب كتاباً رسمياً لإبلاغ العميل بإنهاء عقد الإيجار.`
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
    systemPrompt: `أنت مساعد قانوني متخصص في كتابة الكتب الرسمية.
اكتب كتاباً رسمياً مهنياً بناءً على المعلومات المقدمة.
الكتاب يجب أن يحتوي على ترويسة الشركة والتاريخ والموضوع والمحتوى والتوقيع.`
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
 * إرسال رسالة إلى GLM API والحصول على الرد
 */
export async function sendChatMessage(messages: Message[]): Promise<ChatResponse> {
  try {
    const response = await fetch(ZHIPU_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZHIPU_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'glm-4',
        messages: messages,
        temperature: 0.3,
        top_p: 0.9,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.choices && data.choices[0]?.message?.content) {
      return {
        success: true,
        content: data.choices[0].message.content,
      };
    }
    
    throw new Error('Invalid response format');
  } catch (error: any) {
    console.error('Zhipu AI Error:', error);
    return {
      success: false,
      content: '',
      error: error.message || 'حدث خطأ في الاتصال بالذكاء الاصطناعي',
    };
  }
}

/**
 * توليد كتاب رسمي باستخدام الذكاء الاصطناعي
 */
export async function generateOfficialDocument(
  template: DocumentTemplate,
  answers: Record<string, string>
): Promise<ChatResponse> {
  const today = new Date();
  const dateFormatted = today.toLocaleDateString('ar-QA', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const companyInfo = `
شركة العراف لتأجير السيارات
Al-Araf Car Rental Company
الدوحة - قطر
هاتف: +974 XXXX XXXX
البريد الإلكتروني: info@alaraf.qa
`;

  const answersText = Object.entries(answers)
    .map(([key, value]) => {
      const question = template.questions.find(q => q.id === key);
      return question ? `${question.question}: ${value}` : '';
    })
    .filter(Boolean)
    .join('\n');

  const messages: Message[] = [
    {
      role: 'system',
      content: `${template.systemPrompt}

معلومات الشركة:
${companyInfo}

التاريخ: ${dateFormatted}

قم بكتابة الكتاب بتنسيق HTML مع الحفاظ على التنسيق الرسمي.
استخدم العناصر التالية:
- <div class="letterhead"> للترويسة
- <div class="date"> للتاريخ
- <div class="recipient"> للجهة المرسل إليها
- <div class="subject"> للموضوع
- <div class="body"> لمحتوى الكتاب
- <div class="signature"> للتوقيع
`
    },
    {
      role: 'user',
      content: `أرجو كتابة كتاب "${template.name}" باستخدام المعلومات التالية:

${answersText}

اكتب الكتاب بشكل رسمي ومهني.`
    }
  ];

  return sendChatMessage(messages);
}

/**
 * تحسين نص الكتاب
 */
export async function improveDocumentText(text: string): Promise<ChatResponse> {
  const messages: Message[] = [
    {
      role: 'system',
      content: `أنت مساعد قانوني متخصص في تحسين صياغة الكتب الرسمية.
قم بتحسين النص المقدم مع الحفاظ على المعنى والمحتوى.
اجعل الصياغة أكثر رسمية ومهنية.`
    },
    {
      role: 'user',
      content: `قم بتحسين صياغة هذا النص:\n\n${text}`
    }
  ];

  return sendChatMessage(messages);
}

/**
 * اقتراح محتوى إضافي
 */
export async function suggestContent(
  templateId: string,
  currentAnswers: Record<string, string>
): Promise<ChatResponse> {
  const template = DOCUMENT_TEMPLATES.find(t => t.id === templateId);
  if (!template) {
    return { success: false, content: '', error: 'القالب غير موجود' };
  }

  const messages: Message[] = [
    {
      role: 'system',
      content: `أنت مساعد ذكي يساعد في ملء نماذج الكتب الرسمية.
بناءً على نوع الكتاب والإجابات الحالية، اقترح محتوى مناسب للحقول الفارغة.`
    },
    {
      role: 'user',
      content: `نوع الكتاب: ${template.name}
الإجابات الحالية: ${JSON.stringify(currentAnswers, null, 2)}

اقترح محتوى مناسب للحقول الفارغة بتنسيق JSON.`
    }
  ];

  return sendChatMessage(messages);
}

export default {
  sendChatMessage,
  generateOfficialDocument,
  improveDocumentText,
  suggestContent,
  DOCUMENT_TEMPLATES,
  DOCUMENT_CATEGORIES,
};

