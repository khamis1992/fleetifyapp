import { useState, useCallback, useRef } from 'react';
import { useSupabase } from '@/integrations/supabase/useSupabase';

interface LearningPattern {
  id: string;
  query: string;
  category: string;
  userFeedback: 'positive' | 'negative' | 'neutral';
  confidence: number;
  timestamp: string;
  responseTime: number;
  correctedClassification?: string;
  contextFactors: string[];
}

interface QuerySimilarity {
  query: string;
  similarity: number;
  category: string;
  classification: string;
}

interface AdaptiveInsight {
  pattern: string;
  frequency: number;
  successRate: number;
  commonMistakes: string[];
  suggestedImprovements: string[];
}

export const useAdaptiveLearning = () => {
  const [isLearning, setIsLearning] = useState(false);
  const [learningPatterns, setLearningPatterns] = useState<LearningPattern[]>([]);
  const [insights, setInsights] = useState<AdaptiveInsight[]>([]);
  const supabase = useSupabase();
  const learningCache = useRef<Map<string, LearningPattern[]>>(new Map());

  // Record user feedback and learn from it
  const recordFeedback = useCallback(async (
    query: string,
    category: string,
    feedback: 'positive' | 'negative' | 'neutral',
    confidence: number,
    responseTime: number,
    correctedClassification?: string,
    contextFactors: string[] = []
  ) => {
    try {
      setIsLearning(true);

      const learningPattern: LearningPattern = {
        id: `learning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        query: query.toLowerCase().trim(),
        category,
        userFeedback: feedback,
        confidence,
        timestamp: new Date().toISOString(),
        responseTime,
        correctedClassification,
        contextFactors
      };

      // Store in Supabase
      const { error } = await supabase
        .from('ai_learning_patterns')
        .insert({
          pattern_id: learningPattern.id,
          query: learningPattern.query,
          category: learningPattern.category,
          user_feedback: learningPattern.userFeedback,
          confidence: learningPattern.confidence,
          response_time: learningPattern.responseTime,
          corrected_classification: learningPattern.correctedClassification,
          context_factors: learningPattern.contextFactors,
          created_at: learningPattern.timestamp
        });

      if (error) {
        console.error('Error storing learning pattern:', error);
      }

      // Update local state
      setLearningPatterns(prev => [...prev, learningPattern]);
      
      // Update cache
      const cacheKey = category || 'general';
      const cached = learningCache.current.get(cacheKey) || [];
      cached.push(learningPattern);
      learningCache.current.set(cacheKey, cached);

      // Generate insights
      await generateInsights();

    } catch (error) {
      console.error('Error recording feedback:', error);
    } finally {
      setIsLearning(false);
    }
  }, [supabase]);

  // Find similar queries and their classifications
  const findSimilarQueries = useCallback((
    query: string,
    limit: number = 5
  ): QuerySimilarity[] => {
    const normalizedQuery = query.toLowerCase().trim();
    const similarities: QuerySimilarity[] = [];

    learningPatterns.forEach(pattern => {
      const similarity = calculateTextSimilarity(normalizedQuery, pattern.query);
      if (similarity > 0.3) { // Threshold for similarity
        similarities.push({
          query: pattern.query,
          similarity,
          category: pattern.category,
          classification: pattern.correctedClassification || pattern.category
        });
      }
    });

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }, [learningPatterns]);

  // Get learning-based suggestions for query classification
  const getLearningSuggestions = useCallback((
    query: string,
    currentClassification: string,
    confidence: number
  ) => {
    const similarQueries = findSimilarQueries(query);
    const suggestions = [];

    if (similarQueries.length > 0) {
      // Check if similar queries had different classifications
      const alternativeClassifications = similarQueries
        .filter(sq => sq.classification !== currentClassification)
        .map(sq => sq.classification);

      if (alternativeClassifications.length > 0) {
        const mostCommon = getMostFrequent(alternativeClassifications);
        suggestions.push({
          type: 'alternative_classification',
          suggestion: mostCommon,
          confidence: 0.7,
          reason: `Similar queries were classified as "${mostCommon}"`
        });
      }

      // Check for low confidence patterns
      if (confidence < 70) {
        const highConfidenceMatches = similarQueries.filter(sq => sq.similarity > 0.7);
        if (highConfidenceMatches.length > 0) {
          suggestions.push({
            type: 'confidence_boost',
            suggestion: highConfidenceMatches[0].classification,
            confidence: 0.8,
            reason: 'High similarity to previously successful classifications'
          });
        }
      }
    }

    return suggestions;
  }, [findSimilarQueries]);

  // Generate insights from learning patterns
  const generateInsights = useCallback(async () => {
    try {
      const { data: patterns, error } = await supabase
        .from('ai_learning_patterns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error || !patterns) {
        console.error('Error fetching learning patterns:', error);
        return;
      }

      const categoryInsights: Map<string, AdaptiveInsight> = new Map();

      patterns.forEach(pattern => {
        const category = pattern.category;
        if (!categoryInsights.has(category)) {
          categoryInsights.set(category, {
            pattern: category,
            frequency: 0,
            successRate: 0,
            commonMistakes: [],
            suggestedImprovements: []
          });
        }

        const insight = categoryInsights.get(category)!;
        insight.frequency++;

        // Calculate success rate
        const totalInCategory = patterns.filter(p => p.category === category).length;
        const successfulInCategory = patterns.filter(p => 
          p.category === category && p.user_feedback === 'positive'
        ).length;
        insight.successRate = (successfulInCategory / totalInCategory) * 100;

        // Collect common mistakes
        if (pattern.user_feedback === 'negative' && pattern.corrected_classification) {
          const mistake = `Classified as "${category}" but should be "${pattern.corrected_classification}"`;
          if (!insight.commonMistakes.includes(mistake)) {
            insight.commonMistakes.push(mistake);
          }
        }

        // Generate suggestions
        if (insight.successRate < 70) {
          insight.suggestedImprovements.push(`Improve classification accuracy for ${category} queries`);
        }
        if (pattern.confidence < 50) {
          insight.suggestedImprovements.push(`Add more specific patterns for ${category} detection`);
        }
      });

      setInsights(Array.from(categoryInsights.values()));

    } catch (error) {
      console.error('Error generating insights:', error);
    }
  }, [supabase]);

  // Load learning patterns from database
  const loadLearningPatterns = useCallback(async () => {
    try {
      const { data: patterns, error } = await supabase
        .from('ai_learning_patterns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) {
        console.error('Error loading learning patterns:', error);
        return;
      }

      const loadedPatterns: LearningPattern[] = (patterns || []).map(p => ({
        id: p.pattern_id,
        query: p.query,
        category: p.category,
        userFeedback: p.user_feedback,
        confidence: p.confidence,
        timestamp: p.created_at,
        responseTime: p.response_time,
        correctedClassification: p.corrected_classification,
        contextFactors: p.context_factors || []
      }));

      setLearningPatterns(loadedPatterns);

      // Update cache
      learningCache.current.clear();
      loadedPatterns.forEach(pattern => {
        const cacheKey = pattern.category || 'general';
        const cached = learningCache.current.get(cacheKey) || [];
        cached.push(pattern);
        learningCache.current.set(cacheKey, cached);
      });

    } catch (error) {
      console.error('Error loading learning patterns:', error);
    }
  }, [supabase]);

  // Get performance metrics
  const getPerformanceMetrics = useCallback(() => {
    const totalQueries = learningPatterns.length;
    const positiveQueries = learningPatterns.filter(p => p.userFeedback === 'positive').length;
    const negativeQueries = learningPatterns.filter(p => p.userFeedback === 'negative').length;
    
    const avgConfidence = learningPatterns.reduce((sum, p) => sum + p.confidence, 0) / totalQueries || 0;
    const avgResponseTime = learningPatterns.reduce((sum, p) => sum + p.responseTime, 0) / totalQueries || 0;

    const categoryPerformance = new Map<string, { total: number; positive: number; }>();
    learningPatterns.forEach(pattern => {
      if (!categoryPerformance.has(pattern.category)) {
        categoryPerformance.set(pattern.category, { total: 0, positive: 0 });
      }
      const perf = categoryPerformance.get(pattern.category)!;
      perf.total++;
      if (pattern.userFeedback === 'positive') {
        perf.positive++;
      }
    });

    return {
      totalQueries,
      successRate: totalQueries > 0 ? (positiveQueries / totalQueries) * 100 : 0,
      failureRate: totalQueries > 0 ? (negativeQueries / totalQueries) * 100 : 0,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime),
      categoryPerformance: Object.fromEntries(
        Array.from(categoryPerformance.entries()).map(([category, perf]) => [
          category,
          {
            total: perf.total,
            successRate: (perf.positive / perf.total) * 100
          }
        ])
      )
    };
  }, [learningPatterns]);

  return {
    recordFeedback,
    findSimilarQueries,
    getLearningSuggestions,
    generateInsights,
    loadLearningPatterns,
    getPerformanceMetrics,
    isLearning,
    learningPatterns,
    insights
  };
};

// Helper functions
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = text1.split(/\s+/);
  const words2 = text2.split(/\s+/);
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

function getMostFrequent<T>(arr: T[]): T {
  const frequency = new Map<T, number>();
  arr.forEach(item => {
    frequency.set(item, (frequency.get(item) || 0) + 1);
  });
  
  let mostFrequent = arr[0];
  let maxCount = 0;
  
  frequency.forEach((count, item) => {
    if (count > maxCount) {
      maxCount = count;
      mostFrequent = item;
    }
  });
  
  return mostFrequent;
}