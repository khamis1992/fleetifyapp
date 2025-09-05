import { useState, useCallback, useMemo } from 'react';
import { useContextualQueryAnalyzer } from './useContextualQueryAnalyzer';
import { useConversationMemory } from './useConversationMemory';

export interface AdvancedContext {
  // Current query analysis
  currentQuery: {
    intent: string;
    domain: string;
    entities: string[];
    complexity: 'low' | 'medium' | 'high';
    confidence: number;
  };
  
  // Conversation context
  conversationFlow: {
    previousQueries: string[];
    topicProgression: string[];
    unresolved_references: string[];
    context_shifts: number;
  };
  
  // Cross-reference analysis
  entityResolution: {
    resolved_entities: Record<string, string>;
    ambiguous_entities: string[];
    new_entities: string[];
  };
  
  // Temporal context
  temporalAwareness: {
    temporal_anchors: string[];
    relative_references: string[];
    timeline_coherence: number;
  };
  
  // Intent evolution
  intentEvolution: {
    primary_intent: string;
    sub_intents: string[];
    intent_confidence: number;
    goal_progression: number;
  };
}

export interface ContextualInsight {
  type: 'clarification_needed' | 'context_shift' | 'entity_ambiguity' | 'intent_evolution' | 'temporal_confusion';
  description: string;
  confidence: number;
  suggested_action: string;
  related_turns?: string[];
}

