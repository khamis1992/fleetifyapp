import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';

export interface EnhancedLegalQuery {
  query: string;
  analysis_type?: 'basic' | 'comprehensive' | 'predictive';
  context?: any;
  session_id?: string;
}

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high';
  factors: string[];
  recommendations: string[];
}

export interface QueryClassification {
  type: 'data_query' | 'legal_consultation' | 'hybrid';
  intent: string;
  data_query?: {
    entity: 'customers' | 'contracts' | 'invoices' | 'payments' | 'vehicles';
    action: 'count' | 'list' | 'find' | 'analyze';
    filters?: any;
  };
  confidence: number;
}

export interface EnhancedLegalResponse {
  success: boolean;
  analysis: string;
  confidence: number;
  processing_time: number;
  sources: string[];
  suggestions?: string[];
  legal_references?: string[];
  action_items?: string[];
  risk_assessment?: RiskAssessment;
  query_classification?: QueryClassification;
  data_results?: any;
  query_type?: 'data_query' | 'legal_consultation' | 'hybrid';
}

export interface LegalAnalytics {
  total_queries: number;
  successful_queries: number;
  failed_queries: number;
  average_confidence: number;
  average_processing_time: number;
  daily_usage: Record<string, number>;
  success_rate: number;
}

export interface ConversationHistory {
  id: string;
  query: string;
  response: string;
  timestamp: Date;
  confidence: number;
  session_id: string;
}

