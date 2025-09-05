import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { companyId, evaluationType, timeRange } = await req.json();
    
    console.log('🔍 Self-evaluation started:', { companyId, evaluationType, timeRange });

    // Step 1: Gather performance data
    const performanceData = await gatherPerformanceData(supabaseClient, companyId, timeRange);
    console.log('📊 Performance data gathered:', performanceData);

    // Step 2: Analyze interaction patterns
    const interactionAnalysis = await analyzeInteractionPatterns(supabaseClient, companyId, timeRange);
    console.log('🧩 Interaction analysis complete:', interactionAnalysis);

    // Step 3: Evaluate learning effectiveness
    const learningEffectiveness = await evaluateLearningEffectiveness(supabaseClient, companyId);
    console.log('🎓 Learning effectiveness evaluated:', learningEffectiveness);

    // Step 4: Identify improvement areas using AI
    const improvementAreas = await identifyImprovementAreas(
      performanceData, 
      interactionAnalysis, 
      learningEffectiveness
    );
    console.log('🎯 Improvement areas identified:', improvementAreas);

    // Step 5: Generate adaptive strategies
    const adaptiveStrategies = await generateAdaptiveStrategies(improvementAreas);
    console.log('🚀 Adaptive strategies generated:', adaptiveStrategies);

    // Step 6: Update learning patterns automatically
    await updateLearningPatterns(supabaseClient, companyId, adaptiveStrategies);

    // Step 7: Schedule next evaluation
    await scheduleNextEvaluation(supabaseClient, companyId, evaluationType);

    return new Response(JSON.stringify({
      type: 'evaluation_complete',
      performanceScore: calculateOverallScore(performanceData, learningEffectiveness),
      improvementAreas,
      adaptiveStrategies,
      recommendations: generateRecommendations(improvementAreas),
      nextEvaluationScheduled: true,
      evaluationTimestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Self-evaluation error:', error);
    return new Response(JSON.stringify({ 
      error: 'Self-evaluation failed',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function gatherPerformanceData(supabaseClient: any, companyId: string, timeRange: string) {
  const dateFilter = getDateFilter(timeRange);
  
  // Get metrics
  const { data: metrics } = await supabaseClient
    .from('ai_performance_metrics')
    .select('*')
    .eq('company_id', companyId)
    .gte('metric_date', dateFilter.start)
    .lte('metric_date', dateFilter.end);

  // Get query success rates
  const { data: queries } = await supabaseClient
    .from('ai_query_intents')
    .select('*')
    .eq('company_id', companyId)
    .gte('created_at', dateFilter.start);

  // Get clarification sessions
  const { data: clarifications } = await supabaseClient
    .from('ai_clarification_sessions')
    .select('*')
    .eq('company_id', companyId)
    .gte('created_at', dateFilter.start);

  return {
    metrics: metrics || [],
    totalQueries: queries?.length || 0,
    successfulQueries: queries?.filter(q => q.user_confirmed)?.length || 0,
    clarificationSessions: clarifications?.length || 0,
    completedClarifications: clarifications?.filter(c => c.session_status === 'completed')?.length || 0
  };
}

async function analyzeInteractionPatterns(supabaseClient: any, companyId: string, timeRange: string) {
  const dateFilter = getDateFilter(timeRange);
  
  // Get learning patterns
  const { data: patterns } = await supabaseClient
    .from('ai_learning_patterns')
    .select('*')
    .eq('company_id', companyId)
    .gte('created_at', dateFilter.start);

  // Analyze pattern usage
  const patternTypes = {};
  const successRates = [];
  
  patterns?.forEach(pattern => {
    patternTypes[pattern.pattern_type] = (patternTypes[pattern.pattern_type] || 0) + 1;
    successRates.push(pattern.success_rate);
  });

  return {
    totalPatterns: patterns?.length || 0,
    patternTypes,
    averageSuccessRate: successRates.length ? successRates.reduce((a, b) => a + b, 0) / successRates.length : 0,
    mostUsedPatterns: Object.entries(patternTypes).sort(([,a], [,b]) => b - a).slice(0, 5)
  };
}

async function evaluateLearningEffectiveness(supabaseClient: any, companyId: string) {
  // Get feedback data
  const { data: feedback } = await supabaseClient
    .from('ai_learning_feedback')
    .select('*')
    .eq('company_id', companyId);

  // Get pattern evolution
  const { data: patterns } = await supabaseClient
    .from('ai_learning_patterns')
    .select('success_rate, usage_count, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true });

  const avgRating = feedback?.length ? 
    feedback.reduce((sum, f) => sum + (f.feedback_rating || 0), 0) / feedback.length : 0;

  const learningTrend = patterns?.length > 1 ? 
    patterns[patterns.length - 1].success_rate - patterns[0].success_rate : 0;

  return {
    userSatisfaction: avgRating,
    totalFeedback: feedback?.length || 0,
    learningTrend,
    adaptationRate: patterns?.filter(p => p.usage_count > 1)?.length || 0
  };
}

async function identifyImprovementAreas(performanceData: any, interactionAnalysis: any, learningEffectiveness: any) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `أنت محلل ذكي لأداء الذكاء الاصطناعي. حلل البيانات وحدد مجالات التحسين:

1. نقاط الضعف في الأداء
2. فرص التحسين
3. الأنماط التي تحتاج تطوير
4. اقتراحات للتحسين
5. أولويات التطوير

أرجع النتيجة كـ JSON مع هذا التنسيق:
{
  "weaknesses": ["نقطة ضعف1", "نقطة ضعف2"],
  "opportunities": ["فرصة1", "فرصة2"],
  "priorityAreas": ["مجال1", "مجال2"],
  "recommendedActions": ["إجراء1", "إجراء2"],
  "urgencyLevel": "high|medium|low"
}`
        },
        {
          role: 'user',
          content: `بيانات الأداء: ${JSON.stringify(performanceData)}
تحليل التفاعل: ${JSON.stringify(interactionAnalysis)}
فعالية التعلم: ${JSON.stringify(learningEffectiveness)}

حلل وحدد مجالات التحسين:`
        }
      ],
      temperature: 0.4,
    }),
  });

  const data = await response.json();
  try {
    return JSON.parse(data.choices[0].message.content);
  } catch {
    return {
      weaknesses: ['تحتاج تحليل أعمق'],
      opportunities: ['تحسين دقة الردود'],
      priorityAreas: ['التعلم من الأخطاء'],
      recommendedActions: ['مراجعة الأنماط'],
      urgencyLevel: 'medium'
    };
  }
}

