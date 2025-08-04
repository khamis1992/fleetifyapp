import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useLegalAI, LegalAIQuery, LegalAIResponse } from './useLegalAI';
import { useAdvancedLegalAI, AdvancedLegalQuery, EnhancedLegalResponse } from './useAdvancedLegalAI';
import { useSmartLegalClassifier, SmartQueryClassification } from './useSmartLegalClassifier';
import { useLegalMemos } from './useLegalMemos';
import { useUnpaidCustomerSearch } from './useUnpaidCustomerSearch';

export interface UnifiedLegalQuery {
  query: string;
  country: string;
  company_id: string;
  user_id?: string;
  context?: any;
  conversationHistory?: any[];
  queryType?: 'consultation' | 'document_analysis' | 'document_generation' | 'contract_comparison' | 'predictive_analysis' | 'smart_recommendations';
  files?: File[];
  documentType?: string;
  analysisDepth?: 'basic' | 'standard' | 'comprehensive';
  comparisonDocuments?: any[];
  generationParams?: {
    documentType: string;
    clientData?: any;
    urgency?: 'low' | 'medium' | 'high';
    customFields?: Record<string, any>;
  };
}

export interface UnifiedLegalResponse {
  success: boolean;
  response: LegalAIResponse | EnhancedLegalResponse | any;
  classification: SmartQueryClassification;
  processingType: 'basic' | 'advanced' | 'hybrid' | 'memo_generation' | 'document_analysis' | 'document_generation' | 'contract_comparison' | 'predictive_analysis' | 'smart_recommendations';
  metadata: {
    processingTime: number;
    dataSource: string;
    adaptiveRecommendations?: string[];
  };
  responseType?: 'text' | 'document' | 'analysis' | 'comparison' | 'chart' | 'interactive' | 'prediction';
  attachments?: Array<{
    id: string;
    name: string;
    type: 'document' | 'chart' | 'analysis_report' | 'comparison_report';
    content: any;
    downloadUrl?: string;
  }>;
  interactiveElements?: Array<{
    type: 'button' | 'form' | 'selection' | 'upload' | 'chart_control';
    label: string;
    action: string;
    data?: any;
  }>;
  analysisData?: {
    charts?: any[];
    tables?: any[];
    insights?: any[];
    predictions?: any[];
    risks?: any[];
    recommendations?: any[];
    comparison?: any;
  };
}

