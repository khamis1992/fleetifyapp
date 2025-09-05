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

    const { query, context, companyId, userId, sessionId } = await req.json();
    
    console.log('🔍 Intelligent Clarification Processing:', { query, context, sessionId });

    // Step 1: Analyze query complexity and ambiguity
    const queryAnalysis = await analyzeQueryComplexity(query, context);
    console.log('📊 Query analysis:', queryAnalysis);

    // Step 2: Get historical clarification patterns for this company
    const { data: historicalPatterns } = await supabaseClient
      .from('ai_clarification_sessions')
      .select('*')
      .eq('company_id', companyId)
      .eq('session_status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10);

    // Step 3: Get relevant learning patterns
    const { data: learningPatterns } = await supabaseClient
      .from('ai_learning_patterns')
      .select('*')
      .eq('company_id', companyId)
      .eq('pattern_type', 'clarification_resolution')
      .eq('is_active', true)
      .order('success_rate', { ascending: false })
      .limit(5);

    console.log(`📚 Found ${historicalPatterns?.length || 0} historical patterns and ${learningPatterns?.length || 0} learning patterns`);

    // Step 4: Generate intelligent clarification questions
    const clarificationQuestions = await generateIntelligentQuestions(
      query,
      context,
      queryAnalysis,
      historicalPatterns || [],
      learningPatterns || []
    );

    // Step 5: Create clarification session with enhanced metadata
    const { data: clarificationSession } = await supabaseClient
      .from('ai_clarification_sessions')
      .insert({
        company_id: companyId,
        original_query: query,
        clarification_questions: clarificationQuestions.questions,
        session_status: 'active',
        created_by: userId,
        metadata: {
          query_analysis: queryAnalysis,
          question_generation_strategy: clarificationQuestions.strategy,
          context_factors: clarificationQuestions.contextFactors,
          estimated_resolution_confidence: clarificationQuestions.estimatedConfidence
        }
      })
      .select('*')
      .single();

    console.log('✅ Created intelligent clarification session:', clarificationSession?.id);

    return new Response(JSON.stringify({
      type: 'clarification_created',
      session: clarificationSession,
      analysis: queryAnalysis,
      strategy: clarificationQuestions.strategy,
      estimatedSteps: clarificationQuestions.estimatedSteps,
      contextFactors: clarificationQuestions.contextFactors
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Intelligent Clarification Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Intelligent clarification failed',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function analyzeQueryComplexity(query: string, context: any) {
  try {
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
            content: `أنت محلل ذكي للاستعلامات. قم بتحليل الاستعلام وتحديد:
1. مستوى التعقيد (1-5)
2. مستوى الغموض (1-5) 
3. المجالات المتضمنة (قانونية، محاسبية، إدارية، إلخ)
4. نوع المعلومات المطلوبة
5. السياق المفقود
6. الخطوات المطلوبة للحل

أرجع النتيجة كـ JSON فقط.`
          },
          {
            role: 'user',
            content: `الاستعلام: "${query}"\nالسياق: ${JSON.stringify(context)}`
          }
        ],
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error('Query analysis failed:', error);
    return {
      complexity: 3,
      ambiguity: 4,
      domains: ['general'],
      informationType: 'unknown',
      missingContext: ['purpose', 'timeframe'],
      requiredSteps: 2
    };
  }
}

async function generateIntelligentQuestions(
  query: string,
  context: any,
  analysis: any,
  historicalPatterns: any[],
  learningPatterns: any[]
) {
  try {
    const historicalSuccess = historicalPatterns
      .filter(p => p.final_intent)
      .map(p => ({
        originalQuery: p.original_query,
        questions: p.clarification_questions,
        resolution: p.final_intent,
        userResponses: p.user_responses
      }));

    const learningInsights = learningPatterns
      .map(p => p.pattern_data)
      .filter(p => p && p.successful_questions);

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
            content: `أنت خبير في توليد أسئلة الاستيضاح الذكية. مهمتك:

1. توليد 2-4 أسئلة محددة ومركزة لفهم قصد المستخدم
2. ترتيب الأسئلة حسب الأولوية
3. استخدام الأنماط التاريخية الناجحة
4. تجنب الأسئلة العامة أو المكررة
5. التركيز على المعلومات الأساسية المفقودة

تحليل الاستعلام المتوفر: ${JSON.stringify(analysis)}
الأنماط التاريخية الناجحة: ${JSON.stringify(historicalSuccess.slice(0, 3))}
رؤى التعلم: ${JSON.stringify(learningInsights.slice(0, 2))}

أرجع النتيجة كـ JSON مع:
{
  "questions": ["سؤال1", "سؤال2", ...],
  "strategy": "استراتيجية الأسئلة",
  "contextFactors": ["عامل1", "عامل2"],
  "estimatedConfidence": 0.8,
  "estimatedSteps": 2
}`
          },
          {
            role: 'user',
            content: `الاستعلام الأصلي: "${query}"\nالسياق: ${JSON.stringify(context)}\n\nولد أسئلة الاستيضاح الذكية:`
          }
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error('Question generation failed:', error);
    return {
      questions: [
        "ما هو الهدف الأساسي من استعلامك؟",
        "ما الفترة الزمنية التي تهتم بها؟",
        "هل تريد معلومات أم تنفيذ إجراء؟"
      ],
      strategy: "general_clarification",
      contextFactors: ["missing_intent", "unclear_scope"],
      estimatedConfidence: 0.6,
      estimatedSteps: 3
    };
  }
}