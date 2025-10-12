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
    onError: (error: any) => {
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
  // This would call OpenAI API in production
  // For now, providing simulated response
  
  const contextInfo = customerContext 
    ? `العميل: ${customerContext.first_name} ${customerContext.last_name}\nالعقود النشطة: ${customerContext.contracts?.filter((c: any) => c.status === 'active').length || 0}`
    : '';

  const response = `
بناءً على استفسارك واللوائح القانونية في ${country === 'kuwait' ? 'الكويت' : country === 'saudi' ? 'السعودية' : 'قطر'}:

${contextInfo}

الإجابة القانونية:
يمكنك اتخاذ الإجراءات القانونية المناسبة وفقاً للقانون. يُنصح بإصدار إنذار قانوني أولاً قبل اتخاذ أي إجراءات قضائية.

المراجع القانونية:
- قانون التجارة رقم 68/1980
- القانون المدني

ملاحظة: هذه استشارة عامة. للحصول على استشارة قانونية مفصلة، يُنصح بالتواصل مع مستشار قانوني.
  `.trim();

  return {
    answer: response,
    customerId: customerContext?.id,
    tokensUsed: 150,
    cost: 0.003
  };
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
  const templates = {
    legal_warning_kuwait: `
إنذار قانوني

بناءً على القانون الكويتي رقم 67 لسنة 1980

المرسل إليه: {CUSTOMER_NAME}

نحيطكم علماً بأن لديكم مستحقات متأخرة بقيمة {UNPAID_AMOUNT} دينار كويتي منذ {DELAY_DAYS} يوماً.

نطالبكم بسداد المبلغ خلال 7 أيام من تاريخ استلام هذا الإنذار، وإلا سنضطر لاتخاذ الإجراءات القانونية اللازمة.

التاريخ: {DATE}
    `,
    legal_warning_saudi: `
إنذار قانوني

وفقاً لنظام المعاملات المدنية السعودي

المرسل إليه: {CUSTOMER_NAME}

نفيدكم بوجود مبلغ {UNPAID_AMOUNT} ريال سعودي متأخر منذ {DELAY_DAYS} يوماً.

يتوجب عليكم السداد خلال 7 أيام، وإلا سنلجأ للقضاء.

التاريخ: {DATE}
    `,
    // Add more templates...
  };

  const key = `${documentType}_${country}`;
  return templates[key as keyof typeof templates] || templates.legal_warning_kuwait;
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

async function logConsultation(data: any) {
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