export const useEnhancedLegalAI = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [conversationHistory, setConversationHistory] = useState<ConversationHistory[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  
  const { companyId, user } = useUnifiedCompanyAccess();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const generateSessionId = useCallback(() => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setCurrentSessionId(sessionId);
    return sessionId;
  }, []);

  const processLegalQuery = useCallback(async (queryData: EnhancedLegalQuery): Promise<EnhancedLegalResponse> => {
    if (!companyId) {
      throw new Error('معرف الشركة مطلوب');
    }

    setIsProcessing(true);
    setError(null);
    setProcessingStatus('جاري معالجة الاستعلام القانوني...');

    try {
      const sessionId = queryData.session_id || currentSessionId || generateSessionId();

      console.log('Processing legal query:', {
        query: queryData.query.substring(0, 100) + '...',
        analysis_type: queryData.analysis_type,
        company_id: companyId,
        user_id: user?.id,
        session_id: sessionId
      });

      const response = await supabase.functions.invoke('legal-ai-enhanced', {
        body: {
          query: queryData.query,
          analysis_type: queryData.analysis_type || 'comprehensive',
          context: queryData.context,
          company_id: companyId,
          user_id: user?.id,
          session_id: sessionId
        }
      });

      console.log('Legal AI response received:', response);

      if (response.error) {
        console.error('Legal AI Error:', response.error);
        throw new Error(response.error.message || 'فشل في الاتصال بنظام الذكاء الاصطناعي القانوني');
      }

      const result = response.data as EnhancedLegalResponse;
      
      if (!result) {
        throw new Error('لم يتم استلام رد من النظام');
      }

      if (!result.success) {
        throw new Error(result.analysis || 'فشل في معالجة الاستعلام القانوني');
      }

      // Validate response quality for real results
      if (!result.analysis || result.analysis.length < 50) {
        console.error('Invalid response received:', result);
        throw new Error('الرد المستلم غير مكتمل أو غير صالح - Response too short or empty');
      }

      // Additional validation for real AI responses
      if (result.analysis.includes('I cannot') || result.analysis.includes('I\'m unable')) {
        console.error('AI refusal detected in response:', result.analysis);
        throw new Error('تم رفض الاستعلام من قبل النظام - يرجى المحاولة مرة أخرى');
      }

      // Add to conversation history
      const historyItem: ConversationHistory = {
        id: Date.now().toString(),
        query: queryData.query,
        response: result.analysis,
        timestamp: new Date(),
        confidence: result.confidence,
        session_id: sessionId
      };

      setConversationHistory(prev => [historyItem, ...prev]);
      setProcessingStatus('');
      
      // Show success toast with different messages based on query type
      if (result.query_type === 'data_query') {
        toast.success('تم استرداد البيانات بنجاح');
      } else if (result.query_type === 'hybrid') {
        toast.success('تم تحليل البيانات وتقديم الاستشارة القانونية');
      } else {
        toast.success(`تمت معالجة الاستعلام بنجاح (الثقة: ${result.confidence}%)`);
      }
      
      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ غير متوقع';
      console.error('Legal AI processing error:', err);
      setError(errorMessage);
      
      // Show error toast
      toast.error(`خطأ في معالجة الاستعلام: ${errorMessage}`);
      
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [companyId, user, currentSessionId, generateSessionId]);

  const getQuerySuggestions = useCallback(async (context?: string): Promise<string[]> => {
    try {
      const response = await supabase.functions.invoke('legal-ai-enhanced', {
        body: { context }
      });

      if (response.error) {
        console.error('Error getting suggestions:', response.error);
        return [];
      }

      return response.data?.suggestions || [];
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return [];
    }
  }, []);

  const getLegalAnalytics = useCallback(async (days: number = 30): Promise<LegalAnalytics> => {
    if (!companyId) {
      throw new Error('معرف الشركة مطلوب');
    }

    try {
      const response = await supabase.functions.invoke('legal-ai-enhanced', {
        body: { 
          company_id: companyId,
          days 
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'فشل في جلب الإحصائيات');
      }

      const data = response.data;
      return {
        ...data,
        success_rate: data.total_queries > 0 ? (data.successful_queries / data.total_queries) * 100 : 0
      };

    } catch (error) {
      console.error('Error getting analytics:', error);
      throw error;
    }
  }, [companyId]);

  const saveConversation = useCallback(async (name: string): Promise<void> => {
    if (!companyId || conversationHistory.length === 0) return;

    try {
      const { error } = await supabase
        .from('saved_conversations')
        .insert({
          name,
          company_id: companyId,
          user_id: user?.id,
          session_id: currentSessionId,
          conversation_data: conversationHistory as any,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('تم حفظ المحادثة بنجاح');
    } catch (error) {
      console.error('Error saving conversation:', error);
      toast.error('فشل في حفظ المحادثة');
    }
  }, [companyId, user, currentSessionId, conversationHistory]);

  const loadSavedConversations = useCallback(async () => {
    if (!companyId) return [];

    try {
      const { data, error } = await supabase
        .from('saved_conversations')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error loading conversations:', error);
      return [];
    }
  }, [companyId]);

  const clearConversationHistory = useCallback(() => {
    setConversationHistory([]);
    generateSessionId();
  }, [generateSessionId]);

  const retryLastQuery = useCallback(async (): Promise<EnhancedLegalResponse | null> => {
    const lastUserQuery = conversationHistory.find(item => item.query);
    if (!lastUserQuery) return null;

    return await processLegalQuery({
      query: lastUserQuery.query,
      analysis_type: 'basic'
    });
  }, [conversationHistory, processLegalQuery]);

  // Health check function
  const checkSystemHealth = useCallback(async (): Promise<boolean> => {
    try {
      console.log('Performing health check...');
      
      // Use Supabase's authenticated function call
      const { data, error } = await supabase.functions.invoke('legal-ai-enhanced/health', {
        method: 'GET'
      });

      if (error) {
        console.error('Health check error:', error);
        return false;
      }

      console.log('Health check response:', data);
      return data?.status === 'healthy' && data?.openai_configured === true;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }, []);

  return {
    // Core functions
    processLegalQuery,
    getQuerySuggestions,
    getLegalAnalytics,
    
    // Conversation management
    saveConversation,
    loadSavedConversations,
    clearConversationHistory,
    retryLastQuery,
    
    // System health
    checkSystemHealth,
    
    // State
    isProcessing,
    error,
    processingStatus,
    conversationHistory,
    currentSessionId,
    
    // Utilities
    clearError,
    generateSessionId
  };
};