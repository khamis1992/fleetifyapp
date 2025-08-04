import { useState } from 'react';

export interface StatisticalQueryClassification {
  isStatisticalQuery: boolean;
  queryCategory: 'contracts' | 'customers' | 'legal_cases' | 'financial' | 'general' | null;
  statisticalType: 'count' | 'count_active' | 'count_all' | 'count_smart' | 'count_blacklisted' | 'count_inactive' | 'detailed_analytics' | 'breakdown' | 'sum' | 'percentage' | 'trend' | 'comparison' | null;
  timeframe?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all_time' | null;
  filters?: {
    status?: string;
    type?: string;
    active?: boolean;
    blacklisted?: boolean;
    dateRange?: { start: Date; end: Date };
    amount?: { min?: number; max?: number };
  };
  confidence: number;
  suggestedVisualization: 'chart' | 'table' | 'card' | 'mixed' | null;
  smartContext?: {
    needsClarification: boolean;
    clarificationPrompt?: string;
    suggestedRefinements: string[];
  };
}

interface StatisticalPattern {
  pattern: RegExp;
  category: StatisticalQueryClassification['queryCategory'];
  type: StatisticalQueryClassification['statisticalType'];
  visualization: StatisticalQueryClassification['suggestedVisualization'];
  keywords: string[];
}

const STATISTICAL_PATTERNS: StatisticalPattern[] = [
  // Enhanced Customer patterns with smart classification
  {
    pattern: /(عدد|كم).*(عملاء|عميل).*(نشط|نشطة|نشطين|فعال|فعالة|فعالين|متفاعل)/i,
    category: 'customers',
    type: 'count_active',
    visualization: 'card',
    keywords: ['عملاء', 'نشط', 'فعال', 'عدد', 'كم']
  },
  {
    pattern: /(عدد|كم).*(عملاء|عميل).*(مسجل|مسجلة|مسجلين|جميع|كل|إجمالي|total|all)/i,
    category: 'customers',
    type: 'count_all',
    visualization: 'card',
    keywords: ['عملاء', 'مسجل', 'جميع', 'كل', 'إجمالي', 'عدد']
  },
  {
    pattern: /(عدد|كم).*(عملاء|عميل).*(محظور|محظورة|محظورين|أسود|سوداء|blacklist)/i,
    category: 'customers',
    type: 'count_blacklisted',
    visualization: 'card',
    keywords: ['عملاء', 'محظور', 'أسود', 'عدد']
  },
  {
    pattern: /(عدد|كم).*(عملاء|عميل).*(غير نشط|معطل|معطلة|معطلين|متوقف|inactive)/i,
    category: 'customers',
    type: 'count_inactive',
    visualization: 'card',
    keywords: ['عملاء', 'غير نشط', 'معطل', 'متوقف', 'عدد']
  },
  {
    pattern: /(عدد|كم).*(عملاء|عميل)(?!.*(نشط|محظور|معطل|مسجل))/i,
    category: 'customers',
    type: 'count_smart',
    visualization: 'card',
    keywords: ['عملاء', 'عدد', 'كم']
  },
  {
    pattern: /(إحصائيات|تفاصيل|تحليل).*(عملاء|عميل).*(تفصيل|مفصل|شامل|كامل)/i,
    category: 'customers',
    type: 'detailed_analytics',
    visualization: 'mixed',
    keywords: ['إحصائيات', 'تفاصيل', 'عملاء', 'تحليل']
  },
  {
    pattern: /(توزيع|نوع|أنواع).*(عملاء|عميل)/i,
    category: 'customers',
    type: 'breakdown',
    visualization: 'chart',
    keywords: ['توزيع', 'نوع', 'عملاء']
  },

  // Contract patterns - using "عقد"
  {
    pattern: /كم.*عقد.*(ملغي|ملغى|منتهي|منتهى|مكتمل)/,
    category: 'contracts',
    type: 'count',
    visualization: 'card',
    keywords: ['عقد', 'ملغي', 'كم']
  },
  {
    pattern: /كم.*عقد.*(نشط|فعال|جاري)/,
    category: 'contracts',
    type: 'count',
    visualization: 'card',
    keywords: ['عقد', 'نشط', 'كم']
  },
  {
    pattern: /كم.*عقد.*معلق/,
    category: 'contracts',
    type: 'count',
    visualization: 'card',
    keywords: ['عقد', 'معلق', 'كم']
  },
  {
    pattern: /عدد.*العقود/,
    category: 'contracts',
    type: 'count',
    visualization: 'chart',
    keywords: ['عدد', 'عقود']
  },
  {
    pattern: /إجمالي.*العقود/,
    category: 'contracts',
    type: 'sum',
    visualization: 'mixed',
    keywords: ['إجمالي', 'عقود']
  },
  
  // Agreement patterns - using "اتفاقية" 
  {
    pattern: /كم.*اتفاقية.*(موجودة|موجود|متوفرة|متوفر)/,
    category: 'contracts',
    type: 'count',
    visualization: 'card',
    keywords: ['اتفاقية', 'موجودة', 'كم']
  },
  {
    pattern: /كم.*اتفاقية.*(ملغي|ملغى|منتهي|منتهى|مكتمل)/,
    category: 'contracts',
    type: 'count',
    visualization: 'card',
    keywords: ['اتفاقية', 'ملغي', 'كم']
  },
  {
    pattern: /كم.*اتفاقية.*(نشط|نشطة|فعال|فعالة|جاري|جارية)/,
    category: 'contracts',
    type: 'count',
    visualization: 'card',
    keywords: ['اتفاقية', 'نشط', 'كم']
  },
  {
    pattern: /كم.*اتفاقية.*معلق/,
    category: 'contracts',
    type: 'count',
    visualization: 'card',
    keywords: ['اتفاقية', 'معلق', 'كم']
  },
  {
    pattern: /عدد.*الاتفاقيات/,
    category: 'contracts',
    type: 'count',
    visualization: 'chart',
    keywords: ['عدد', 'اتفاقيات']
  },
  {
    pattern: /إجمالي.*الاتفاقيات/,
    category: 'contracts',
    type: 'sum',
    visualization: 'mixed',
    keywords: ['إجمالي', 'اتفاقيات']
  },
  
  // Legal cases patterns
  {
    pattern: /كم.*قضية.*(مفتوحة|مغلقة|جارية)/,
    category: 'legal_cases',
    type: 'count',
    visualization: 'card',
    keywords: ['قضية', 'مفتوحة', 'كم']
  },
  {
    pattern: /عدد.*القضايا/,
    category: 'legal_cases',
    type: 'count',
    visualization: 'chart',
    keywords: ['عدد', 'قضايا']
  },
  
  // Financial patterns
  {
    pattern: /كم.*المبلغ.*(المستحق|الإجمالي|المدفوع)/,
    category: 'financial',
    type: 'sum',
    visualization: 'card',
    keywords: ['مبلغ', 'مستحق', 'كم']
  },
  {
    pattern: /إجمالي.*المبالغ/,
    category: 'financial',
    type: 'sum',
    visualization: 'mixed',
    keywords: ['إجمالي', 'مبالغ']
  },
  
  // General statistical patterns
  {
    pattern: /كم.*عدد/,
    category: 'general',
    type: 'count',
    visualization: 'card',
    keywords: ['كم', 'عدد']
  },
  {
    pattern: /احصائيات?/,
    category: 'general',
    type: 'count',
    visualization: 'mixed',
    keywords: ['احصائيات']
  },
  {
    pattern: /تقرير.*احصائي/,
    category: 'general',
    type: 'trend',
    visualization: 'mixed',
    keywords: ['تقرير', 'احصائي']
  }
];

