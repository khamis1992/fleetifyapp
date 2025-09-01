import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withCors } from '../_shared/cors.ts';
import { 
  requireAuth, 
  rateLimit, 
  validateInput, 
  logSecurityEvent,
  type ValidationRule 
} from '../_shared/security.ts';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Input validation rules
const chatValidationRules: ValidationRule[] = [
  { field: 'messages', type: 'array', required: true },
  { field: 'model', type: 'string', required: false, maxLength: 50 },
  { field: 'max_completion_tokens', type: 'number', required: false },
  { field: 'temperature', type: 'number', required: false }
];

serve(withCors(requireAuth(async (req, auth) => {
  try {
    // Rate limiting
    const clientId = auth.user_id;
    if (!rateLimit(clientId, 50, 60000)) { // 50 requests per minute
      await logSecurityEvent('rate_limit_exceeded', { user_id: clientId }, req, auth);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const requestData = await req.json();
    
    // Input validation
    const { valid, errors } = validateInput(requestData, chatValidationRules);
    if (!valid) {
      await logSecurityEvent('invalid_input', { errors, data: requestData }, req, auth);
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: errors }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { messages, model = 'gpt-4.1-2025-04-14', max_completion_tokens = 1000, temperature } = requestData;

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Validate messages array
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages must be a non-empty array' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize messages
    const sanitizedMessages = messages.map(msg => ({
      role: String(msg.role).slice(0, 20), // Limit role length
      content: String(msg.content).slice(0, 10000) // Limit content length
    }));

    const requestBody: any = {
      model,
      messages: sanitizedMessages,
      max_completion_tokens: Math.min(max_completion_tokens, 2000), // Cap tokens
    };

    // Only add temperature for legacy models
    if (model.includes('gpt-4o') && temperature !== undefined) {
      requestBody.temperature = Math.max(0, Math.min(2, temperature)); // Clamp temperature
    }

    console.log('Making OpenAI request with model:', model);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      // Log the error for monitoring
      await logSecurityEvent('api_error', { 
        service: 'openai', 
        status: response.status, 
        error: errorText.slice(0, 500) 
      }, req, auth);
      
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in openai-chat function:', error);
    
    // Log security event for errors
    await logSecurityEvent('function_error', { 
      function: 'openai-chat', 
      error: error.message 
    }, req, auth);
    
    return new Response(JSON.stringify({ 
      error: 'An error occurred while processing the request',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
})));