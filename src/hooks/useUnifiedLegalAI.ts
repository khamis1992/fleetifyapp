import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useLegalAI, LegalAIQuery, LegalAIResponse } from './useLegalAI';
import { useAdvancedLegalAI, AdvancedLegalQuery, EnhancedLegalResponse } from './useAdvancedLegalAI';
import { useSmartLegalClassifier, SmartQueryClassification } from './useSmartLegalClassifier';

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
  processingType: 'basic' | 'advanced' | 'hybrid';
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
      if (processingType === 'basic') {
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
  }, [submitBasicQuery, submitAdvancedQuery, classifyQuery]);

  return {
    submitUnifiedQuery,
    isProcessing: isProcessing || isBasicLoading || isAdvancedLoading || isClassifying,
    error,
    processingStatus,
    clearError: () => setError(null)
  };
};

// Helper functions
function determineProcessingType(classification: SmartQueryClassification): 'basic' | 'advanced' | 'hybrid' {
  if (classification.type === 'system_data' || classification.complexity === 'low') {
    return 'basic';
  }
  
  if (classification.complexity === 'high' || classification.contextual.userIntent === 'research') {
    return 'advanced';
  }
  
  return 'hybrid';
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
  processingType: 'basic' | 'advanced' | 'hybrid',
  processingTime: number
): void {
  const timeText = processingTime < 2000 ? 'بسرعة' : processingTime < 5000 ? 'بكفاءة' : 'بعناية';
  
  if (processingType === 'basic') {
    toast.success(`⚡ تم الحصول على الإجابة ${timeText}`);
  } else if (processingType === 'advanced') {
    toast.success(`🎯 تم إجراء التحليل المتقدم ${timeText}`);
  } else {
    toast.success(`🔄 تم المعالجة الذكية للاستفسار ${timeText}`);
  }
}