const TIME_PATTERNS = [
  { pattern: /اليوم|اليومية/, timeframe: 'today' as const },
  { pattern: /الأسبوع|أسبوعي|الأسبوعية/, timeframe: 'week' as const },
  { pattern: /الشهر|شهري|الشهرية/, timeframe: 'month' as const },
  { pattern: /الربع|ربعي|الربعية/, timeframe: 'quarter' as const },
  { pattern: /السنة|سنوي|السنوية/, timeframe: 'year' as const }
];

// Smart context generation function
const generateSmartContext = (
  pattern: StatisticalPattern,
  normalizedQuery: string
): StatisticalQueryClassification['smartContext'] => {
  const context: StatisticalQueryClassification['smartContext'] = {
    needsClarification: false,
    suggestedRefinements: []
  };

  if (pattern.category === 'customers') {
    if (pattern.type === 'count_smart') {
      // This is the ambiguous "عدد العملاء" case
      context.needsClarification = true;
      context.clarificationPrompt = 'هل تريد معرفة العملاء النشطين أم جميع العملاء المسجلين؟';
      context.suggestedRefinements = [
        'عدد العملاء النشطين',
        'عدد جميع العملاء المسجلين',
        'العملاء النشطين فقط',
        'كل العملاء بما فيهم المعطلين'
      ];
    } else if (pattern.type === 'count_active') {
      context.suggestedRefinements = [
        'العملاء النشطين اليوم',
        'العملاء النشطين هذا الشهر',
        'مقارنة العملاء النشطين بالشهر الماضي'
      ];
    } else if (pattern.type === 'count_all') {
      context.suggestedRefinements = [
        'توزيع العملاء حسب النوع',
        'العملاء المسجلين الجدد',
        'إحصائيات شاملة للعملاء'
      ];
    } else if (pattern.type === 'detailed_analytics') {
      context.suggestedRefinements = [
        'تحليل نشاط العملاء',
        'اتجاهات نمو العملاء',
        'معدل نشاط العملاء'
      ];
    }
  }

  if (pattern.category === 'contracts') {
    context.suggestedRefinements = [
      'العقود حسب الحالة',
      'قيمة العقود الإجمالية',
      'العقود منتهية الصلاحية'
    ];
  }

  return context;
};

