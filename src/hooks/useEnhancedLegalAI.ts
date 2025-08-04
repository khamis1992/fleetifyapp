import { useState, useCallback } from 'react';
import { useContextualQueryAnalyzer } from './useContextualQueryAnalyzer';
import { useStatisticalQueryHandler } from './useStatisticalQueryHandler';
import { useStatisticalQueryClassifier } from './useStatisticalQueryClassifier';
import { useSemanticDictionary } from './useSemanticDictionary';
import { useUnifiedLegalAI } from './useUnifiedLegalAI';

export interface EnhancedLegalQuery {
  query: string;
  context?: {
    conversationHistory?: any[];
    userPreferences?: any;
    domainHint?: string;
    company_id?: string;
    user_id?: string;
  };
}

export interface EnhancedLegalResponse {
  response: string;
  confidence: number;
  processingStrategy: 'semantic_enhanced' | 'statistical' | 'legal_analysis' | 'hybrid' | 'unified';
  metadata: {
    queryAnalysis: any;
    semanticMatches?: any[];
    processingTime: number;
    suggestions?: string[];
    relatedConcepts?: string[];
    enhancementApplied: boolean;
  };
  visualizations?: any[];
  followUpQuestions?: string[];
  actionableInsights?: string[];
}

export const useEnhancedLegalAI = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { analyzeQuery } = useContextualQueryAnalyzer();
  const { processStatisticalQuery } = useStatisticalQueryHandler();
  const { classifyStatisticalQuery } = useStatisticalQueryClassifier();
  const { expandQuery, getRelatedConcepts } = useSemanticDictionary();
  const { submitUnifiedQuery } = useUnifiedLegalAI();

  const processEnhancedQuery = useCallback(async (
    enhancedQuery: EnhancedLegalQuery
  ): Promise<EnhancedLegalResponse> => {
    setIsProcessing(true);
    const startTime = Date.now();

    try {
      // Step 1: Enhanced semantic analysis
      const queryAnalysis = await analyzeQuery(enhancedQuery.query);
      
      // Step 2: Apply semantic enhancement to the query
      const enhancedQueryText = enhanceQueryWithSemantics(enhancedQuery.query, queryAnalysis);
      
      // Step 3: Determine if we need statistical processing
      if (queryAnalysis.isStatisticalQuery && queryAnalysis.context.confidence > 0.7) {
        // First classify the query statistically
        const statisticalClassification = classifyStatisticalQuery(enhancedQuery.query);
        const statisticalResult = await processStatisticalQuery(
          enhancedQuery.query,
          statisticalClassification,
          enhancedQuery.context?.company_id || ''
        );
        
        return {
          response: generateEnhancedStatisticalResponse(statisticalResult, queryAnalysis),
          confidence: queryAnalysis.context.confidence,
          processingStrategy: 'statistical',
          metadata: {
            queryAnalysis,
            semanticMatches: queryAnalysis.semanticMatches,
            processingTime: Date.now() - startTime,
            suggestions: queryAnalysis.suggestedQueries,
            relatedConcepts: extractRelatedConcepts(queryAnalysis),
            enhancementApplied: true
          },
          visualizations: statisticalResult.success ? statisticalResult.visualizations || [] : [],
          followUpQuestions: generateContextualFollowUps(queryAnalysis),
          actionableInsights: generateActionableInsights(statisticalResult, queryAnalysis)
        };
      }

      // Step 4: Use unified AI with enhanced context
      const unifiedQuery = {
        query: enhancedQueryText,
        country: 'Kuwait', // Default for legal context
        company_id: enhancedQuery.context?.company_id || '',
        user_id: enhancedQuery.context?.user_id,
        context: {
          ...enhancedQuery.context,
          semanticAnalysis: queryAnalysis,
          enhancedQuery: true
        },
        conversationHistory: enhancedQuery.context?.conversationHistory || []
      };

      const unifiedResponse = await submitUnifiedQuery(unifiedQuery);

      // Step 5: Apply additional semantic enhancements to the response
      const enhancedResponseText = enhanceResponseWithContext(
        unifiedResponse.response,
        queryAnalysis
      );

      return {
        response: enhancedResponseText,
        confidence: queryAnalysis.context.confidence,
        processingStrategy: 'unified',
        metadata: {
          queryAnalysis,
          semanticMatches: queryAnalysis.semanticMatches,
          processingTime: Date.now() - startTime,
          suggestions: queryAnalysis.suggestedQueries,
          relatedConcepts: extractRelatedConcepts(queryAnalysis),
          enhancementApplied: true
        },
        visualizations: unifiedResponse.response?.analysisData?.charts || [],
        followUpQuestions: generateContextualFollowUps(queryAnalysis),
        actionableInsights: generateResponseInsights(unifiedResponse, queryAnalysis)
      };

    } catch (error) {
      console.error('Error in enhanced legal AI processing:', error);
      return {
        response: 'I encountered an error while processing your enhanced query. Please try rephrasing your question with more specific terms.',
        confidence: 0.1,
        processingStrategy: 'semantic_enhanced',
        metadata: {
          queryAnalysis: null,
          processingTime: Date.now() - startTime,
          enhancementApplied: false
        },
        followUpQuestions: ['Could you provide more specific details?', 'Would you like me to suggest related topics?']
      };
    } finally {
      setIsProcessing(false);
    }
  }, [analyzeQuery, processStatisticalQuery, submitUnifiedQuery]);

  // Helper functions for semantic enhancement
  const enhanceQueryWithSemantics = (originalQuery: string, analysis: any): string => {
    let enhancedQuery = originalQuery;
    
    // Add context-aware terms based on domain
    if (analysis.context.domain === 'legal') {
      enhancedQuery = `Legal context: ${enhancedQuery}`;
    } else if (analysis.context.domain === 'financial') {
      enhancedQuery = `Financial analysis: ${enhancedQuery}`;
    } else if (analysis.context.domain === 'fleet_management') {
      enhancedQuery = `Fleet operations: ${enhancedQuery}`;
    }

    // Add temporal context if detected
    if (analysis.context.temporal.isRealTime) {
      enhancedQuery += ' (current status required)';
    } else if (analysis.context.temporal.isHistorical) {
      enhancedQuery += ' (historical data analysis)';
    }

    return enhancedQuery;
  };

  const enhanceResponseWithContext = (response: any, analysis: any): string => {
    let enhancedResponse = '';
    
    if (typeof response === 'string') {
      enhancedResponse = response;
    } else if (response?.advice) {
      enhancedResponse = response.advice;
    } else {
      enhancedResponse = 'I processed your query based on the semantic analysis.';
    }

    // Add context-aware enhancements
    if (analysis.semanticMatches.length > 0) {
      const concepts = analysis.semanticMatches.map(m => m.concept).join(', ');
      enhancedResponse += `\n\n🔍 **Context detected:** ${concepts}`;
    }

    if (analysis.context.complexity === 'high') {
      enhancedResponse += '\n\n💡 **Note:** This is a complex query. I recommend breaking it down into specific questions for more detailed assistance.';
    }

    return enhancedResponse;
  };

  const generateEnhancedStatisticalResponse = (result: any, analysis: any): string => {
    if (!result.success) {
      return `I understand you're looking for statistical information about ${analysis.expandedTerms.join(', ')}. Let me help you access this data with a different approach.`;
    }

    let response = `📊 **Enhanced Statistical Analysis**\n\n`;
    response += `**Query Context:** ${analysis.context.domain} domain, ${analysis.context.complexity} complexity\n\n`;
    
    if (result.data?.statisticalData) {
      response += `**Results:** ${result.data.description || 'Statistical data processed'}\n`;
      response += `**Value:** ${result.data.value || 'Data available'}\n\n`;
    }

    if (result.suggestions?.length > 0) {
      response += `**Enhanced Insights:**\n${result.suggestions.map((s: string) => `• ${s}`).join('\n')}\n\n`;
    }

    response += `**Semantic Context:** Based on your query about "${analysis.originalQuery}", I identified key concepts: ${analysis.semanticMatches.map((m: any) => m.concept).join(', ')}`;

    return response;
  };

  const extractRelatedConcepts = (analysis: any): string[] => {
    const concepts = new Set<string>();
    
    analysis.semanticMatches.forEach((match: any) => {
      concepts.add(match.concept);
      // Get related concepts using semantic dictionary
      const related = getRelatedConcepts(match.concept, 2);
      related.forEach(r => concepts.add(r.primary));
    });

    return Array.from(concepts).slice(0, 5);
  };

  const generateContextualFollowUps = (analysis: any): string[] => {
    const questions: string[] = [];
    const { domain, intent, entities } = analysis.context;

    switch (domain) {
      case 'legal':
        questions.push(
          'Would you like specific legal precedents for this matter?',
          'Do you need help drafting related legal documents?',
          'Should I provide compliance requirements for this area?'
        );
        break;
      case 'financial':
        questions.push(
          'Would you like a detailed financial breakdown?',
          'Do you need budget projections for this area?',
          'Should I analyze trends and patterns?'
        );
        break;
      case 'fleet_management':
        questions.push(
          'Would you like vehicle utilization reports?',
          'Do you need maintenance cost analysis?',
          'Should I provide optimization recommendations?'
        );
        break;
      default:
        questions.push(
          'Would you like more specific information?',
          'Do you need help with related topics?',
          'Should I provide detailed analysis?'
        );
    }

    // Add intent-specific questions
    if (intent === 'action') {
      questions.push('Would you like me to help execute this action?');
    } else if (intent === 'analysis') {
      questions.push('Should I provide deeper analytical insights?');
    }

    return questions.slice(0, 3);
  };

  const generateActionableInsights = (result: any, analysis: any): string[] => {
    const insights: string[] = [];

    if (analysis.context.domain === 'financial' && result.success) {
      insights.push('Consider setting up automated reporting for this metric');
      insights.push('Monitor trends to identify potential issues early');
    }

    if (analysis.context.domain === 'legal') {
      insights.push('Document this inquiry for compliance records');
      insights.push('Consider creating a template for similar requests');
    }

    if (analysis.context.complexity === 'high') {
      insights.push('Break down complex queries into smaller, specific questions');
      insights.push('Use filters and specific criteria for better results');
    }

    return insights.slice(0, 3);
  };

  const generateResponseInsights = (response: any, analysis: any): string[] => {
    const insights: string[] = [];

    if (response.success && response.response?.responseType === 'interactive') {
      insights.push('Use the interactive elements to get more specific results');
    }

    if (analysis.context.temporal.isRealTime) {
      insights.push('Consider setting up real-time monitoring for this information');
    }

    insights.push('Save frequently used queries for quick access');
    
    return insights.slice(0, 3);
  };

  return {
    processEnhancedQuery,
    isProcessing
  };
};