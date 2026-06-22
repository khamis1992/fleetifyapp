import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Core interfaces for the self-learning AI system
export interface QueryIntent {
  id: string;
  intent: string;
  confidence: number;
  patterns_used: number;
}

export interface ClarificationSession {
  id: string;
  company_id: string;
  original_query: string;
  clarification_questions: string[];
  session_status: 'active' | 'completed' | 'cancelled';
  user_responses?: Record<string, string>;
  final_intent?: string;
  created_at: string;
  completed_at?: string;
  created_by?: string;
  metadata?: {
    query_analysis?: any;
    question_generation_strategy?: string;
    context_factors?: string[];
    estimated_resolution_confidence?: number;
    response_analysis?: any;
    final_intent_confidence?: number;
    learning_insights?: string[];
  };
}

export interface LearningFeedback {
  id: string;
  feedback_type: 'positive' | 'negative' | 'suggestion' | 'helpful' | 'accurate' | 'improvement_needed';
  feedback_rating: number;
  feedback_comments?: string;
  improvement_suggestions?: Record<string, any>;
  query_intent_id?: string;
  clarification_session_id?: string;
}

export interface PerformanceMetrics {
  metric_date: string;
  total_queries: number;
  successful_classifications: number;
  clarification_requests: number;
  user_satisfaction_avg: number;
  learning_improvements: number;
  response_time_avg?: number;
}

export interface SelfLearningQuery {
  query: string;
  context?: Record<string, any>;
}

export interface SelfLearningResponse {
  response: string;
  confidence: number;
  intent_classification: string;
  requires_clarification: boolean;
  clarification_questions?: string[];
  suggested_actions?: string[];
  learning_applied: boolean;
  session_id?: string;
  processing_time?: number;
  adaptive_recommendations?: string[];
  query_intent_id?: string;
  processing_type?: string;
}

export const useSelfLearningAI = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLearning, setIsLearning] = useState(false);
  const [currentSession, setCurrentSession] = useState<ClarificationSession | null>(null);

  // Main function to process queries with self-learning
  const processQueryWithLearning = useCallback(async (
    queryData: SelfLearningQuery
  ): Promise<SelfLearningResponse> => {
    if (!queryData.query.trim()) {
      throw new Error('Query cannot be empty');
    }

    setIsProcessing(true);
    setIsLearning(true);
    
    try {
      console.log('🧠 Processing query with self-learning AI:', queryData);

      // Get user company from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('User company not found');
      }

      // Call the enhanced self-learning AI edge function
      const { data: response, error } = await supabase.functions.invoke('self-learning-ai', {
        body: {
          query: queryData.query,
          context: queryData.context || {},
          sessionId: crypto.randomUUID(),
          companyId: profile.company_id,
          userId: (await supabase.auth.getUser()).data.user?.id
        }
      });

      if (error) {
        console.error('❌ Self-learning AI error:', error);
        throw new Error(`AI processing failed: ${error.message}`);
      }

      console.log('🎯 Self-learning AI response:', response);

      if (response.type === 'clarification_needed') {
        setCurrentSession(response.session);
        return {
          response: "أحتاج لبعض التوضيحات لفهم طلبك بشكل أفضل.",
          confidence: response.confidence,
          intent_classification: 'clarification_needed',
          requires_clarification: true,
          clarification_questions: response.session?.clarification_questions || [],
          suggested_actions: [],
          learning_applied: false,
          session_id: response.session?.id || null
        };
      }

      // Process successful response
      return {
        response: response.response,
        confidence: response.confidence,
        intent_classification: response.intent,
        requires_clarification: false,
        clarification_questions: [],
        suggested_actions: response.suggestions || [],
        learning_applied: true,
        session_id: null,
        processing_time: Date.now(),
        adaptive_recommendations: response.suggestions,
        query_intent_id: response.queryIntentId,
        processing_type: response.processingType
      };

    } catch (error) {
      console.error('❌ Error in processQueryWithLearning:', error);
      
      return {
        response: 'حدث خطأ في معالجة طلبك. يرجى المحاولة مرة أخرى.',
        confidence: 0,
        intent_classification: 'error',
        requires_clarification: false,
        learning_applied: false
      };
    } finally {
      setIsProcessing(false);
      setIsLearning(false);
    }
  }, []);

  // Initiate clarification session with enhanced intelligence
  const initiateClarificationSession = useCallback(async (query: string): Promise<ClarificationSession> => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.user.id)
      .single();

    if (!profile) throw new Error('User profile not found');

    // Call the intelligent clarification edge function
    const { data: response, error } = await supabase.functions.invoke('intelligent-clarification', {
      body: {
        query,
        context: {},
        companyId: profile.company_id,
        userId: user.user.id
      }
    });

    if (error) {
      console.error('❌ Intelligent clarification error:', error);
      throw new Error(`Clarification creation failed: ${error.message}`);
    }

    return response.session as ClarificationSession;
  }, []);

  // Process clarification responses with enhanced learning
  const processClarificationResponse = useCallback(async (
    sessionId: string, 
    responses: Record<string, string>
  ): Promise<any> => {
    setIsProcessing(true);
    setIsLearning(true);

    try {
      console.log('🎓 Processing clarification responses with learning:', { sessionId, responses });

      // Get user company from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('User company not found');
      }

      // Call the clarification learning edge function
      const { data: response, error } = await supabase.functions.invoke('clarification-learning', {
        body: {
          sessionId,
          responses,
          companyId: profile.company_id,
          userId: (await supabase.auth.getUser()).data.user?.id
        }
      });

      if (error) {
        console.error('❌ Clarification learning error:', error);
        throw new Error(`Clarification processing failed: ${error.message}`);
      }

      console.log('🎯 Clarification learning response:', response);
      
      // Clear current session
      setCurrentSession(null);
      
      return response;

    } catch (error) {
      console.error('❌ Error in processClarificationResponse:', error);
      throw error;
    } finally {
      setIsProcessing(false);
      setIsLearning(false);
    }
  }, []);

  // Submit learning feedback
  const submitLearningFeedback = useCallback(async (
    feedbackData: Omit<LearningFeedback, 'id'>
  ): Promise<void> => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.user.id)
      .single();

    if (!profile) throw new Error('User profile not found');

    const { error } = await supabase
      .from('ai_learning_feedback')
      .insert({
        company_id: profile.company_id,
        ...feedbackData,
        created_by: user.user.id
      });

    if (error) throw error;

    console.log('✅ Learning feedback submitted successfully');
  }, []);

  // Get performance metrics
  const getPerformanceMetrics = useCallback(async (
    startDate?: string,
    endDate?: string
  ): Promise<PerformanceMetrics[]> => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.user.id)
      .single();

    if (!profile) throw new Error('User profile not found');

    let query = supabase
      .from('ai_performance_metrics')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('metric_date', { ascending: false });

    if (startDate) {
      query = query.gte('metric_date', startDate);
    }
    if (endDate) {
      query = query.lte('metric_date', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  }, []);

  return {
    // Core functions
    processQueryWithLearning,
    initiateClarificationSession,
    processClarificationResponse,
    submitLearningFeedback,
    getPerformanceMetrics,
    
    // State
    isProcessing,
    isLearning,
    currentSession
  };
};