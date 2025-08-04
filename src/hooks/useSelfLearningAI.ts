import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Core interfaces for the self-learning system
export interface QueryIntent {
  id: string;
  original_query: string;
  normalized_query?: string;
  intent_classification: string;
  confidence_score: number;
  context_data: Record<string, any>;
  user_confirmed: boolean;
  created_at: string;
}

export interface ClarificationSession {
  id: string;
  original_query: string;
  clarification_questions: string[];
  user_responses: Record<string, string>;
  final_intent?: string;
  session_status: 'active' | 'completed' | 'abandoned';
  created_at: string;
}

export interface LearningFeedback {
  id: string;
  feedback_type: 'helpful' | 'accurate' | 'improvement_needed';
  feedback_rating: number;
  feedback_comments?: string;
  improvement_suggestions: Record<string, any>;
}

export interface PerformanceMetrics {
  metric_date: string;
  total_queries: number;
  successful_classifications: number;
  clarification_requests: number;
  user_satisfaction_avg: number;
  learning_improvements: number;
  response_time_avg: number;
}

export interface SelfLearningQuery {
  query: string;
  context?: Record<string, any>;
  conversation_history?: any[];
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
          response: "I need some clarification to better understand your request.",
          confidence: response.confidence,
          intent_classification: 'clarification_needed',
          requires_clarification: true,
          clarification_questions: response.session.clarification_questions,
          suggested_actions: [],
          learning_applied: false,
          session_id: response.session.id
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
      console.error('Error in self-learning AI processing:', error);
      toast.error('Error processing query with self-learning system');
      
      return {
        response: "I encountered an error while processing your request. Please try again.",
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

  // Analyze query intent using learned patterns
  const analyzeQueryIntent = async (query: string, context?: Record<string, any>) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.user.id)
      .single();

    if (!profile) throw new Error('User profile not found');

    // Get learned patterns for similar queries
    const { data: patterns } = await supabase
      .from('ai_learning_patterns')
      .select('*')
      .eq('company_id', profile.company_id)
      .eq('is_active', true)
      .order('success_rate', { ascending: false });

    // Analyze query using existing semantic analysis
    const normalizedQuery = query.toLowerCase().trim();
    
    // Simple intent classification (can be enhanced with ML models)
    let intent = 'general_inquiry';
    let confidence = 0.5;
    
    // Check against learned patterns
    if (patterns) {
      for (const pattern of patterns) {
        if (pattern.pattern_type === 'query_similarity' && pattern.pattern_data && typeof pattern.pattern_data === 'object') {
          const patternData = pattern.pattern_data as any;
          const similarity = calculateSimilarity(normalizedQuery, patternData.query || '');
          if (similarity > 0.8 && pattern.success_rate > 0.7) {
            intent = patternData.intent || 'general_inquiry';
            confidence = Math.min(0.95, (pattern.success_rate || 0.5) * similarity);
            break;
          }
        }
      }
    }

    // Store the intent analysis
    const { data: queryIntent } = await supabase
      .from('ai_query_intents')
      .insert({
        company_id: profile.company_id,
        original_query: query,
        normalized_query: normalizedQuery,
        intent_classification: intent,
        confidence_score: confidence,
        context_data: context || {},
        created_by: user.user.id
      })
      .select()
      .single();