export const useAdvancedContextAnalysis = () => {
  const { analyzeQuery } = useContextualQueryAnalyzer();
  const { getRelevantContext, conversationTurns } = useConversationMemory();
  const [contextHistory, setContextHistory] = useState<AdvancedContext[]>([]);
  const [insights, setInsights] = useState<ContextualInsight[]>([]);

  // Analyze query with full conversational context
  const analyzeWithConversationContext = useCallback(async (
    query: string
  ): Promise<AdvancedContext> => {
    // Get basic query analysis
    const queryAnalysis = await analyzeQuery(query);
    
    // Get conversation context
    const relevantContext = getRelevantContext(query, 5, 10);
    
    // Analyze conversation flow
    const conversationFlow = analyzeConversationFlow(query, relevantContext.recentTurns);
    
    // Resolve entities with conversation history
    const entityResolution = resolveEntitiesWithHistory(
      queryAnalysis.context.entities,
      relevantContext.recentTurns
    );
    
    // Analyze temporal context
    const temporalAwareness = analyzeTemporalContext(query, relevantContext.recentTurns);
    
    // Track intent evolution
    const intentEvolution = analyzeIntentEvolution(
      queryAnalysis.context.intent,
      relevantContext.recentTurns
    );

    const advancedContext: AdvancedContext = {
      currentQuery: {
        intent: queryAnalysis.context.intent,
        domain: queryAnalysis.context.domain,
        entities: queryAnalysis.context.entities,
        complexity: queryAnalysis.context.complexity,
        confidence: queryAnalysis.context.confidence
      },
      conversationFlow,
      entityResolution,
      temporalAwareness,
      intentEvolution
    };

    // Generate contextual insights
    const newInsights = generateContextualInsights(advancedContext, query);
    setInsights(prev => [...newInsights, ...prev.slice(0, 9)]);

    // Update context history
    setContextHistory(prev => [advancedContext, ...prev.slice(0, 19)]);

    return advancedContext;
  }, [analyzeQuery, getRelevantContext, conversationTurns]);

  // Analyze conversation flow patterns
  const analyzeConversationFlow = useCallback((
    currentQuery: string,
    recentTurns: any[]
  ) => {
    const previousQueries = recentTurns.map(turn => turn.user_message);
    const topicProgression = recentTurns.map(turn => turn.context_data.domain);
    
    // Detect unresolved references (pronouns, "it", "that", etc.)
    const unresolvedRefs = extractUnresolvedReferences(currentQuery);
    
    // Count context shifts (domain changes)
    const contextShifts = countContextShifts(topicProgression);

    return {
      previousQueries,
      topicProgression,
      unresolved_references: unresolvedRefs,
      context_shifts: contextShifts
    };
  }, []);

  // Resolve entities using conversation history
  const resolveEntitiesWithHistory = useCallback((
    currentEntities: string[],
    recentTurns: any[]
  ) => {
    const resolvedEntities: Record<string, string> = {};
    const ambiguousEntities: string[] = [];
    const newEntities: string[] = [];
    
    // Get all previously mentioned entities
    const historicalEntities = new Set<string>();
    recentTurns.forEach(turn => {
      turn.context_data.entities.forEach((entity: string) => {
        historicalEntities.add(entity.toLowerCase());
      });
    });

    currentEntities.forEach(entity => {
      const lowerEntity = entity.toLowerCase();
      
      // Check if entity was mentioned before
      if (historicalEntities.has(lowerEntity)) {
        resolvedEntities[entity] = entity; // Already resolved
      } else {
        // Check for potential references
        if (['it', 'this', 'that', 'they', 'them'].includes(lowerEntity)) {
          ambiguousEntities.push(entity);
        } else {
          newEntities.push(entity);
        }
      }
    });

    return {
      resolved_entities: resolvedEntities,
      ambiguous_entities: ambiguousEntities,
      new_entities: newEntities
    };
  }, []);

  // Analyze temporal context and coherence
  const analyzeTemporalContext = useCallback((
    currentQuery: string,
    recentTurns: any[]
  ) => {
    const temporalPatterns = {
      absolute: /\b(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|january|february|march|april|may|june|july|august|september|october|november|december)\b/gi,
      relative: /\b(today|yesterday|tomorrow|next week|last month|this year|recently|soon)\b/gi,
      contextual: /\b(before|after|during|while|since|until|when)\b/gi
    };

    const temporalAnchors: string[] = [];
    const relativeReferences: string[] = [];

    // Extract temporal expressions from current query
    const absoluteMatches = [...currentQuery.matchAll(temporalPatterns.absolute)];
    const relativeMatches = [...currentQuery.matchAll(temporalPatterns.relative)];

    absoluteMatches.forEach(match => temporalAnchors.push(match[0]));
    relativeMatches.forEach(match => relativeReferences.push(match[0]));

    // Calculate timeline coherence based on conversation flow
    let timelineCoherence = 1.0;
    
    // Check for temporal inconsistencies
    const allTemporalRefs = recentTurns.flatMap(turn => {
      const refs = [...turn.user_message.matchAll(temporalPatterns.relative)];
      return refs.map(ref => ({
        text: ref[0],
        timestamp: turn.timestamp
      }));
    });

    // Reduce coherence for conflicting temporal references
    if (allTemporalRefs.length > 1) {
      const conflicts = detectTemporalConflicts(allTemporalRefs);
      timelineCoherence = Math.max(0.3, 1.0 - (conflicts * 0.2));
    }

    return {
      temporal_anchors: temporalAnchors,
      relative_references: relativeReferences,
      timeline_coherence: timelineCoherence
    };
  }, []);

  // Analyze intent evolution throughout conversation
  const analyzeIntentEvolution = useCallback((
    currentIntent: string,
    recentTurns: any[]
  ) => {
    const intentHistory = recentTurns.map(turn => turn.context_data.intent);
    const intentCounts = intentHistory.reduce((acc, intent) => {
      acc[intent] = (acc[intent] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const primaryIntent = Object.keys(intentCounts).reduce((a, b) => 
      intentCounts[a] > intentCounts[b] ? a : b, currentIntent);

    const subIntents = Object.keys(intentCounts)
      .filter(intent => intent !== primaryIntent)
      .sort((a, b) => intentCounts[b] - intentCounts[a]);

    // Calculate intent confidence based on consistency
    const totalTurns = recentTurns.length;
    const primaryCount = intentCounts[primaryIntent] || 1;
    const intentConfidence = totalTurns > 0 ? primaryCount / totalTurns : 1.0;

    // Calculate goal progression (how focused the conversation is)
    const uniqueIntents = Object.keys(intentCounts).length;
    const goalProgression = uniqueIntents > 0 ? 1.0 / uniqueIntents : 1.0;

    return {
      primary_intent: primaryIntent,
      sub_intents: subIntents,
      intent_confidence: intentConfidence,
      goal_progression: goalProgression
    };
  }, []);

  // Generate contextual insights
  const generateContextualInsights = useCallback((
    context: AdvancedContext,
    query: string
  ): ContextualInsight[] => {
    const insights: ContextualInsight[] = [];

    // Check for clarification needs
    if (context.entityResolution.ambiguous_entities.length > 0) {
      insights.push({
        type: 'entity_ambiguity',
        description: `Ambiguous references detected: ${context.entityResolution.ambiguous_entities.join(', ')}`,
        confidence: 0.8,
        suggested_action: 'Ask for clarification about specific entities'
      });
    }

    // Check for context shifts
    if (context.conversationFlow.context_shifts > 2) {
      insights.push({
        type: 'context_shift',
        description: 'Multiple topic changes detected in conversation',
        confidence: 0.7,
        suggested_action: 'Summarize previous topics before proceeding'
      });
    }

    // Check for temporal confusion
    if (context.temporalAwareness.timeline_coherence < 0.6) {
      insights.push({
        type: 'temporal_confusion',
        description: 'Temporal references may be inconsistent',
        confidence: 0.6,
        suggested_action: 'Clarify specific timeframes'
      });
    }

    // Check for intent evolution
    if (context.intentEvolution.intent_confidence < 0.5) {
      insights.push({
        type: 'intent_evolution',
        description: 'User intent appears to be changing throughout conversation',
        confidence: 0.7,
        suggested_action: 'Confirm current goal and adjust approach'
      });
    }

    // Check for low confidence requiring clarification
    if (context.currentQuery.confidence < 0.4) {
      insights.push({
        type: 'clarification_needed',
        description: 'Query analysis confidence is low',
        confidence: 0.9,
        suggested_action: 'Request more specific information'
      });
    }

    return insights;
  }, []);

  // Helper functions
  const extractUnresolvedReferences = (query: string): string[] => {
    const pronouns = ['it', 'this', 'that', 'they', 'them', 'these', 'those'];
    const words = query.toLowerCase().split(/\s+/);
    return pronouns.filter(pronoun => words.includes(pronoun));
  };

  const countContextShifts = (topicProgression: string[]): number => {
    let shifts = 0;
    for (let i = 1; i < topicProgression.length; i++) {
      if (topicProgression[i] !== topicProgression[i - 1]) {
        shifts++;
      }
    }
    return shifts;
  };

  const detectTemporalConflicts = (temporalRefs: any[]): number => {
    // Simple conflict detection - could be enhanced
    const uniqueRefs = new Set(temporalRefs.map(ref => ref.text));
    const hasConflictingRefs = temporalRefs.some(ref => 
      ['today', 'yesterday'].some(conflict => 
        ref.text !== conflict && temporalRefs.some(other => other.text === conflict)
      )
    );
    return hasConflictingRefs ? 1 : 0;
  };

  // Get current context state
  const getCurrentContext = useCallback(() => {
    return contextHistory[0] || null;
  }, [contextHistory]);

  // Get insights for current conversation
  const getCurrentInsights = useCallback(() => {
    return insights.slice(0, 5);
  }, [insights]);

  return {
    // Main analysis function
    analyzeWithConversationContext,
    
    // Context state
    getCurrentContext,
    contextHistory,
    
    // Insights
    getCurrentInsights,
    insights,
    
    // Utility functions
    extractUnresolvedReferences,
    countContextShifts
  };
};