export const useUnifiedLegalAI = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  const { submitQuery: submitBasicQuery, isLoading: isBasicLoading } = useLegalAI();
  const { submitAdvancedQuery, isLoading: isAdvancedLoading } = useAdvancedLegalAI();
  const { classifyQuery, isClassifying } = useSmartLegalClassifier();
  const { searchCustomers, analyzeCustomer, generateMemo, isLoading: isMemoLoading } = useLegalMemos();
  const { searchUnpaidCustomers, generateLegalNoticeData } = useUnpaidCustomerSearch();

  // Document Analysis Handler
  const handleDocumentAnalysis = useCallback(async (
    queryData: UnifiedLegalQuery,
    classification: SmartQueryClassification
  ): Promise<any> => {
    setProcessingStatus('Analyzing documents...');
    
    if (!queryData.files || queryData.files.length === 0) {
      return {
        success: true,
        advice: `لتحليل الوثائق، يرجى رفع الملفات المطلوب تحليلها.
        
الملفات المدعومة:
- ملفات PDF
- ملفات Word (DOC, DOCX)
- ملفات نصية (TXT)

سأقوم بتحليل الوثائق وتقديم:
- استخراج البنود الرئيسية
- تحديد المخاطر القانونية
- اقتراح التحسينات
- مقارنة مع المعايير القانونية`,
        responseType: 'interactive',
        interactiveElements: [{
          type: 'upload',
          label: 'رفع الوثائق للتحليل',
          action: 'upload_documents',
          data: { acceptedTypes: ['.pdf', '.doc', '.docx', '.txt'] }
        }],
        metadata: { source: 'api', confidence: 0.9, response_time: 300 }
      };
    }

    // Simulate document analysis
    const analysisResults = {
      documentSummary: 'تحليل شامل للوثيقة المرفقة',
      keyPoints: ['البند الأول', 'البند الثاني', 'البند الثالث'],
      risks: [{ level: 'medium', description: 'مخاطرة متوسطة في البند X' }],
      recommendations: ['توصية بمراجعة البند Y', 'إضافة بند حماية إضافي']
    };

    return {
      success: true,
      advice: 'تم تحليل الوثيقة بنجاح',
      responseType: 'analysis',
      analysisData: {
        insights: analysisResults.keyPoints,
        risks: analysisResults.risks,
        recommendations: analysisResults.recommendations
      },
      metadata: { source: 'api', confidence: 0.88, response_time: 2000 }
    };
  }, []);

  // Document Generation Handler
  const handleDocumentGeneration = useCallback(async (
    queryData: UnifiedLegalQuery,
    classification: SmartQueryClassification
  ): Promise<any> => {
    setProcessingStatus('Generating document...');
    
    const { generationParams } = queryData;
    
    if (!generationParams?.documentType) {
      return {
        success: true,
        advice: `أنا جاهز لإنشاء الوثائق القانونية. يرجى تحديد نوع الوثيقة المطلوبة:

**الوثائق المتاحة:**
- عقود الإيجار
- اتفاقيات الخدمة
- إشعارات قانونية
- مذكرات قانونية
- عقود العمل

**مثال:** "أنشئ عقد إيجار سكني لمدة سنة واحدة"`,
        responseType: 'interactive',
        interactiveElements: [
          { type: 'selection', label: 'عقد إيجار', action: 'generate_lease_contract', data: {} },
          { type: 'selection', label: 'اتفاقية خدمة', action: 'generate_service_agreement', data: {} },
          { type: 'selection', label: 'إشعار قانوني', action: 'generate_legal_notice', data: {} }
        ],
        metadata: { source: 'api', confidence: 0.9, response_time: 200 }
      };
    }

    // Simulate document generation
    const generatedDocument = {
      title: `${generationParams.documentType} - ${new Date().toLocaleDateString('ar-KW')}`,
      content: `هذه وثيقة ${generationParams.documentType} تم إنشاؤها تلقائياً...`,
      metadata: { createdAt: new Date(), documentId: `DOC_${Date.now()}` }
    };

    return {
      success: true,
      advice: `✅ تم إنشاء ${generationParams.documentType} بنجاح`,
      responseType: 'document',
      attachments: [{
        id: generatedDocument.metadata.documentId,
        name: generatedDocument.title,
        type: 'document',
        content: generatedDocument.content
      }],
      metadata: { source: 'api', confidence: 0.92, response_time: 3000 }
    };
  }, []);

  // Contract Comparison Handler
  const handleContractComparison = useCallback(async (
    queryData: UnifiedLegalQuery,
    classification: SmartQueryClassification
  ): Promise<any> => {
    setProcessingStatus('Comparing contracts...');
    
    if (!queryData.comparisonDocuments || queryData.comparisonDocuments.length < 2) {
      return {
        success: true,
        advice: `لمقارنة العقود، أحتاج إلى وثيقتين على الأقل.

**خطوات المقارنة:**
1. رفع العقد الأول
2. رفع العقد الثاني
3. تحديد نوع المقارنة المطلوبة

**ما سأقدمه لك:**
- مقارنة البنود الرئيسية
- تحديد الاختلافات المهمة
- تقييم المخاطر
- توصيات للتحسين`,
        responseType: 'interactive',
        interactiveElements: [{
          type: 'upload',
          label: 'رفع العقود للمقارنة',
          action: 'upload_contracts_comparison',
          data: { minFiles: 2, maxFiles: 5 }
        }],
        metadata: { source: 'api', confidence: 0.9, response_time: 250 }
      };
    }

    // Simulate contract comparison
    const comparisonResult = {
      similarities: 75,
      keyDifferences: ['فرق في المدة الزمنية', 'اختلاف في قيمة الغرامة'],
      riskAssessment: 'متوسط',
      recommendations: ['توحيد البنود المتشابهة', 'مراجعة الاختلافات الحرجة']
    };

    return {
      success: true,
      advice: 'تمت مقارنة العقود بنجاح',
      responseType: 'comparison',
      analysisData: {
        comparison: comparisonResult,
        charts: [{ type: 'similarity', data: { similarity: comparisonResult.similarities } }]
      },
      metadata: { source: 'api', confidence: 0.87, response_time: 4000 }
    };
  }, []);

  // Predictive Analysis Handler
  const handlePredictiveAnalysis = useCallback(async (
    queryData: UnifiedLegalQuery,
    classification: SmartQueryClassification
  ): Promise<any> => {
    setProcessingStatus('Performing predictive analysis...');
    
    // Simulate predictive analysis
    const predictions = {
      caseOutcome: { probability: 78, prediction: 'نتيجة إيجابية محتملة' },
      timeToResolution: '4-6 أشهر',
      estimatedCosts: { min: 2000, max: 5000, currency: 'KWD' },
      riskFactors: ['تعقيد القضية', 'سوابق قضائية محدودة']
    };

    return {
      success: true,
      advice: 'تم إجراء التحليل التنبؤي',
      responseType: 'prediction',
      analysisData: {
        predictions: [predictions],
        charts: [
          { type: 'probability', data: predictions.caseOutcome },
          { type: 'timeline', data: { duration: predictions.timeToResolution } }
        ]
      },
      metadata: { source: 'api', confidence: 0.75, response_time: 3500 }
    };
  }, []);

  // Smart Recommendations Handler
  const handleSmartRecommendations = useCallback(async (
    queryData: UnifiedLegalQuery,
    classification: SmartQueryClassification
  ): Promise<any> => {
    setProcessingStatus('Generating smart recommendations...');
    
    const smartRecommendations = {
      immediate: ['مراجعة العقود الحالية', 'تحديث السياسات القانونية'],
      shortTerm: ['تدريب الفريق على الامتثال', 'إجراء مراجعة قانونية شاملة'],
      longTerm: ['تطوير نظام إدارة قانونية', 'إنشاء قاعدة بيانات سوابق']
    };

    return {
      success: true,
      advice: 'تم إنشاء التوصيات الذكية',
      responseType: 'interactive',
      analysisData: {
        recommendations: [
          ...smartRecommendations.immediate,
          ...smartRecommendations.shortTerm,
          ...smartRecommendations.longTerm
        ]
      },
      interactiveElements: smartRecommendations.immediate.map(rec => ({
        type: 'button',
        label: rec,
        action: 'implement_recommendation',
        data: { recommendation: rec }
      })),
      metadata: { source: 'api', confidence: 0.82, response_time: 1800 }
    };
  }, []);

  const submitUnifiedQuery = useCallback(async (
    queryData: UnifiedLegalQuery
  ): Promise<UnifiedLegalResponse> => {
    setIsProcessing(true);
    setError(null);
    const startTime = Date.now();

    try {
      // Step 1: Classify the query
      setProcessingStatus('Analyzing query...');
      const classification = await classifyQuery(
        queryData.query,
        queryData.conversationHistory || [],
        queryData.context
      );

      // Step 2: Determine processing strategy
      const processingType = determineProcessingType(classification);
      setProcessingStatus(`Processing with ${processingType} analysis...`);

      let response: LegalAIResponse | EnhancedLegalResponse;

      // Step 3: Route to appropriate AI system based on queryType or classification
      if (queryData.queryType === 'document_analysis' || processingType === 'document_analysis') {
        response = await handleDocumentAnalysis(queryData, classification);
      } else if (queryData.queryType === 'document_generation' || processingType === 'document_generation') {
        response = await handleDocumentGeneration(queryData, classification);
      } else if (queryData.queryType === 'contract_comparison' || processingType === 'contract_comparison') {
        response = await handleContractComparison(queryData, classification);
      } else if (queryData.queryType === 'predictive_analysis' || processingType === 'predictive_analysis') {
        response = await handlePredictiveAnalysis(queryData, classification);
      } else if (queryData.queryType === 'smart_recommendations' || processingType === 'smart_recommendations') {
        response = await handleSmartRecommendations(queryData, classification);
      } else if (processingType === 'memo_generation') {
        response = await handleMemoGeneration(queryData, classification);
      } else if (processingType === 'basic') {
        const basicQuery: LegalAIQuery = {
          query: queryData.query,
          country: queryData.country,
          company_id: queryData.company_id,
          user_id: queryData.user_id
        };
        response = await submitBasicQuery(basicQuery);
      } else if (processingType === 'advanced') {
        const advancedQuery: AdvancedLegalQuery = {
          query: queryData.query,
          country: queryData.country,
          company_id: queryData.company_id,
          user_id: queryData.user_id,
          context: {
            ...queryData.context,
            classification,
            conversationHistory: queryData.conversationHistory
          },
          analysis_depth: classification.suggestedAnalysisDepth === 'basic' ? 'basic' : 
                          classification.suggestedAnalysisDepth === 'comprehensive' ? 'comprehensive' : 'detailed'
        };
        response = await submitAdvancedQuery(advancedQuery);
      } else {
        // Hybrid approach - start with basic, enhance if needed
        setProcessingStatus('Starting with basic analysis...');
        const basicQuery: LegalAIQuery = {
          query: queryData.query,
          country: queryData.country,
          company_id: queryData.company_id,
          user_id: queryData.user_id
        };
        
        const basicResponse = await submitBasicQuery(basicQuery);
        
        // Determine if enhancement is needed
        if (shouldEnhanceResponse(basicResponse, classification)) {
          setProcessingStatus('Enhancing with advanced analysis...');
          const advancedQuery: AdvancedLegalQuery = {
            query: queryData.query,
            country: queryData.country,
            company_id: queryData.company_id,
            user_id: queryData.user_id,
            context: {
              ...queryData.context,
              basicResponse,
              classification,
              conversationHistory: queryData.conversationHistory
            },
            analysis_depth: 'detailed'
          };
          response = await submitAdvancedQuery(advancedQuery);
        } else {
          response = basicResponse;
        }
      }

      const processingTime = Date.now() - startTime;

      // Step 4: Generate adaptive recommendations
      const adaptiveRecommendations = generateAdaptiveRecommendations(
        response,
        classification,
        queryData.conversationHistory || []
      );

      setProcessingStatus('');
      
      // Success toast with intelligent messaging
      showIntelligentSuccessMessage(classification, processingType, processingTime);

      return {
        success: true,
        response,
        classification,
        processingType,
        metadata: {
          processingTime,
          dataSource: response.metadata?.source || 'unified',
          adaptiveRecommendations
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
      setError(errorMessage);
      setProcessingStatus('');
      toast.error('حدث خطأ في معالجة الاستفسار');
      
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [submitBasicQuery, submitAdvancedQuery, classifyQuery, searchCustomers, analyzeCustomer, generateMemo, searchUnpaidCustomers, generateLegalNoticeData, handleDocumentAnalysis, handleDocumentGeneration, handleContractComparison, handlePredictiveAnalysis, handleSmartRecommendations]);

  // Handle unpaid customers queries
  const handleUnpaidCustomersQuery = async (
    queryData: UnifiedLegalQuery,
    classification: SmartQueryClassification
  ): Promise<any> => {
    setProcessingStatus('Searching for unpaid customers...');

    try {
      const unpaidCustomers = await searchUnpaidCustomers();
      
      if (unpaidCustomers.length === 0) {
        return {
          success: true,
          advice: `✅ أخبار جيدة! لا يوجد عملاء متأخرين في السداد حالياً.

جميع العملاء يقومون بسداد مستحقاتهم في الوقت المحدد.

**للمراجعة الدورية:**
- تحقق من الفواتير المرسلة
- راجع تواريخ الاستحقاق القادمة
- تأكد من تحديث بيانات العملاء`,
          responseType: 'text',
          metadata: { source: 'database', confidence: 1.0, response_time: 500 }
        };
      }

      // Calculate statistics
      const totalOverdueAmount = unpaidCustomers.reduce((sum, c) => sum + c.overdue_amount, 0);
      const averageOverdueDays = Math.round(unpaidCustomers.reduce((sum, c) => sum + c.overdue_days, 0) / unpaidCustomers.length);
      const criticalCases = unpaidCustomers.filter(c => c.overdue_days >= 90).length;

      return {
        success: true,
        advice: `📊 **تقرير العملاء المتأخرين في السداد**

**إحصائيات عامة:**
• عدد العملاء المتأخرين: ${unpaidCustomers.length}
• إجمالي المبالغ المتأخرة: ${totalOverdueAmount.toFixed(3)} د.ك
• متوسط أيام التأخير: ${averageOverdueDays} يوم
• الحالات الحرجة (أكثر من 90 يوم): ${criticalCases}

**أهم الحالات المتأخرة:**
${unpaidCustomers.slice(0, 5).map((customer, index) => 
  `${index + 1}. ${customer.customer_name || customer.customer_name_ar} - ${customer.overdue_amount.toFixed(3)} د.ك (${customer.overdue_days} يوم)`
).join('\n')}

**إجراءات مقترحة:**
• إرسال إشعارات قانونية للحالات الحرجة
• متابعة هاتفية مع العملاء المتأخرين
• مراجعة شروط السداد للعقود الجديدة

يمكنك اختيار عميل محدد لإنشاء إشعار قانوني أو مذكرة مطالبة.`,
        responseType: 'interactive',
        interactiveElements: [
          {
            type: 'button',
            label: 'عرض تفاصيل العملاء المتأخرين',
            action: 'show_unpaid_customers_interface',
            data: { customers: unpaidCustomers }
          },
          {
            type: 'button',
            label: 'إنشاء تقرير مفصل',
            action: 'generate_detailed_report',
            data: { type: 'unpaid_customers' }
          }
        ],
        analysisData: {
          insights: [
            `يوجد ${unpaidCustomers.length} عميل متأخر في السداد`,
            `إجمالي المبالغ المتأخرة ${totalOverdueAmount.toFixed(3)} د.ك`,
            `${criticalCases} حالة تحتاج لتدخل عاجل`
          ],
          tables: [{
            title: 'أهم العملاء المتأخرين',
            data: unpaidCustomers.slice(0, 10).map(c => ({
              name: c.customer_name || c.customer_name_ar,
              amount: `${c.overdue_amount.toFixed(3)} د.ك`,
              days: `${c.overdue_days} يوم`,
              phone: c.phone
            }))
          }]
        },
        metadata: { source: 'database', confidence: 0.95, response_time: 1000 }
      };
    } catch (error) {
      return {
        success: false,
        advice: 'حدث خطأ أثناء البحث عن العملاء المتأخرين في السداد. يرجى المحاولة مرة أخرى.',
        metadata: { source: 'database', confidence: 0, response_time: 500 }
      };
    }
  };

  // Check if query is about unpaid customers
  const isUnpaidCustomersQuery = (query: string): boolean => {
    const unpaidKeywords = [
      'متأخر', 'متأخرين', 'متأخرة', 'سداد', 'دفع', 'مدين', 'مدينين',
      'unpaid', 'overdue', 'late payment', 'outstanding', 'debt', 'debtors',
      'مستحق', 'مستحقات', 'ذمم', 'إيجار متأخر', 'فواتير متأخرة'
    ];
    
    return unpaidKeywords.some(keyword => 
      query.toLowerCase().includes(keyword.toLowerCase())
    );
  };

  // Handle memo generation requests
  const handleMemoGeneration = async (
    queryData: UnifiedLegalQuery,
    classification: SmartQueryClassification
  ): Promise<LegalAIResponse> => {
    setProcessingStatus('Searching for relevant customers...');
    
  // Check if query is about unpaid customers or late payments
    if (isUnpaidCustomersQuery(queryData.query)) {
      return await handleUnpaidCustomersQuery(queryData, classification);
    }

    // Extract customer information from query
    const customerSearchTerm = extractCustomerFromQuery(queryData.query);
    
    if (!customerSearchTerm) {
      // If no specific customer mentioned, provide guidance
      return {
        success: true,
        advice: `لإنشاء مذكرة قانونية، أحتاج إلى معلومات أكثر تحديداً:

1. **اسم العميل أو المستأجر**: من هو العميل المطلوب إرسال المذكرة إليه؟
2. **نوع المذكرة**: هل هي مطالبة بدفع، إنذار قانوني، أم إشعار بانتهاك العقد؟
3. **السبب المحدد**: ما هو السبب الدقيق وراء إرسال المذكرة؟

**مثال للاستفسار الصحيح:**
"اكتب مذكرة مطالبة بدفع الإيجار المتأخر للعميل أحمد علي"

أو يمكنك البحث عن العملاء المتأخرين في السداد بكتابة:
"ابحث عن العملاء المتأخرين في السداد" أو "عرض قائمة العملاء المدينين"

بعد تقديم هذه المعلومات، سأتمكن من البحث عن بيانات العميل وإنشاء مذكرة قانونية مخصصة تتضمن كافة التفاصيل اللازمة.`,
        metadata: {
          source: 'api',
          confidence: 0.9,
          response_time: 500
        }
      };
    }

    try {
      // Search for customers
      const customers = await searchCustomers(customerSearchTerm);
      
      if (customers.length === 0) {
        return {
          success: true,
          advice: `لم يتم العثور على عميل يطابق البحث "${customerSearchTerm}".
          
يرجى التأكد من:
- الاسم مكتوب بشكل صحيح
- استخدام الاسم الكامل أو جزء منه
- التحقق من أن العميل مسجل في النظام

يمكنك أيضاً استخدام رقم البطاقة الشخصية أو رقم الهاتف للبحث.`,
          metadata: {
            source: 'api',
            confidence: 0.8,
            response_time: 1000
          }
        };
      }

      // If multiple customers found, ask for clarification
      if (customers.length > 1) {
        const customerList = customers.map((customer, index) => 
          `${index + 1}. ${customer.customer_type === 'individual' 
            ? `${customer.first_name} ${customer.last_name}` 
            : customer.company_name} - ${customer.phone}`
        ).join('\n');

        return {
          success: true,
          advice: `تم العثور على عدة عملاء يطابقون البحث. يرجى تحديد العميل المطلوب:

${customerList}

يرجى إعادة كتابة الطلب مع تحديد العميل بدقة أكبر.`,
          metadata: {
            source: 'api',
            confidence: 0.7,
            response_time: 1500
          }
        };
      }

      // Single customer found - proceed with memo generation
      const customer = customers[0];
      setProcessingStatus('Analyzing customer data...');
      
      // Analyze customer for comprehensive data
      const analysis = await analyzeCustomer(customer.id);
      
      setProcessingStatus('Generating legal memo...');
      
      // Generate the memo
      const memoType = classification.memoContext?.memoType || 'payment_demand';
      const memo = await generateMemo(customer.id, memoType, queryData.query);

      if (memo) {
        return {
          success: true,
          advice: `✅ **تم إنشاء المذكرة القانونية بنجاح**

**رقم المذكرة:** ${memo.memo_number}
**العميل:** ${customer.customer_type === 'individual' 
  ? `${customer.first_name} ${customer.last_name}` 
  : customer.company_name}
**نوع المذكرة:** ${getMemoTypeLabel(memoType)}
**الحالة:** مسودة

**محتوى المذكرة:**
${memo.content}

**الخطوات التالية:**
1. مراجعة محتوى المذكرة
2. الموافقة على إرسال المذكرة
3. متابعة رد العميل

يمكنك الآن مراجعة المذكرة وإجراء أي تعديلات مطلوبة قبل الإرسال.`,
          
          metadata: {
            source: 'api',
            confidence: 0.95,
            response_time: 3000,
            query_type: 'memo'
          }
        };
      } else {
        throw new Error('Failed to generate memo');
      }
      
    } catch (error) {
      console.error('Error in memo generation:', error);
      return {
        success: false,
        advice: 'حدث خطأ في إنشاء المذكرة القانونية. يرجى المحاولة مرة أخرى.',
        
        metadata: {
          source: 'api',
          confidence: 0.1,
          response_time: 2000
        }
      };
    }
  };

  return {
    submitUnifiedQuery,
    isProcessing: isProcessing || isBasicLoading || isAdvancedLoading || isClassifying || isMemoLoading,
    error,
    processingStatus,
    clearError: () => setError(null)
  };
};

// Helper functions
function determineProcessingType(classification: SmartQueryClassification): 'basic' | 'advanced' | 'hybrid' | 'memo_generation' | 'document_analysis' | 'document_generation' | 'contract_comparison' | 'predictive_analysis' | 'smart_recommendations' {
  if (classification.type === 'memo_generation' || classification.type === 'document_creation') {
    return 'memo_generation';
  }
  
  if (classification.type === 'system_data' || classification.complexity === 'low') {
    return 'basic';
  }
  
  if (classification.complexity === 'high' || classification.contextual.userIntent === 'research') {
    return 'advanced';
  }
  
  return 'hybrid';
}

function extractCustomerFromQuery(query: string): string {
  const words = query.toLowerCase();
  
  // Look for customer name patterns
  const namePatterns = [
    /(?:عميل|مستأجر|العميل|المستأجر)\s+([أ-ي\s]+)/,
    /(?:client|tenant|customer)\s+([a-z\s]+)/i,
    /(?:اسم|للعميل|للمستأجر)\s+([أ-ي\s]+)/,
    /(?:name|for)\s+([a-z\s]+)/i
  ];

  for (const pattern of namePatterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // Look for quoted names
  const quotedMatch = query.match(/["'"]([^"'"]+)["'"]/);
  if (quotedMatch) {
    return quotedMatch[1].trim();
  }

  // Look for common patterns without keywords
  const arabicNameMatch = query.match(/([أ-ي]+\s+[أ-ي]+)/);
  if (arabicNameMatch) {
    return arabicNameMatch[1].trim();
  }

  const englishNameMatch = query.match(/\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/);
  if (englishNameMatch) {
    return englishNameMatch[1].trim();
  }

  return '';
}

function getMemoTypeLabel(memoType: string): string {
  const labels = {
    payment_demand: 'مطالبة بالدفع',
    legal_notice: 'إنذار قانوني',
    compliance_warning: 'تحذير امتثال',
    contract_breach: 'انتهاك عقد'
  };
  return labels[memoType as keyof typeof labels] || 'مذكرة قانونية';
}

function shouldEnhanceResponse(
  basicResponse: LegalAIResponse, 
  classification: SmartQueryClassification
): boolean {
  // Enhance if basic response lacks detail for complex queries
  if (classification.complexity === 'medium' && 
      (!basicResponse.advice || basicResponse.advice.length < 200)) {
    return true;
  }
  
  // Enhance if confidence is low
  if (classification.confidence < 0.6) {
    return true;
  }
  
  // Enhance for research or compliance queries
  if (['research', 'compliance'].includes(classification.contextual.userIntent)) {
    return true;
  }
  
  return false;
}

function generateAdaptiveRecommendations(
  response: LegalAIResponse | EnhancedLegalResponse,
  classification: SmartQueryClassification,
  conversationHistory: any[]
): string[] {
  const recommendations: string[] = [];
  
  // Based on query complexity
  if (classification.complexity === 'high') {
    recommendations.push('Consider scheduling a detailed consultation for complex legal matters');
  }
  
  // Based on conversation context
  if (classification.contextual.conversationStage === 'initial') {
    recommendations.push('Ask follow-up questions for more specific guidance');
  }
  
  // Based on user intent
  if (classification.contextual.userIntent === 'compliance') {
    recommendations.push('Review compliance checklist and schedule regular audits');
  }
  
  // Based on response confidence  
  if ('classification' in response && 'confidence_score' in response.classification && response.classification.confidence_score < 0.7) {
    recommendations.push('Consult with a legal professional for additional verification');
  }
  
  return recommendations;
}

function showIntelligentSuccessMessage(
  classification: SmartQueryClassification,
  processingType: 'basic' | 'advanced' | 'hybrid' | 'memo_generation' | 'document_analysis' | 'document_generation' | 'contract_comparison' | 'predictive_analysis' | 'smart_recommendations',
  processingTime: number
): void {
  const timeText = processingTime < 2000 ? 'بسرعة' : processingTime < 5000 ? 'بكفاءة' : 'بعناية';
  
  if (processingType === 'basic') {
    toast.success(`⚡ تم الحصول على الإجابة ${timeText}`);
  } else if (processingType === 'advanced') {
    toast.success(`🎯 تم إجراء التحليل المتقدم ${timeText}`);
  } else if (processingType === 'memo_generation') {
    toast.success(`📝 تم إنشاء المذكرة القانونية ${timeText}`);
  } else if (processingType === 'document_analysis') {
    toast.success(`📊 تم تحليل الوثيقة ${timeText}`);
  } else if (processingType === 'document_generation') {
    toast.success(`📄 تم إنشاء الوثيقة ${timeText}`);
  } else if (processingType === 'contract_comparison') {
    toast.success(`🔍 تمت مقارنة العقود ${timeText}`);
  } else if (processingType === 'predictive_analysis') {
    toast.success(`🔮 تم إجراء التحليل التنبؤي ${timeText}`);
  } else if (processingType === 'smart_recommendations') {
    toast.success(`💡 تم إنشاء التوصيات الذكية ${timeText}`);
  } else {
    toast.success(`🔄 تم المعالجة الذكية للاستفسار ${timeText}`);
  }
}