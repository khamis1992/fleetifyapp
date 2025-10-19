import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';

// تعريف أنواع البيانات للتعلم المستمر
interface LearningData {
  id: string;
  query: string;
  response: string;
  userFeedback: {
    rating: number; // 1-5
    helpful: boolean;
    accurate: boolean;
    relevant: boolean;
    comments?: string;
  };
  contextData: {
    intent: string;
    entities: unknown[];
    complexity: number;
    urgency: string;
  };
  performanceMetrics: {
    responseTime: number;
    confidence: number;
    sourcesUsed: string[];
    cacheHit: boolean;
  };
  timestamp: Date;
  userId: string;
  sessionId: string;
}

interface LearningPattern {
  id: string;
  pattern: string;
  frequency: number;
  successRate: number;
  averageRating: number;
  lastSeen: Date;
  category: 'intent' | 'entity' | 'response' | 'error';
  examples: string[];
}

interface ModelPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  userSatisfaction: number;
  responseTime: number;
  cacheHitRate: number;
  errorRate: number;
  improvementTrend: number;
}

interface TrainingBatch {
  id: string;
  data: LearningData[];
  size: number;
  createdAt: Date;
  processedAt?: Date;
  improvements: {
    accuracyGain: number;
    newPatterns: number;
    updatedRules: number;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface AdaptiveRule {
  id: string;
  condition: string;
  action: string;
  confidence: number;
  successCount: number;
  failureCount: number;
  lastUpdated: Date;
  category: string;
  priority: number;
}

interface KnowledgeGraph {
  concepts: Map<string, ConceptNode>;
  relationships: Map<string, RelationshipEdge>;
  lastUpdated: Date;
}

interface ConceptNode {
  id: string;
  name: string;
  type: 'legal_concept' | 'entity' | 'procedure' | 'document';
  frequency: number;
  confidence: number;
  relatedConcepts: string[];
  examples: string[];
  lastUpdated: Date;
}

interface RelationshipEdge {
  id: string;
  source: string;
  target: string;
  type: 'causes' | 'requires' | 'similar_to' | 'part_of' | 'leads_to';
  strength: number;
  evidence: string[];
}

export const useContinuousLearningSystem = () => {
  const { companyId } = useUnifiedCompanyAccess();

  // حالات النظام
  const [isLearning, setIsLearning] = useState(false);
  const [learningStats, setLearningStats] = useState({
    totalInteractions: 0,
    patternsLearned: 0,
    accuracyImprovement: 0,
    lastTrainingDate: null as Date | null
  });

  const [modelPerformance, setModelPerformance] = useState<ModelPerformance>({
    accuracy: 0.85,
    precision: 0.82,
    recall: 0.88,
    f1Score: 0.85,
    userSatisfaction: 0.78,
    responseTime: 2.1,
    cacheHitRate: 0.65,
    errorRate: 0.12,
    improvementTrend: 0.02
  });

  // مراجع البيانات
  const learningDataBuffer = useRef<LearningData[]>([]);
  const learningPatterns = useRef<Map<string, LearningPattern>>(new Map());
  const adaptiveRules = useRef<Map<string, AdaptiveRule>>(new Map());
  const knowledgeGraph = useRef<KnowledgeGraph>({
    concepts: new Map(),
    relationships: new Map(),
    lastUpdated: new Date()
  });

  const trainingQueue = useRef<TrainingBatch[]>([]);
  const performanceHistory = useRef<ModelPerformance[]>([]);

  // تسجيل تفاعل جديد للتعلم
  const recordLearningInteraction = useCallback(async (
    query: string,
    response: string,
    contextData: any,
    performanceMetrics: any,
    userId: string,
    sessionId: string
  ) => {
    const learningData: LearningData = {
      id: `learning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      query,
      response,
      userFeedback: {
        rating: 0, // سيتم تحديثه عند تلقي التقييم
        helpful: false,
        accurate: false,
        relevant: false
      },
      contextData,
      performanceMetrics,
      timestamp: new Date(),
      userId,
      sessionId
    };

    // إضافة للمخزن المؤقت
    learningDataBuffer.current.push(learningData);

    // حفظ في قاعدة البيانات
    try {
      if (!companyId) {
        console.warn('Company ID not available for learning interaction');
        return learningData.id;
      }

      const { error } = await supabase
        .from('learning_interactions')
        .insert({
          id: learningData.id,
          company_id: companyId,
          user_id: userId,
          session_id: sessionId,
          query: learningData.query,
          response: learningData.response,
          intent: learningData.contextData.intent,
          context_data: learningData.contextData,
          response_time_ms: learningData.performanceMetrics.responseTime,
          confidence_score: learningData.performanceMetrics.confidence,
          sources_used: learningData.performanceMetrics.sourcesUsed || [],
          cache_hit: learningData.performanceMetrics.cacheHit || false,
          created_at: learningData.timestamp.toISOString()
        });

      if (error) {
        console.error('Error inserting learning interaction:', error);
      } else {
        console.log('Learning interaction recorded in database:', learningData.id);
      }
    } catch (error) {
      console.error('Error recording learning interaction:', error);
    }

    // تحديث الإحصائيات
    setLearningStats(prev => ({
      ...prev,
      totalInteractions: prev.totalInteractions + 1
    }));

    // تشغيل التعلم التلقائي إذا وصل المخزن المؤقت للحد الأدنى
    if (learningDataBuffer.current.length >= 10) {
      await triggerIncrementalLearning();
    }

    return learningData.id;
  }, []);

  // تحديث تقييم المستخدم
  const updateUserFeedback = useCallback(async (
    interactionId: string,
    feedback: Partial<LearningData['userFeedback']>
  ) => {
    try {
      // تحديث في المخزن المؤقت
      const interaction = learningDataBuffer.current.find(item => item.id === interactionId);
      if (interaction) {
        interaction.userFeedback = { ...interaction.userFeedback, ...feedback };
      }

      // تحديث في قاعدة البيانات
      const { error } = await supabase
        .from('learning_interactions')
        .update({
          rating: feedback.rating,
          helpful: feedback.helpful,
          accurate: feedback.accurate,
          relevant: feedback.relevant,
          feedback_comments: feedback.comments,
          updated_at: new Date().toISOString()
        })
        .eq('id', interactionId);

      if (error) {
        console.error('Error updating feedback in database:', error);
      } else {
        console.log('User feedback updated in database:', interactionId);
      }

      // تشغيل التعلم من التقييم
      await learnFromFeedback(interactionId, feedback);

      console.log('User feedback updated:', interactionId);
    } catch (error) {
      console.error('Error updating user feedback:', error);
    }
  }, []);

  // التعلم التدريجي
  const triggerIncrementalLearning = useCallback(async () => {
    if (isLearning || learningDataBuffer.current.length === 0) return;

    setIsLearning(true);
    const startTime = Date.now();

    try {
      console.log('Starting incremental learning...');

      // 1. تحليل الأنماط الجديدة
      const newPatterns = await analyzeNewPatterns(learningDataBuffer.current);
      
      // 2. تحديث قاعدة المعرفة
      await updateKnowledgeGraph(learningDataBuffer.current);
      
      // 3. تحديث القواعد التكيفية
      await updateAdaptiveRules(learningDataBuffer.current);
      
      // 4. تحسين نماذج التنبؤ
      await improvePerformanceModels(learningDataBuffer.current);
      
      // 5. إنشاء دفعة تدريب جديدة
      const trainingBatch = await createTrainingBatch(learningDataBuffer.current);
      
      // 6. معالجة دفعة التدريب
      await processTrainingBatch(trainingBatch);

      // 7. تقييم التحسينات
      const improvements = await evaluateImprovements();

      // تحديث الإحصائيات
      setLearningStats(prev => ({
        ...prev,
        patternsLearned: prev.patternsLearned + newPatterns.length,
        accuracyImprovement: improvements.accuracyGain,
        lastTrainingDate: new Date()
      }));

      // مسح المخزن المؤقت
      learningDataBuffer.current = [];

      const processingTime = Date.now() - startTime;
      console.log(`Incremental learning completed in ${processingTime}ms`);

    } catch (error) {
      console.error('Error in incremental learning:', error);
    } finally {
      setIsLearning(false);
    }
  }, [isLearning]);

  // تحليل الأنماط الجديدة
  const analyzeNewPatterns = useCallback(async (data: LearningData[]): Promise<LearningPattern[]> => {
    const newPatterns: LearningPattern[] = [];
    const patternCounts = new Map<string, number>();
    const patternExamples = new Map<string, string[]>();
    const patternRatings = new Map<string, number[]>();

    // تحليل أنماط النوايا
    for (const item of data) {
      const intent = item.contextData.intent;
      const key = `intent_${intent}`;
      
      patternCounts.set(key, (patternCounts.get(key) || 0) + 1);
      
      if (!patternExamples.has(key)) {
        patternExamples.set(key, []);
      }
      patternExamples.get(key)!.push(item.query);
      
      if (!patternRatings.has(key)) {
        patternRatings.set(key, []);
      }
      if (item.userFeedback.rating > 0) {
        patternRatings.get(key)!.push(item.userFeedback.rating);
      }
    }

    // تحليل أنماط الكيانات
    for (const item of data) {
      for (const entity of item.contextData.entities) {
        const key = `entity_${entity.type}`;
        
        patternCounts.set(key, (patternCounts.get(key) || 0) + 1);
        
        if (!patternExamples.has(key)) {
          patternExamples.set(key, []);
        }
        patternExamples.get(key)!.push(entity.value);
      }
    }

    // إنشاء أنماط جديدة
    for (const [pattern, frequency] of patternCounts.entries()) {
      if (frequency >= 3) { // الحد الأدنى للتكرار
        const ratings = patternRatings.get(pattern) || [];
        const averageRating = ratings.length > 0 
          ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
          : 0;

        const newPattern: LearningPattern = {
          id: `pattern_${Date.now()}_${pattern}`,
          pattern,
          frequency,
          successRate: averageRating / 5, // تحويل التقييم إلى معدل نجاح
          averageRating,
          lastSeen: new Date(),
          category: pattern.startsWith('intent_') ? 'intent' : 'entity',
          examples: patternExamples.get(pattern)?.slice(0, 5) || []
        };

        newPatterns.push(newPattern);
        learningPatterns.current.set(pattern, newPattern);
      }
    }

    console.log(`Analyzed ${newPatterns.length} new patterns`);
    return newPatterns;
  }, []);

  // تحديث الرسم البياني للمعرفة
  const updateKnowledgeGraph = useCallback(async (data: LearningData[]) => {
    const graph = knowledgeGraph.current;

    for (const item of data) {
      // استخراج المفاهيم من الاستفسار والاستجابة
      const concepts = extractConcepts(item.query + ' ' + item.response);
      
      for (const concept of concepts) {
        const conceptId = concept.toLowerCase().replace(/\s+/g, '_');
        
        if (graph.concepts.has(conceptId)) {
          // تحديث مفهوم موجود
          const existingConcept = graph.concepts.get(conceptId)!;
          existingConcept.frequency++;
          existingConcept.lastUpdated = new Date();
          
          if (item.userFeedback.rating > 0) {
            existingConcept.confidence = (existingConcept.confidence + item.userFeedback.rating / 5) / 2;
          }
        } else {
          // إضافة مفهوم جديد
          const newConcept: ConceptNode = {
            id: conceptId,
            name: concept,
            type: determineConceptType(concept),
            frequency: 1,
            confidence: item.userFeedback.rating > 0 ? item.userFeedback.rating / 5 : 0.5,
            relatedConcepts: [],
            examples: [item.query],
            lastUpdated: new Date()
          };
          
          graph.concepts.set(conceptId, newConcept);
        }
      }

      // تحديث العلاقات بين المفاهيم
      for (let i = 0; i < concepts.length - 1; i++) {
        for (let j = i + 1; j < concepts.length; j++) {
          const sourceId = concepts[i].toLowerCase().replace(/\s+/g, '_');
          const targetId = concepts[j].toLowerCase().replace(/\s+/g, '_');
          const relationshipId = `${sourceId}_${targetId}`;
          
          if (graph.relationships.has(relationshipId)) {
            // تقوية العلاقة الموجودة
            const relationship = graph.relationships.get(relationshipId)!;
            relationship.strength = Math.min(1, relationship.strength + 0.1);
            relationship.evidence.push(item.query);
          } else {
            // إنشاء علاقة جديدة
            const newRelationship: RelationshipEdge = {
              id: relationshipId,
              source: sourceId,
              target: targetId,
              type: 'similar_to', // نوع افتراضي
              strength: 0.3,
              evidence: [item.query]
            };
            
            graph.relationships.set(relationshipId, newRelationship);
          }
        }
      }
    }

    graph.lastUpdated = new Date();
    console.log(`Knowledge graph updated: ${graph.concepts.size} concepts, ${graph.relationships.size} relationships`);
  }, []);

  // تحديث القواعد التكيفية
  const updateAdaptiveRules = useCallback(async (data: LearningData[]) => {
    const rules = adaptiveRules.current;

    for (const item of data) {
      // تحليل نجاح/فشل الاستجابة
      const isSuccessful = item.userFeedback.rating >= 4 || item.userFeedback.helpful;
      
      // إنشاء قواعد جديدة أو تحديث الموجودة
      const ruleConditions = [
        `intent_${item.contextData.intent}`,
        `complexity_${item.contextData.complexity > 0.7 ? 'high' : 'low'}`,
        `urgency_${item.contextData.urgency}`,
        `response_time_${item.performanceMetrics.responseTime > 3000 ? 'slow' : 'fast'}`
      ];

      for (const condition of ruleConditions) {
        const ruleId = `rule_${condition}`;
        
        if (rules.has(ruleId)) {
          const rule = rules.get(ruleId)!;
          
          if (isSuccessful) {
            rule.successCount++;
          } else {
            rule.failureCount++;
          }
          
          rule.confidence = rule.successCount / (rule.successCount + rule.failureCount);
          rule.lastUpdated = new Date();
        } else {
          const newRule: AdaptiveRule = {
            id: ruleId,
            condition,
            action: generateRuleAction(condition, isSuccessful),
            confidence: isSuccessful ? 1 : 0,
            successCount: isSuccessful ? 1 : 0,
            failureCount: isSuccessful ? 0 : 1,
            lastUpdated: new Date(),
            category: condition.split('_')[0],
            priority: calculateRulePriority(condition)
          };
          
          rules.set(ruleId, newRule);
        }
      }
    }

    console.log(`Updated ${rules.size} adaptive rules`);
  }, []);

  // تحسين نماذج الأداء
  const improvePerformanceModels = useCallback(async (data: LearningData[]) => {
    if (data.length === 0) return;

    // حساب مقاييس الأداء الجديدة
    const ratings = data.filter(item => item.userFeedback.rating > 0).map(item => item.userFeedback.rating);
    const responseTimes = data.map(item => item.performanceMetrics.responseTime);
    const cacheHits = data.filter(item => item.performanceMetrics.cacheHit).length;

    const newPerformance: Partial<ModelPerformance> = {};

    if (ratings.length > 0) {
      newPerformance.userSatisfaction = ratings.reduce((sum, rating) => sum + rating, 0) / (ratings.length * 5);
      newPerformance.accuracy = Math.min(0.98, modelPerformance.accuracy + (newPerformance.userSatisfaction - 0.8) * 0.1);
    }

    if (responseTimes.length > 0) {
      newPerformance.responseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length / 1000; // تحويل إلى ثوانٍ
    }

    newPerformance.cacheHitRate = cacheHits / data.length;

    // حساب معدل الأخطاء
    const errors = data.filter(item => item.userFeedback.rating <= 2).length;
    newPerformance.errorRate = errors / data.length;

    // حساب اتجاه التحسن
    const previousPerformance = performanceHistory.current[performanceHistory.current.length - 1] || modelPerformance;
    newPerformance.improvementTrend = (newPerformance.accuracy || modelPerformance.accuracy) - previousPerformance.accuracy;

    // تحديث الأداء
    setModelPerformance(prev => {
      const updated = { ...prev, ...newPerformance };
      performanceHistory.current.push(updated);
      
      // الاحتفاظ بآخر 100 قياس فقط
      if (performanceHistory.current.length > 100) {
        performanceHistory.current = performanceHistory.current.slice(-100);
      }
      
      return updated;
    });

    console.log('Performance models improved:', newPerformance);
  }, [modelPerformance]);

  // إنشاء دفعة تدريب
  const createTrainingBatch = useCallback(async (data: LearningData[]): Promise<TrainingBatch> => {
    const batch: TrainingBatch = {
      id: `batch_${Date.now()}`,
      data: [...data],
      size: data.length,
      createdAt: new Date(),
      improvements: {
        accuracyGain: 0,
        newPatterns: 0,
        updatedRules: 0
      },
      status: 'pending'
    };

    trainingQueue.current.push(batch);
    return batch;
  }, []);

  // معالجة دفعة التدريب
  const processTrainingBatch = useCallback(async (batch: TrainingBatch) => {
    batch.status = 'processing';
    
    try {
      // محاكاة معالجة التدريب
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // حساب التحسينات
      const positiveRatings = batch.data.filter(item => item.userFeedback.rating >= 4).length;
      const accuracyGain = (positiveRatings / batch.size) * 0.01; // تحسن 1% كحد أقصى
      
      batch.improvements = {
        accuracyGain,
        newPatterns: learningPatterns.current.size,
        updatedRules: adaptiveRules.current.size
      };
      
      batch.processedAt = new Date();
      batch.status = 'completed';
      
      console.log(`Training batch ${batch.id} processed successfully`);
    } catch (error) {
      console.error(`Error processing training batch ${batch.id}:`, error);
      batch.status = 'failed';
    }
  }, []);

  // تقييم التحسينات
  const evaluateImprovements = useCallback(async () => {
    const recentBatches = trainingQueue.current.filter(batch => 
      batch.status === 'completed' && 
      Date.now() - batch.createdAt.getTime() < 24 * 60 * 60 * 1000 // آخر 24 ساعة
    );

    const totalAccuracyGain = recentBatches.reduce((sum, batch) => sum + batch.improvements.accuracyGain, 0);
    const totalNewPatterns = recentBatches.reduce((sum, batch) => sum + batch.improvements.newPatterns, 0);
    const totalUpdatedRules = recentBatches.reduce((sum, batch) => sum + batch.improvements.updatedRules, 0);

    return {
      accuracyGain: totalAccuracyGain,
      newPatterns: totalNewPatterns,
      updatedRules: totalUpdatedRules,
      batchesProcessed: recentBatches.length
    };
  }, []);

  // التعلم من التقييم
  const learnFromFeedback = useCallback(async (
    interactionId: string,
    feedback: Partial<LearningData['userFeedback']>
  ) => {
    const interaction = learningDataBuffer.current.find(item => item.id === interactionId);
    if (!interaction) return;

    // تحديث الأنماط بناءً على التقييم
    const intent = interaction.contextData.intent;
    const patternKey = `intent_${intent}`;
    
    if (learningPatterns.current.has(patternKey)) {
      const pattern = learningPatterns.current.get(patternKey)!;
      
      if (feedback.rating) {
        pattern.averageRating = (pattern.averageRating + feedback.rating) / 2;
        pattern.successRate = pattern.averageRating / 5;
      }
      
      pattern.lastSeen = new Date();
    }

    // تحديث القواعد التكيفية
    const isPositiveFeedback = feedback.rating ? feedback.rating >= 4 : feedback.helpful;
    const ruleCondition = `intent_${intent}`;
    
    if (adaptiveRules.current.has(ruleCondition)) {
      const rule = adaptiveRules.current.get(ruleCondition)!;
      
      if (isPositiveFeedback) {
        rule.successCount++;
      } else {
        rule.failureCount++;
      }
      
      rule.confidence = rule.successCount / (rule.successCount + rule.failureCount);
      rule.lastUpdated = new Date();
    }

    console.log(`Learned from feedback for interaction ${interactionId}`);
  }, []);

  // وظائف مساعدة

  const extractConcepts = (text: string): string[] => {
    // استخراج المفاهيم القانونية من النص
    const legalConcepts = [
      'عقد', 'اتفاقية', 'إنذار', 'مطالبة', 'دعوى', 'قضية', 'محكمة',
      'قانون', 'نظام', 'لائحة', 'مادة', 'فقرة', 'بند',
      'التزام', 'حق', 'واجب', 'مسؤولية', 'ضمان',
      'تأجير', 'استئجار', 'مؤجر', 'مستأجر', 'أجرة',
      'مركبة', 'سيارة', 'ليموزين', 'رخصة', 'تأمين'
    ];

    const foundConcepts = [];
    const textLower = text.toLowerCase();

    for (const concept of legalConcepts) {
      if (textLower.includes(concept)) {
        foundConcepts.push(concept);
      }
    }

    return foundConcepts;
  };

  const determineConceptType = (concept: string): ConceptNode['type'] => {
    const documentTypes = ['عقد', 'اتفاقية', 'إنذار', 'مطالبة'];
    const legalConcepts = ['قانون', 'نظام', 'لائحة', 'مادة'];
    const entities = ['مركبة', 'سيارة', 'عميل', 'مؤجر'];
    const procedures = ['دعوى', 'قضية', 'تقاضي', 'استئناف'];

    if (documentTypes.some(type => concept.includes(type))) return 'document';
    if (legalConcepts.some(type => concept.includes(type))) return 'legal_concept';
    if (entities.some(type => concept.includes(type))) return 'entity';
    if (procedures.some(type => concept.includes(type))) return 'procedure';
    
    return 'legal_concept'; // افتراضي
  };

  const generateRuleAction = (condition: string, isSuccessful: boolean): string => {
    const [category, value] = condition.split('_');
    
    if (isSuccessful) {
      switch (category) {
        case 'intent':
          return `تطبيق النهج الحالي للنية ${value}`;
        case 'complexity':
          return `استخدام الاستراتيجية الحالية للتعقيد ${value}`;
        case 'urgency':
          return `الحفاظ على مستوى الاستجابة للإلحاح ${value}`;
        default:
          return 'الحفاظ على النهج الحالي';
      }
    } else {
      switch (category) {
        case 'intent':
          return `تحسين معالجة النية ${value}`;
        case 'complexity':
          return `تطوير استراتيجية أفضل للتعقيد ${value}`;
        case 'urgency':
          return `تحسين الاستجابة للإلحاح ${value}`;
        default:
          return 'مراجعة وتحسين النهج';
      }
    }
  };

  const calculateRulePriority = (condition: string): number => {
    const [category] = condition.split('_');
    
    switch (category) {
      case 'intent': return 10; // أولوية عالية
      case 'urgency': return 8;
      case 'complexity': return 6;
      case 'response_time': return 4;
      default: return 2;
    }
  };

  // تشغيل التعلم المجدول
  const schedulePeriodicLearning = useCallback(() => {
    const interval = setInterval(async () => {
      if (learningDataBuffer.current.length > 0) {
        await triggerIncrementalLearning();
      }
    }, 30 * 60 * 1000); // كل 30 دقيقة

    return () => clearInterval(interval);
  }, [triggerIncrementalLearning]);

  // تصدير البيانات للتحليل
  const exportLearningData = useCallback(async (dateRange?: { start: Date; end: Date }) => {
    try {
      // تم تعطيل استعلام قاعدة البيانات مؤقتاً لحين إنشاء الجدول
      // let query = supabase.from('learning_interactions').select('*');
      
      // if (dateRange) {
      //   query = query
      //     .gte('created_at', dateRange.start.toISOString())
      //     .lte('created_at', dateRange.end.toISOString());
      // }

      // const { data, error } = await query;
      // if (error) throw error;

      // إرجاع البيانات من الذاكرة مؤقتاً
      const filteredData = dateRange 
        ? learningDataBuffer.current.filter(item => 
            item.timestamp >= dateRange.start && item.timestamp <= dateRange.end
          )
        : learningDataBuffer.current;

      return {
        interactions: filteredData,
        patterns: Array.from(learningPatterns.current.values()),
        rules: Array.from(adaptiveRules.current.values()),
        performance: performanceHistory.current,
        knowledgeGraph: {
          concepts: Array.from(knowledgeGraph.current.concepts.values()),
          relationships: Array.from(knowledgeGraph.current.relationships.values())
        }
      };
    } catch (error) {
      console.error('Error exporting learning data:', error);
      throw error;
    }
  }, []);

  // الحصول على توصيات التحسين
  const getImprovementRecommendations = useCallback(() => {
    const recommendations = [];

    // تحليل الأداء
    if (modelPerformance.accuracy < 0.9) {
      recommendations.push({
        type: 'accuracy',
        priority: 'high',
        message: 'دقة النموذج تحتاج تحسين - يُنصح بزيادة بيانات التدريب',
        action: 'increase_training_data'
      });
    }

    if (modelPerformance.responseTime > 3) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: 'زمن الاستجابة بطيء - يُنصح بتحسين التخزين المؤقت',
        action: 'optimize_caching'
      });
    }

    if (modelPerformance.userSatisfaction < 0.8) {
      recommendations.push({
        type: 'satisfaction',
        priority: 'high',
        message: 'رضا المستخدمين منخفض - يُنصح بمراجعة جودة الاستجابات',
        action: 'improve_response_quality'
      });
    }

    // تحليل الأنماط
    const lowPerformancePatterns = Array.from(learningPatterns.current.values())
      .filter(pattern => pattern.successRate < 0.7);

    if (lowPerformancePatterns.length > 0) {
      recommendations.push({
        type: 'patterns',
        priority: 'medium',
        message: `${lowPerformancePatterns.length} أنماط تحتاج تحسين`,
        action: 'retrain_patterns',
        details: lowPerformancePatterns.map(p => p.pattern)
      });
    }

    return recommendations;
  }, [modelPerformance]);

  // تهيئة النظام
  useEffect(() => {
    const cleanup = schedulePeriodicLearning();
    return cleanup;
  }, [schedulePeriodicLearning]);

  return {
    // الوظائف الرئيسية
    recordLearningInteraction,
    updateUserFeedback,
    triggerIncrementalLearning,
    
    // الحالات
    isLearning,
    learningStats,
    modelPerformance,
    
    // البيانات
    learningPatterns: learningPatterns.current,
    adaptiveRules: adaptiveRules.current,
    knowledgeGraph: knowledgeGraph.current,
    trainingQueue: trainingQueue.current,
    
    // وظائف التحليل
    exportLearningData,
    getImprovementRecommendations,
    
    // إحصائيات
    bufferSize: learningDataBuffer.current.length,
    patternsCount: learningPatterns.current.size,
    rulesCount: adaptiveRules.current.size,
    conceptsCount: knowledgeGraph.current.concepts.size
  };
};

