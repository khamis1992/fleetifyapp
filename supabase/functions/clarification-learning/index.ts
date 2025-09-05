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

    const { sessionId, responses, companyId, userId } = await req.json();
    
    console.log('🎓 Processing clarification responses for learning:', { sessionId, responses });

    // Step 1: Get clarification session
    const { data: session } = await supabaseClient
      .from('ai_clarification_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (!session) {
      throw new Error('Clarification session not found');
    }

    // Step 2: Analyze response quality and extract insights
    const responseAnalysis = await analyzeClarificationResponses(
      session.original_query,
      session.clarification_questions,
      responses
    );

    console.log('📊 Response analysis:', responseAnalysis);

    // Step 3: Determine final intent using AI
    const finalIntent = await determineFinalIntent(
      session.original_query,
      responses,
      responseAnalysis
    );

    console.log('🎯 Determined final intent:', finalIntent);

    // Step 4: Update clarification session
    await supabaseClient
      .from('ai_clarification_sessions')
      .update({
        user_responses: responses,
        final_intent: finalIntent.intent,
        session_status: 'completed',
        completed_at: new Date().toISOString(),
        metadata: {
          ...session.metadata,
          response_analysis: responseAnalysis,
          final_intent_confidence: finalIntent.confidence,
          learning_insights: finalIntent.insights
        }
      })
      .eq('id', sessionId);

    // Step 5: Create learning patterns from this clarification
    await createLearningPattern(
      supabaseClient,
      companyId,
      session,
      responses,
      responseAnalysis,
      finalIntent,
      userId
    );

    // Step 6: Generate final response
    const finalResponse = await generateFinalResponse(
      session.original_query,
      finalIntent,
      responses
    );

    // Step 7: Update performance metrics
    await updateClarificationMetrics(supabaseClient, companyId, responseAnalysis);

    return new Response(JSON.stringify({
      type: 'clarification_completed',
      finalIntent: finalIntent.intent,
      confidence: finalIntent.confidence,
      response: finalResponse,
      insights: finalIntent.insights,
      learningApplied: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Clarification Learning Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Clarification learning failed',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function analyzeClarificationResponses(
  originalQuery: string,
  questions: string[],
  responses: Record<string, string>
) {
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
            content: `أنت محلل ذكي لردود الاستيضاح. قم بتحليل ردود المستخدم وتحديد:

1. جودة الردود (1-5)
2. اكتمال المعلومات (1-5)
3. وضوح القصد (1-5)
4. الثقة في فهم المطلوب (1-5)
5. الكلمات المفتاحية المستخرجة
6. السياق المحدد
7. نوع الإجراء المطلوب

أرجع النتيجة كـ JSON فقط.`
          },
          {
            role: 'user',
            content: `الاستعلام الأصلي: "${originalQuery}"
الأسئلة: ${JSON.stringify(questions)}
الردود: ${JSON.stringify(responses)}

قم بالتحليل:`
          }
        ],
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error('Response analysis failed:', error);
    return {
      responseQuality: 3,
      completeness: 3,
      intentClarity: 3,
      confidence: 3,
      keywords: [],
      context: {},
      actionType: 'unknown'
    };
  }
}

async function determineFinalIntent(
  originalQuery: string,
  responses: Record<string, string>,
  analysis: any
) {
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
            content: `أنت خبير في تحديد القصد النهائي للمستخدم. بناءً على الاستعلام الأصلي وردود الاستيضاح، حدد:

1. القصد النهائي (intent)
2. مستوى الثقة (0-1)
3. رؤى للتعلم المستقبلي
4. فئة الطلب الرئيسية
5. المعلومات الأساسية المستخرجة

أرجع النتيجة كـ JSON مع هذا التنسيق:
{
  "intent": "نوع_القصد",
  "confidence": 0.9,
  "category": "الفئة",
  "extractedInfo": {},
  "insights": ["رؤية1", "رؤية2"],
  "actionRequired": "نوع_الإجراء"
}`
          },
          {
            role: 'user',
            content: `الاستعلام الأصلي: "${originalQuery}"
ردود الاستيضاح: ${JSON.stringify(responses)}
تحليل الردود: ${JSON.stringify(analysis)}

حدد القصد النهائي:`
          }
        ],
        temperature: 0.4,
      }),
    });

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error('Intent determination failed:', error);
    return {
      intent: 'general_inquiry',
      confidence: 0.5,
      category: 'general',
      extractedInfo: {},
      insights: ['Need better clarification questions'],
      actionRequired: 'provide_information'
    };
  }
}

async function createLearningPattern(
  supabaseClient: any,
  companyId: string,
  session: any,
  responses: Record<string, string>,
  analysis: any,
  finalIntent: any,
  userId: string
) {
  try {
    const learningPattern = {
      original_query_pattern: session.original_query,
      successful_questions: session.clarification_questions,
      effective_responses: responses,
      resolution_pathway: finalIntent,
      quality_metrics: analysis,
      context_factors: session.metadata?.context_factors || [],
      timestamp: new Date().toISOString(),
      resolution_confidence: finalIntent.confidence
    };

    await supabaseClient
      .from('ai_learning_patterns')
      .insert({
        company_id: companyId,
        pattern_type: 'clarification_resolution',
        pattern_data: learningPattern,
        success_rate: finalIntent.confidence,
        usage_count: 1,
        is_active: true
      });

    console.log('✅ Created clarification learning pattern');
  } catch (error) {
    console.error('Failed to create learning pattern:', error);
  }
}

async function generateFinalResponse(
  originalQuery: string,
  finalIntent: any,
  responses: Record<string, string>
) {
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
            content: `أنت مساعد ذكي. بناءً على الاستعلام الأصلي والقصد النهائي المحدد، قدم إجابة شاملة ومفيدة.

استخدم المعلومات المستخرجة من الاستيضاح لتقديم إجابة دقيقة ومخصصة.`
          },
          {
            role: 'user',
            content: `الاستعلام الأصلي: "${originalQuery}"
القصد النهائي: ${JSON.stringify(finalIntent)}
ردود الاستيضاح: ${JSON.stringify(responses)}

قدم الإجابة النهائية:`
          }
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Final response generation failed:', error);
    return 'تم فهم طلبك بنجاح. شكراً لردودك التوضيحية.';
  }
}

async function updateClarificationMetrics(
  supabaseClient: any,
  companyId: string,
  analysis: any
) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Update or insert metrics
    const { data: existingMetrics } = await supabaseClient
      .from('ai_performance_metrics')
      .select('*')
      .eq('company_id', companyId)
      .eq('metric_date', today)
      .single();

    if (existingMetrics) {
      await supabaseClient
        .from('ai_performance_metrics')
        .update({
          clarification_requests: existingMetrics.clarification_requests + 1,
          user_satisfaction_avg: (existingMetrics.user_satisfaction_avg + analysis.responseQuality) / 2
        })
        .eq('id', existingMetrics.id);
    } else {
      await supabaseClient
        .from('ai_performance_metrics')
        .insert({
          company_id: companyId,
          metric_date: today,
          total_queries: 1,
          clarification_requests: 1,
          user_satisfaction_avg: analysis.responseQuality,
          successful_classifications: 1
        });
    }

    console.log('📊 Updated clarification metrics');
  } catch (error) {
    console.error('Failed to update metrics:', error);
  }
}