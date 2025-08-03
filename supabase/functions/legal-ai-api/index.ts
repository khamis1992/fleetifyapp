import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface LegalQuery {
  query: string;
  country: string;
  company_id: string;
}

interface LegalFeedback {
  query: string;
  country: string;
  rating: number;
  feedback_text?: string;
  company_id: string;
  message_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  try {
    console.log(`Processing request: ${req.method} ${path}`);

    // Health check endpoint
    if (path === '/legal-ai-api/health' && req.method === 'GET') {
      return new Response(
        JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          openai_available: !!openAIApiKey
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Legal advice endpoint
    if (path === '/legal-ai-api/legal-advice' && req.method === 'POST') {
      const body: LegalQuery = await req.json();
      console.log('Processing legal advice request:', { query: body.query?.substring(0, 100), country: body.country });

      if (!body.query || !body.country || !body.company_id) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Missing required fields: query, country, company_id' 
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (!openAIApiKey) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'OpenAI API key not configured' 
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const systemPrompt = `You are a professional legal consultant AI specialized in ${body.country} law. 
      Provide accurate, helpful legal advice while emphasizing that this is general information and not a substitute for professional legal counsel.
      
      Guidelines:
      - Be specific to ${body.country} legal context
      - Provide practical, actionable advice
      - Include relevant legal references when possible
      - Always recommend consulting with a local attorney for complex matters
      - Be concise but comprehensive
      - Use professional but accessible language`;

      const startTime = Date.now();

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
              { role: 'system', content: systemPrompt },
              { role: 'user', content: body.query }
            ],
            temperature: 0.7,
            max_tokens: 1500,
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const advice = data.choices[0].message.content;
        const responseTime = Date.now() - startTime;

        // Log the query for analytics (optional)
        try {
          await supabase.from('legal_ai_queries').insert({
            company_id: body.company_id,
            query: body.query,
            country: body.country,
            response: advice,
            response_time: responseTime,
          });
        } catch (logError) {
          console.warn('Failed to log query:', logError);
        }

        return new Response(
          JSON.stringify({
            success: true,
            advice: advice,
            metadata: {
              source: 'api',
              confidence: 0.85,
              response_time: responseTime,
              cost_saved: false,
            }
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );

      } catch (openAIError) {
        console.error('OpenAI API error:', openAIError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Failed to generate legal advice. Please try again.' 
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Feedback endpoint
    if (path === '/legal-ai-api/feedback' && req.method === 'POST') {
      const body: LegalFeedback = await req.json();
      console.log('Processing feedback:', { rating: body.rating, company_id: body.company_id });

      if (!body.rating || !body.company_id || !body.message_id) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Missing required fields: rating, company_id, message_id' 
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Store feedback (optional)
      try {
        await supabase.from('legal_ai_feedback').insert({
          company_id: body.company_id,
          message_id: body.message_id,
          rating: body.rating,
          feedback_text: body.feedback_text,
          query: body.query,
          country: body.country,
        });
      } catch (logError) {
        console.warn('Failed to log feedback:', logError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          rating: body.rating,
          message: 'Thank you for your feedback!'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 404 for unknown endpoints
    return new Response(
      JSON.stringify({ error: 'Endpoint not found' }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in legal-ai-api function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Internal server error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});