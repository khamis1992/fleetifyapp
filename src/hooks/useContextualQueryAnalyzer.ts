import { useState, useCallback, useMemo } from 'react';
import { useSemanticDictionary } from './useSemanticDictionary';
import { useStatisticalQueryClassifier } from './useStatisticalQueryClassifier';
import { useSmartLegalClassifier } from './useSmartLegalClassifier';

interface QueryContext {
  domain: 'legal' | 'financial' | 'fleet_management' | 'operations' | 'general';
  intent: 'information' | 'action' | 'analysis' | 'creation' | 'modification';
  entities: string[];
  temporal: {
    timeframe?: string;
    isHistorical: boolean;
    isRealTime: boolean;
  };
  complexity: 'low' | 'medium' | 'high';
  confidence: number;
}

interface EnhancedQueryAnalysis {
  originalQuery: string;
  normalizedQuery: string;
  expandedTerms: string[];
  context: QueryContext;
  suggestedQueries: string[];
  isStatisticalQuery: boolean;
  semanticMatches: Array<{
    term: string;
    concept: string;
    confidence: number;
  }>;
}

const INTENT_PATTERNS = {
  information: [
    /\b(show|display|list|view|what|who|when|where|how many|count)\b/i,
    /\b(tell me|give me|get|find|search)\b/i
  ],
  action: [
    /\b(create|add|insert|make|generate|build)\b/i,
    /\b(send|dispatch|assign|approve|reject)\b/i
  ],
  analysis: [
    /\b(analyze|compare|calculate|report|summarize)\b/i,
    /\b(trends|performance|statistics|breakdown)\b/i
  ],
  creation: [
    /\b(draft|compose|write|prepare|document)\b/i,
    /\b(memo|letter|contract|agreement)\b/i
  ],
  modification: [
    /\b(update|modify|change|edit|cancel)\b/i,
    /\b(suspend|activate|renew|extend)\b/i
  ]
};

const TEMPORAL_PATTERNS = {
  realtime: /\b(now|current|today|this moment|right now)\b/i,
  recent: /\b(today|yesterday|this week|recent|latest)\b/i,
  historical: /\b(last month|previous|history|past|since|from)\b/i,
  future: /\b(next|upcoming|future|scheduled|planned)\b/i
};

