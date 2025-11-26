import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QueryParams {
  query: string;
  country: 'kuwait' | 'saudi' | 'qatar';
  companyId: string;
}

interface QueryResponse {
  answer: string;
  customerId?: string;
  riskScore?: number;
  documentType?: string;
  document?: any;
  riskAnalysis?: any;
  tokensUsed?: number;
  cost?: number;
}

interface DocumentParams {
  customerId: string;
  documentType: 'legal_warning' | 'payment_claim' | 'contract_termination';
  country: 'kuwait' | 'saudi' | 'qatar';
  additionalData?: any;
}

interface RiskParams {
  customerId: string;
}

export const useLegalAI = (companyId: string) => {
  const [apiKey, setApiKey] = useState<string>(() => {
    // Get from localStorage (will implement encryption later)
    return localStorage.getItem('openai_api_key') || '';
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  // Process natural language query
  const processQuery = useMutation({
    mutationFn: async (params: QueryParams): Promise<QueryResponse> => {
      if (!apiKey) {
        throw new Error('API key is required');
      }

      setIsProcessing(true);
      const startTime = Date.now();

      try {
        // Step 1: Extract customer information from query
        const customerMatch = await extractCustomerFromQuery(params.query, companyId);
        
        // Step 2: Fetch customer context if found
        let customerContext = null;
        if (customerMatch) {
          customerContext = await fetchCustomerContext(customerMatch.id);
        }

        // Step 3: Determine query intent
        const intent = classifyQueryIntent(params.query);

        // Step 4: Generate AI response based on intent
        let response: QueryResponse;

        switch (intent) {
          case 'risk_analysis':
            if (!customerContext) {
              throw new Error('يرجى تحديد العميل لتحليل المخاطر');
            }
            response = await performRiskAnalysis(customerContext, params.country);
            break;

          case 'document_generation':
            if (!customerContext) {
              throw new Error('يرجى تحديد العميل لإنشاء الوثيقة');
            }
            response = await generateLegalDocument(customerContext, params.query, params.country, apiKey);
            break;

          case 'legal_consultation':
            response = await provideLegalConsultation(params.query, customerContext, params.country, apiKey);
            break;

          default:
            response = await provideLegalConsultation(params.query, customerContext, params.country, apiKey);
        }

        // Step 5: Log consultation to database
        const responseTime = Date.now() - startTime;
        await logConsultation({
          companyId,
          customerId: customerMatch?.id,
          query: params.query,
          response: response.answer,
          queryType: intent,
          riskScore: response.riskScore,
          responseTime,
          tokensUsed: response.tokensUsed,
          cost: response.cost
        });

        return response;
      } finally {
        setIsProcessing(false);
      }
    },
    onError: (error: Error) => {
      console.error('Error processing query:', error);
      toast.error(error.message || 'حدث خطأ في معالجة الاستفسار');
    }
  });

  // Generate legal document
  const generateDocument = useMutation({
    mutationFn: async (params: DocumentParams) => {
      if (!apiKey) {
        throw new Error('API key is required');
      }

      // Fetch customer context
      const customerContext = await fetchCustomerContext(params.customerId);
      
      // Generate document using AI
      const document = await generateLegalDocumentByType(
        customerContext,
        params.documentType,
        params.country,
        apiKey,
        params.additionalData
      );

      // Save to database
      const { data, error } = await supabase
        .from('legal_documents')
        .insert({
          company_id: companyId,
          customer_id: params.customerId,
          document_type: params.documentType,
          content: document.content,
          template_used: document.template,
          country_law: params.country,
          metadata: document.metadata
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('تم إنشاء الوثيقة بنجاح');
      return data;
    }
  });

  // Analyze customer risk
  const analyzeRisk = useMutation({
    mutationFn: async (params: RiskParams) => {
      const customerContext = await fetchCustomerContext(params.customerId);
      const riskAnalysis = await performRiskAnalysis(customerContext, 'kuwait');
      
      toast.success('تم تحليل المخاطر بنجاح');
      return riskAnalysis;
    }
  });

  // Update API key
  const updateApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('openai_api_key', key);
  };

  return {
    processQuery,
    generateDocument,
    analyzeRisk,
    isProcessing,
    apiKey,
    setApiKey: updateApiKey
  };
};

// Helper functions

async function extractCustomerFromQuery(query: string, companyId: string) {
  // Extract customer name or ID from query
  const namePattern = /(?:العميل|للعميل|الخاص ب)\s+([أ-ي\s]+)/;
  const match = query.match(namePattern);

  if (!match) return null;

  const customerName = match[1].trim();

  // Search for customer in database
  const { data, error } = await supabase
    .from('customers')
    .select('id, first_name, last_name, company_name')
    .eq('company_id', companyId)
    .or(`first_name.ilike.%${customerName}%,last_name.ilike.%${customerName}%,company_name.ilike.%${customerName}%`)
    .limit(1)
    .single();

  return data || null;
}

async function fetchCustomerContext(customerId: string) {
  const { data, error } = await supabase
    .from('customers')
    .select(`
      *,
      contracts(*),
      payments(*),
      traffic_violations(*),
      legal_cases(*)
    `)
    .eq('id', customerId)
    .single();

  if (error) throw error;
  return data;
}

function classifyQueryIntent(query: string): 'risk_analysis' | 'document_generation' | 'legal_consultation' {
  const lowerQuery = query.toLowerCase();

  if (lowerQuery.includes('تحليل') || lowerQuery.includes('مخاطر') || lowerQuery.includes('تقييم')) {
    return 'risk_analysis';
  }

  if (lowerQuery.includes('اكتب') || lowerQuery.includes('إنذار') || lowerQuery.includes('مطالبة') || lowerQuery.includes('وثيقة')) {
    return 'document_generation';
  }

  return 'legal_consultation';
}

async function performRiskAnalysis(customerContext: any, country: string) {
  // Calculate risk factors
  const factors = {
    paymentDelay: calculatePaymentDelay(customerContext.payments),
    unpaidAmount: calculateUnpaidAmount(customerContext.payments),
    violationCount: customerContext.traffic_violations?.length || 0,
    contractHistory: customerContext.contracts?.length || 0,
    litigationHistory: customerContext.legal_cases?.filter((c: any) => c.status === 'active').length || 0
  };

  // Calculate weighted risk score (0-100)
  const weights = {
    paymentDelay: 0.35,
    unpaidAmount: 0.30,
    violationCount: 0.20,
    contractHistory: 0.10,
    litigationHistory: 0.05
  };

  const normalizedFactors = {
    paymentDelay: Math.min(factors.paymentDelay / 90, 1) * 100, // Normalize to 0-100
    unpaidAmount: Math.min(factors.unpaidAmount / 10000, 1) * 100,
    violationCount: Math.min(factors.violationCount / 10, 1) * 100,
    contractHistory: Math.max(0, 1 - factors.contractHistory / 20) * 100,
    litigationHistory: Math.min(factors.litigationHistory / 5, 1) * 100
  };

  const riskScore = Object.entries(weights).reduce((score, [key, weight]) => {
    return score + (normalizedFactors[key as keyof typeof normalizedFactors] * weight);
  }, 0);

  // Generate recommendations
  const recommendations: string[] = [];
  if (riskScore > 70) {
    recommendations.push('مراقبة مشددة ومطالبة فورية');
    recommendations.push('إصدار إنذار قانوني');
  } else if (riskScore > 40) {
    recommendations.push('متابعة دورية');
    recommendations.push('تنبيه العميل بالمستحقات');
  } else {
    recommendations.push('عميل جيد - متابعة عادية');
  }

  const response = `
تحليل المخاطر للعميل: ${customerContext.first_name} ${customerContext.last_name}

📊 درجة المخاطر: ${riskScore.toFixed(1)}/100 (${riskScore > 70 ? 'عالي' : riskScore > 40 ? 'متوسط' : 'منخفض'})

📈 عوامل المخاطر:
- تأخير الدفع: ${factors.paymentDelay} يوم
- المبلغ غير المدفوع: ${factors.unpaidAmount.toFixed(3)} د.ك
- المخالفات المرورية: ${factors.violationCount}
- عدد العقود: ${factors.contractHistory}
- القضايا القانونية: ${factors.litigationHistory}

💡 التوصيات:
${recommendations.map(r => `- ${r}`).join('\n')}
  `.trim();

  return {
    answer: response,
    riskScore,
    riskAnalysis: {
      customerId: customerContext.id,
      score: riskScore,
      factors,
      recommendations
    }
  };
}

async function generateLegalDocument(
  customerContext: any,
  query: string,
  country: string,
  apiKey: string
) {
  const documentType = extractDocumentType(query);
  return await generateLegalDocumentByType(customerContext, documentType, country, apiKey);
}

async function generateLegalDocumentByType(
  customerContext: any,
  documentType: string,
  country: string,
  apiKey: string,
  additionalData?: any
) {
  // Get legal template
  const template = getLegalTemplate(documentType, country);
  
  // Prepare customer data
  const customerName = `${customerContext.first_name} ${customerContext.last_name}`;
  const unpaidAmount = calculateUnpaidAmount(customerContext.payments);
  const paymentDelay = calculatePaymentDelay(customerContext.payments);

  // Generate document content
  const content = template
    .replace('{CUSTOMER_NAME}', customerName)
    .replace('{UNPAID_AMOUNT}', unpaidAmount.toFixed(3))
    .replace('{DELAY_DAYS}', paymentDelay.toString())
    .replace('{DATE}', new Date().toLocaleDateString('ar-EG'));

  const response = `
تم إنشاء ${documentType === 'legal_warning' ? 'إنذار قانوني' : documentType === 'payment_claim' ? 'مطالبة مالية' : 'إنهاء عقد'}:

${content}

---
تم الإنشاء بواسطة المستشار القانوني الذكي
التاريخ: ${new Date().toLocaleDateString('ar-EG')}
  `.trim();

  return {
    answer: response,
    document: {
      type: documentType,
      content,
      template: `${documentType}_${country}`,
      metadata: { customerName, unpaidAmount, paymentDelay }
    },
    customerId: customerContext.id
  };
}

async function provideLegalConsultation(
  query: string,
  customerContext: any | null,
  country: string,
  apiKey: string
): Promise<QueryResponse> {
  // البحث في قاعدة المعرفة القانونية القطرية
  const relevantLaws = await searchLegalKnowledge(query, country);
  
  const contextInfo = customerContext 
    ? `
📋 معلومات العميل:
- الاسم: ${customerContext.first_name || ''} ${customerContext.last_name || ''}
- العقود النشطة: ${customerContext.contracts?.filter((c: any) => c.status === 'active').length || 0}
- المخالفات المرورية: ${customerContext.traffic_violations?.length || 0}
- القضايا القانونية: ${customerContext.legal_cases?.length || 0}
`
    : '';

  // بناء الإجابة بناءً على القوانين القطرية
  let legalReferences = '';
  if (relevantLaws.length > 0) {
    legalReferences = '\n📚 المراجع القانونية القطرية:\n' + relevantLaws.map((law: any) => 
      `• ${law.law_name} ${law.law_number ? `رقم ${law.law_number}` : ''} ${law.law_year ? `لسنة ${law.law_year}` : ''}\n  ${law.article_number ? `المادة ${law.article_number}: ` : ''}${law.article_title || ''}\n  "${law.article_content.substring(0, 200)}..."`
    ).join('\n\n');
  }

  const response = `
⚖️ استشارة قانونية بناءً على القوانين القطرية
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${contextInfo}

📌 الإجابة القانونية:
بناءً على استفسارك والقوانين القطرية المعمول بها:

${getContextualAnswer(query, relevantLaws)}

${legalReferences}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 توصيات:
1. يُنصح بإرسال إنذار قانوني رسمي قبل اتخاذ أي إجراءات قضائية
2. الاحتفاظ بجميع المستندات والعقود الأصلية
3. توثيق جميع المراسلات مع العميل
4. مراجعة محامٍ متخصص للحالات المعقدة

⚠️ ملاحظة: هذه استشارة عامة بناءً على القوانين القطرية. للحصول على استشارة قانونية مفصلة، يُنصح بالتواصل مع محامٍ مرخص.
  `.trim();

  return {
    answer: response,
    customerId: customerContext?.id,
    tokensUsed: 200,
    cost: 0.004
  };
}

// البحث في قاعدة المعرفة القانونية الشاملة
async function searchLegalKnowledge(query: string, country: string = 'qatar') {
  try {
    // استخراج الكلمات المفتاحية من الاستفسار
    const keywords = extractKeywords(query);
    
    // البحث في الجدول الشامل للقوانين القطرية الجديد
    const { data: qatarLaws, error: qatarError } = await supabase
      .from('qatar_legal_texts')
      .select('*')
      .eq('is_active', true)
      .order('year', { ascending: false })
      .limit(100);

    if (qatarError) {
      console.error('Error searching qatar_legal_texts:', qatarError);
    }

    // تصفية النتائج بناءً على الكلمات المفتاحية
    const relevantQatarLaws = (qatarLaws || []).filter((law: any) => {
      const content = `${law.title_ar} ${law.part_title || ''} ${law.chapter_title || ''} ${law.article_text_ar} ${(law.keywords || []).join(' ')}`.toLowerCase();
      return keywords.some(keyword => content.includes(keyword.toLowerCase()));
    }).slice(0, 8);

    // تحويل النتائج لتنسيق موحد
    const formattedQatarLaws = relevantQatarLaws.map((law: any) => ({
      law_name: law.title_ar,
      law_number: law.law_number,
      law_year: law.year,
      article_number: law.article_number,
      article_title: law.article_title_ar || law.chapter_title,
      article_content: law.article_text_ar,
      category: law.part_title,
      subcategory: law.chapter_title,
      law_type: law.law_type
    }));

    // البحث أيضاً في الجدول القديم للتوافق
    const { data: oldData, error: oldError } = await supabase
      .from('legal_knowledge_base')
      .select('*')
      .eq('country', country)
      .eq('is_active', true)
      .limit(50);

    if (oldError) {
      console.error('Error searching legal_knowledge_base:', oldError);
    }

    // تصفية النتائج القديمة
    const relevantOldLaws = (oldData || []).filter((law: any) => {
      const content = `${law.category} ${law.subcategory || ''} ${law.law_name} ${law.article_title || ''} ${law.article_content}`.toLowerCase();
      return keywords.some(keyword => content.includes(keyword.toLowerCase()));
    }).slice(0, 3);

    // دمج النتائج مع إعطاء الأولوية للجدول الجديد
    const allResults = [...formattedQatarLaws, ...relevantOldLaws];
    
    // إزالة التكرارات بناءً على رقم المادة
    const uniqueResults = allResults.filter((law, index, self) => 
      index === self.findIndex((l) => 
        l.article_number === law.article_number && l.law_name === law.law_name
      )
    );

    return uniqueResults.slice(0, 10);
  } catch (error) {
    console.error('Error in searchLegalKnowledge:', error);
    return [];
  }
}

// استخراج الكلمات المفتاحية من الاستفسار
function extractKeywords(query: string): string[] {
  const stopWords = ['في', 'من', 'على', 'إلى', 'عن', 'مع', 'هل', 'ما', 'كيف', 'أين', 'متى', 'لماذا', 'هذا', 'هذه', 'ذلك', 'التي', 'الذي', 'أن', 'أو', 'و'];
  const words = query.split(/[\s،,؟?!.]+/).filter(word => 
    word.length > 2 && !stopWords.includes(word)
  );
  
  // إضافة كلمات مفتاحية إضافية بناءً على السياق
  const additionalKeywords: string[] = [];
  if (query.includes('تأجير') || query.includes('إيجار')) additionalKeywords.push('إيجار', 'مستأجر', 'مؤجر', 'عقد');
  if (query.includes('مخالف')) additionalKeywords.push('مخالفة', 'مرور', 'غرامة');
  if (query.includes('دفع') || query.includes('سداد')) additionalKeywords.push('أجرة', 'دفع', 'تأخير');
  if (query.includes('إنذار')) additionalKeywords.push('إنذار', 'مطالبة', 'تعويض');
  if (query.includes('عقد')) additionalKeywords.push('عقد', 'التزام', 'فسخ');
  if (query.includes('ليموزين')) additionalKeywords.push('ليموزين', 'نقل', 'ترخيص');
  
  return [...new Set([...words, ...additionalKeywords])];
}

// الحصول على إجابة سياقية بناءً على نوع الاستفسار
function getContextualAnswer(query: string, laws: any[]): string {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('تأخير') || lowerQuery.includes('دفع') || lowerQuery.includes('سداد')) {
    return `وفقاً للقانون المدني القطري رقم 22 لسنة 2004:
- المادة 597: يلتزم المستأجر بدفع الأجرة في المواعيد المتفق عليها
- المادة 615: في حالة إخلال المستأجر بالتزاماته الجوهرية، يحق للمؤجر طلب فسخ العقد مع التعويض
- المادة 263: يلتزم المدين بتعويض الدائن عن الضرر الناتج عن التأخير في التنفيذ

الإجراء المقترح: إرسال إنذار رسمي بمهلة 7 أيام للسداد، ثم رفع دعوى مدنية في حال عدم الاستجابة.`;
  }
  
  if (lowerQuery.includes('مخالف') || lowerQuery.includes('مرور')) {
    return `وفقاً لقانون المرور القطري رقم 19 لسنة 2007 ولوائح تأجير السيارات:
- يمكن تحويل المخالفات المرورية للمستأجر الفعلي وقت وقوع المخالفة
- يتطلب ذلك تقديم عقد الإيجار وإثبات أن المستأجر هو السائق
- يمكن تقديم طلب للإدارة العامة للمرور أو من خلال المحكمة المدنية

الإجراء المقترح: تجميع المستندات (عقد الإيجار، تفاصيل المخالفات) وتقديم طلب رسمي لتحويلها.`;
  }
  
  if (lowerQuery.includes('إنذار') || lowerQuery.includes('مطالبة')) {
    return `وفقاً للقانون المدني القطري والإجراءات القضائية:
- المادة 171: العقد شريعة المتعاقدين ولا يجوز نقضه إلا باتفاق الطرفين
- المادة 263: يلتزم المدين بالتعويض عن الضرر الناتج عن عدم التنفيذ
- المادة 267: يقدر التعويض بقدر الضرر المباشر المتوقع

الإجراء المقترح: إعداد إنذار قانوني يتضمن المبلغ المستحق والمهلة القانونية والعواقب في حالة عدم السداد.`;
  }
  
  if (lowerQuery.includes('ليموزين') || lowerQuery.includes('ترخيص') || lowerQuery.includes('نقل')) {
    return `وفقاً للوائح وزارة المواصلات القطرية لخدمات الليموزين وتأجير السيارات:
- يجب الحصول على موافقة مبدئية من وزارة المواصلات
- شروط المركبات: موديل لا يزيد عمره عن 5 سنوات، زجاج شفاف، حالة فنية جيدة
- يجب على السائقين الحصول على رخصة قيادة عمومية سارية

للحصول على الترخيص: تقديم شهادة حفظ الاسم، البطاقة الشخصية، والسجل التجاري لوزارة المواصلات.`;
  }
  
  if (lowerQuery.includes('خيانة') || lowerQuery.includes('اختلاس') || lowerQuery.includes('سرقة')) {
    return `وفقاً لقانون العقوبات القطري رقم 11 لسنة 2004:
- المادة 354 (خيانة الأمانة): عقوبة الحبس حتى 3 سنوات وغرامة حتى 20,000 ريال
- المادة 339 (السرقة): عقوبة الحبس حتى 3 سنوات وغرامة حتى 20,000 ريال
- المادة 363 (الاحتيال): عقوبة الحبس حتى 3 سنوات وغرامة حتى 20,000 ريال

الإجراء المقترح: تقديم بلاغ للنيابة العامة مع جميع الأدلة والمستندات.`;
  }
  
  // إجابة عامة
  return `بناءً على القوانين القطرية المعمول بها، يمكنك اتخاذ الإجراءات القانونية المناسبة لحماية حقوقك. 

الخطوات الموصى بها:
1. مراجعة العقد والاتفاقيات المبرمة
2. توثيق جميع المراسلات والمستندات
3. إرسال إنذار قانوني رسمي
4. اللجوء للقضاء في حالة عدم الاستجابة`;
}

function extractDocumentType(query: string): 'legal_warning' | 'payment_claim' | 'contract_termination' {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('إنذار')) {
    return 'legal_warning';
  }
  if (lowerQuery.includes('مطالبة')) {
    return 'payment_claim';
  }
  if (lowerQuery.includes('إنهاء') || lowerQuery.includes('فسخ')) {
    return 'contract_termination';
  }
  
  return 'legal_warning';
}

function getLegalTemplate(documentType: string, country: string): string {
  const templates: Record<string, string> = {
    // قوالب قطرية
    legal_warning_qatar: `
إنذار قانوني رسمي
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

بناءً على القانون المدني القطري رقم 22 لسنة 2004
والقانون التجاري القطري رقم 27 لسنة 2006

المرسل إليه: السيد / السيدة {CUSTOMER_NAME}

الموضوع: إنذار بسداد مستحقات متأخرة

نحيطكم علماً بأنه يترصد بذمتكم لصالح شركتنا مبلغ وقدره ({UNPAID_AMOUNT}) ريال قطري، متأخر السداد منذ ({DELAY_DAYS}) يوماً.

وبناءً على أحكام المادة 171 من القانون المدني القطري التي تنص على أن "العقد شريعة المتعاقدين"، والمادة 597 التي توجب على المستأجر دفع الأجرة في المواعيد المتفق عليها،

فإننا نطالبكم بسداد المبلغ المذكور أعلاه خلال مهلة أقصاها سبعة (7) أيام من تاريخ استلام هذا الإنذار.

وفي حال عدم الاستجابة، سنضطر آسفين لاتخاذ كافة الإجراءات القانونية المتاحة لنا، بما في ذلك:
- رفع دعوى قضائية أمام المحكمة المدنية
- المطالبة بالتعويض عن الأضرار وفقاً للمادة 263
- احتساب غرامات التأخير المنصوص عليها في العقد

وتفضلوا بقبول فائق الاحترام،

التاريخ: {DATE}
التوقيع: _________________
    `,
    
    payment_claim_qatar: `
مطالبة مالية رسمية
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

إلى: المحكمة المدنية الابتدائية
الدائرة: _______________

المدعي: [اسم الشركة]
المدعى عليه: {CUSTOMER_NAME}

الموضوع: مطالبة مالية بمبلغ {UNPAID_AMOUNT} ريال قطري

الوقائع:
بموجب عقد إيجار/تأجير سيارة مبرم بين المدعي والمدعى عليه، التزم المدعى عليه بسداد الأقساط المستحقة في مواعيدها المحددة.

إلا أن المدعى عليه أخل بهذا الالتزام وتأخر عن السداد لمدة ({DELAY_DAYS}) يوماً، مما أدى إلى تراكم مستحقات بذمته بقيمة ({UNPAID_AMOUNT}) ريال قطري.

السند القانوني:
- المادة 171 من القانون المدني القطري: العقد شريعة المتعاقدين
- المادة 263: التزام المدين بالتعويض عن عدم التنفيذ
- المادة 597: التزام المستأجر بدفع الأجرة في المواعيد المتفق عليها
- المادة 615: حق المؤجر في فسخ العقد مع التعويض

الطلبات:
1. إلزام المدعى عليه بسداد مبلغ {UNPAID_AMOUNT} ريال قطري
2. إلزامه بدفع غرامة التأخير المتفق عليها
3. إلزامه بالتعويض عن الأضرار التي لحقت بالمدعي
4. تحميله المصاريف وأتعاب المحاماة

المستندات المرفقة:
- صورة عقد الإيجار/التأجير
- كشف حساب المستحقات
- صورة الإنذار المرسل للمدعى عليه
- إثبات استلام الإنذار

التاريخ: {DATE}
    `,
    
    contract_termination_qatar: `
إشعار فسخ عقد
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

بناءً على أحكام القانون المدني القطري رقم 22 لسنة 2004

المرسل إليه: السيد / السيدة {CUSTOMER_NAME}

الموضوع: إشعار بفسخ عقد الإيجار/التأجير

بالإشارة إلى عقد الإيجار/التأجير المبرم بيننا، وحيث أنكم قد أخللتم بالتزاماتكم التعاقدية المتمثلة في:
- عدم سداد الأقساط المستحقة لمدة ({DELAY_DAYS}) يوماً
- تراكم مستحقات بقيمة ({UNPAID_AMOUNT}) ريال قطري

وعملاً بأحكام المادة 615 من القانون المدني القطري التي تنص على أنه "إذا أخل المستأجر بالتزام من التزاماته الجوهرية، جاز للمؤجر أن يطلب فسخ العقد مع التعويض"،

فإننا نشعركم بفسخ العقد المذكور اعتباراً من تاريخ هذا الإشعار، ونطالبكم بما يلي:
1. تسليم المركبة فوراً بحالتها الأصلية
2. سداد جميع المستحقات المتأخرة
3. سداد غرامات التأخير
4. التعويض عن أي أضرار لحقت بالمركبة

وفي حال عدم الامتثال، سنلجأ للإجراءات القانونية لاسترداد حقوقنا.

التاريخ: {DATE}
التوقيع: _________________
    `,
    
    // قوالب كويتية
    legal_warning_kuwait: `
إنذار قانوني

بناءً على القانون المدني الكويتي

المرسل إليه: {CUSTOMER_NAME}

نحيطكم علماً بأن لديكم مستحقات متأخرة بقيمة {UNPAID_AMOUNT} دينار كويتي منذ {DELAY_DAYS} يوماً.

نطالبكم بسداد المبلغ خلال 7 أيام من تاريخ استلام هذا الإنذار، وإلا سنضطر لاتخاذ الإجراءات القانونية اللازمة.

التاريخ: {DATE}
    `,
    
    // قوالب سعودية
    legal_warning_saudi: `
إنذار قانوني

وفقاً لنظام المعاملات المدنية السعودي

المرسل إليه: {CUSTOMER_NAME}

نفيدكم بوجود مبلغ {UNPAID_AMOUNT} ريال سعودي متأخر منذ {DELAY_DAYS} يوماً.

يتوجب عليكم السداد خلال 7 أيام، وإلا سنلجأ للقضاء.

التاريخ: {DATE}
    `,
  };

  const key = `${documentType}_${country}`;
  return templates[key] || templates.legal_warning_qatar;
}

function calculatePaymentDelay(payments: any[]): number {
  if (!payments || payments.length === 0) return 0;
  
  const overduePayments = payments.filter(p => 
    p.status === 'pending' && new Date(p.due_date) < new Date()
  );

  if (overduePayments.length === 0) return 0;

  const maxDelay = Math.max(...overduePayments.map(p => {
    const dueDate = new Date(p.due_date);
    const today = new Date();
    return Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
  }));

  return maxDelay;
}

function calculateUnpaidAmount(payments: any[]): number {
  if (!payments || payments.length === 0) return 0;
  
  return payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
}

interface ConsultationLogData {
  companyId: string;
  customerId?: string;
  query: string;
  response: string;
  queryType: string;
  riskScore?: number;
  responseTime: number;
  tokensUsed?: number;
  cost?: number;
}

async function logConsultation(data: ConsultationLogData) {
  try {
    await supabase.from('legal_consultations').insert({
      company_id: data.companyId,
      customer_id: data.customerId,
      query: data.query,
      response: data.response,
      query_type: data.queryType,
      risk_score: data.riskScore,
      response_time_ms: data.responseTime,
      tokens_used: data.tokensUsed,
      cost_usd: data.cost
    });
  } catch (error) {
    console.error('Error logging consultation:', error);
  }
}
