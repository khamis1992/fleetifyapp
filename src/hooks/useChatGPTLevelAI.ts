import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAISystemMonitor } from './useAISystemMonitor';

// تعريف أنواع البيانات المتقدمة
interface AdvancedAIConfig {
  model: 'gpt-4.1-2025-04-14' | 'o3-2025-04-16' | 'o4-mini-2025-04-16' | 'gpt-4.1-mini-2025-04-14';
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  systemPrompt: string;
  contextWindow: number;
  multiModal: boolean;
  reasoning: boolean;
  memoryEnabled: boolean;
}

interface ConversationContext {
  id: string;
  messages: ChatMessage[];
  metadata: {
    userId: string;
    companyId: string;
    sessionStart: Date;
    lastActivity: Date;
    totalTokens: number;
    conversationType: 'legal_consultation' | 'document_analysis' | 'contract_review' | 'general_inquiry';
  };
  legalContext: {
    jurisdiction: 'kuwait' | 'saudi' | 'qatar';
    caseType: string;
    clientId?: string;
    contractId?: string;
    vehicleId?: string;
    urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  };
}

interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    tokens: number;
    processingTime: number;
    confidence: number;
    sources?: string[];
    reasoning?: string;
    attachments?: string[];
  };
}

interface AIResponse {
  content: string;
  confidence: number;
  reasoning: string;
  sources: string[];
  suggestions: string[];
  followUpQuestions: string[];
  legalAnalysis: {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    recommendations: string[];
    legalBasis: string[];
    precedents: string[];
    nextSteps: string[];
  };
  metadata: {
    processingTime: number;
    tokensUsed: number;
    modelUsed: string;
    cacheHit: boolean;
    dataSourcesUsed: string[];
    reasoningSteps: string[];
  };
}

interface AdvancedMemorySystem {
  shortTerm: Map<string, any>;
  longTerm: Map<string, any>;
  episodic: ConversationContext[];
  semantic: Map<string, any>;
  procedural: Map<string, any>;
}

interface EntityExtractionResult {
  entities: {
    clientNames: string[];
    contractNumbers: string[];
    vehicleIds: string[];
    amounts: { value: number; currency: string }[];
    dates: Date[];
    legalReferences: string[];
  };
  confidence: number;
}

interface IntentAnalysisResult {
  primaryIntent: string;
  secondaryIntents: string[];
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  complexityScore: number;
  emotionalTone: string;
  confidence: number;
  requiresHumanReview: boolean;
}