    return {
      id: queryIntent?.id,
      intent,
      confidence,
      patterns_used: patterns?.length || 0
    };
  };

  // Initiate clarification session
  const initiateClarificationSession = async (query: string): Promise<ClarificationSession> => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.user.id)
      .single();

    if (!profile) throw new Error('User profile not found');

    // Generate clarification questions based on query analysis
    const clarificationQuestions = generateClarificationQuestions(query);

    const { data: session } = await supabase
      .from('ai_clarification_sessions')
      .insert({
        company_id: profile.company_id,
        original_query: query,
        clarification_questions: clarificationQuestions,
        created_by: user.user.id
      })
      .select()
      .single();

    const newSession: ClarificationSession = {
      id: session.id,
      original_query: session.original_query,
      clarification_questions: Array.isArray(session.clarification_questions) 
        ? session.clarification_questions 
        : (session.clarification_questions as any) || [],
      user_responses: {},
      session_status: 'active',
      created_at: session.created_at
    };

    setCurrentSession(newSession);
    return newSession;
  };

  // Process clarification responses
  const processClarificationResponse = useCallback(async (
    sessionId: string,
    responses: Record<string, string>
  ) => {
    if (!currentSession || currentSession.id !== sessionId) {
      throw new Error('Invalid clarification session');
    }

    // Update session with responses
    const updatedSession = {
      ...currentSession,
      user_responses: responses
    };

    // Determine final intent based on responses
    const finalIntent = determineFinalIntent(currentSession.original_query, responses);

    await supabase
      .from('ai_clarification_sessions')
      .update({
        user_responses: responses,
        final_intent: finalIntent,
        session_status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    // Learn from this clarification
    await recordClarificationLearning(currentSession.original_query, responses, finalIntent);

    setCurrentSession(null);
    
    return finalIntent;
  }, [currentSession]);

  // Submit learning feedback
  const submitLearningFeedback = useCallback(async (
    feedbackData: Omit<LearningFeedback, 'id'>
  ) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.user.id)
      .single();

    if (!profile) throw new Error('User profile not found');

    await supabase
      .from('ai_learning_feedback')
      .insert({
        company_id: profile.company_id,
        ...feedbackData,
        created_by: user.user.id
      });

    toast.success('Thank you for your feedback! This helps improve the AI system.');
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

    const { data } = await query;
    return data || [];
  }, []);

  // Helper functions
  const calculateSimilarity = (text1: string, text2: string): number => {
    // Simple similarity calculation (can be enhanced with more sophisticated algorithms)
    const words1 = text1.split(' ');
    const words2 = text2.split(' ');
    const commonWords = words1.filter(word => words2.includes(word));
    return commonWords.length / Math.max(words1.length, words2.length);
  };

  const generateClarificationQuestions = (query: string): string[] => {
    // Generate relevant clarification questions based on query content
    const questions = [];
    
    if (query.includes('contract') || query.includes('agreement')) {
      questions.push('Are you referring to a rental contract, service agreement, or another type of contract?');
      questions.push('Do you need to create, modify, or review an existing contract?');
    }
    
    if (query.includes('report') || query.includes('data')) {
      questions.push('What type of report are you looking for?');
      questions.push('What time period should the report cover?');
    }
    
    if (query.includes('customer') || query.includes('client')) {
      questions.push('Are you working with an existing customer or creating a new customer record?');
      questions.push('What specific customer information do you need?');
    }
    
    // Default questions if no specific context detected
    if (questions.length === 0) {
      questions.push('Could you provide more details about what you\'re trying to accomplish?');
      questions.push('Which section of the system are you working with?');
    }
    
    return questions;
  };

  const determineFinalIntent = (query: string, responses: Record<string, string>): string => {
    // Analyze responses to determine the most likely intent
    const responseText = Object.values(responses).join(' ').toLowerCase();
    
    if (responseText.includes('contract') || responseText.includes('agreement')) {
      return 'contract_management';
    }
    if (responseText.includes('report') || responseText.includes('analytics')) {
      return 'reporting_analytics';
    }
    if (responseText.includes('customer') || responseText.includes('client')) {
      return 'customer_management';
    }
    if (responseText.includes('vehicle') || responseText.includes('fleet')) {
      return 'fleet_management';
    }
    
    return 'general_inquiry';
  };

  const processHighConfidenceQuery = async (
    intentAnalysis: any,
    queryData: SelfLearningQuery
  ): Promise<SelfLearningResponse> => {
    // Process the query based on the determined intent
    // This would integrate with existing AI systems
    
    return {
      response: `Based on my understanding, you're asking about ${intentAnalysis.intent}. I'm processing this with ${Math.round(intentAnalysis.confidence * 100)}% confidence.`,
      confidence: intentAnalysis.confidence,
      intent_classification: intentAnalysis.intent,
      requires_clarification: false,
      suggested_actions: [`View ${intentAnalysis.intent} section`, 'Get detailed help'],
      learning_applied: intentAnalysis.patterns_used > 0
    };
  };

  const recordSuccessfulInteraction = async (
    intentAnalysis: any,
    queryData: SelfLearningQuery,
    response: SelfLearningResponse
  ) => {
    // Record this successful interaction as a learning pattern
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.user.id)
      .single();

    if (!profile) return;

    await supabase
      .from('ai_learning_patterns')
      .insert({
        company_id: profile.company_id,
        pattern_type: 'query_similarity',
        pattern_data: {
          query: queryData.query.toLowerCase(),
          intent: intentAnalysis.intent,
          confidence: intentAnalysis.confidence,
          context: queryData.context
        },
        usage_count: 1,
        success_rate: 1.0
      });
  };

  const recordClarificationLearning = async (
    originalQuery: string,
    responses: Record<string, string>,
    finalIntent: string
  ) => {
    // Record clarification patterns for future learning
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.user.id)
      .single();

    if (!profile) return;

    await supabase
      .from('ai_learning_patterns')
      .insert({
        company_id: profile.company_id,
        pattern_type: 'clarification_resolution',
        pattern_data: {
          original_query: originalQuery.toLowerCase(),
          clarification_responses: responses,
          resolved_intent: finalIntent
        },
        usage_count: 1,
        success_rate: 1.0
      });
  };

  return {
    processQueryWithLearning,
    processClarificationResponse,
    submitLearningFeedback,
    getPerformanceMetrics,
    currentSession,
    isProcessing,
    isLearning: isLearning || isProcessing
  };
};