import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ConversationTurn {
  id: string;
  user_message: string;
  ai_response: string;
  timestamp: Date;
  context_data: {
    intent: string;
    domain: string;
    entities: string[];
    confidence: number;
    follow_up_context?: any;
  };
  session_id: string;
  user_feedback?: 'positive' | 'negative' | 'neutral';
}

export interface ConversationSession {
  id: string;
  company_id: string;
  user_id: string;
  session_name: string;
  started_at: Date;
  last_activity: Date;
  context_summary: {
    main_topics: string[];
    key_entities: string[];
    conversation_goal?: string;
    resolved_queries: number;
    pending_actions: string[];
  };
  total_turns: number;
  status: 'active' | 'paused' | 'completed';
}

export interface ContextualReference {
  turn_id: string;
  reference_type: 'entity' | 'topic' | 'action' | 'temporal';
  content: string;
  relevance_score: number;
  created_at: Date;
}

export const useConversationMemory = () => {
  const [currentSession, setCurrentSession] = useState<ConversationSession | null>(null);
  const [conversationTurns, setConversationTurns] = useState<ConversationTurn[]>([]);
  const [contextualReferences, setContextualReferences] = useState<ContextualReference[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize or resume conversation session
  const initializeSession = useCallback(async (sessionName?: string): Promise<ConversationSession> => {
    setIsLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.user.id)
        .single();

      if (!profile) throw new Error('User profile not found');

      // Create new session
      const sessionId = crypto.randomUUID();
      const newSession: ConversationSession = {
        id: sessionId,
        company_id: profile.company_id,
        user_id: user.user.id,
        session_name: sessionName || `Conversation ${new Date().toLocaleDateString()}`,
        started_at: new Date(),
        last_activity: new Date(),
        context_summary: {
          main_topics: [],
          key_entities: [],
          resolved_queries: 0,
          pending_actions: []
        },
        total_turns: 0,
        status: 'active'
      };

      setCurrentSession(newSession);
      setConversationTurns([]);
      setContextualReferences([]);
      
      console.log('🔄 Initialized new conversation session:', sessionId);
      return newSession;
    } catch (error) {
      console.error('❌ Error initializing session:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Add conversation turn with context
  const addConversationTurn = useCallback(async (
    userMessage: string,
    aiResponse: string,
    contextData: ConversationTurn['context_data']
  ): Promise<ConversationTurn> => {
    if (!currentSession) {
      throw new Error('No active session');
    }

    const turn: ConversationTurn = {
      id: crypto.randomUUID(),
      user_message: userMessage,
      ai_response: aiResponse,
      timestamp: new Date(),
      context_data: contextData,
      session_id: currentSession.id
    };

    // Update conversation turns
    setConversationTurns(prev => [...prev, turn]);

    // Update session context summary
    const updatedSession = {
      ...currentSession,
      last_activity: new Date(),
      total_turns: currentSession.total_turns + 1,
      context_summary: {
        ...currentSession.context_summary,
        main_topics: Array.from(new Set([
          ...currentSession.context_summary.main_topics,
          contextData.domain
        ])),
        key_entities: Array.from(new Set([
          ...currentSession.context_summary.key_entities,
          ...contextData.entities
        ])),
        resolved_queries: currentSession.context_summary.resolved_queries + 1
      }
    };

    setCurrentSession(updatedSession);

    // Extract and store contextual references
    await extractContextualReferences(turn);

    console.log('✅ Added conversation turn:', turn.id);
    return turn;
  }, [currentSession]);

  // Extract contextual references from a conversation turn
  const extractContextualReferences = useCallback(async (turn: ConversationTurn) => {
    const references: ContextualReference[] = [];

    // Extract entities
    turn.context_data.entities.forEach(entity => {
      references.push({
        turn_id: turn.id,
        reference_type: 'entity',
        content: entity,
        relevance_score: 0.8,
        created_at: turn.timestamp
      });
    });

    // Extract topics
    references.push({
      turn_id: turn.id,
      reference_type: 'topic',
      content: turn.context_data.domain,
      relevance_score: 0.9,
      created_at: turn.timestamp
    });

    // Extract temporal references
    const temporalPattern = /\b(today|yesterday|tomorrow|next week|last month|this year)\b/gi;
    const temporalMatches = [...turn.user_message.matchAll(temporalPattern)];
    temporalMatches.forEach(match => {
      references.push({
        turn_id: turn.id,
        reference_type: 'temporal',
        content: match[0],
        relevance_score: 0.7,
        created_at: turn.timestamp
      });
    });

    setContextualReferences(prev => [...prev, ...references]);
  }, []);

  // Get relevant context for current query
  const getRelevantContext = useCallback((
    currentQuery: string,
    maxTurns: number = 5,
    maxReferences: number = 10
  ) => {
    // Get recent turns
    const recentTurns = conversationTurns
      .slice(-maxTurns)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Get relevant references based on current query
    const queryWords = currentQuery.toLowerCase().split(/\s+/);
    const relevantReferences = contextualReferences
      .filter(ref => {
        return queryWords.some(word => 
          ref.content.toLowerCase().includes(word) ||
          word.includes(ref.content.toLowerCase())
        );
      })
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, maxReferences);

    return {
      recentTurns,
      relevantReferences,
      sessionSummary: currentSession?.context_summary
    };
  }, [conversationTurns, contextualReferences, currentSession]);

  // Update user feedback for a turn
  const updateTurnFeedback = useCallback(async (
    turnId: string,
    feedback: 'positive' | 'negative' | 'neutral'
  ) => {
    setConversationTurns(prev =>
      prev.map(turn =>
        turn.id === turnId
          ? { ...turn, user_feedback: feedback }
          : turn
      )
    );

    console.log(`📝 Updated feedback for turn ${turnId}: ${feedback}`);
  }, []);

  // Save session to persistent storage
  const saveSession = useCallback(async () => {
    if (!currentSession) return;

    try {
      // In a real implementation, you would save to Supabase here
      const sessionData = {
        session: currentSession,
        turns: conversationTurns,
        references: contextualReferences
      };

      localStorage.setItem(
        `conversation_${currentSession.id}`,
        JSON.stringify(sessionData)
      );

      console.log('💾 Session saved successfully');
    } catch (error) {
      console.error('❌ Error saving session:', error);
    }
  }, [currentSession, conversationTurns, contextualReferences]);

  // Load session from persistent storage
  const loadSession = useCallback(async (sessionId: string) => {
    try {
      const savedData = localStorage.getItem(`conversation_${sessionId}`);
      if (savedData) {
        const { session, turns, references } = JSON.parse(savedData);
        setCurrentSession({
          ...session,
          started_at: new Date(session.started_at),
          last_activity: new Date(session.last_activity)
        });
        setConversationTurns(turns.map((turn: unknown) => ({
          ...turn,
          timestamp: new Date(turn.timestamp)
        })));
        setContextualReferences(references.map((ref: unknown) => ({
          ...ref,
          created_at: new Date(ref.created_at)
        })));
        
        console.log('📂 Session loaded successfully:', sessionId);
      }
    } catch (error) {
      console.error('❌ Error loading session:', error);
    }
  }, []);

  // Get conversation summary
  const getConversationSummary = useCallback(() => {
    if (!currentSession) return null;

    const totalMessages = conversationTurns.length;
    const domains = Array.from(new Set(conversationTurns.map(turn => turn.context_data.domain)));
    const avgConfidence = conversationTurns.length > 0
      ? conversationTurns.reduce((sum, turn) => sum + turn.context_data.confidence, 0) / conversationTurns.length
      : 0;

    return {
      sessionId: currentSession.id,
      sessionName: currentSession.session_name,
      duration: Date.now() - currentSession.started_at.getTime(),
      totalMessages,
      domains,
      avgConfidence,
      status: currentSession.status,
      keyTopics: currentSession.context_summary.main_topics,
      resolvedQueries: currentSession.context_summary.resolved_queries
    };
  }, [currentSession, conversationTurns]);

  // Auto-save session periodically
  useEffect(() => {
    if (currentSession && conversationTurns.length > 0) {
      const interval = setInterval(() => {
        saveSession();
      }, 30000); // Save every 30 seconds

      return () => clearInterval(interval);
    }
  }, [currentSession, conversationTurns, saveSession]);

  return {
    // Session management
    currentSession,
    initializeSession,
    loadSession,
    saveSession,
    
    // Conversation management
    conversationTurns,
    addConversationTurn,
    updateTurnFeedback,
    
    // Context management
    getRelevantContext,
    contextualReferences,
    
    // Analysis
    getConversationSummary,
    
    // State
    isLoading
  };
};