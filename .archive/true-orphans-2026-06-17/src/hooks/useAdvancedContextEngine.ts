import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

// أنواع البيانات لمحرك فهم السياق المتقدم
export interface ContextAnalysis {
  queryType: 'legal_consultation' | 'document_generation' | 'data_inquiry' | 'risk_assessment' | 'contract_analysis' | 'customer_inquiry';
  businessContext: 'rental_operations' | 'customer_management' | 'contract_management' | 'financial_operations' | 'legal_compliance';
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  complexity: 'simple' | 'moderate' | 'complex' | 'expert_required';
  entities: {
    customers?: string[];
    contracts?: string[];
    vehicles?: string[];
    amounts?: number[];
    dates?: string[];
    locations?: string[];
  };
  intent: {
    primary: string;
    secondary?: string[];
    actionRequired: boolean;
    expectedOutput: 'advice' | 'document' | 'analysis' | 'data' | 'recommendation';
  };
  contextualFactors: {
    hasHistoricalData: boolean;
    requiresLegalPrecedent: boolean;
    involvesFinancialRisk: boolean;
    needsImmediateAction: boolean;
    crossJurisdictional: boolean;
  };
  confidence: number;
  processingStrategy: 'direct_response' | 'data_enriched' | 'comprehensive_analysis' | 'expert_consultation';
}

export interface BusinessIntelligence {
  industryContext: {
    sector: 'car_rental' | 'fleet_management' | 'transportation';
    commonIssues: string[];
    regulatoryFramework: string[];
    bestPractices: string[];
  };
  operationalContext: {
    businessModel: string;
    keyStakeholders: string[];
    criticalProcesses: string[];
    riskFactors: string[];
  };
  legalFramework: {
    applicableLaws: string[];
    jurisdiction: string[];
    complianceRequirements: string[];
    commonDisputes: string[];
  };
}

export interface ContextEnrichment {
  relatedData: {
    customerHistory?: unknown[];
    contractDetails?: unknown[];
    financialRecords?: unknown[];
    legalPrecedents?: unknown[];
  };
  similarCases: Array<{
    caseId: string;
    similarity: number;
    outcome: string;
    lessons: string[];
  }>;
  riskIndicators: Array<{
    type: string;
    level: 'low' | 'medium' | 'high';
    description: string;
    mitigation: string;
  }>;
  recommendations: Array<{
    action: string;
    priority: number;
    rationale: string;
    expectedOutcome: string;
  }>;
}