async function generateAdaptiveStrategies(improvementAreas: any) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `أنت استراتيجي ذكي للتحسين المستمر. بناءً على مجالات التحسين، ولد استراتيجيات تكيفية:

1. استراتيجيات قصيرة المدى (1-2 أسبوع)
2. استراتيجيات متوسطة المدى (1-2 شهر)  
3. استراتيجيات طويلة المدى (3+ أشهر)
4. مؤشرات النجاح
5. آليات التنفيذ

أرجع النتيجة كـ JSON.`
        },
        {
          role: 'user',
          content: `مجالات التحسين: ${JSON.stringify(improvementAreas)}\n\nولد الاستراتيجيات التكيفية:`
        }
      ],
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  try {
    return JSON.parse(data.choices[0].message.content);
  } catch {
    return {
      shortTerm: ['تحسين الأسئلة التوضيحية'],
      mediumTerm: ['تطوير أنماط جديدة'], 
      longTerm: ['تحسين النموذج الأساسي']
    };
  }
}

async function updateLearningPatterns(supabaseClient: any, companyId: string, strategies: any) {
  // Update existing patterns based on strategies
  await supabaseClient
    .from('ai_learning_patterns')
    .insert({
      company_id: companyId,
      pattern_type: 'adaptive_strategy',
      pattern_data: {
        strategies,
        auto_generated: true,
        timestamp: new Date().toISOString()
      },
      success_rate: 0.8,
      is_active: true
    });

  console.log('🔄 Learning patterns updated with adaptive strategies');
}

async function scheduleNextEvaluation(supabaseClient: any, companyId: string, evaluationType: string) {
  const nextEvaluation = new Date();
  nextEvaluation.setDate(nextEvaluation.getDate() + 7); // Weekly evaluation

  await supabaseClient
    .from('ai_performance_metrics')
    .insert({
      company_id: companyId,
      metric_date: new Date().toISOString().split('T')[0],
      total_queries: 0,
      next_evaluation_scheduled: nextEvaluation.toISOString()
    });
}

function getDateFilter(timeRange: string) {
  const end = new Date();
  const start = new Date();
  
  switch (timeRange) {
    case 'week':
      start.setDate(end.getDate() - 7);
      break;
    case 'month':
      start.setMonth(end.getMonth() - 1);
      break;
    default:
      start.setDate(end.getDate() - 7);
  }
  
  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}

function calculateOverallScore(performanceData: any, learningEffectiveness: any): number {
  const successRate = performanceData.totalQueries > 0 ? 
    performanceData.successfulQueries / performanceData.totalQueries : 0;
  
  const clarificationRate = performanceData.clarificationSessions > 0 ?
    performanceData.completedClarifications / performanceData.clarificationSessions : 1;
    
  const userSatisfaction = learningEffectiveness.userSatisfaction / 5; // Normalize to 0-1
  
  return Math.round(((successRate + clarificationRate + userSatisfaction) / 3) * 100);
}

function generateRecommendations(improvementAreas: any): string[] {
  return [
    '🎯 ركز على تحسين دقة التصنيف الأولي',
    '📚 طور المزيد من أنماط التعلم للمجالات الضعيفة',
    '💬 حسن جودة أسئلة الاستيضاح',
    '🔄 راجع وحدث الأنماط الموجودة بانتظام',
    '📊 اجمع المزيد من ملاحظات المستخدمين'
  ];
}