export const useContextualQueryAnalyzer = () => {
  const [analysisHistory, setAnalysisHistory] = useState<EnhancedQueryAnalysis[]>([]);
  const { findSemanticMatch, expandQuery, getRelatedConcepts } = useSemanticDictionary();
  const { classifyStatisticalQuery } = useStatisticalQueryClassifier();
  const { classifyQuery: classifyLegalQuery } = useSmartLegalClassifier();

  const analyzeIntent = useCallback((query: string): QueryContext['intent'] => {
    for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
      if (patterns.some(pattern => pattern.test(query))) {
        return intent as QueryContext['intent'];
      }
    }
    return 'information'; // default
  }, []);

  const analyzeTemporal = useCallback((query: string) => {
    const temporal = {
      timeframe: undefined as string | undefined,
      isHistorical: false,
      isRealTime: false
    };

    if (TEMPORAL_PATTERNS.realtime.test(query)) {
      temporal.isRealTime = true;
      temporal.timeframe = 'current';
    } else if (TEMPORAL_PATTERNS.recent.test(query)) {
      temporal.timeframe = 'recent';
    } else if (TEMPORAL_PATTERNS.historical.test(query)) {
      temporal.isHistorical = true;
      temporal.timeframe = 'historical';
    } else if (TEMPORAL_PATTERNS.future.test(query)) {
      temporal.timeframe = 'future';
    }

    return temporal;
  }, []);

  const extractEntities = useCallback((query: string): string[] => {
    const words = query.toLowerCase().split(/\s+/);
    const entities: string[] = [];

    words.forEach(word => {
      const match = findSemanticMatch(word);
      if (match) {
        entities.push(match.primary);
      }
    });

    // Remove duplicates
    return [...new Set(entities)];
  }, [findSemanticMatch]);

  const determineDomain = useCallback((entities: string[], query: string): QueryContext['domain'] => {
    const domainScores = {
      legal: 0,
      financial: 0,
      fleet_management: 0,
      operations: 0,
      general: 0
    };

    entities.forEach(entity => {
      const match = findSemanticMatch(entity);
      if (match) {
        switch (match.category) {
          case 'legal':
            domainScores.legal += match.weight;
            break;
          case 'financial':
            domainScores.financial += match.weight;
            break;
          case 'fleet_management':
            domainScores.fleet_management += match.weight;
            break;
          case 'operations':
          case 'hr':
            domainScores.operations += match.weight;
            break;
          default:
            domainScores.general += match.weight * 0.5;
        }
      }
    });

    // Legal-specific patterns
    if (/\b(contract|agreement|legal|court|case|lawsuit)\b/i.test(query)) {
      domainScores.legal += 2;
    }

    // Financial patterns
    if (/\b(revenue|income|expense|payment|invoice|billing)\b/i.test(query)) {
      domainScores.financial += 2;
    }

    // Fleet patterns
    if (/\b(vehicle|car|fleet|maintenance|dispatch)\b/i.test(query)) {
      domainScores.fleet_management += 2;
    }

    const maxScore = Math.max(...Object.values(domainScores));
    const domain = Object.keys(domainScores).find(
      key => domainScores[key as keyof typeof domainScores] === maxScore
    ) as QueryContext['domain'];

    return domain || 'general';
  }, [findSemanticMatch]);

  const calculateComplexity = useCallback((query: string, entities: string[]): QueryContext['complexity'] => {
    let complexityScore = 0;

    // Length factor
    if (query.length > 100) complexityScore += 2;
    else if (query.length > 50) complexityScore += 1;

    // Entity count
    if (entities.length > 5) complexityScore += 2;
    else if (entities.length > 2) complexityScore += 1;

    // Complex operations
    if (/\b(analyze|compare|calculate|breakdown|trends)\b/i.test(query)) {
      complexityScore += 2;
    }

    // Multiple conditions
    if (/\b(and|or|but|if|when|where)\b/i.test(query)) {
      complexityScore += 1;
    }

    if (complexityScore >= 4) return 'high';
    if (complexityScore >= 2) return 'medium';
    return 'low';
  }, []);

  const generateSuggestions = useCallback((analysis: EnhancedQueryAnalysis): string[] => {
    const suggestions: string[] = [];
    const { context, expandedTerms } = analysis;

    // Domain-specific suggestions
    switch (context.domain) {
      case 'legal':
        if (context.intent === 'information') {
          suggestions.push('Show me contract details', 'List active legal cases');
        }
        break;
      case 'financial':
        if (context.intent === 'analysis') {
          suggestions.push('Monthly revenue breakdown', 'Payment status summary');
        }
        break;
      case 'fleet_management':
        if (context.intent === 'information') {
          suggestions.push('Vehicle status report', 'Maintenance schedule');
        }
        break;
    }

    // Related concepts suggestions
    expandedTerms.slice(0, 3).forEach(term => {
      const related = getRelatedConcepts(term, 2);
      related.forEach(concept => {
        suggestions.push(`Show ${concept.primary} information`);
      });
    });

    return suggestions.slice(0, 5);
  }, [getRelatedConcepts]);

  const analyzeQuery = useCallback(async (query: string): Promise<EnhancedQueryAnalysis> => {
    const normalizedQuery = query.trim().toLowerCase();
    const expandedTerms = expandQuery(query, false);
    const entities = extractEntities(query);
    const intent = analyzeIntent(query);
    const temporal = analyzeTemporal(query);
    const domain = determineDomain(entities, query);
    const complexity = calculateComplexity(query, entities);

    // Check if it's a statistical query
    const statisticalClassification = classifyStatisticalQuery(query);
    const isStatisticalQuery = statisticalClassification.isStatisticalQuery;

    // Semantic matches
    const semanticMatches = entities.map(entity => {
      const match = findSemanticMatch(entity);
      return {
        term: entity,
        concept: match?.primary || entity,
        confidence: match?.weight || 0.5
      };
    });

    // Calculate overall confidence
    const confidence = semanticMatches.length > 0 
      ? semanticMatches.reduce((sum, match) => sum + match.confidence, 0) / semanticMatches.length
      : 0.5;

    const context: QueryContext = {
      domain,
      intent,
      entities,
      temporal,
      complexity,
      confidence
    };

    const analysis: EnhancedQueryAnalysis = {
      originalQuery: query,
      normalizedQuery,
      expandedTerms,
      context,
      suggestedQueries: [],
      isStatisticalQuery,
      semanticMatches
    };

    analysis.suggestedQueries = generateSuggestions(analysis);

    // Add to history
    setAnalysisHistory(prev => [analysis, ...prev.slice(0, 9)]); // Keep last 10

    return analysis;
  }, [
    expandQuery, 
    extractEntities, 
    analyzeIntent, 
    analyzeTemporal, 
    determineDomain, 
    calculateComplexity,
    classifyStatisticalQuery,
    findSemanticMatch,
    generateSuggestions
  ]);

  const getRecentAnalyses = useCallback((count = 5) => {
    return analysisHistory.slice(0, count);
  }, [analysisHistory]);

  const clearHistory = useCallback(() => {
    setAnalysisHistory([]);
  }, []);

  return {
    analyzeQuery,
    getRecentAnalyses,
    clearHistory,
    analysisHistory
  };
};