export const useStatisticalQueryClassifier = () => {
  const [isClassifying, setIsClassifying] = useState(false);

  const classifyStatisticalQuery = (query: string): StatisticalQueryClassification => {
    setIsClassifying(true);
    
    try {
      const normalizedQuery = query.toLowerCase().trim();
      console.log('🔍 Statistical Query Classifier - Processing query:', { original: query, normalized: normalizedQuery });
      
      // Check for statistical patterns
      let bestMatch: StatisticalPattern | null = null;
      let highestScore = 0;
      
      for (const pattern of STATISTICAL_PATTERNS) {
        if (pattern.pattern.test(normalizedQuery)) {
          // Calculate confidence score based on keyword matches
          const keywordMatches = pattern.keywords.filter(keyword => 
            normalizedQuery.includes(keyword)
          ).length;
          const score = keywordMatches / pattern.keywords.length;
          
          console.log('✅ Pattern matched:', {
            pattern: pattern.pattern.toString(),
            category: pattern.category,
            keywords: pattern.keywords,
            keywordMatches,
            score
          });
          
          if (score > highestScore) {
            highestScore = score;
            bestMatch = pattern;
          }
        }
      }
      
      if (!bestMatch) {
        // Check for general statistical indicators
        const hasStatisticalKeywords = /كم|عدد|احصائ|تقرير|مجموع|إجمالي|اتفاقية|اتفاقيات/.test(normalizedQuery);
        
        return {
          isStatisticalQuery: hasStatisticalKeywords,
          queryCategory: hasStatisticalKeywords ? 'general' : null,
          statisticalType: hasStatisticalKeywords ? 'count' : null,
          confidence: hasStatisticalKeywords ? 0.6 : 0.1,
          suggestedVisualization: hasStatisticalKeywords ? 'card' : null
        };
      }
      
      // Extract timeframe
      let timeframe: StatisticalQueryClassification['timeframe'] = null;
      for (const timePattern of TIME_PATTERNS) {
        if (timePattern.pattern.test(normalizedQuery)) {
          timeframe = timePattern.timeframe;
          break;
        }
      }
      
      // Extract filters based on query content
      const filters: StatisticalQueryClassification['filters'] = {};
      
      // Status filters for contracts
      if (/ملغي|ملغى|منتهي|منتهى/.test(normalizedQuery)) {
        filters.status = 'cancelled';
      } else if (/نشط|فعال|جاري/.test(normalizedQuery)) {
        filters.status = 'active';
        filters.active = true;
      } else if (/معلق/.test(normalizedQuery)) {
        filters.status = 'suspended';
      } else if (/مكتمل/.test(normalizedQuery)) {
        filters.status = 'completed';
      }

      // Customer-specific filters
      if (bestMatch.category === 'customers') {
        if (bestMatch.type === 'count_active') {
          filters.active = true;
        } else if (bestMatch.type === 'count_inactive') {
          filters.active = false;
        } else if (bestMatch.type === 'count_blacklisted') {
          filters.blacklisted = true;
        }
      }
      
      // Smart context generation
      const smartContext = generateSmartContext(bestMatch, normalizedQuery);
      
      const confidence = Math.min(0.95, 0.7 + (highestScore * 0.25));
      
      const result = {
        isStatisticalQuery: true,
        queryCategory: bestMatch.category,
        statisticalType: bestMatch.type,
        timeframe,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        confidence,
        suggestedVisualization: bestMatch.visualization,
        smartContext
      };
      
      console.log('📊 Statistical Query Classification Result:', result);
      return result;
      
    } finally {
      setIsClassifying(false);
    }
  };

  return {
    classifyStatisticalQuery,
    isClassifying
  };
};