export const useAdvancedContextEngine = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisCache, setAnalysisCache] = useState<Map<string, ContextAnalysis>>(new Map());

  // قاعدة المعرفة لفهم السياق
  const businessIntelligence: BusinessIntelligence = useMemo(() => ({
    industryContext: {
      sector: 'car_rental',
      commonIssues: [
        'تأخير المدفوعات',
        'أضرار المركبات',
        'انتهاك شروط العقد',
        'نزاعات التأمين',
        'مشاكل الترخيص',
        'قضايا المرور'
      ],
      regulatoryFramework: [
        'قانون المرور',
        'أنظمة تأجير المركبات',
        'قوانين حماية المستهلك',
        'أنظمة التأمين',
        'القوانين التجارية'
      ],
      bestPractices: [
        'توثيق شامل للعقود',
        'فحص دوري للمركبات',
        'متابعة المدفوعات',
        'تأمين شامل',
        'تدريب السائقين'
      ]
    },
    operationalContext: {
      businessModel: 'تأجير السيارات قصير وطويل المدى',
      keyStakeholders: ['العملاء', 'الموردون', 'شركات التأمين', 'الجهات الحكومية'],
      criticalProcesses: ['إدارة العقود', 'إدارة الأسطول', 'المحاسبة', 'خدمة العملاء'],
      riskFactors: ['مخاطر ائتمانية', 'مخاطر تشغيلية', 'مخاطر قانونية', 'مخاطر السوق']
    },
    legalFramework: {
      applicableLaws: ['القانون التجاري', 'قانون المرور', 'قانون العمل', 'قانون حماية المستهلك'],
      jurisdiction: ['الكويت', 'السعودية', 'قطر'],
      complianceRequirements: ['تراخيص التشغيل', 'التأمين الإلزامي', 'الفحص الدوري', 'السجلات المحاسبية'],
      commonDisputes: ['نزاعات الدفع', 'أضرار المركبات', 'انتهاك العقود', 'قضايا التأمين']
    }
  }), []);

  // تحليل نوع الاستفسار
  const analyzeQueryType = useCallback((query: string): ContextAnalysis['queryType'] => {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('إنذار') || lowerQuery.includes('مطالبة') || lowerQuery.includes('عقد')) {
      return 'document_generation';
    }
    if (lowerQuery.includes('مخاطر') || lowerQuery.includes('تقييم') || lowerQuery.includes('تحليل')) {
      return 'risk_assessment';
    }
    if (lowerQuery.includes('عميل') || lowerQuery.includes('زبون') || lowerQuery.includes('معلومات')) {
      return 'customer_inquiry';
    }
    if (lowerQuery.includes('عقد') && (lowerQuery.includes('مراجعة') || lowerQuery.includes('فحص'))) {
      return 'contract_analysis';
    }
    if (lowerQuery.includes('بيانات') || lowerQuery.includes('إحصائيات') || lowerQuery.includes('تقرير')) {
      return 'data_inquiry';
    }
    
    return 'legal_consultation';
  }, []);

  // تحليل السياق التجاري
  const analyzeBusinessContext = useCallback((query: string): ContextAnalysis['businessContext'] => {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('عميل') || lowerQuery.includes('زبون')) {
      return 'customer_management';
    }
    if (lowerQuery.includes('عقد') || lowerQuery.includes('اتفاقية')) {
      return 'contract_management';
    }
    if (lowerQuery.includes('مبلغ') || lowerQuery.includes('دفع') || lowerQuery.includes('فاتورة')) {
      return 'financial_operations';
    }
    if (lowerQuery.includes('قانون') || lowerQuery.includes('نظام') || lowerQuery.includes('امتثال')) {
      return 'legal_compliance';
    }
    
    return 'rental_operations';
  }, []);

  // تحليل مستوى الإلحاح
  const analyzeUrgency = useCallback((query: string): ContextAnalysis['urgencyLevel'] => {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('عاجل') || lowerQuery.includes('فوري') || lowerQuery.includes('طارئ')) {
      return 'critical';
    }
    if (lowerQuery.includes('سريع') || lowerQuery.includes('مهم') || lowerQuery.includes('ضروري')) {
      return 'high';
    }
    if (lowerQuery.includes('قريب') || lowerQuery.includes('محدد')) {
      return 'medium';
    }
    
    return 'low';
  }, []);

  // استخراج الكيانات من النص
  const extractEntities = useCallback((query: string): ContextAnalysis['entities'] => {
    const entities: ContextAnalysis['entities'] = {};
    
    // استخراج أسماء العملاء (أنماط شائعة)
    const customerPatterns = [
      /عميل\s+(\w+)/gi,
      /زبون\s+(\w+)/gi,
      /السيد\s+(\w+)/gi,
      /الأستاذ\s+(\w+)/gi,
      /شركة\s+(\w+)/gi
    ];
    
    const customers: string[] = [];
    customerPatterns.forEach(pattern => {
      const matches = query.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const name = match.split(' ')[1];
          if (name && !customers.includes(name)) {
            customers.push(name);
          }
        });
      }
    });
    
    if (customers.length > 0) {
      entities.customers = customers;
    }
    
    // استخراج أرقام العقود
    const contractMatches = query.match(/عقد\s*رقم\s*(\d+)|رقم\s*العقد\s*(\d+)/gi);
    if (contractMatches) {
      entities.contracts = contractMatches.map(match => 
        match.replace(/[^\d]/g, '')
      ).filter(Boolean);
    }
    
    // استخراج المبالغ المالية
    const amountMatches = query.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:ريال|دينار|درهم|جنيه)/gi);
    if (amountMatches) {
      entities.amounts = amountMatches.map(match => 
        parseFloat(match.replace(/[^\d.]/g, ''))
      );
    }
    
    // استخراج التواريخ
    const dateMatches = query.match(/\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/g);
    if (dateMatches) {
      entities.dates = dateMatches;
    }
    
    return entities;
  }, []);

  // تحليل النية والهدف
  const analyzeIntent = useCallback((query: string, queryType: ContextAnalysis['queryType']): ContextAnalysis['intent'] => {
    const lowerQuery = query.toLowerCase();
    
    let primary = 'استفسار عام';
    let expectedOutput: ContextAnalysis['intent']['expectedOutput'] = 'advice';
    let actionRequired = false;
    const secondary: string[] = [];
    
    switch (queryType) {
      case 'document_generation':
        if (lowerQuery.includes('إنذار')) {
          primary = 'إنشاء إنذار قانوني';
          expectedOutput = 'document';
          actionRequired = true;
        } else if (lowerQuery.includes('مطالبة')) {
          primary = 'إنشاء مطالبة قانونية';
          expectedOutput = 'document';
          actionRequired = true;
        } else if (lowerQuery.includes('عقد')) {
          primary = 'إنشاء أو تعديل عقد';
          expectedOutput = 'document';
          actionRequired = true;
        }
        break;
        
      case 'risk_assessment':
        primary = 'تقييم المخاطر القانونية';
        expectedOutput = 'analysis';
        secondary.push('تحديد نقاط الضعف', 'اقتراح حلول');
        break;
        
      case 'customer_inquiry':
        primary = 'استعلام عن بيانات العميل';
        expectedOutput = 'data';
        secondary.push('تحليل التاريخ', 'تقييم الوضع');
        break;
        
      case 'contract_analysis':
        primary = 'تحليل العقد القانوني';
        expectedOutput = 'analysis';
        secondary.push('مراجعة الشروط', 'تحديد المخاطر');
        break;
        
      case 'data_inquiry':
        primary = 'استعلام عن البيانات';
        expectedOutput = 'data';
        break;
        
      default:
        primary = 'استشارة قانونية';
        expectedOutput = 'advice';
    }
    
    return {
      primary,
      secondary: secondary.length > 0 ? secondary : undefined,
      actionRequired,
      expectedOutput
    };
  }, []);

  // تحليل العوامل السياقية
  const analyzeContextualFactors = useCallback((
    query: string, 
    entities: ContextAnalysis['entities']
  ): ContextAnalysis['contextualFactors'] => {
    const lowerQuery = query.toLowerCase();
    
    return {
      hasHistoricalData: !!(entities.customers?.length || entities.contracts?.length),
      requiresLegalPrecedent: lowerQuery.includes('قانون') || lowerQuery.includes('نظام') || lowerQuery.includes('حكم'),
      involvesFinancialRisk: !!(entities.amounts?.length || lowerQuery.includes('مبلغ') || lowerQuery.includes('دين')),
      needsImmediateAction: lowerQuery.includes('عاجل') || lowerQuery.includes('فوري') || lowerQuery.includes('إنذار'),
      crossJurisdictional: lowerQuery.includes('كويت') && (lowerQuery.includes('سعودية') || lowerQuery.includes('قطر'))
    };
  }, []);

  // حساب مستوى الثقة
  const calculateConfidence = useCallback((analysis: Partial<ContextAnalysis>): number => {
    let confidence = 0.5; // قاعدة أساسية
    
    // زيادة الثقة بناءً على وضوح النوع
    if (analysis.queryType) confidence += 0.2;
    
    // زيادة الثقة بناءً على وجود كيانات
    if (analysis.entities?.customers?.length) confidence += 0.1;
    if (analysis.entities?.contracts?.length) confidence += 0.1;
    if (analysis.entities?.amounts?.length) confidence += 0.1;
    
    // زيادة الثقة بناءً على وضوح النية
    if (analysis.intent?.actionRequired) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }, []);

  // تحديد استراتيجية المعالجة
  const determineProcessingStrategy = useCallback((
    analysis: ContextAnalysis
  ): ContextAnalysis['processingStrategy'] => {
    if (analysis.complexity === 'expert_required') {
      return 'expert_consultation';
    }
    
    if (analysis.contextualFactors.hasHistoricalData || analysis.entities.customers?.length) {
      return 'data_enriched';
    }
    
    if (analysis.complexity === 'complex' || analysis.urgencyLevel === 'critical') {
      return 'comprehensive_analysis';
    }
    
    return 'direct_response';
  }, []);

  // التحليل الرئيسي للسياق
  const analyzeContext = useCallback(async (
    query: string,
    companyId?: string
  ): Promise<ContextAnalysis> => {
    setIsAnalyzing(true);
    
    try {
      // فحص الكاش أولاً
      const cacheKey = `${query}_${companyId || 'default'}`;
      const cached = analysisCache.get(cacheKey);
      if (cached) {
        return cached;
      }
      
      // تحليل مكونات الاستفسار
      const queryType = analyzeQueryType(query);
      const businessContext = analyzeBusinessContext(query);
      const urgencyLevel = analyzeUrgency(query);
      const entities = extractEntities(query);
      const intent = analyzeIntent(query, queryType);
      const contextualFactors = analyzeContextualFactors(query, entities);
      
      // تحديد مستوى التعقيد
      let complexity: ContextAnalysis['complexity'] = 'simple';
      if (entities.customers?.length && entities.contracts?.length) {
        complexity = 'complex';
      } else if (contextualFactors.requiresLegalPrecedent || contextualFactors.crossJurisdictional) {
        complexity = 'moderate';
      }
      
      // بناء التحليل النهائي
      const analysis: ContextAnalysis = {
        queryType,
        businessContext,
        urgencyLevel,
        complexity,
        entities,
        intent,
        contextualFactors,
        confidence: 0,
        processingStrategy: 'direct_response'
      };
      
      // حساب الثقة وتحديد الاستراتيجية
      analysis.confidence = calculateConfidence(analysis);
      analysis.processingStrategy = determineProcessingStrategy(analysis);
      
      // حفظ في الكاش
      setAnalysisCache(prev => new Map(prev.set(cacheKey, analysis)));
      
      return analysis;
      
    } finally {
      setIsAnalyzing(false);
    }
  }, [
    analyzeQueryType,
    analyzeBusinessContext,
    analyzeUrgency,
    extractEntities,
    analyzeIntent,
    analyzeContextualFactors,
    calculateConfidence,
    determineProcessingStrategy,
    analysisCache
  ]);

  // إثراء السياق بالبيانات ذات الصلة
  const enrichContext = useCallback(async (
    analysis: ContextAnalysis,
    companyId: string
  ): Promise<ContextEnrichment> => {
    const enrichment: ContextEnrichment = {
      relatedData: {},
      similarCases: [],
      riskIndicators: [],
      recommendations: []
    };

    try {
      // جلب بيانات العملاء ذات الصلة
      if (analysis.entities.customers?.length) {
        const { data: customers } = await supabase
          .from('customers')
          .select('*')
          .eq('company_id', companyId)
          .or(
            analysis.entities.customers
              .map(name => `first_name.ilike.%${name}%,last_name.ilike.%${name}%,company_name.ilike.%${name}%`)
              .join(',')
          );
        
        enrichment.relatedData.customerHistory = customers || [];
      }

      // جلب بيانات العقود ذات الصلة
      if (analysis.entities.contracts?.length) {
        const { data: contracts } = await supabase
          .from('contracts')
          .select('*, customers(*)')
          .eq('company_id', companyId)
          .in('contract_number', analysis.entities.contracts);
        
        enrichment.relatedData.contractDetails = contracts || [];
      }

      // تحليل المخاطر
      if (analysis.contextualFactors.involvesFinancialRisk) {
        enrichment.riskIndicators.push({
          type: 'مخاطر مالية',
          level: analysis.urgencyLevel === 'critical' ? 'high' : 'medium',
          description: 'يتضمن الاستفسار مخاطر مالية محتملة',
          mitigation: 'مراجعة السجلات المالية وتقييم القدرة على السداد'
        });
      }

      // توليد التوصيات
      switch (analysis.processingStrategy) {
        case 'data_enriched':
          enrichment.recommendations.push({
            action: 'مراجعة البيانات التاريخية',
            priority: 1,
            rationale: 'وجود بيانات تاريخية ذات صلة',
            expectedOutcome: 'فهم أعمق للوضع الحالي'
          });
          break;
          
        case 'comprehensive_analysis':
          enrichment.recommendations.push({
            action: 'إجراء تحليل شامل',
            priority: 1,
            rationale: 'تعقيد الحالة يتطلب تحليل متعمق',
            expectedOutcome: 'حل شامل ومدروس'
          });
          break;
      }

    } catch (error) {
      console.error('خطأ في إثراء السياق:', error);
    }

    return enrichment;
  }, []);

  return {
    analyzeContext,
    enrichContext,
    businessIntelligence,
    isAnalyzing,
    analysisCache: Array.from(analysisCache.entries())
  };
};

