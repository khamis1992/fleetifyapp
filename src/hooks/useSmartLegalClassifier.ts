import { useState } from 'react';

export interface SmartQueryClassification {
  type: 'simple' | 'complex' | 'mixed' | 'system_data';
  complexity: 'low' | 'medium' | 'high';
  confidence: number;
  requiredSources: string[];
  suggestedAnalysisDepth: 'basic' | 'standard' | 'comprehensive';
  contextual: {
    conversationStage: 'initial' | 'followup' | 'clarification' | 'deep_dive';
    previousTopics: string[];
    userIntent: 'consultation' | 'research' | 'document_analysis' | 'compliance';
  };
  processingStrategy: 'cache_first' | 'local_knowledge' | 'ai_analysis' | 'hybrid';
  estimatedResponseTime: number;
}

export const useSmartLegalClassifier = () => {
  const [isClassifying, setIsClassifying] = useState(false);

  const classifyQuery = async (
    query: string, 
    conversationHistory: any[] = [],
    userContext?: any
  ): Promise<SmartQueryClassification> => {
    setIsClassifying(true);
    
    try {
      // Analyze query complexity and type
      const complexity = analyzeComplexity(query);
      const type = determineQueryType(query);
      const confidence = calculateConfidence(query, type, complexity);
      
      // Determine processing strategy
      const processingStrategy = determineProcessingStrategy(query, type, complexity);
      
      // Analyze conversation context
      const contextual = analyzeConversationContext(query, conversationHistory);
      
      // Determine required sources and analysis depth
      const requiredSources = identifyRequiredSources(query, type);
      const suggestedAnalysisDepth = determineSuggestedDepth(complexity, type);
      
      // Estimate response time
      const estimatedResponseTime = estimateResponseTime(processingStrategy, complexity);

      return {
        type,
        complexity,
        confidence,
        requiredSources,
        suggestedAnalysisDepth,
        contextual,
        processingStrategy,
        estimatedResponseTime
      };
    } finally {
      setIsClassifying(false);
    }
  };

  return {
    classifyQuery,
    isClassifying
  };
};

// Helper functions
function analyzeComplexity(query: string): 'low' | 'medium' | 'high' {
  const complexityIndicators = {
    high: ['contract', 'merger', 'acquisition', 'compliance', 'regulation', 'lawsuit', 'litigation'],
    medium: ['license', 'agreement', 'policy', 'procedure', 'audit', 'review'],
    low: ['definition', 'meaning', 'simple', 'basic', 'what is', 'explain']
  };

  const words = query.toLowerCase().split(' ');
  
  if (words.some(word => complexityIndicators.high.some(indicator => word.includes(indicator)))) {
    return 'high';
  }
  if (words.some(word => complexityIndicators.medium.some(indicator => word.includes(indicator)))) {
    return 'medium';
  }
  return 'low';
}

function determineQueryType(query: string): 'simple' | 'complex' | 'mixed' | 'system_data' {
  const systemDataKeywords = ['statistics', 'data', 'report', 'analytics', 'metrics'];
  const simpleKeywords = ['definition', 'meaning', 'what is', 'explain'];
  const complexKeywords = ['analysis', 'recommendation', 'strategy', 'assessment'];

  const words = query.toLowerCase();
  
  if (systemDataKeywords.some(keyword => words.includes(keyword))) {
    return 'system_data';
  }
  
  const hasSimple = simpleKeywords.some(keyword => words.includes(keyword));
  const hasComplex = complexKeywords.some(keyword => words.includes(keyword));
  
  if (hasSimple && hasComplex) return 'mixed';
  if (hasComplex) return 'complex';
  return 'simple';
}

function calculateConfidence(query: string, type: string, complexity: string): number {
  // Simple confidence calculation based on query characteristics
  const baseConfidence = 0.7;
  const queryLength = query.split(' ').length;
  
  let confidence = baseConfidence;
  
  // Adjust based on query length
  if (queryLength > 10) confidence += 0.1;
  if (queryLength < 5) confidence -= 0.1;
  
  // Adjust based on type certainty
  if (type === 'system_data') confidence += 0.2;
  if (type === 'mixed') confidence -= 0.1;
  
  return Math.min(Math.max(confidence, 0.1), 1.0);
}

function determineProcessingStrategy(query: string, type: string, complexity: string): 'cache_first' | 'local_knowledge' | 'ai_analysis' | 'hybrid' {
  if (type === 'system_data') return 'cache_first';
  if (complexity === 'low') return 'local_knowledge';
  if (complexity === 'high') return 'ai_analysis';
  return 'hybrid';
}

function analyzeConversationContext(query: string, history: any[]): {
  conversationStage: 'initial' | 'followup' | 'clarification' | 'deep_dive';
  previousTopics: string[];
  userIntent: 'consultation' | 'research' | 'document_analysis' | 'compliance';
} {
  const conversationStage: 'initial' | 'followup' | 'clarification' | 'deep_dive' = 
    history.length === 0 ? 'initial' : 
    history.length < 3 ? 'followup' : 'deep_dive';
  
  const previousTopics = history
    .filter(msg => msg.type === 'user')
    .map(msg => extractTopics(msg.content))
    .flat();

  const userIntent = determineUserIntent(query, history);

  return {
    conversationStage,
    previousTopics,
    userIntent
  };
}

function extractTopics(content: string): string[] {
  // Simple topic extraction - in real implementation, this could be more sophisticated
  const topicKeywords = ['contract', 'license', 'compliance', 'regulation', 'legal', 'law'];
  return topicKeywords.filter(topic => content.toLowerCase().includes(topic));
}

function determineUserIntent(query: string, history: any[]): 'consultation' | 'research' | 'document_analysis' | 'compliance' {
  const words = query.toLowerCase();
  
  if (words.includes('compliance') || words.includes('audit')) return 'compliance';
  if (words.includes('document') || words.includes('contract')) return 'document_analysis';
  if (words.includes('research') || words.includes('analyze')) return 'research';
  return 'consultation';
}

function identifyRequiredSources(query: string, type: string): string[] {
  const sources = [];
  
  if (type === 'system_data') {
    sources.push('internal_database');
  } else {
    sources.push('legal_knowledge_base');
    if (query.toLowerCase().includes('regulation')) {
      sources.push('regulatory_database');
    }
    if (query.toLowerCase().includes('precedent')) {
      sources.push('case_law_database');
    }
  }
  
  return sources;
}

function determineSuggestedDepth(complexity: string, type: string): 'basic' | 'standard' | 'comprehensive' {
  if (type === 'system_data') return 'basic';
  if (complexity === 'high') return 'comprehensive';
  if (complexity === 'medium') return 'standard';
  return 'basic';
}

function estimateResponseTime(strategy: string, complexity: string): number {
  const baseTimes = {
    cache_first: 1000,
    local_knowledge: 2000,
    ai_analysis: 5000,
    hybrid: 3000
  };
  
  const complexityMultiplier = {
    low: 1,
    medium: 1.5,
    high: 2
  };
  
  return baseTimes[strategy as keyof typeof baseTimes] * complexityMultiplier[complexity as keyof typeof complexityMultiplier];
}