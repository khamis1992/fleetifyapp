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

    // Check for anti-loop mechanism: detect recent clarification requests for similar queries
    const recentClarifications = await supabaseClient
      .from('ai_clarification_sessions')
      .select('*')
      .eq('company_id', companyId)
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
      .eq('session_status', 'active')
      .order('created_at', { ascending: false })
      .limit(3);

    // Analyze conversation context to detect if user is answering a previous question
    const conversationContext = analyzeConversationContext(query, context);
    console.log('💬 Conversation context:', conversationContext);

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

    // Step 2.6: Check if this is an answer to a previous question
    const isAnswerToPreviousQuestion = conversationContext.isAnswerToQuestion;
    console.log(`💡 Is answer to previous question: ${isAnswerToPreviousQuestion}`);

    // Step 3: Enhanced clarification decision with anti-loop protection
    let needsClarification = false;
    let clarificationReason = '';
    
    // Anti-loop mechanism: Don't ask for clarification if we recently did for similar queries
    const hasRecentClarification = recentClarifications.data && recentClarifications.data.length > 0;
    
    if (hasRecentClarification) {
      console.log('🚫 Skipping clarification due to recent clarification requests');
      needsClarification = false;
      clarificationReason = 'Recently asked for clarification, preventing loop';
    } else if (isAnswerToPreviousQuestion) {
      console.log('💭 User is answering a previous question, processing directly');
      needsClarification = false;
      clarificationReason = 'User is answering a previous question';
    } else if (isSimpleQuery) {
      console.log('✅ Query is simple and clear, processing directly');
      needsClarification = false;
      clarificationReason = 'Query is simple and clear';
    } else if (existingPatterns && existingPatterns.length === 0) {
      // No patterns exist - only clarify if query is complex and unclear
      needsClarification = conversationContext.complexityScore > 0.7 && conversationContext.clarityScore < 0.4;
      clarificationReason = 'No patterns exist and query is complex/unclear';
    } else {
      // Patterns exist - only clarify if similarity is very low AND query is complex
      needsClarification = highestSimilarity < 0.2 && conversationContext.complexityScore > 0.7;
      clarificationReason = 'Low pattern similarity and high query complexity';
    }
    
    console.log(`🤔 Needs clarification: ${needsClarification}, similarity: ${highestSimilarity}, isSimple: ${isSimpleQuery}, reason: ${clarificationReason}`);

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
  const conversationHistory = context?.conversationHistory || [];
  
  // Check if this is a follow-up response to a previous AI question
  const lastAIMessage = getLastAIMessage(conversationHistory);
  const isFollowUpAnswer = checkIfAnswerToQuestion(normalizedQuery, conversationHistory);
  
  if (isFollowUpAnswer && lastAIMessage) {
    // Process follow-up answers based on context
    if (lastAIMessage.content.includes('العقود النشطة') || lastAIMessage.content.includes('جميع العقود')) {
      // This is answering a contract count question
      if (normalizedQuery.includes('جميع') || normalizedQuery.includes('كل')) {
        return {
          response: 'حسناً، سأقوم بعرض إجمالي عدد العقود في النظام. للوصول إلى هذه المعلومات، أحتاج للاتصال بقاعدة البيانات. سيتم عرض جميع العقود بما في ذلك النشطة والمنتهية الصلاحية.',
          intent: 'contract_count_all',
          confidence: 0.9,
          usedPattern: false,
          adaptiveRecommendations: ['عرض تفاصيل العقود', 'تصنيف العقود حسب الحالة', 'إحصائيات شهرية للعقود']
        };
      } else if (normalizedQuery.includes('نشطة') || normalizedQuery.includes('النشطة')) {
        return {
          response: 'ممتاز، سأعرض لك العقود النشطة فقط. هذا سيشمل العقود التي لم تنته صلاحيتها وما زالت سارية المفعول.',
          intent: 'contract_count_active',
          confidence: 0.9,
          usedPattern: false,
          adaptiveRecommendations: ['عرض تفاصيل العقود النشطة', 'تواريخ انتهاء العقود', 'العقود القريبة من الانتهاء']
        };
      }
    }
    
    if (lastAIMessage.content.includes('العملاء النشطين') || lastAIMessage.content.includes('جميع العملاء')) {
      // This is answering a customer count question
      if (normalizedQuery.includes('جميع') || normalizedQuery.includes('كل')) {
        return {
          response: 'سأعرض لك إجمالي عدد العملاء المسجلين في النظام، بما في ذلك النشطين وغير النشطين.',
          intent: 'customer_count_all',
          confidence: 0.9,
          usedPattern: false,
          adaptiveRecommendations: ['قائمة العملاء', 'تقارير العملاء', 'إحصائيات العملاء']
        };
      } else if (normalizedQuery.includes('نشط') || normalizedQuery.includes('النشطين')) {
        return {
          response: 'سأعرض لك العملاء النشطين فقط الذين لديهم تعاملات حالية مع الشركة.',
          intent: 'customer_count_active',
          confidence: 0.9,
          usedPattern: false,
          adaptiveRecommendations: ['تفاصيل العملاء النشطين', 'آخر تعاملات العملاء', 'عقود العملاء النشطة']
        };
      }
    }
  }
  
  // Arabic keywords for contract/agreement counting
  const contractCountKeywords = ['كم عقد', 'كم اتفاقية', 'عدد العقود', 'عدد الاتفاقيات'];
  const customerCountKeywords = ['كم عميل', 'عدد العملاء', 'كم زبون'];
  
  // Check for simple count queries
  if (contractCountKeywords.some(keyword => normalizedQuery.includes(keyword))) {
    return {
      response: 'لمساعدتك في معرفة عدد العقود، أحتاج للوصول إلى قاعدة البيانات. هل تقصد العقود النشطة فقط أم جميع العقود؟',
      intent: 'contract_count_query',
      confidence: 0.9,
      usedPattern: false,
      adaptiveRecommendations: ['عرض العقود النشطة', 'عرض جميع العقود', 'إحصائيات العقود']
    };
  }
  
  if (customerCountKeywords.some(keyword => normalizedQuery.includes(keyword))) {
    return {
      response: 'لعرض إحصائيات العملاء، هل تريد معرفة العملاء النشطين أم جميع العملاء المسجلين في النظام؟',
      intent: 'customer_count_query',
      confidence: 0.9,
      usedPattern: false,
      adaptiveRecommendations: ['عرض العملاء النشطين', 'عرض جميع العملاء', 'تقارير العملاء']
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
    /جميع\s+(العقود|الاتفاقيات|العملاء)/,
    /كل\s+(العقود|الاتفاقيات|العملاء)/,
    /نشطة؟?\s*(فقط)?/,
    /النشطة\s*(فقط)?/,
    
    // English patterns  
    /how\s+many\s+(contracts?|agreements?|customers?)/,
    /number\s+of\s+(contracts?|agreements?|customers?)/,
    /count\s+(contracts?|agreements?|customers?)/,
    /all\s+(contracts?|agreements?|customers?)/,
    /active\s+(contracts?|agreements?|customers?)/,
    
    // Status queries
    /حالة\s+(العقد|الاتفاقية)/,
    /status\s+of/,
    
    // Simple answers and confirmations
    /^(نعم|لا|yes|no)$/,
    /^(جميع|كل|all)$/,
    /^(النشطة|active)$/
  ];
  
  // Also consider short responses (likely answers) as simple
  if (normalizedQuery.length < 20 && normalizedQuery.split(' ').length <= 3) {
    return true;
  }
  
  return simplePatterns.some(pattern => pattern.test(normalizedQuery));
}

