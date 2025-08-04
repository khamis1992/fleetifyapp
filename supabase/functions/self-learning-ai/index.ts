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
        if (patternData.embedding) {
          const similarity = cosineSimilarity(queryEmbedding, patternData.embedding);
          console.log(`🔍 Pattern similarity: ${similarity} for pattern: ${pattern.pattern_type}`);
          
          if (similarity > highestSimilarity && similarity > 0.7) {
            highestSimilarity = similarity;
            bestMatch = pattern;
          }
        }
      }
    }

    // Step 3: Determine if clarification is needed
    const needsClarification = highestSimilarity < 0.6;
    console.log(`🤔 Needs clarification: ${needsClarification}, similarity: ${highestSimilarity}`);

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
          content: 'You are a helpful AI assistant. Analyze the user query and provide a helpful response while identifying the intent.'
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
  
  // Basic intent classification
  let intent = 'general_query';
  if (query.includes('عقد') || query.includes('contract')) intent = 'contract_query';
  if (query.includes('عميل') || query.includes('customer')) intent = 'customer_query';
  if (query.includes('كم') || query.includes('عدد')) intent = 'statistics_query';
  
  return {
    response: responseText,
    intent,
    confidence: 0.5,
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
    // Create or update learning pattern
    const patternData = {
      query_embedding: queryEmbedding,
      response_quality: 0.8, // Initial assumption, will be updated by user feedback
      processing_type: processingType,
      intent_detected: responseData.intent,
      confidence_level: responseData.confidence,
      context_features: extractContextFeatures(query),
      timestamp: new Date().toISOString()
    };

    await supabaseClient
      .from('ai_learning_patterns')
      .insert({
        company_id: companyId,
        pattern_type: responseData.intent,
        pattern_data: patternData,
        success_rate: 0.8,
        usage_count: 1,
        is_active: true
      });

    console.log('✅ Created new learning pattern');
  } catch (error) {
    console.error('Failed to create learning pattern:', error);
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

async function generateFollowUpSuggestions(query: string, responseData: any): Promise<string[]> {
  return [
    `More details about ${responseData.intent}`,
    'Related statistics',
    'Export this information'
  ];
}