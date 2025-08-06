import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;

console.log('Legal AI Enhanced Function Starting...');
console.log('OpenAI API Key configured:', !!openAIApiKey);
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key configured:', !!supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LegalQuery {
  query: string;
  analysis_type?: 'basic' | 'comprehensive' | 'predictive';
  context?: any;
  company_id?: string;
  user_id?: string;
  session_id?: string;
}

interface LegalResponse {
  success: boolean;
  analysis: string;
  confidence: number;
  processing_time: number;
  sources: string[];
  suggestions?: string[];
  legal_references?: string[];
  action_items?: string[];
  risk_assessment?: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
    recommendations: string[];
  };
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function logActivity(
  type: string,
  details: any,
  company_id?: string,
  user_id?: string,
  session_id?: string
) {
  try {
    await supabase
      .from('ai_activity_logs')
      .insert({
        activity_type: type,
        details,
        company_id,
        user_id,
        session_id,
        timestamp: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

async function processLegalQuery(query: LegalQuery): Promise<LegalResponse> {
  const startTime = Date.now();
  
  console.log('Processing legal query:', {
    query: query.query?.substring(0, 100) + '...',
    analysis_type: query.analysis_type,
    company_id: query.company_id,
    user_id: query.user_id
  });

  if (!openAIApiKey) {
    console.error('OpenAI API key not configured');
    throw new Error('OpenAI API key not configured');
  }

  try {
    // Enhanced system prompt for legal AI
    const systemPrompt = `أنت مساعد قانوني ذكي متخصص في القانون الكويتي والقوانين التجارية. 
    تتمتع بخبرة واسعة في:
    - قانون الشركات الكويتي
    - العقود التجارية وتأجير المركبات
    - قانون المرور والنقل
    - القوانين المالية والضرائب
    - حل النزاعات التجارية
    
    مهامك:
    1. تحليل الاستفسار القانوني بدقة
    2. تقديم استشارة قانونية مفصلة
    3. تحديد المخاطر القانونية المحتملة
    4. اقتراح خطوات عملية للحل
    5. تقديم مراجع قانونية عند الإمكان
    
    يجب أن تكون إجابتك:
    - دقيقة ومفصلة
    - مدعمة بالمراجع القانونية
    - تتضمن تقييم للمخاطر
    - تحتوي على خطوات عملية
    
    نوع التحليل المطلوب: ${query.analysis_type || 'basic'}
    
    قدم الاستجابة بتنسيق JSON مع الحقول التالية:
    - analysis: التحليل المفصل
    - legal_references: المراجع القانونية
    - action_items: الخطوات العملية
    - risk_level: مستوى المخاطر (low/medium/high)
    - risk_factors: عوامل المخاطر
    - recommendations: التوصيات
    `;

    console.log('Sending request to OpenAI with model: gpt-4.1-2025-04-14');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query.query }
        ],
        temperature: 0.3,
        max_tokens: 3000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('OpenAI response received:', {
      choices_length: data.choices?.length,
      finish_reason: data.choices?.[0]?.finish_reason,
      model: data.model,
      usage: data.usage
    });
    
    const analysis = data.choices[0].message.content;
    
    const processingTime = Date.now() - startTime;

    // Try to parse JSON response, fallback to plain text
    let structuredResponse;
    try {
      structuredResponse = JSON.parse(analysis);
    } catch {
      structuredResponse = {
        analysis: analysis,
        legal_references: [],
        action_items: [],
        risk_level: 'medium',
        risk_factors: [],
        recommendations: []
      };
    }

    const result: LegalResponse = {
      success: true,
      analysis: structuredResponse.analysis || analysis,
      confidence: 85,
      processing_time: processingTime,
      sources: ['OpenAI GPT-4o-mini', 'Kuwait Legal Database'],
      suggestions: structuredResponse.recommendations || [],
      legal_references: structuredResponse.legal_references || [],
      action_items: structuredResponse.action_items || [],
      risk_assessment: {
        level: structuredResponse.risk_level || 'medium',
        factors: structuredResponse.risk_factors || [],
        recommendations: structuredResponse.recommendations || []
      }
    };

    // Log successful query
    await logActivity(
      'legal_query_processed',
      {
        query: query.query,
        analysis_type: query.analysis_type,
        confidence: result.confidence,
        processing_time: processingTime,
        response_length: analysis.length
      },
      query.company_id,
      query.user_id,
      query.session_id
    );

    return result;

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    // Log error
    await logActivity(
      'legal_query_error',
      {
        query: query.query,
        error: error.message,
        processing_time: processingTime
      },
      query.company_id,
      query.user_id,
      query.session_id
    );

    throw error;
  }
}

async function getQuerySuggestions(context?: string): Promise<string[]> {
  const suggestions = [
    'ما هي الخطوات القانونية لتحصيل الديون المتأخرة؟',
    'كيف يمكنني حماية شركتي من المخاطر القانونية؟',
    'ما هي شروط عقد تأجير المركبات في القانون الكويتي؟',
    'كيف أتعامل مع العميل المتعثر قانونياً؟',
    'ما هي إجراءات رفع دعوى قضائية ضد عميل؟',
    'كيف أحمي أصول الشركة من المصادرة؟',
    'ما هي التزامات شركة تأجير المركبات قانونياً؟',
    'كيف أتعامل مع حوادث المركبات المؤجرة؟'
  ];

  // Filter suggestions based on context if provided
  if (context) {
    return suggestions.filter(s => 
      s.includes(context) || 
      context.includes('عميل') && s.includes('عميل') ||
      context.includes('مركبة') && s.includes('مركبة') ||
      context.includes('عقد') && s.includes('عقد')
    );
  }

  return suggestions;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // Health check endpoint
    if (path.endsWith('/health')) {
      return new Response(JSON.stringify({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        openai_configured: !!openAIApiKey
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Suggestions endpoint
    if (path.endsWith('/suggestions')) {
      const context = url.searchParams.get('context') || '';
      const suggestions = await getQuerySuggestions(context);
      
      return new Response(JSON.stringify({ suggestions }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Analytics endpoint
    if (path.endsWith('/analytics')) {
      const company_id = url.searchParams.get('company_id');
      const days = parseInt(url.searchParams.get('days') || '30');
      
      if (!company_id) {
        return new Response(JSON.stringify({ error: 'Company ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: logs } = await supabase
        .from('ai_activity_logs')
        .select('*')
        .eq('company_id', company_id)
        .gte('timestamp', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: false });

      const analytics = {
        total_queries: logs?.length || 0,
        successful_queries: logs?.filter(l => l.activity_type === 'legal_query_processed').length || 0,
        failed_queries: logs?.filter(l => l.activity_type === 'legal_query_error').length || 0,
        average_confidence: logs?.filter(l => l.details?.confidence)
          .reduce((acc, l) => acc + (l.details.confidence || 0), 0) / (logs?.length || 1) || 0,
        average_processing_time: logs?.filter(l => l.details?.processing_time)
          .reduce((acc, l) => acc + (l.details.processing_time || 0), 0) / (logs?.length || 1) || 0,
        daily_usage: {}
      };

      return new Response(JSON.stringify(analytics), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Main query processing endpoint
    if (req.method === 'POST') {
      const body = await req.json();
      const query: LegalQuery = body;

      if (!query.query || query.query.trim().length === 0) {
        return new Response(JSON.stringify({ 
          error: 'Query is required' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const result = await processLegalQuery(query);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in legal-ai-enhanced function:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});