function analyzeConversationContext(query: string, context: any) {
  const normalizedQuery = query.toLowerCase().trim();
  const conversationHistory = context?.conversationHistory || [];
  
  // Check if this looks like an answer to a previous question
  const isAnswerToQuestion = checkIfAnswerToQuestion(normalizedQuery, conversationHistory);
  
  // Calculate complexity and clarity scores
  const complexityScore = calculateComplexityScore(query);
  const clarityScore = calculateClarityScore(query);
  
  return {
    isAnswerToQuestion,
    complexityScore,
    clarityScore,
    conversationLength: conversationHistory.length,
    recentAIMessage: getLastAIMessage(conversationHistory)
  };
}

function checkIfAnswerToQuestion(query: string, conversationHistory: any[]): boolean {
  if (conversationHistory.length < 2) return false;
  
  // Get the last AI message
  const lastAIMessage = getLastAIMessage(conversationHistory);
  if (!lastAIMessage) return false;
  
  // Check if the last AI message was asking a question
  const wasQuestion = lastAIMessage.content.includes('?') || 
                     lastAIMessage.content.includes('هل') ||
                     lastAIMessage.content.includes('ما') ||
                     lastAIMessage.content.includes('كم') ||
                     lastAIMessage.content.includes('أيهما') ||
                     lastAIMessage.content.includes('أحتاج');
  
  if (!wasQuestion) return false;
  
  // Check if current query looks like an answer
  const answerPatterns = [
    /^(جميع|كل|النشطة|نعم|لا|all|active|yes|no)/,
    /العقود\s*(النشطة|جميع)?/,
    /الاتفاقيات\s*(النشطة|جميع)?/,
    /العملاء\s*(النشطين|جميع)?/
  ];
  
  return answerPatterns.some(pattern => pattern.test(query));
}

function getLastAIMessage(conversationHistory: any[]) {
  return conversationHistory
    .filter(msg => msg.type === 'ai')
    .slice(-1)[0];
}

function calculateComplexityScore(query: string): number {
  let score = 0;
  
  // Length factor
  if (query.length > 100) score += 0.3;
  else if (query.length > 50) score += 0.2;
  else if (query.length > 20) score += 0.1;
  
  // Word count factor
  const wordCount = query.split(' ').length;
  if (wordCount > 10) score += 0.3;
  else if (wordCount > 5) score += 0.2;
  
  // Complex keywords
  const complexKeywords = ['تفصيلي', 'شامل', 'تحليل', 'مقارنة', 'comprehensive', 'detailed', 'analysis'];
  if (complexKeywords.some(keyword => query.includes(keyword))) score += 0.4;
  
  return Math.min(score, 1.0);
}

function calculateClarityScore(query: string): number {
  let score = 1.0;
  
  // Reduce score for vague words
  const vageWords = ['شيء', 'أمر', 'حاجة', 'موضوع', 'thing', 'stuff', 'something'];
  if (vageWords.some(word => query.includes(word))) score -= 0.4;
  
  // Reduce score for questions without specific objects
  if (query.includes('؟') || query.includes('?')) {
    const hasSpecificObject = /عقد|اتفاقية|عميل|زبون|contract|agreement|customer/.test(query);
    if (!hasSpecificObject) score -= 0.3;
  }
  
  // Increase score for clear intent keywords
  const clearKeywords = ['عدد', 'كم', 'قائمة', 'count', 'list', 'show'];
  if (clearKeywords.some(keyword => query.includes(keyword))) score += 0.2;
  
  return Math.max(score, 0.0);
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