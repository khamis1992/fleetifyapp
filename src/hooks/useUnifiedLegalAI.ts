import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useLegalAI, LegalAIQuery, LegalAIResponse } from './useLegalAI';
import { useAdvancedLegalAI, AdvancedLegalQuery, EnhancedLegalResponse } from './useAdvancedLegalAI';
import { useSmartLegalClassifier, SmartQueryClassification } from './useSmartLegalClassifier';
import { useLegalMemos } from './useLegalMemos';

export interface UnifiedLegalQuery {
  query: string;
  country: string;
  company_id: string;
  user_id?: string;
  context?: any;
  conversationHistory?: any[];
}

export interface UnifiedLegalResponse {
  success: boolean;
  response: LegalAIResponse | EnhancedLegalResponse;
  classification: SmartQueryClassification;
  processingType: 'basic' | 'advanced' | 'hybrid' | 'memo_generation';
  metadata: {
    processingTime: number;
    dataSource: string;
    adaptiveRecommendations?: string[];
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

      // Step 3: Route to appropriate AI system
      if (processingType === 'memo_generation') {
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
  }, [submitBasicQuery, submitAdvancedQuery, classifyQuery, searchCustomers, analyzeCustomer, generateMemo]);

  // Handle memo generation requests
  const handleMemoGeneration = async (
    queryData: UnifiedLegalQuery,
    classification: SmartQueryClassification
  ): Promise<LegalAIResponse> => {
    setProcessingStatus('Searching for relevant customers...');
    
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
function determineProcessingType(classification: SmartQueryClassification): 'basic' | 'advanced' | 'hybrid' | 'memo_generation' {
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
  processingType: 'basic' | 'advanced' | 'hybrid' | 'memo_generation',
  processingTime: number
): void {
  const timeText = processingTime < 2000 ? 'بسرعة' : processingTime < 5000 ? 'بكفاءة' : 'بعناية';
  
  if (processingType === 'basic') {
    toast.success(`⚡ تم الحصول على الإجابة ${timeText}`);
  } else if (processingType === 'advanced') {
    toast.success(`🎯 تم إجراء التحليل المتقدم ${timeText}`);
  } else if (processingType === 'memo_generation') {
    toast.success(`📝 تم إنشاء المذكرة القانونية ${timeText}`);
  } else {
    toast.success(`🔄 تم المعالجة الذكية للاستفسار ${timeText}`);
  }
}