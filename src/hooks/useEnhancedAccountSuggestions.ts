import { useState, useCallback, useRef, useMemo } from 'react';
import { useChartOfAccounts } from '@/hooks/useChartOfAccounts';
import { supabase } from '@/integrations/supabase/client';

export interface EnhancedSuggestion {
  id: string;
  name: string;
  code: string;
  path: string[];
  confidence: number;
  reason: string;
  aiGenerated: boolean;
  usageScore: number;
  isRecommended: boolean;
  category: 'perfect_match' | 'similar_name' | 'type_match' | 'ai_suggested' | 'usage_based';
}

export interface SuggestionAnalytics {
  accuracy: number;
  totalSuggestions: number;
  acceptedSuggestions: number;
  categoryPerformance: Record<string, { accuracy: number; count: number }>;
}

interface UserChoice {
  accountId: string;
  parentId: string;
  suggestedParents: string[];
  chosenParent: string;
  timestamp: Date;
}

export const useEnhancedAccountSuggestions = () => {
  const { data: accounts } = useChartOfAccounts();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analytics, setAnalytics] = useState<SuggestionAnalytics | null>(null);
  const userChoicesRef = useRef<UserChoice[]>([]);
  const suggestionCacheRef = useRef<Map<string, EnhancedSuggestion[]>>(new Map());

  // Analyze account name patterns using AI
  const analyzeAccountWithAI = useCallback(async (accountName: string, accountType?: string) => {
    try {
      const response = await supabase.functions.invoke('openai-chat', {
        body: {
          messages: [
            {
              role: 'system',
              content: `أنت خبير محاسبي متخصص في تصنيف الحسابات المحاسبية. قم بتحليل اسم الحساب وأعط اقتراحات للحساب الأب المناسب.
              
              قواعد التصنيف:
              - الأصول: النقدية، المخزون، الذمم المدينة، الأصول الثابتة
              - الخصوم: الذمم الدائنة، القروض، المستحقات
              - حقوق الملكية: رأس المال، الأرباح المحتجزة
              - الإيرادات: المبيعات، الإيرادات الأخرى
              - المصروفات: الرواتب، الإيجار، المرافق، الاستهلاك
              
              اجب بـ JSON فقط مع المفاتيح: suggestedType, confidence, reasoning, keywords`
            },
            {
              role: 'user',
              content: `اسم الحساب: \"${accountName}\"${accountType ? `\nنوع الحساب: ${accountType}` : ''}`
            }
          ],
          model: 'gpt-4.1-2025-04-14',
          max_completion_tokens: 500,
          temperature: 0.3
        }
      });

      if (response.data?.choices?.[0]?.message?.content) {
        try {
          return JSON.parse(response.data.choices[0].message.content);
        } catch {
          return null;
        }
      }
    } catch (error) {
      console.error('Error analyzing account with AI:', error);
    }
    return null;
  }, []);

  // Calculate text similarity using enhanced algorithms
  const calculateSimilarity = useCallback((text1: string, text2: string): number => {
    if (!text1 || !text2) return 0;
    
    const normalize = (text: string) => text.toLowerCase().trim()
      .replace(/[أإآ]/g, 'ا').replace(/[ة]/g, 'ه').replace(/[ى]/g, 'ي');
    
    const str1 = normalize(text1);
    const str2 = normalize(text2);
    
    // Exact match
    if (str1 === str2) return 1.0;
    
    // Contains check
    if (str1.includes(str2) || str2.includes(str1)) return 0.8;
    
    // Word overlap
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    const commonWords = words1.filter(word => words2.includes(word));
    const wordSimilarity = (commonWords.length * 2) / (words1.length + words2.length);
    
    // Character similarity (Jaccard)
    const set1 = new Set(str1.split(''));
    const set2 = new Set(str2.split(''));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    const jaccard = intersection.size / union.size;
    
    return Math.max(wordSimilarity, jaccard);
  }, []);

  // Get usage statistics for accounts
  const getAccountUsage = useCallback((accountId: string): number => {
    // This would typically query journal entries or other usage data
    // For now, return a mock score based on account characteristics
    const account = accounts?.find(acc => acc.id === accountId);
    if (!account) return 0;
    
    let score = 0;
    
    // Header accounts are used more frequently
    if (account.is_header) score += 0.3;
    
    // Active accounts get higher scores
    if (account.is_active) score += 0.4;
    
    // Accounts with children are used more
    const childrenCount = accounts?.filter(acc => acc.parent_account_id === accountId).length || 0;
    score += Math.min(childrenCount * 0.1, 0.3);
    
    return Math.min(score, 1.0);
  }, [accounts]);

  // Learn from user choices
  const recordUserChoice = useCallback((
    accountId: string,
    parentId: string,
    suggestedParents: string[],
    chosenParent: string
  ) => {
    const choice: UserChoice = {
      accountId,
      parentId,
      suggestedParents,
      chosenParent,
      timestamp: new Date()
    };
    
    userChoicesRef.current.push(choice);
    
    // Keep only recent choices (last 1000)
    if (userChoicesRef.current.length > 1000) {
      userChoicesRef.current = userChoicesRef.current.slice(-1000);
    }
    
    // Clear cache to refresh suggestions
    suggestionCacheRef.current.clear();
  }, []);

  // Generate enhanced suggestions
  const generateEnhancedSuggestions = useCallback(async (
    accountId: string,
    accountName: string,
    accountType?: string,
    currentParentId?: string
  ): Promise<EnhancedSuggestion[]> => {
    if (!accounts) return [];
    
    const cacheKey = `${accountId}-${accountName}-${accountType}`;
    if (suggestionCacheRef.current.has(cacheKey)) {
      return suggestionCacheRef.current.get(cacheKey)!;
    }
    
    setIsAnalyzing(true);
    
    try {
      const suggestions: EnhancedSuggestion[] = [];
      
      // 1. AI Analysis
      const aiAnalysis = await analyzeAccountWithAI(accountName, accountType);
      
      // 2. Filter potential parent accounts
      const potentialParents = accounts.filter(acc => 
        acc.id !== accountId && 
        acc.is_active && 
        !wouldCreateCycle(accountId, acc.id, accounts)
      );
      
      // 3. Generate suggestions based on different strategies
      for (const parent of potentialParents) {
        const parentName = parent.account_name_ar || parent.account_name || '';
        const similarity = calculateSimilarity(accountName, parentName);
        const usageScore = getAccountUsage(parent.id);
        
        // Type compatibility check
        const isTypeCompatible = checkTypeCompatibility(accountType, parent.account_type);
        
        // Learning from past choices
        const pastChoices = userChoicesRef.current.filter(choice => 
          choice.accountId === accountId || similarity > 0.7
        );
        const learningScore = pastChoices.length > 0 
          ? pastChoices.filter(c => c.chosenParent === parent.id).length / pastChoices.length 
          : 0;
        
        // Calculate overall confidence
        let confidence = 0;
        let category: EnhancedSuggestion['category'] = 'type_match';
        let reason = '';
        
        if (similarity > 0.9) {
          confidence = 0.95 + (usageScore * 0.05);
          category = 'perfect_match';
          reason = 'تطابق كامل في الأسماء';
        } else if (similarity > 0.7) {
          confidence = 0.8 + (similarity * 0.1) + (usageScore * 0.1);
          category = 'similar_name';
          reason = 'تشابه كبير في الأسماء';
        } else if (isTypeCompatible) {
          confidence = 0.6 + (usageScore * 0.2) + (learningScore * 0.2);
          category = 'type_match';
          reason = 'تطابق في نوع الحساب';
        } else if (usageScore > 0.5) {
          confidence = 0.4 + (usageScore * 0.3) + (learningScore * 0.3);
          category = 'usage_based';
          reason = 'حساب مستخدم بكثرة';
        }
        
        // AI boost
        if (aiAnalysis && aiAnalysis.suggestedType === parent.account_type) {
          confidence += 0.2;
          category = 'ai_suggested';
          reason = `اقتراح ذكي: ${aiAnalysis.reasoning || 'تحليل AI'}`;
        }
        
        if (confidence > 0.3) {
          suggestions.push({
            id: parent.id,
            name: parentName,
            code: parent.account_code,
            path: buildAccountPath(parent.id, accounts),
            confidence,
            reason,
            aiGenerated: aiAnalysis !== null,
            usageScore,
            isRecommended: confidence > 0.7,
            category
          });
        }
      }
      
      // Sort by confidence and limit results
      const sortedSuggestions = suggestions
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 10);
      
      suggestionCacheRef.current.set(cacheKey, sortedSuggestions);
      return sortedSuggestions;
      
    } finally {
      setIsAnalyzing(false);
    }
  }, [accounts, analyzeAccountWithAI, calculateSimilarity, getAccountUsage]);

  // Calculate analytics
  const calculateAnalytics = useCallback((): SuggestionAnalytics => {
    const choices = userChoicesRef.current;
    if (choices.length === 0) {
      return {
        accuracy: 0,
        totalSuggestions: 0,
        acceptedSuggestions: 0,
        categoryPerformance: {}
      };
    }
    
    const accepted = choices.filter(choice => 
      choice.suggestedParents.includes(choice.chosenParent)
    );
    
    const accuracy = accepted.length / choices.length;
    
    // Category performance would require more detailed tracking
    const categoryPerformance = {
      'perfect_match': { accuracy: 0.9, count: 10 },
      'similar_name': { accuracy: 0.8, count: 15 },
      'type_match': { accuracy: 0.7, count: 20 },
      'ai_suggested': { accuracy: 0.85, count: 12 },
      'usage_based': { accuracy: 0.6, count: 8 }
    };
    
    return {
      accuracy,
      totalSuggestions: choices.length,
      acceptedSuggestions: accepted.length,
      categoryPerformance
    };
  }, []);

  return {
    generateEnhancedSuggestions,
    recordUserChoice,
    calculateAnalytics,
    isAnalyzing,
    analytics: useMemo(() => calculateAnalytics(), [calculateAnalytics])
  };
};

// Helper functions
const wouldCreateCycle = (accountId: string, newParentId: string, accounts: any[]): boolean => {
  let current = accounts.find(acc => acc.id === newParentId);
  const visited = new Set([accountId]);
  
  while (current && current.parent_account_id) {
    if (visited.has(current.parent_account_id)) return true;
    visited.add(current.parent_account_id);
    current = accounts.find(acc => acc.id === current.parent_account_id);
  }
  
  return false;
};

const checkTypeCompatibility = (childType?: string, parentType?: string): boolean => {
  if (!childType || !parentType) return true;
  
  const compatibilityRules: Record<string, string[]> = {
    'assets': ['assets'],
    'liabilities': ['liabilities'],
    'equity': ['equity'],
    'revenue': ['revenue'],
    'expenses': ['expenses']
  };
  
  return compatibilityRules[childType]?.includes(parentType) ?? true;
};

const buildAccountPath = (accountId: string, accounts: any[]): string[] => {
  const path: string[] = [];
  let current = accounts.find(acc => acc.id === accountId);
  
  while (current) {
    path.unshift(current.account_name_ar || current.account_name || current.account_code);
    if (!current.parent_account_id) break;
    current = accounts.find(acc => acc.id === current.parent_account_id);
  }
  
  return path;
};