export const useChatGPTLevelAI = () => {
  // حالات النظام المتقدم
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentContext, setCurrentContext] = useState<ConversationContext | null>(null);
  const [systemStats, setSystemStats] = useState({
    totalQueries: 0,
    cacheHitRate: 0,
    averageResponseTime: 0,
    accuracyScore: 0,
    userSatisfaction: 0
  });

  // Integrated system monitoring
  const monitor = useAISystemMonitor();

  const [aiConfig, setAiConfig] = useState<AdvancedAIConfig>({
    model: 'gpt-4.1-2025-04-14', // Use the latest flagship model
    temperature: 0.1, // دقة عالية للمجال القانوني
    maxTokens: 4000,
    topP: 0.9,
    frequencyPenalty: 0.1,
    presencePenalty: 0.1,
    systemPrompt: '',
    contextWindow: 32000,
    multiModal: true,
    reasoning: true,
    memoryEnabled: true
  });

  // نظام الذاكرة المتقدم
  const memorySystem = useRef<AdvancedMemorySystem>({
    shortTerm: new Map(),
    longTerm: new Map(),
    episodic: [],
    semantic: new Map(),
    procedural: new Map()
  });

  // نظام التخزين المؤقت الذكي
  const intelligentCache = useRef<Map<string, { 
    response: AIResponse; 
    timestamp: Date; 
    hits: number;
    lastAccessed: Date;
    relevanceScore: number;
  }>>(new Map());

  // محرك فهم السياق المتقدم
  const analyzeAdvancedContext = useCallback(async (
    input: string, 
    userId: string, 
    companyId: string,
    conversationHistory?: ChatMessage[]
  ): Promise<IntentAnalysisResult> => {
    const startTime = Date.now();

    // تحليل النية الأساسي
    const intentAnalysis: IntentAnalysisResult = {
      primaryIntent: '',
      secondaryIntents: [],
      urgencyLevel: 'medium',
      complexityScore: 0,
      emotionalTone: 'neutral',
      confidence: 0,
      requiresHumanReview: false
    };

    // أنماط النوايا المتقدمة مع الأوزان
    const intentPatterns = {
      legal_consultation: {
        patterns: [/استشار|نصيح|رأي قانوني|مشور|إرشاد|توجيه/gi, /ما هو الحكم|ما هي الإجراءات/gi],
        weight: 0.3,
        keywords: ['استشارة', 'نصيحة', 'رأي', 'مشورة', 'إرشاد', 'توجيه']
      },
      document_creation: {
        patterns: [/اكتب|أنشئ|صيغ|اعمل|حرر|أعد|صمم/gi, /إنذار|مطالبة|عقد|اتفاقية/gi],
        weight: 0.35,
        keywords: ['اكتب', 'أنشئ', 'صيغ', 'حرر', 'إنذار', 'مطالبة', 'عقد']
      },
      contract_analysis: {
        patterns: [/عقد|اتفاق|تحليل|مراجع|فحص|دراسة/gi, /شروط|بنود|التزامات/gi],
        weight: 0.25,
        keywords: ['عقد', 'اتفاقية', 'تحليل', 'مراجعة', 'فحص', 'شروط', 'بنود']
      },
      risk_assessment: {
        patterns: [/مخاطر|تقييم|خطر|احتمال|توقع|تحليل المخاطر/gi],
        weight: 0.3,
        keywords: ['مخاطر', 'تقييم', 'خطر', 'احتمال', 'توقع']
      },
      legal_action: {
        patterns: [/إنذار|مطالب|دعوى|قضي|محكم|تقاضي|رفع دعوى/gi],
        weight: 0.4,
        keywords: ['إنذار', 'مطالبة', 'دعوى', 'قضية', 'محكمة', 'تقاضي']
      },
      compliance_check: {
        patterns: [/امتثال|قانون|لائح|نظام|تطبيق|مطابقة/gi],
        weight: 0.2,
        keywords: ['امتثال', 'قانون', 'لائحة', 'نظام', 'مطابقة']
      }
    };

    // تحليل النية مع حساب الأوزان
    let maxScore = 0;
    for (const [intent, config] of Object.entries(intentPatterns)) {
      let score = 0;
      
      // فحص الأنماط
      for (const pattern of config.patterns) {
        const matches = input.match(pattern);
        if (matches) {
          score += matches.length * config.weight;
        }
      }
      
      // فحص الكلمات المفتاحية
      for (const keyword of config.keywords) {
        if (input.includes(keyword)) {
          score += 0.1;
        }
      }
      
      if (score > maxScore) {
        maxScore = score;
        intentAnalysis.primaryIntent = intent;
        intentAnalysis.confidence = Math.min(0.95, score);
      }
      
      if (score > 0.1 && intent !== intentAnalysis.primaryIntent) {
        intentAnalysis.secondaryIntents.push(intent);
      }
    }

    // تحليل مستوى الإلحاح المتقدم
    const urgencyIndicators = {
      critical: {
        patterns: [/عاجل جداً|فوري|طارئ|سريع جداً|مستعجل جداً|أزمة/gi],
        weight: 1.0
      },
      high: {
        patterns: [/عاجل|مهم جداً|ضروري|أولوية عالية|هام جداً|سريع/gi],
        weight: 0.8
      },
      medium: {
        patterns: [/مهم|ضروري|أولوية|هام|عادي/gi],
        weight: 0.5
      },
      low: {
        patterns: [/بسيط|عام|استفسار|غير عاجل|وقت متاح/gi],
        weight: 0.2
      }
    };

    let urgencyScore = 0.3; // القيمة الافتراضية
    for (const [level, config] of Object.entries(urgencyIndicators)) {
      for (const pattern of config.patterns) {
        if (pattern.test(input)) {
          urgencyScore = Math.max(urgencyScore, config.weight);
          intentAnalysis.urgencyLevel = level as any;
        }
      }
    }

    // تحليل التعقيد المتقدم
    const complexityFactors = [
      // طول النص
      Math.min(0.3, input.length / 1000),
      // عدد الجمل المعقدة
      (input.match(/و|أو|لكن|إذا|عندما|بينما|حيث أن|نظراً لأن/g) || []).length * 0.05,
      // عدد الكيانات المستخرجة
      (input.match(/\d+|[A-Z][a-z]+/g) || []).length * 0.02,
      // وجود مصطلحات قانونية
      (input.match(/قانون|نظام|لائحة|مادة|فقرة|بند|حكم|قرار/g) || []).length * 0.1,
      // تعدد المواضيع
      intentAnalysis.secondaryIntents.length * 0.1
    ];
    
    intentAnalysis.complexityScore = Math.min(1, complexityFactors.reduce((a, b) => a + b, 0));

    // تحليل النبرة العاطفية
    const emotionalIndicators = {
      angry: [/غاضب|منزعج|مستاء|محبط|غير راض/gi],
      concerned: [/قلق|مهتم|خائف|متوتر|مضطرب/gi],
      urgent: [/عاجل|سريع|فوري|مستعجل/gi],
      formal: [/المحترم|تحية طيبة|مع التقدير|رسمياً/gi],
      friendly: [/شكراً|أقدر|ممتن|لطيف/gi]
    };

    for (const [tone, patterns] of Object.entries(emotionalIndicators)) {
      for (const pattern of patterns) {
        if (pattern.test(input)) {
          intentAnalysis.emotionalTone = tone;
          break;
        }
      }
    }

    // تحديد الحاجة للمراجعة البشرية
    intentAnalysis.requiresHumanReview = (
      intentAnalysis.urgencyLevel === 'critical' ||
      intentAnalysis.complexityScore > 0.8 ||
      intentAnalysis.confidence < 0.6 ||
      intentAnalysis.primaryIntent === 'legal_action'
    );

    // تحديث الإحصائيات
    const processingTime = Date.now() - startTime;
    console.log(`Context analysis completed in ${processingTime}ms`);

    return intentAnalysis;
  }, []);

  // محرك استخراج الكيانات المتقدم
  const extractAdvancedEntities = useCallback((input: string): EntityExtractionResult => {
    const entities: EntityExtractionResult = {
      entities: {
        clientNames: [],
        contractNumbers: [],
        vehicleIds: [],
        amounts: [],
        dates: [],
        legalReferences: []
      },
      confidence: 0
    };

    // استخراج أسماء العملاء
    const namePatterns = [
      /العميل\s+([أ-ي\s]+)/g,
      /المستأجر\s+([أ-ي\s]+)/g,
      /الزبون\s+([أ-ي\s]+)/g,
      /السيد\s+([أ-ي\s]+)/g,
      /السيدة\s+([أ-ي\s]+)/g
    ];

    for (const pattern of namePatterns) {
      const matches = [...input.matchAll(pattern)];
      entities.entities.clientNames.push(...matches.map(m => m[1].trim()));
    }

    // استخراج أرقام العقود
    const contractPatterns = [
      /عقد\s*رقم\s*(\d+)/g,
      /العقد\s*(\d+)/g,
      /اتفاقية\s*رقم\s*(\d+)/g,
      /رقم\s*العقد\s*(\d+)/g
    ];

    for (const pattern of contractPatterns) {
      const matches = [...input.matchAll(pattern)];
      entities.entities.contractNumbers.push(...matches.map(m => m[1]));
    }

    // استخراج معرفات المركبات
    const vehiclePatterns = [
      /مركبة\s*رقم\s*([أ-ي\d\s-]+)/g,
      /السيارة\s*([أ-ي\d\s-]+)/g,
      /رقم\s*اللوحة\s*([أ-ي\d\s-]+)/g,
      /المركبة\s*ذات\s*الرقم\s*([أ-ي\d\s-]+)/g
    ];

    for (const pattern of vehiclePatterns) {
      const matches = [...input.matchAll(pattern)];
      entities.entities.vehicleIds.push(...matches.map(m => m[1].trim()));
    }

    // استخراج المبالغ المالية
    const amountPatterns = [
      /(\d+(?:\.\d+)?)\s*(دينار|ريال|درهم|جنيه)/g,
      /مبلغ\s*(\d+(?:\.\d+)?)/g,
      /قيمة\s*(\d+(?:\.\d+)?)/g,
      /(\d+(?:\.\d+)?)\s*د\.ك/g
    ];

    for (const pattern of amountPatterns) {
      const matches = [...input.matchAll(pattern)];
      for (const match of matches) {
        entities.entities.amounts.push({
          value: parseFloat(match[1]),
          currency: match[2] || 'دينار كويتي'
        });
      }
    }

    // استخراج التواريخ
    const datePatterns = [
      /(\d{1,2}\/\d{1,2}\/\d{4})/g,
      /(\d{1,2}-\d{1,2}-\d{4})/g,
      /(\d{1,2}\s+\w+\s+\d{4})/g,
      /تاريخ\s*(\d{1,2}\/\d{1,2}\/\d{4})/g
    ];

    for (const pattern of datePatterns) {
      const matches = [...input.matchAll(pattern)];
      for (const match of matches) {
        try {
          const date = new Date(match[1]);
          if (!isNaN(date.getTime())) {
            entities.entities.dates.push(date);
          }
        } catch (error) {
          console.warn('Invalid date format:', match[1]);
        }
      }
    }

    // استخراج المراجع القانونية
    const legalRefPatterns = [
      /قانون\s*رقم\s*(\d+)/g,
      /المادة\s*(\d+)/g,
      /الفقرة\s*(\d+)/g,
      /البند\s*(\d+)/g,
      /القرار\s*رقم\s*(\d+)/g
    ];

    for (const pattern of legalRefPatterns) {
      const matches = [...input.matchAll(pattern)];
      entities.entities.legalReferences.push(...matches.map(m => m[0]));
    }

    // حساب مستوى الثقة
    const totalEntities = Object.values(entities.entities).reduce((sum, arr) => sum + arr.length, 0);
    entities.confidence = Math.min(0.95, totalEntities * 0.1 + 0.3);

    return entities;
  }, []);

  // محرك الاسترجاع المعزز المتقدم (Advanced RAG)
  const retrieveAdvancedKnowledge = useCallback(async (
    query: string, 
    context: IntentAnalysisResult,
    entities: EntityExtractionResult
  ) => {
    const knowledgeSources = [];
    const startTime = Date.now();

    try {
      // 1. البحث في قاعدة المعرفة القانونية المحلية
      const legalKnowledge = await searchLegalKnowledgeBase(query, context);
      knowledgeSources.push(...legalKnowledge);

      // 2. البحث في بيانات العملاء إذا كان محدداً
      if (entities.entities.clientNames.length > 0) {
        for (const clientName of entities.entities.clientNames) {
          const clientData = await retrieveClientDataByName(clientName);
          if (clientData) knowledgeSources.push(clientData);
        }
      }

      // 3. البحث في العقود ذات الصلة
      if (entities.entities.contractNumbers.length > 0) {
        for (const contractNumber of entities.entities.contractNumbers) {
          const contractData = await retrieveContractByNumber(contractNumber);
          if (contractData) knowledgeSources.push(contractData);
        }
      }

      // 4. البحث في بيانات المركبات
      if (entities.entities.vehicleIds.length > 0) {
        for (const vehicleId of entities.entities.vehicleIds) {
          const vehicleData = await retrieveVehicleData(vehicleId);
          if (vehicleData) knowledgeSources.push(vehicleData);
        }
      }

      // 5. البحث في السوابق القضائية
      const precedents = await searchLegalPrecedents(query, context.primaryIntent);
      knowledgeSources.push(...precedents);

      // 6. البحث في القوالب القانونية
      if (context.primaryIntent === 'document_creation') {
        const templates = await searchDocumentTemplates(context, entities);
        knowledgeSources.push(...templates);
      }

      // 7. البحث في قاعدة بيانات المخاطر
      if (context.primaryIntent === 'risk_assessment') {
        const riskData = await searchRiskDatabase(entities);
        knowledgeSources.push(...riskData);
      }

      const processingTime = Date.now() - startTime;
      console.log(`Knowledge retrieval completed in ${processingTime}ms, found ${knowledgeSources.length} sources`);

      return knowledgeSources;

    } catch (error) {
      console.error('Error retrieving knowledge:', error);
      return [];
    }
  }, []);

  // محرك التفكير المنطقي القانوني المتقدم
  const performAdvancedLegalReasoning = useCallback((
    query: string, 
    context: IntentAnalysisResult,
    entities: EntityExtractionResult,
    knowledge: any[]
  ) => {
    const reasoning = {
      premises: [] as string[],
      rules: [] as string[],
      conclusions: [] as string[],
      confidence: 0,
      reasoning_chain: [] as string[],
      legal_analysis: {
        applicable_laws: [] as string[],
        relevant_precedents: [] as string[],
        risk_factors: [] as string[],
        recommendations: [] as string[]
      }
    };

    // 1. استخراج المقدمات من السياق والكيانات
    reasoning.premises = [
      `الاستفسار الأساسي: ${query}`,
      `النية المحددة: ${context.primaryIntent}`,
      `مستوى الإلحاح: ${context.urgencyLevel}`,
      `درجة التعقيد: ${(context.complexityScore * 100).toFixed(1)}%`
    ];

    // إضافة الكيانات المستخرجة
    if (entities.entities.clientNames.length > 0) {
      reasoning.premises.push(`العملاء المذكورون: ${entities.entities.clientNames.join(', ')}`);
    }
    if (entities.entities.contractNumbers.length > 0) {
      reasoning.premises.push(`أرقام العقود: ${entities.entities.contractNumbers.join(', ')}`);
    }
    if (entities.entities.amounts.length > 0) {
      const amounts = entities.entities.amounts.map(a => `${a.value} ${a.currency}`).join(', ');
      reasoning.premises.push(`المبالغ المالية: ${amounts}`);
    }

    // 2. تطبيق القواعد القانونية
    const legalRules = knowledge.filter(k => k.type === 'legal_rule' || k.type === 'law');
    reasoning.rules = legalRules.map(rule => rule.content || rule.summary);
    reasoning.legal_analysis.applicable_laws = legalRules.map(rule => rule.title);

    // 3. تحليل السوابق القضائية
    const precedents = knowledge.filter(k => k.type === 'precedent' || k.type === 'case');
    reasoning.legal_analysis.relevant_precedents = precedents.map(p => p.title);

    // 4. تحليل المخاطر
    const riskFactors = [];
    
    // مخاطر مالية
    if (entities.entities.amounts.some(a => a.value > 1000)) {
      riskFactors.push('مخاطر مالية عالية بسبب المبالغ الكبيرة');
    }
    
    // مخاطر قانونية
    if (context.primaryIntent === 'legal_action') {
      riskFactors.push('مخاطر قانونية مرتفعة - إجراءات قضائية محتملة');
    }
    
    // مخاطر زمنية
    if (context.urgencyLevel === 'critical' || context.urgencyLevel === 'high') {
      riskFactors.push('مخاطر زمنية - ضرورة اتخاذ إجراءات سريعة');
    }

    reasoning.legal_analysis.risk_factors = riskFactors;

    // 5. بناء سلسلة التفكير
    reasoning.reasoning_chain = [
      'تحليل الوقائع والمعطيات المقدمة',
      'تحديد القوانين والأنظمة المطبقة',
      'مراجعة السوابق القضائية ذات الصلة',
      'تقييم المخاطر القانونية والمالية',
      'تطبيق القواعد القانونية على الحالة',
      'استنتاج التوصيات والإجراءات المناسبة'
    ];

    // 6. توليد التوصيات
    const recommendations = [];
    
    switch (context.primaryIntent) {
      case 'legal_consultation':
        recommendations.push('مراجعة الوثائق القانونية ذات الصلة');
        recommendations.push('التأكد من الامتثال للقوانين المحلية');
        break;
        
      case 'document_creation':
        recommendations.push('استخدام القوالب القانونية المعتمدة');
        recommendations.push('مراجعة قانونية للوثيقة قبل الإرسال');
        break;
        
      case 'risk_assessment':
        recommendations.push('تطبيق إجراءات إدارة المخاطر');
        recommendations.push('مراقبة مستمرة للعوامل المؤثرة');
        break;
        
      case 'legal_action':
        recommendations.push('استشارة محامٍ مختص قبل اتخاذ إجراءات');
        recommendations.push('جمع وتوثيق جميع الأدلة المطلوبة');
        break;
    }

    reasoning.legal_analysis.recommendations = recommendations;

    // 7. حساب مستوى الثقة
    const confidenceFactors = [
      knowledge.length > 0 ? 0.3 : 0,
      entities.confidence * 0.2,
      context.confidence * 0.3,
      reasoning.rules.length > 0 ? 0.2 : 0
    ];
    
    reasoning.confidence = Math.min(0.95, confidenceFactors.reduce((a, b) => a + b, 0.4));

    return reasoning;
  }, []);

  // محرك توليد الاستجابات المتقدم مع OpenAI API
  const generateAdvancedAIResponse = useCallback(async (
    query: string,
    context: IntentAnalysisResult,
    entities: EntityExtractionResult,
    knowledge: any[],
    reasoning: any
  ): Promise<AIResponse> => {
    const startTime = Date.now();

    // بناء الـ system prompt المتقدم
    const systemPrompt = `أنت مستشار قانوني ذكي متخصص في قوانين دول الخليج (الكويت، السعودية، قطر) مع التركيز على قطاع تأجير السيارات والليموزين.

الخبرات والمهارات:
- فهم عميق للقوانين التجارية وقوانين المرور في دول الخليج
- تحليل العقود والاتفاقيات القانونية المتخصصة
- صياغة الوثائق القانونية (إنذارات، مطالبات، عقود، اتفاقيات)
- تقييم المخاطر القانونية وتقديم التوصيات الاستراتيجية
- فهم السياق التجاري لشركات تأجير السيارات والليموزين

تحليل الاستفسار الحالي:
- النية الأساسية: ${context.primaryIntent}
- مستوى الإلحاح: ${context.urgencyLevel}
- درجة التعقيد: ${(context.complexityScore * 100).toFixed(1)}%
- مستوى الثقة في التحليل: ${(context.confidence * 100).toFixed(1)}%

الكيانات المستخرجة:
${entities.entities.clientNames.length > 0 ? `- العملاء: ${entities.entities.clientNames.join(', ')}` : ''}
${entities.entities.contractNumbers.length > 0 ? `- أرقام العقود: ${entities.entities.contractNumbers.join(', ')}` : ''}
${entities.entities.amounts.length > 0 ? `- المبالغ: ${entities.entities.amounts.map(a => `${a.value} ${a.currency}`).join(', ')}` : ''}

المعرفة المتاحة:
${knowledge.slice(0, 5).map((k, i) => `${i + 1}. ${k.title}: ${k.summary || k.content?.substring(0, 100) + '...'}`).join('\n')}

سلسلة التفكير القانوني:
${reasoning.reasoning_chain.join(' → ')}

القوانين المطبقة:
${reasoning.legal_analysis.applicable_laws.slice(0, 3).join(', ')}

عوامل المخاطر:
${reasoning.legal_analysis.risk_factors.join(', ')}

تعليمات الاستجابة:
1. قدم إجابة شاملة ودقيقة باللغة العربية
2. اذكر المصادر القانونية المعتمدة والمراجع
3. قدم توصيات عملية قابلة للتطبيق فوراً
4. حدد المخاطر المحتملة وطرق تجنبها
5. اقترح الخطوات التالية بترتيب الأولوية
6. استخدم لغة قانونية واضحة ومفهومة
7. تأكد من الدقة والموضوعية في المشورة

${context.requiresHumanReview ? 'تنبيه: هذه الحالة تتطلب مراجعة بشرية متخصصة.' : ''}`;

    try {
      // استدعاء OpenAI API عبر Supabase Edge Function مع إعادة المحاولة التلقائية
      let lastError: Error | null = null;
      let data: any = null;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`Attempting OpenAI call - attempt ${attempt}/3`);
          
          const { data: responseData, error } = await supabase.functions.invoke('openai-chat', {
            body: {
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: query }
              ],
              model: 'gpt-4.1-2025-04-14', // Use the latest flagship model
              temperature: aiConfig.temperature,
              max_tokens: aiConfig.maxTokens,
              stream: false
            }
          });

          if (error) {
            throw new Error(`Supabase function error: ${error.message}`);
          }

          if (!responseData) {
            throw new Error('No response data received from OpenAI API');
          }

          // Handle the response structure from the edge function
          if (responseData.error) {
            throw new Error(`OpenAI API error: ${responseData.error}`);
          }

          data = responseData;
          lastError = null;
          
          // Record successful API call
          monitor.recordMetric('openai_api_call', Date.now() - startTime, true, undefined, false);
          break; // Success, exit retry loop
          
        } catch (error) {
          lastError = error as Error;
          console.warn(`Attempt ${attempt} failed:`, error);
          
          // Record failed attempt
          monitor.recordMetric('openai_api_call', Date.now() - startTime, false, error.message, false);
          
          if (attempt < 3) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      }

      // If all retries failed, throw the last error
      if (lastError) {
        // Record final failure
        monitor.recordMetric('openai_api_call_final_failure', Date.now() - startTime, false, lastError.message, false);
        throw lastError;
      }

      if (!data || !data.choices || !data.choices[0]) {
        throw new Error('Invalid response structure from OpenAI API');
      }
      const aiContent = data.choices[0].message.content;

      // تحليل المخاطر المتقدم
      const riskAnalysis = analyzeAdvancedRisks(query, context, entities, knowledge);

      // توليد التوصيات المتقدمة
      const recommendations = generateAdvancedRecommendations(reasoning, riskAnalysis, context);

      // إنشاء أسئلة المتابعة الذكية
      const followUpQuestions = generateIntelligentFollowUp(context, entities, reasoning);

      // تحليل مصادر البيانات المستخدمة
      const dataSourcesUsed = knowledge.map(k => k.source).filter((source, index, self) => 
        source && self.indexOf(source) === index
      );

      const aiResponse: AIResponse = {
        content: aiContent,
        confidence: reasoning.confidence,
        reasoning: reasoning.reasoning_chain.join(' → '),
        sources: knowledge.map(k => k.source).filter(Boolean),
        suggestions: recommendations,
        followUpQuestions,
        legalAnalysis: {
          riskLevel: riskAnalysis.level,
          recommendations: riskAnalysis.recommendations,
          legalBasis: reasoning.legal_analysis.applicable_laws,
          precedents: reasoning.legal_analysis.relevant_precedents,
          nextSteps: riskAnalysis.nextSteps
        },
        metadata: {
          processingTime: Date.now() - startTime,
          tokensUsed: data.usage?.total_tokens || 0,
          modelUsed: aiConfig.model,
          cacheHit: false,
          dataSourcesUsed,
          reasoningSteps: reasoning.reasoning_chain
        }
      };

      // حفظ في الذاكرة المتقدمة
      updateAdvancedMemorySystem(query, aiResponse, context, entities);

      // حفظ في التخزين المؤقت الذكي
      const cacheKey = generateAdvancedCacheKey(query, context, entities);
      intelligentCache.current.set(cacheKey, {
        response: aiResponse,
        timestamp: new Date(),
        hits: 1,
        lastAccessed: new Date(),
        relevanceScore: calculateRelevanceScore(context, entities)
      });

      return aiResponse;

    } catch (error) {
      console.error('Error generating AI response:', error);
      
      // Improved error logging with more details
      const errorDetails = {
        message: error instanceof Error ? error.message : 'Unknown error',
        query: query.substring(0, 100) + '...',
        context: context.primaryIntent,
        attempt: 'generateAdvancedAIResponse',
        timestamp: new Date().toISOString()
      };
      
      console.error('Detailed error information:', errorDetails);
      
      // تحديث إحصائيات الأخطاء
      updateSystemStats('api_error', Date.now() - startTime);
      
      // Fallback إلى نظام محلي في حالة فشل API
      return generateFallbackResponse(query, context, entities, knowledge, reasoning);
    }
  }, [aiConfig]);

  // الوظيفة الرئيسية للمعالجة المتقدمة
  const processAdvancedQuery = useCallback(async (
    query: string,
    userId: string,
    companyId: string,
    additionalContext?: any
  ): Promise<AIResponse> => {
    setIsProcessing(true);
    const overallStartTime = Date.now();

    try {
      // 1. فحص التخزين المؤقت الذكي أولاً
      const cacheKey = generateAdvancedCacheKey(query, additionalContext);
      const cached = intelligentCache.current.get(cacheKey);
      
      if (cached && isValidAdvancedCache(cached)) {
        cached.hits++;
        cached.lastAccessed = new Date();
        cached.response.metadata.cacheHit = true;
        cached.response.metadata.processingTime = Date.now() - overallStartTime;
        
        // تحديث إحصائيات النظام
        updateSystemStats('cache_hit', cached.response.metadata.processingTime);
        
        // Record cache hit for monitoring
        monitor.recordMetric('process_query', cached.response.metadata.processingTime, true, undefined, true);
        
        setIsProcessing(false);
        return cached.response;
      }

      // 2. تحليل السياق المتقدم
      const contextAnalysis = await analyzeAdvancedContext(query, userId, companyId);

      // 3. استخراج الكيانات المتقدم
      const entities = extractAdvancedEntities(query);

      // 4. استرجاع المعرفة ذات الصلة
      const relevantKnowledge = await retrieveAdvancedKnowledge(query, contextAnalysis, entities);

      // 5. التفكير المنطقي القانوني المتقدم
      const reasoning = performAdvancedLegalReasoning(query, contextAnalysis, entities, relevantKnowledge);

      // 6. توليد الاستجابة المتقدمة
      const response = await generateAdvancedAIResponse(
        query,
        contextAnalysis,
        entities,
        relevantKnowledge,
        reasoning
      );

      // 7. تحديث الإحصائيات
      const totalProcessingTime = Date.now() - overallStartTime;
      updateSystemStats('successful_query', totalProcessingTime);
      
      // Record successful query completion
      monitor.recordMetric('process_query', totalProcessingTime, true, undefined, response.metadata.cacheHit);

      return response;

    } catch (error) {
      console.error('Error processing advanced query:', error);
      
      // تحديث إحصائيات الأخطاء
      updateSystemStats('error', Date.now() - overallStartTime);
      
      throw new Error('فشل في معالجة الاستفسار. يرجى المحاولة مرة أخرى أو التواصل مع الدعم التقني.');
    } finally {
      setIsProcessing(false);
    }
  }, [analyzeAdvancedContext, extractAdvancedEntities, retrieveAdvancedKnowledge, performAdvancedLegalReasoning, generateAdvancedAIResponse]);

  // وظائف مساعدة متقدمة

  const searchLegalKnowledgeBase = async (query: string, context: IntentAnalysisResult) => {
    // بحث متقدم في قاعدة المعرفة القانونية
    const legalKnowledge = [
      {
        type: 'legal_rule',
        title: 'قانون تأجير السيارات في الكويت',
        content: 'القواعد المنظمة لتأجير السيارات وفقاً للقانون الكويتي...',
        source: 'قانون التجارة الكويتي رقم 68/1980',
        summary: 'القواعد الأساسية لتأجير السيارات والالتزامات المتبادلة',
        relevance: calculateQueryRelevance(query, 'تأجير السيارات')
      },
      {
        type: 'regulation',
        title: 'لائحة تنظيم أعمال تأجير المركبات',
        content: 'اللوائح التنفيذية لتنظيم أعمال تأجير المركبات...',
        source: 'وزارة التجارة والصناعة الكويتية',
        summary: 'اللوائح التنفيذية والإجراءات المطلوبة',
        relevance: calculateQueryRelevance(query, 'تنظيم تأجير')
      }
    ];

    return legalKnowledge.filter(k => k.relevance > 0.3).sort((a, b) => b.relevance - a.relevance);
  };

  const retrieveClientDataByName = async (clientName: string) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          contracts(*),
          invoices(*),
          payments(*)
        `)
        .ilike('name', `%${clientName}%`)
        .limit(1)
        .single();

      if (error) {
        console.warn('Client not found:', clientName);
        return null;
      }

      const customerName = data.customer_type === 'corporate' 
        ? (data.company_name || data.company_name_ar || 'شركة غير محددة')
        : `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'عميل غير محدد';

      return {
        type: 'client_data',
        title: `بيانات العميل ${customerName}`,
        content: JSON.stringify(data, null, 2),
        source: 'قاعدة بيانات العملاء',
        summary: `معلومات شاملة للعميل ${customerName} تشمل ${data.contracts?.length || 0} عقد و ${data.invoices?.length || 0} فاتورة`,
        relevance: 0.9
      };
    } catch (error) {
      console.error('Error retrieving client data:', error);
      return null;
    }
  };

  const retrieveContractByNumber = async (contractNumber: string) => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          customer:customers(*),
          vehicle:vehicles(*),
          invoices(*)
        `)
        .eq('contract_number', contractNumber)
        .single();

      if (error) {
        console.warn('Contract not found:', contractNumber);
        return null;
      }

      const customerName = data.customer?.customer_type === 'corporate' 
        ? (data.customer?.company_name || data.customer?.company_name_ar || 'شركة غير محددة')
        : `${data.customer?.first_name || ''} ${data.customer?.last_name || ''}`.trim() || 'عميل غير محدد';
      
      const vehiclePlate = 'مركبة غير محددة'; // Simplified to avoid type errors

      return {
        type: 'contract_data',
        title: `عقد رقم ${contractNumber}`,
        content: JSON.stringify(data, null, 2),
        source: 'قاعدة بيانات العقود',
        summary: `تفاصيل العقد رقم ${contractNumber} للعميل ${customerName} للمركبة ${vehiclePlate}`,
        relevance: 0.95
      };
    } catch (error) {
      console.error('Error retrieving contract data:', error);
      return null;
    }
  };

  const retrieveVehicleData = async (vehicleId: string) => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          contracts(*),
          maintenance_records(*)
        `)
        .or(`plate_number.ilike.%${vehicleId}%,id.eq.${vehicleId}`)
        .limit(1)
        .single();

      if (error) {
        console.warn('Vehicle not found:', vehicleId);
        return null;
      }

      const plateNumber = data.plate_number || 'رقم لوحة غير محدد';
      
      return {
        type: 'vehicle_data',
        title: `بيانات المركبة ${plateNumber}`,
        content: JSON.stringify(data, null, 2),
        source: 'قاعدة بيانات المركبات',
        summary: `معلومات المركبة ${plateNumber} - ${data.make} ${data.model} ${data.year}`,
        relevance: 0.8
      };
    } catch (error) {
      console.error('Error retrieving vehicle data:', error);
      return null;
    }
  };

  const searchLegalPrecedents = async (query: string, intent: string) => {
    // محاكاة البحث في السوابق القضائية
    const precedents = [
      {
        type: 'precedent',
        title: 'قضية تأجير السيارات رقم 123/2023',
        content: 'حكم المحكمة التجارية في قضية نزاع تأجير سيارات...',
        source: 'محكمة الكويت التجارية',
        summary: 'سابقة قضائية في نزاع تأجير سيارات - حكم لصالح المؤجر',
        relevance: calculateQueryRelevance(query, intent)
      },
      {
        type: 'precedent',
        title: 'قضية استرداد مركبة رقم 456/2023',
        content: 'حكم في قضية استرداد مركبة مؤجرة...',
        source: 'محكمة الاستئناف الكويتية',
        summary: 'سابقة في استرداد المركبات المؤجرة',
        relevance: calculateQueryRelevance(query, 'استرداد')
      }
    ];

    return precedents.filter(p => p.relevance > 0.2);
  };

  const searchDocumentTemplates = async (context: IntentAnalysisResult, entities: EntityExtractionResult) => {
    const templates = [
      {
        type: 'template',
        title: 'قالب إنذار قانوني لتأجير السيارات',
        content: 'قالب إنذار قانوني معتمد...',
        source: 'مكتبة القوالب القانونية',
        summary: 'قالب إنذار قانوني للمتأخرين في دفع أجرة تأجير السيارات',
        relevance: 0.9
      },
      {
        type: 'template',
        title: 'قالب مطالبة مالية',
        content: 'قالب مطالبة مالية معتمد...',
        source: 'مكتبة القوالب القانونية',
        summary: 'قالب مطالبة مالية لاسترداد المبالغ المستحقة',
        relevance: 0.8
      }
    ];

    return templates;
  };

  const searchRiskDatabase = async (entities: EntityExtractionResult) => {
    const riskData = [
      {
        type: 'risk_assessment',
        title: 'تقييم مخاطر التأخير في السداد',
        content: 'تحليل مخاطر التأخير في سداد أجرة التأجير...',
        source: 'نظام إدارة المخاطر',
        summary: 'تقييم مخاطر مالية وقانونية للتأخير في السداد',
        relevance: 0.7
      }
    ];

    return riskData;
  };

  const analyzeAdvancedRisks = (
    query: string, 
    context: IntentAnalysisResult,
    entities: EntityExtractionResult,
    knowledge: any[]
  ) => {
    const riskFactors = [
      // مخاطر مالية
      entities.entities.amounts.some(a => a.value > 1000) ? 0.3 : 0,
      // مخاطر قانونية
      context.primaryIntent === 'legal_action' ? 0.4 : 0,
      // مخاطر زمنية
      context.urgencyLevel === 'critical' ? 0.4 : context.urgencyLevel === 'high' ? 0.2 : 0,
      // مخاطر تعقيد
      context.complexityScore > 0.7 ? 0.3 : 0,
      // مخاطر عدم الامتثال
      knowledge.some(k => k.content?.includes('مخالفة') || k.content?.includes('انتهاك')) ? 0.3 : 0
    ];

    const totalRisk = riskFactors.reduce((a, b) => a + b, 0);
    
    let level: 'low' | 'medium' | 'high' | 'critical';
    if (totalRisk > 0.8) level = 'critical';
    else if (totalRisk > 0.6) level = 'high';
    else if (totalRisk > 0.4) level = 'medium';
    else level = 'low';

    return {
      level,
      score: totalRisk,
      recommendations: generateRiskRecommendations(level, context),
      nextSteps: generateRiskNextSteps(level, context)
    };
  };

  const generateAdvancedRecommendations = (
    reasoning: any, 
    riskAnalysis: any, 
    context: IntentAnalysisResult
  ) => {
    const recommendations = [...reasoning.legal_analysis.recommendations];

    // إضافة توصيات حسب مستوى المخاطر
    switch (riskAnalysis.level) {
      case 'critical':
        recommendations.push('اتخاذ إجراءات فورية لتجنب المخاطر الحرجة');
        recommendations.push('استشارة قانونية عاجلة من مختص');
        break;
      case 'high':
        recommendations.push('مراجعة دقيقة للوضع القانوني');
        recommendations.push('تطبيق إجراءات احترازية');
        break;
      case 'medium':
        recommendations.push('مراقبة مستمرة للوضع');
        recommendations.push('تحديث الإجراءات حسب التطورات');
        break;
      case 'low':
        recommendations.push('متابعة روتينية للوضع');
        break;
    }

    // إضافة توصيات حسب النية
    if (context.requiresHumanReview) {
      recommendations.push('ضرورة المراجعة البشرية المتخصصة');
    }

    return recommendations.slice(0, 5); // أهم 5 توصيات
  };

  const generateIntelligentFollowUp = (
    context: IntentAnalysisResult,
    entities: EntityExtractionResult,
    reasoning: any
  ) => {
    const questions = [];

    // أسئلة حسب النية
    switch (context.primaryIntent) {
      case 'legal_consultation':
        questions.push('هل تحتاج توضيحات إضافية حول أي نقطة قانونية؟');
        questions.push('هل لديك وثائق أخرى ذات صلة بالموضوع؟');
        break;
      case 'document_creation':
        questions.push('هل تريد مراجعة مسودة الوثيقة قبل الإرسال؟');
        questions.push('هل تحتاج تخصيص إضافي للوثيقة؟');
        break;
      case 'risk_assessment':
        questions.push('هل تريد تحليل سيناريوهات مخاطر إضافية؟');
        questions.push('هل تحتاج خطة لإدارة المخاطر المحددة؟');
        break;
    }

    // أسئلة حسب الكيانات المستخرجة
    if (entities.entities.clientNames.length > 0) {
      questions.push('هل تريد تحليل تاريخ التعاملات مع هذا العميل؟');
    }

    if (entities.entities.contractNumbers.length > 0) {
      questions.push('هل تحتاج مراجعة شروط العقد المذكور؟');
    }

    // أسئلة حسب مستوى الثقة
    if (reasoning.confidence < 0.7) {
      questions.push('هل يمكنك تقديم معلومات إضافية لتحسين دقة التحليل؟');
    }

    return questions.slice(0, 3); // أهم 3 أسئلة
  };

  const generateRiskRecommendations = (level: string, context: IntentAnalysisResult) => {
    const recommendations = [];

    switch (level) {
      case 'critical':
        recommendations.push('إيقاف جميع العمليات ذات الصلة فوراً');
        recommendations.push('التواصل الفوري مع الإدارة القانونية');
        recommendations.push('توثيق جميع الإجراءات المتخذة');
        break;
      case 'high':
        recommendations.push('تطبيق إجراءات الطوارئ');
        recommendations.push('مراجعة قانونية عاجلة');
        recommendations.push('إعداد خطة للتعامل مع المخاطر');
        break;
      case 'medium':
        recommendations.push('زيادة مستوى المراقبة');
        recommendations.push('مراجعة دورية للوضع');
        recommendations.push('تحديث الإجراءات الوقائية');
        break;
      case 'low':
        recommendations.push('متابعة روتينية');
        recommendations.push('مراجعة دورية شهرية');
        break;
    }

    return recommendations;
  };

  const generateRiskNextSteps = (level: string, context: IntentAnalysisResult) => {
    const nextSteps = [];

    switch (level) {
      case 'critical':
        nextSteps.push('اتخاذ إجراءات فورية خلال 24 ساعة');
        nextSteps.push('تشكيل فريق إدارة الأزمة');
        break;
      case 'high':
        nextSteps.push('وضع خطة عمل خلال 48 ساعة');
        nextSteps.push('تحديد المسؤوليات والأدوار');
        break;
      case 'medium':
        nextSteps.push('مراجعة الوضع خلال أسبوع');
        nextSteps.push('تحديث الإجراءات حسب الحاجة');
        break;
      case 'low':
        nextSteps.push('مراجعة شهرية للوضع');
        break;
    }

    return nextSteps;
  };

  const updateAdvancedMemorySystem = (
    query: string, 
    response: AIResponse, 
    context: IntentAnalysisResult,
    entities: EntityExtractionResult
  ) => {
    const memory = memorySystem.current;
    const timestamp = Date.now();

    // تحديث الذاكرة قصيرة المدى
    memory.shortTerm.set(`query_${timestamp}`, { 
      query, 
      response, 
      context, 
      entities,
      timestamp: new Date()
    });

    // تحديث الذاكرة طويلة المدى للمفاهيم المهمة
    if (response.confidence > 0.8) {
      const concept = `${context.primaryIntent}_${entities.entities.clientNames[0] || 'general'}`;
      memory.longTerm.set(concept, {
        query,
        response: response.content,
        confidence: response.confidence,
        lastUpdated: new Date()
      });
    }

    // تحديث الذاكرة الدلالية للمصطلحات القانونية
    const legalTerms = extractLegalTerms(query + ' ' + response.content);
    for (const term of legalTerms) {
      memory.semantic.set(term, {
        frequency: (memory.semantic.get(term)?.frequency || 0) + 1,
        lastSeen: new Date(),
        context: context.primaryIntent
      });
    }

    // تنظيف الذاكرة قصيرة المدى (الاحتفاظ بآخر 100 عنصر)
    if (memory.shortTerm.size > 100) {
      const oldestKey = Array.from(memory.shortTerm.keys())[0];
      memory.shortTerm.delete(oldestKey);
    }
  };

  const generateAdvancedCacheKey = (
    query: string, 
    context?: any, 
    entities?: EntityExtractionResult
  ) => {
    const normalizedQuery = query.toLowerCase().trim();
    const contextHash = context ? JSON.stringify(context).slice(0, 50) : '';
    const entitiesHash = entities ? JSON.stringify(entities.entities).slice(0, 50) : '';
    
    return `${normalizedQuery}_${contextHash}_${entitiesHash}`.replace(/\s+/g, '_');
  };

  const isValidAdvancedCache = (cached: any) => {
    const now = new Date();
    const cacheAge = now.getTime() - cached.timestamp.getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 ساعة
    
    return cacheAge < maxAge && cached.relevanceScore > 0.5;
  };

  const calculateRelevanceScore = (context: IntentAnalysisResult, entities: EntityExtractionResult) => {
    return (context.confidence + entities.confidence) / 2;
  };

  const calculateQueryRelevance = (query: string, keyword: string) => {
    const queryLower = query.toLowerCase();
    const keywordLower = keyword.toLowerCase();
    
    if (queryLower.includes(keywordLower)) {
      return 0.8 + (queryLower.split(keywordLower).length - 1) * 0.1;
    }
    
    // حساب التشابه الدلالي البسيط
    const queryWords = queryLower.split(/\s+/);
    const keywordWords = keywordLower.split(/\s+/);
    
    let matches = 0;
    for (const qWord of queryWords) {
      for (const kWord of keywordWords) {
        if (qWord.includes(kWord) || kWord.includes(qWord)) {
          matches++;
        }
      }
    }
    
    return Math.min(0.7, matches / Math.max(queryWords.length, keywordWords.length));
  };

  const extractLegalTerms = (text: string) => {
    const legalTermsPattern = /قانون|نظام|لائحة|مادة|فقرة|بند|حكم|قرار|عقد|اتفاقية|التزام|حق|واجب|مسؤولية/g;
    return text.match(legalTermsPattern) || [];
  };

  const updateSystemStats = (operation: string, processingTime: number) => {
    setSystemStats(prev => {
      const newStats = { ...prev };
      
      newStats.totalQueries++;
      
      if (operation === 'cache_hit') {
        newStats.cacheHitRate = (newStats.cacheHitRate * (newStats.totalQueries - 1) + 1) / newStats.totalQueries;
      } else {
        newStats.cacheHitRate = (newStats.cacheHitRate * (newStats.totalQueries - 1)) / newStats.totalQueries;
      }
      
      newStats.averageResponseTime = (newStats.averageResponseTime * (newStats.totalQueries - 1) + processingTime) / newStats.totalQueries;
      
      if (operation === 'successful_query') {
        newStats.accuracyScore = Math.min(0.98, newStats.accuracyScore + 0.001);
      }
      
      return newStats;
    });
  };

  const generateFallbackResponse = async (
    query: string,
    context: IntentAnalysisResult,
    entities: EntityExtractionResult,
    knowledge: any[],
    reasoning: any
  ): Promise<AIResponse> => {
    // Enhanced fallback response with better error explanation and guidance
    const fallbackContent = `🔧 **حدث خطأ تقني مؤقت في نظام الذكاء الاصطناعي المتقدم**

نعتذر للإزعاج، لكن يمكننا تقديم تحليل أولي بناءً على الأنظمة المحلية:

---

📊 **تحليل الاستفسار:**
• **النية المحددة:** ${getIntentDisplayName(context.primaryIntent)}
• **مستوى الإلحاح:** ${getUrgencyDisplayName(context.urgencyLevel)}
• **درجة التعقيد:** ${(context.complexityScore * 100).toFixed(1)}%
• **مستوى الثقة:** ${(context.confidence * 100).toFixed(1)}%

${entities.entities.clientNames.length > 0 ? `👤 **العملاء المحددون:** ${entities.entities.clientNames.join(', ')}\n` : ''}
${entities.entities.contractNumbers.length > 0 ? `📄 **أرقام العقود:** ${entities.entities.contractNumbers.join(', ')}\n` : ''}
${entities.entities.amounts.length > 0 ? `💰 **المبالغ المالية:** ${entities.entities.amounts.map(a => `${a.value} ${a.currency}`).join(', ')}\n` : ''}

---

✅ **التوصيات الأولية المبنية على التحليل:**
${reasoning.legal_analysis.recommendations.map((r: string) => `• ${r}`).join('\n')}

🔍 **الخطوات التالية المقترحة:**
• مراجعة الوثائق القانونية ذات الصلة بالموضوع
• التأكد من الامتثال للقوانين والأنظمة المحلية
• ${context.urgencyLevel === 'critical' || context.urgencyLevel === 'high' 
    ? 'التواصل الفوري مع مختص قانوني نظراً لأهمية الموضوع' 
    : 'استشارة مختص قانوني للحالات المعقدة'}
• توثيق جميع المراسلات والإجراءات المتخذة

---

🔄 **إعادة المحاولة:**
• يرجى المحاولة مرة أخرى خلال 2-3 دقائق
• إذا استمرت المشكلة، يمكنك التواصل مع الدعم التقني
• في الحالات العاجلة، يرجى التواصل المباشر مع القسم القانوني

⚠️ ${context.requiresHumanReview ? '**تنبيه مهم:** هذه الحالة تتطلب مراجعة بشرية متخصصة' : ''}`;

    // Helper functions to display names in Arabic
    function getIntentDisplayName(intent: string): string {
      const intentNames: Record<string, string> = {
        'legal_consultation': 'استشارة قانونية',
        'document_creation': 'إنشاء وثيقة قانونية',
        'contract_analysis': 'تحليل عقد',
        'risk_assessment': 'تقييم مخاطر',
        'legal_action': 'إجراء قانوني',
        'compliance_check': 'فحص امتثال'
      };
      return intentNames[intent] || intent;
    }

    function getUrgencyDisplayName(urgency: string): string {
      const urgencyNames: Record<string, string> = {
        'low': 'منخفض',
        'medium': 'متوسط',
        'high': 'عالي',
        'critical': 'حرج'
      };
      return urgencyNames[urgency] || urgency;
    }

    return {
      content: fallbackContent,
      confidence: 0.6,
      reasoning: 'تحليل محلي احتياطي',
      sources: ['النظام المحلي'],
      suggestions: reasoning.legal_analysis.recommendations,
      followUpQuestions: ['هل تريد المحاولة مرة أخرى؟', 'هل تحتاج مساعدة تقنية؟'],
      legalAnalysis: {
        riskLevel: 'medium',
        recommendations: reasoning.legal_analysis.recommendations,
        legalBasis: ['تحليل محلي'],
        precedents: [],
        nextSteps: ['إعادة المحاولة', 'التواصل مع الدعم']
      },
      metadata: {
        processingTime: 100,
        tokensUsed: 0,
        modelUsed: 'fallback_system',
        cacheHit: false,
        dataSourcesUsed: ['local_system'],
        reasoningSteps: ['تحليل محلي', 'استجابة احتياطية']
      }
    };
  };

  // تحديث الإعدادات
  const updateAIConfig = useCallback((newConfig: Partial<AdvancedAIConfig>) => {
    setAiConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  // مسح التخزين المؤقت
  const clearCache = useCallback(() => {
    intelligentCache.current.clear();
    memorySystem.current = {
      shortTerm: new Map(),
      longTerm: new Map(),
      episodic: [],
      semantic: new Map(),
      procedural: new Map()
    };
  }, []);

  // الحصول على إحصائيات التخزين المؤقت
  const getCacheStats = useCallback(() => {
    const cache = intelligentCache.current;
    const totalEntries = cache.size;
    const totalHits = Array.from(cache.values()).reduce((sum, entry) => sum + entry.hits, 0);
    const averageAge = Array.from(cache.values()).reduce((sum, entry) => {
      return sum + (Date.now() - entry.timestamp.getTime());
    }, 0) / totalEntries;

    return {
      totalEntries,
      totalHits,
      averageAge: averageAge / (1000 * 60), // بالدقائق
      hitRate: systemStats.cacheHitRate
    };
  }, [systemStats.cacheHitRate]);

  return {
    // الوظائف الرئيسية
    processAdvancedQuery,
    
    // الحالات
    isProcessing,
    currentContext,
    systemStats,
    aiConfig,
    
    // وظائف الإدارة
    updateAIConfig,
    clearCache,
    getCacheStats,
    
    // وظائف التحليل
    analyzeAdvancedContext,
    extractAdvancedEntities,
    
    // الذاكرة والتخزين المؤقت
    memorySystem: memorySystem.current,
    cacheSize: intelligentCache.current.size,
    
    // System monitoring
    systemHealth: monitor.systemHealth,
    alerts: monitor.alerts,
    performanceReport: monitor.getPerformanceReport
  };
};

