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

    const { query, context, sessionId, companyId, userId } = await req.json();
    
    console.log('🧠 Self-Learning AI Processing:', { query, context, sessionId, companyId });

    // Step 1: Analyze query against existing learning patterns
    const { data: existingPatterns } = await supabaseClient
      .from('ai_learning_patterns')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('success_rate', { ascending: false });

    console.log(`📚 Found ${existingPatterns?.length || 0} existing learning patterns`);

    // Step 2: Calculate similarity to existing patterns
    const queryEmbedding = await generateEmbedding(query);
    let bestMatch = null;
    let highestSimilarity = 0;

    if (existingPatterns && existingPatterns.length > 0) {
      for (const pattern of existingPatterns) {
        const patternData = pattern.pattern_data as any;
        if (patternData.query_embedding) {
          const similarity = cosineSimilarity(queryEmbedding, patternData.query_embedding);
          console.log(`🔍 Pattern similarity: ${similarity} for pattern: ${pattern.pattern_type}`);
          
          if (similarity > highestSimilarity && similarity > 0.4) { // Lowered threshold
            highestSimilarity = similarity;
            bestMatch = pattern;
          }
        }
      }
    }

    // Step 2.5: Check for simple/clear queries that don't need clarification
    const isSimpleQuery = await isQuerySimpleAndClear(query);
    console.log(`🎯 Query is simple and clear: ${isSimpleQuery}`);

    // Step 3: Determine if clarification is needed
    // Only ask for clarification if:
    // 1. No patterns exist AND query is not simple/clear
    // 2. OR similarity is very low AND query is complex
    let needsClarification = false;
    
    if (existingPatterns && existingPatterns.length === 0) {
      // No patterns exist - only clarify if query is not simple
      needsClarification = !isSimpleQuery;
    } else {
      // Patterns exist - only clarify if similarity is very low AND query is complex
      needsClarification = highestSimilarity < 0.3 && !isSimpleQuery;
    }
    
    console.log(`🤔 Needs clarification: ${needsClarification}, similarity: ${highestSimilarity}, isSimple: ${isSimpleQuery}`);

    if (needsClarification) {
      // Generate intelligent clarification questions
      const clarificationQuestions = await generateClarificationQuestions(query, context, existingPatterns);
      
      const { data: clarificationSession } = await supabaseClient
        .from('ai_clarification_sessions')
        .insert({
          company_id: companyId,
          original_query: query,
          clarification_questions: clarificationQuestions,
          session_status: 'active',
          created_by: userId
        })
        .select('*')
        .single();

      return new Response(JSON.stringify({
        type: 'clarification_needed',
        session: clarificationSession,
        confidence: highestSimilarity,
        reason: 'Query intent unclear, need clarification to learn better'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 4: Process with high confidence
    let responseData;
    let processingType = 'new_learning';

    if (bestMatch) {
      console.log(`✅ Using existing pattern: ${bestMatch.pattern_type} with confidence: ${highestSimilarity}`);
      processingType = 'pattern_match';
      
      // Update pattern usage
      await supabaseClient
        .from('ai_learning_patterns')
        .update({
          usage_count: bestMatch.usage_count + 1,
          last_used_at: new Date().toISOString()
        })
        .eq('id', bestMatch.id);

      responseData = await processWithPattern(query, bestMatch, context);
    } else {
      console.log('🆕 Creating new learning experience');
      responseData = await processNewQuery(query, context);
    }

    // Step 5: Record the interaction for learning
    const { data: intentRecord } = await supabaseClient
      .from('ai_query_intents')
      .insert({
        company_id: companyId,
        original_query: query,
        normalized_query: query.toLowerCase().trim(),
        intent_classification: responseData.intent || 'general_query',
        confidence_score: highestSimilarity,
        context_data: context,
        created_by: userId
      })
      .select('*')
      .single();

    console.log('📝 Recorded query intent:', intentRecord?.id);

    // Step 6: Self-evaluate and learn from this interaction
    await selfEvaluateAndLearn(
      supabaseClient,
      companyId,
      query,
      responseData,
      queryEmbedding,
      processingType,
      userId
    );

    return new Response(JSON.stringify({
      type: 'success',
      response: responseData.response,
      intent: responseData.intent,
      confidence: highestSimilarity,
      processingType,
      suggestions: await generateFollowUpSuggestions(query, responseData),
      queryIntentId: intentRecord?.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Self-Learning AI Error:', error);
    
    // Learn from errors
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      );
      
      await supabaseClient
        .from('ai_learning_patterns')
        .insert({
          company_id: 'system',
          pattern_type: 'error_pattern',
          pattern_data: {
            error: error.message,
            timestamp: new Date().toISOString(),
            context: 'self_learning_processing'
          },
          success_rate: 0,
          is_active: true
        });
    } catch (loggingError) {
      console.error('Failed to log error for learning:', loggingError);
    }

    return new Response(JSON.stringify({ 
      error: 'Self-learning processing failed',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    });

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Embedding generation failed:', error);
    return [];
  }
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function generateClarificationQuestions(
  query: string,
  context: any,
  existingPatterns: any[]
): Promise<string[]> {
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
          content: `You are an AI assistant that generates clarification questions to better understand user queries. 
          
          Based on the user's query and existing learning patterns, generate 2-3 specific clarification questions that will help determine the user's exact intent.
          
          Existing patterns: ${JSON.stringify(existingPatterns?.map(p => p.pattern_type) || [])}
          
          Return ONLY a JSON array of questions, no other text.`
        },
        {
          role: 'user',
          content: `Query: "${query}"\nContext: ${JSON.stringify(context)}\n\nGenerate clarification questions:`
        }
      ],
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  try {
    return JSON.parse(data.choices[0].message.content);
  } catch {
    return [
      "What specific information are you looking for?",
      "Are you asking about data analysis or taking an action?",
      "What time period are you interested in?"
    ];
  }
}

async function processWithPattern(query: string, pattern: any, context: any) {
  const patternData = pattern.pattern_data as any;
  
  return {
    response: `Based on learned pattern "${pattern.pattern_type}", I can help you with: ${query}`,
    intent: pattern.pattern_type,
    confidence: 0.9,
    usedPattern: true
  };
}

async function processNewQuery(query: string, context: any) {
  // Enhanced keyword-based processing for common queries
  const normalizedQuery = query.toLowerCase().trim();
  
  // Arabic keywords for contract/agreement counting
  const contractCountKeywords = ['كم عقد', 'كم اتفاقية', 'عدد العقود', 'عدد الاتفاقيات'];
  const customerCountKeywords = ['كم عميل', 'عدد العملاء', 'كم زبون'];
  
  // Check for simple count queries
  if (contractCountKeywords.some(keyword => normalizedQuery.includes(keyword))) {
    return {
      response: 'لمساعدتك في معرفة عدد العقود، أحتاج للوصول إلى قاعدة البيانات. هل تقصد العقود النشطة فقط أم جميع العقود؟',
      intent: 'contract_count_query',
      confidence: 0.9,
      usedPattern: false
    };
  }
  
  if (customerCountKeywords.some(keyword => normalizedQuery.includes(keyword))) {
    return {
      response: 'لعرض إحصائيات العملاء، هل تريد معرفة العملاء النشطين أم جميع العملاء المسجلين في النظام؟',
      intent: 'customer_count_query',
      confidence: 0.9,
      usedPattern: false
    };
  }

  // Fallback to AI processing for complex queries
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
          content: `You are a helpful legal AI assistant. Provide helpful responses in Arabic for Arabic queries and English for English queries. 
          Be specific and actionable in your responses.`
        },
        {
          role: 'user',
          content: `Query: ${query}\nContext: ${JSON.stringify(context)}`
        }
      ],
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  const responseText = data.choices[0].message.content;
  
  // Enhanced intent classification
  let intent = 'general_query';
  if (query.includes('عقد') || query.includes('contract') || query.includes('اتفاقية')) intent = 'contract_query';
  if (query.includes('عميل') || query.includes('customer') || query.includes('زبون')) intent = 'customer_query';
  if (query.includes('كم') || query.includes('عدد') || query.includes('count') || query.includes('how many')) intent = 'statistics_query';
  if (query.includes('بحث') || query.includes('search') || query.includes('find')) intent = 'search_query';
  
  return {
    response: responseText,
    intent,
    confidence: 0.7, // Increased confidence for better processing
    usedPattern: false
  };
}

async function selfEvaluateAndLearn(
  supabaseClient: any,
  companyId: string,
  query: string,
  responseData: any,
  queryEmbedding: number[],
  processingType: string,
  userId: string
) {
  console.log('🎓 Self-evaluating and learning from interaction...');
  
  try {
    // Always create learning patterns, even with low confidence
    const patternData = {
      query_embedding: queryEmbedding,
      response_quality: Math.max(0.6, responseData.confidence), // Minimum quality threshold
      processing_type: processingType,
      intent_detected: responseData.intent,
      confidence_level: responseData.confidence,
      context_features: extractContextFeatures(query),
      original_query: query,
      timestamp: new Date().toISOString()
    };

    // Check if similar pattern already exists
    const { data: existingPattern } = await supabaseClient
      .from('ai_learning_patterns')
      .select('*')
      .eq('company_id', companyId)
      .eq('pattern_type', responseData.intent)
      .single();

    if (existingPattern) {
      // Update existing pattern
      await supabaseClient
        .from('ai_learning_patterns')
        .update({
          usage_count: existingPattern.usage_count + 1,
          last_used_at: new Date().toISOString(),
          success_rate: Math.min(0.95, existingPattern.success_rate + 0.05) // Gradually improve
        })
        .eq('id', existingPattern.id);
      
      console.log('✅ Updated existing learning pattern');
    } else {
      // Create new pattern
      await supabaseClient
        .from('ai_learning_patterns')
        .insert({
          company_id: companyId,
          pattern_type: responseData.intent,
          pattern_data: patternData,
          success_rate: Math.max(0.6, responseData.confidence), // Minimum success rate
          usage_count: 1,
          is_active: true
        });

      console.log('✅ Created new learning pattern');
    }
  } catch (error) {
    console.error('Failed to create/update learning pattern:', error);
  }
}

function extractContextFeatures(query: string): any {
  return {
    length: query.length,
    language: query.match(/[\u0600-\u06FF]/) ? 'arabic' : 'english',
    hasNumbers: /\d/.test(query),
    hasQuestion: /\?|كم|ماذا|كيف/.test(query),
    keywords: query.toLowerCase().split(' ').filter(word => word.length > 2)
  };
}

async function isQuerySimpleAndClear(query: string): Promise<boolean> {
  const normalizedQuery = query.toLowerCase().trim();
  
  // Define patterns for simple, clear queries
  const simplePatterns = [
    // Arabic patterns
    /كم\s+(عقد|اتفاقية|عميل|زبون)/,
    /عدد\s+(العقود|الاتفاقيات|العملاء)/,
    /ما\s+عدد/,
    
    // English patterns  
    /how\s+many\s+(contracts?|agreements?|customers?)/,
    /number\s+of\s+(contracts?|agreements?|customers?)/,
    /count\s+(contracts?|agreements?|customers?)/,
    
    // Status queries
    /حالة\s+(العقد|الاتفاقية)/,
    /status\s+of/
  ];
  
  return simplePatterns.some(pattern => pattern.test(normalizedQuery));
}

async function generateFollowUpSuggestions(query: string, responseData: any): Promise<string[]> {
  const suggestions = [];
  
  if (responseData.intent.includes('contract')) {
    suggestions.push('عرض تفاصيل العقود', 'البحث في العقود النشطة', 'إحصائيات العقود الشهرية');
  } else if (responseData.intent.includes('customer')) {
    suggestions.push('قائمة العملاء', 'إضافة عميل جديد', 'تقارير العملاء');
  } else {
    suggestions.push('المزيد من التفاصيل', 'الإحصائيات ذات الصلة', 'تصدير هذه المعلومات');
  }
  
  return suggestions;
}