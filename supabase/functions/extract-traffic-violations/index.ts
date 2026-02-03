import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { TrafficViolationRegexParser } from "./regex-parser.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Try to get Z.AI/GLM API key first, fallback to OpenAI
const glmApiKey = Deno.env.get('GLM_API_KEY');
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Use GLM by default if available, otherwise fallback to OpenAI
// Note: GLM-4.7 has timeout issues with large payloads (>15K chars with full system prompt)
// Consider using smaller chunk sizes or OpenAI for large files
const useGLM = !!glmApiKey;
const apiKey = useGLM ? glmApiKey : openAIApiKey;

// Helper function to convert ArrayBuffer to base64 (handles large files)
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = '';

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }

  return btoa(binary);
}

// System prompt for extracting violations - MOI Qatar optimized (SIMPLIFIED VERSION)
// Full prompt caused 500 errors with GLM-4.7 API - using minimal version
const EXTRACTION_SYSTEM_PROMPT = `استخرج المخالفات المرورية من النص. أرجع JSON فقط:
{
  "header": {"file_number": "", "vehicle_plate": "", "owner_name": ""},
  "violations": [
    {"violation_number": "", "date": "YYYY-MM-DD", "time": "HH:MM", "plate_number": "", "violation_type": "", "location": "", "fine_amount": 0}
  ]
}
التواريخ بصيغة YYYY-MM-DD. المبالغ أرقام فقط.`;

// Generate JWT token for GLM API (id.secret format)
async function generateGLMToken(apiKey: string): Promise<string> {
  // GLM API key format: id.secret
  const [id, secret] = apiKey.split('.');

  if (!id || !secret) {
    // If no dot in key, return it as-is (might be a direct API key)
    return apiKey;
  }

  // Create JWT payload
  const now = Date.now();
  const payload = {
    api_key: id,
    exp: now + 3600000, // 1 hour expiration
    timestamp: now
  };

  // Simple JWT encoding for Deno
  const header = btoa(JSON.stringify({ alg: 'HS256', sign_type: 'SIGN' }));
  const encodedPayload = btoa(JSON.stringify(payload));

  // Create signature
  const data = `${header}.${encodedPayload}`;
  const signature = await hmacSha256(data, secret);

  return `${header}.${encodedPayload}.${signature}`;
}

// HMAC-SHA256 implementation for Deno
async function hmacSha256(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    messageData
  );

  // Convert to base64url
  const hashArray = Array.from(new Uint8Array(signature));
  const hashBase64 = btoa(String.fromCharCode.apply(null, hashArray));
  return hashBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Process text with GLM-4.7 (supports much larger context than GPT-4)
async function processTextWithGLM(text: string, requestId: string): Promise<Response> {
  console.log(`[${requestId}] Processing PDF text with GLM-4...`);
  console.log(`[${requestId}] Text length:`, text.length, 'characters');

  // GLM-4.7 supports up to 128K-1M tokens
  // For large PDFs, we need to be more conservative to avoid timeouts
  const maxTextLength = 150000; // 150K characters (reduced for stability)
  const truncatedText = text.length > maxTextLength
    ? text.substring(0, maxTextLength) + '\n\n[Text truncated due to size...]'
    : text;

  console.log(`[${requestId}] Using text length:`, truncatedText.length, 'characters (truncated from', text.length, ')');

  // Check if API key has the format id.secret
  const [id, secret] = (glmApiKey || '').split('.');
  const usesJWT = id && secret && id.length === 24 && secret.length > 20;

  let token: string;
  let baseUrl: string;

  if (usesJWT) {
    // Use JWT token with original BigModel endpoint
    console.log(`[${requestId}] Using JWT authentication with BigModel API`);
    console.log(`[${requestId}] API Key ID:`, id);
    token = await generateGLMToken(glmApiKey!);
    baseUrl = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
  } else {
    // Use direct Bearer token with Z.AI endpoint
    console.log(`[${requestId}] Using direct Bearer authentication with Z.AI API`);
    console.log(`[${requestId}] API Key format: id length=${id?.length || 0}, secret length=${secret?.length || 0}`);
    token = glmApiKey!;
    baseUrl = 'https://api.z.ai/api/paas/v4/chat/completions';
  }

  console.log(`[${requestId}] API URL:`, baseUrl);
  console.log(`[${requestId}] Token prefix:`, token.substring(0, 20) + '...');

  const requestBody = {
    model: 'glm-4.7',
    max_tokens: 8000,
    messages: [
      {
        role: 'system',
        content: EXTRACTION_SYSTEM_PROMPT
      },
      {
        role: 'user',
        content: `استخرج جميع المخالفات المرورية من النص التالي:\n\n${truncatedText}`
      }
    ]
  };

  console.log(`[${requestId}] Request body:`, JSON.stringify({
    ...requestBody,
    messages: [`[system prompt (${requestBody.messages[0].content.length} chars)]`, `[user content (${requestBody.messages[1].content.length} chars)]`]
  }, null, 2));

  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minute timeout

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log(`[${requestId}] GLM API response status:`, response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${requestId}] GLM API error:`, response.status, errorText);
      console.error(`[${requestId}] Error headers:`, Object.fromEntries(response.headers.entries()));
      try {
        const errorJson = JSON.parse(errorText);
        console.error(`[${requestId}] Parsed error:`, JSON.stringify(errorJson, null, 2));
      } catch {
        // Not JSON, keep as text
      }
      throw new Error(`GLM API error: ${response.status} - ${errorText}`);
    }

    return response;
  } catch (error) {
    console.error(`[${requestId}] Error in processTextWithGLM:`, error);
    throw error;
  }
}

// Process text with GPT-4 (fallback if GLM is not available)
async function processTextWithGPT4(text: string): Promise<Response> {
  console.log('Processing PDF text with GPT-4 (fallback)...');
  console.log('Text length:', text.length, 'characters');

  const maxTextLength = 50000;
  const truncatedText = text.length > maxTextLength
    ? text.substring(0, maxTextLength) + '\n\n[Text truncated due to size...]'
    : text;

  console.log('Using text length:', truncatedText.length, 'characters (truncated from', text.length, ')');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 4000,
      messages: [
        {
          role: 'system',
          content: EXTRACTION_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: `استخرج جميع المخالفات المرورية من النص التالي:\n\n${truncatedText}`
        }
      ]
    }),
  });

  return response;
}

serve(async (req) => {
  const requestId = crypto.randomUUID();

  // Handle CORS preflight requests FIRST - before any other processing
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle test endpoint for API key validation
  if (req.url.includes('/test-api-key')) {
    console.log(`[${requestId}] Testing GLM API key...`);

    const testResults = {
      timestamp: new Date().toISOString(),
      glm_api_key_exists: !!glmApiKey,
      openai_api_key_exists: !!openAIApiKey,
      glm_api_key_prefix: glmApiKey ? `${glmApiKey.substring(0, 10)}...` : null,
      tests: [] as any[]
    };

    // Test GLM API with JWT method (BigModel endpoint)
    if (glmApiKey) {
      const [id, secret] = glmApiKey.split('.');
      const usesJWT = id && secret && id.length === 24 && secret.length > 20;

      if (usesJWT) {
        console.log(`[${requestId}] Testing JWT authentication with BigModel API...`);
        testResults.tests.push({
          method: 'JWT (BigModel)',
          endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
          api_key_id: id,
          status: 'testing...'
        });

        try {
          const token = await generateGLMToken(glmApiKey);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

          const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'glm-4.7',
              messages: [{ role: 'user', content: 'Hello' }],
              max_tokens: 10
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          const responseData = await response.json();

          testResults.tests[0].status = response.ok ? 'success' : 'failed';
          testResults.tests[0].http_status = response.status;
          testResults.tests[0].response = response.ok ? 'API key works!' : responseData;
          console.log(`[${requestId}] JWT test result:`, response.status);
        } catch (error) {
          testResults.tests[0].status = 'error';
          testResults.tests[0].error = error.message;
          console.error(`[${requestId}] JWT test error:`, error);
        }
      } else {
        // Test direct Bearer authentication (Z.AI endpoint)
        console.log(`[${requestId}] Testing direct Bearer authentication with Z.AI API...`);
        testResults.tests.push({
          method: 'Bearer (Z.AI)',
          endpoint: 'https://api.z.ai/api/paas/v4/chat/completions',
          api_key_format: `id length=${id?.length || 0}, secret length=${secret?.length || 0}`,
          status: 'testing...'
        });

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

          const response = await fetch('https://api.z.ai/api/paas/v4/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${glmApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'glm-4.7',
              messages: [{ role: 'user', content: 'Hello' }],
              max_tokens: 10
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          const responseData = await response.json();

          testResults.tests[0].status = response.ok ? 'success' : 'failed';
          testResults.tests[0].http_status = response.status;
          testResults.tests[0].response = response.ok ? 'API key works!' : responseData;
          console.log(`[${requestId}] Bearer test result:`, response.status);
        } catch (error) {
          testResults.tests[0].status = 'error';
          testResults.tests[0].error = error.message;
          console.error(`[${requestId}] Bearer test error:`, error);
        }
      }
    } else {
      testResults.tests.push({
        method: 'N/A',
        status: 'skipped',
        reason: 'No GLM_API_KEY configured'
      });
    }

    return new Response(JSON.stringify(testResults, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Handle test endpoint for payload size performance
  if (req.url.includes('/test-payload-sizes')) {
    console.log(`[${requestId}] Testing GLM API with different payload sizes...`);

    const testSizes = [5000, 10000, 15000, 20000, 25000, 30000];
    const results = {
      timestamp: new Date().toISOString(),
      tests: [] as any[]
    };

    // Sample Arabic text that mimics traffic violation content
    const arabicSample = `مخالفة مرورية رقم المرجع: ${Math.random().toString(36).substring(7)} تاريخ المخالفة: 2025-01-12
    نوع المخالفة: تجاوز السرعة المحددة مكان المخالفة: الدائري الأول الغربي
    مبلغ المخالفة: 500 ريال قطري حالة المخالفة: غير مدفوعة
    تاريخ الاستحقاق: 2025-02-12 ملاحظات: المخالفة مسجلة على اللوحة 86-2015
    `.repeat(10); // Repeat to get more text

    for (const size of testSizes) {
      console.log(`[${requestId}] Testing payload size: ${size} characters`);

      // Create test text of specified size
      const testText = arabicSample.repeat(Math.ceil(size / arabicSample.length)).substring(0, size);

      const testResult = {
        payload_size: size,
        actual_length: testText.length,
        status: 'testing...',
        duration_ms: null,
        http_status: null,
        error: null
      };

      const startTime = performance.now();

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout per test

        const response = await fetch('https://api.z.ai/api/paas/v4/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${glmApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'glm-4.7',
            messages: [
              {
                role: 'system',
                content: EXTRACTION_SYSTEM_PROMPT.substring(0, 500) // Use truncated prompt for testing
              },
              {
                role: 'user',
                content: `استخرج جميع المخالفات المرورية من النص التالي:\n\n${testText}`
              }
            ],
            max_tokens: 100
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const duration = performance.now() - startTime;

        testResult.status = response.ok ? 'success' : 'failed';
        testResult.duration_ms = Math.round(duration);
        testResult.http_status = response.status;

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          testResult.error = errorData;
        }

        console.log(`[${requestId}] Payload ${size} chars: ${testResult.status} (${testResult.duration_ms}ms)`);

      } catch (error) {
        const duration = performance.now() - startTime;
        testResult.status = 'error';
        testResult.duration_ms = Math.round(duration);
        testResult.error = error.message;
        console.error(`[${requestId}] Payload ${size} chars error:`, error);
      }

      results.tests.push(testResult);
    }

    return new Response(JSON.stringify(results, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Handle test endpoint for regex parser
  if (req.url.includes('/test-regex')) {
    console.log(`[${requestId}] Testing regex parser...`);

    try {
      const body = await req.json();
      const { test_text, options } = body;

      if (!test_text) {
        return new Response(JSON.stringify({
          success: false,
          error: 'No test_text provided'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const startTime = performance.now();
      const parser = new TrafficViolationRegexParser(test_text, options);
      const result = parser.extract();
      const duration = performance.now() - startTime;

      console.log(`[${requestId}] Regex parsing completed in ${duration.toFixed(2)}ms`);
      console.log(`[${requestId}] Extracted ${result.violations.length} violations`);

      return new Response(JSON.stringify({
        success: true,
        test_input: {
          length: test_text.length,
          preview: test_text.substring(0, 200)
        },
        extracted: result,
        performance: {
          duration_ms: Math.round(duration),
          violations_per_second: Math.round((result.violations.length / duration) * 1000)
        }
      }, null, 2), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error(`[${requestId}] Regex test error:`, error);
      return new Response(JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n')
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // Handle regex extraction endpoint
  if (req.url.includes('/extract-regex')) {
    console.log(`[${requestId}] Processing with regex parser...`);

    try {
      const body = await req.json();
      const { pdf_text, options } = body;

      if (!pdf_text || typeof pdf_text !== 'string') {
        return new Response(JSON.stringify({
          success: false,
          error: 'No pdf_text provided or invalid type'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`[${requestId}] PDF text length:`, pdf_text.length);

      // Validate minimum text length
      if (pdf_text.trim().length < 20) {
        return new Response(JSON.stringify({
          success: false,
          error: 'PDF_NO_TEXT',
          details: 'لم يتم العثور على نص كافٍ في ملف PDF.',
          suggestion: 'قد يكون الملف عبارة عن صور ممسوحة ضوئياً.'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Process with regex parser
      const parser = new TrafficViolationRegexParser(pdf_text, options);
      const result = parser.extract();

      console.log(`[${requestId}] Regex extraction complete in ${result.metadata.processing_time_ms.toFixed(2)}ms`);
      console.log(`[${requestId}] Extracted ${result.violations.length} violations`);

      // Validate results
      if (result.violations.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          error: 'No violations found',
          details: 'لم يتم العثور على أي مخالفات مرورية في هذا الملف.',
          suggestion: 'تأكد من أن الملف يحتوي على مخالفات مرورية بصيغة وزارة الداخلية القطرية.',
          metadata: result.metadata
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Return successful result
      return new Response(JSON.stringify({
        success: true,
        header: result.header,
        violations: result.violations,
        total_count: result.violations.length,
        provider: 'regex-parser',
        metadata: result.metadata
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error(`[${requestId}] Regex extraction error:`, error);
      return new Response(JSON.stringify({
        success: false,
        error: error.message,
        errorType: error.name,
        details: 'فشل في استخراج المخالفات باستخدام المحلل التلقائي.',
        stack: error.stack?.split('\n').slice(0, 3).join('\n')
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  console.log(`[${requestId}] New request received`);

  try {
    if (!apiKey) {
      console.error(`[${requestId}] No API key configured`);
      return new Response(JSON.stringify({
        success: false,
        error: 'No API key configured',
        details: 'Please set GLM_API_KEY (recommended) or OPENAI_API_KEY in Supabase Edge Function secrets.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Using AI provider:', useGLM ? 'GLM-4' : 'OpenAI GPT-4o');

    // Check content type
    const contentType = req.headers.get('content-type') || '';

    let response;

    // Handle JSON body (text from PDF)
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const { text, source } = body;

      if (!text || typeof text !== 'string') {
        throw new Error('No text provided in JSON body');
      }

      console.log('Processing extracted PDF text. Source:', source || 'unknown');
      console.log('Text preview:', text.substring(0, 200));

      // Check if text is meaningful (not just whitespace)
      if (text.trim().length < 20) {
        return new Response(JSON.stringify({
          success: false,
          error: 'PDF_NO_TEXT',
          details: 'لم يتم العثور على نص كافٍ في ملف PDF. قد يكون الملف عبارة عن صور ممسوحة ضوئياً.',
          suggestion: 'جرب رفع صورة (JPG/PNG) بدلاً من PDF أو استخدم ملف PDF نصي.'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Use GLM if available, otherwise fallback to GPT-4
      if (useGLM) {
        response = await processTextWithGLM(text, requestId);
      } else {
        response = await processTextWithGPT4(text);
      }

    } else {
      // Handle FormData (file upload - for images)
      const formData = await req.formData();
      const file = formData.get('file') as File;

      if (!file) {
        throw new Error('No file provided');
      }

      console.log('Processing file:', file.name, 'Type:', file.type, 'Size:', file.size);

      // Check file size limit (10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size too large. Maximum allowed size is 10MB');
      }

      // Read the file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // Determine file type
      const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const isImage = file.type.startsWith('image/') ||
                      /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);

      if (!isPDF && !isImage) {
        throw new Error('Unsupported file type. Please upload a PDF or image file (JPG, PNG, GIF, WEBP).');
      }

      if (isPDF) {
        // PDF should be processed client-side and sent as text
        return new Response(JSON.stringify({
          success: false,
          error: 'PDF_SHOULD_BE_TEXT',
          details: 'يجب استخراج النص من PDF في المتصفح وإرساله كـ JSON.',
          suggestion: 'يجب تعديل الكود لإرسال النص المستخرج.'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // For images, use Vision API
      const base64Image = arrayBufferToBase64(arrayBuffer);
      const mimeType = file.type || 'image/png';

      console.log('Processing as image with Vision API');

      if (useGLM) {
        // GLM-4V for vision
        const [id, secret] = (glmApiKey || '').split('.');
        const usesJWT = id && secret && id.length === 24 && secret.length > 20;

        let token: string;
        let baseUrl: string;

        if (usesJWT) {
          token = await generateGLMToken(glmApiKey!);
          baseUrl = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
        } else {
          token = glmApiKey!;
          baseUrl = 'https://api.z.ai/api/paas/v4/chat/completions';
        }

        response = await fetch(baseUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'glm-4v',
            max_tokens: 8000,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: EXTRACTION_SYSTEM_PROMPT + '\n\nاستخرج جميع المخالفات المرورية من هذه الصورة.'
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:${mimeType};base64,${base64Image}`
                    }
                  }
                ]
              }
            ]
          }),
        });
      } else {
        // OpenAI GPT-4o Vision fallback
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            max_tokens: 4000,
            messages: [
              {
                role: 'system',
                content: EXTRACTION_SYSTEM_PROMPT
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'استخرج جميع المخالفات المرورية من هذه الصورة.'
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:${mimeType};base64,${base64Image}`,
                      detail: 'high'
                    }
                  }
                ]
              }
            ]
          }),
        });
      }
    }

    if (!response.ok) {
      const errorData = await response.text();
      console.error('AI API error:', response.status, errorData);

      let errorDetails = errorData;
      try {
        const errorJson = JSON.parse(errorData);
        errorDetails = JSON.stringify(errorJson, null, 2);
      } catch {
        // Keep as text if not JSON
      }

      throw new Error(`AI API error: ${response.status} - ${errorDetails}`);
    }

    const data = await response.json();
    console.log('AI response received');

    // Handle both GLM and OpenAI response formats
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('Invalid response from AI API');
      throw new Error('Invalid response from AI API');
    }

    console.log('Response content preview:', content.substring(0, 500));

    // Try to parse JSON from the response
    try {
      // Extract JSON from the response (it might be wrapped in markdown)
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) ||
                        content.match(/```\n([\s\S]*?)\n```/) ||
                        content.match(/\{[\s\S]*"header"[\s\S]*"violations"[\s\S]*\}/) ||
                        content.match(/\{[\s\S]*"violations"[\s\S]*\}/);

      let jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;

      // Clean up the string
      jsonString = jsonString.trim();
      if (!jsonString.startsWith('{')) {
        const startIndex = jsonString.indexOf('{');
        const endIndex = jsonString.lastIndexOf('}');
        if (startIndex !== -1 && endIndex !== -1) {
          jsonString = jsonString.substring(startIndex, endIndex + 1);
        }
      }

      const extractedData = JSON.parse(jsonString);

      if (extractedData.error) {
        console.log('AI could not process the file:', extractedData.error);
        return new Response(JSON.stringify({
          success: false,
          error: 'Could not read PDF content',
          details: extractedData.error || 'لا يمكن قراءة محتوى ملف PDF. جرب رفع صورة بدلاً من PDF أو تأكد من أن الملف يحتوي على نص قابل للقراءة.'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (extractedData.violations && Array.isArray(extractedData.violations)) {
        console.log(`Extracted ${extractedData.violations.length} violations`);

        if (extractedData.violations.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: 'No violations found',
            details: 'لم يتم العثور على أي مخالفات مرورية في هذا الملف. تأكد من أن الملف يحتوي على مخالفات مرورية واضحة.'
          }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({
          success: true,
          header: extractedData.header || {},
          violations: extractedData.violations,
          total_count: extractedData.violations.length,
          images_processed: 1,
          provider: useGLM ? 'GLM-4' : 'OpenAI'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        throw new Error('Invalid response format from AI');
      }
    } catch (parseError) {
      console.error('Failed to parse JSON from AI response:', parseError);
      console.error('Raw response:', content);

      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to parse AI response',
        details: 'فشل في تحليل استجابة الذكاء الاصطناعي. جرب مرة أخرى أو استخدم ملف PDF مختلف.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in extract-traffic-violations function:', error.message);
    console.error('Error stack:', error.stack);

    const errorDetails = {
      success: false,
      error: error.message,
      errorType: error.name,
      details: error.message || 'تعذر استخراج المخالفات من الملف. تأكد من أن الملف صالح ويحتوي على مخالفات مرورية واضحة.',
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    };

    return new Response(JSON.stringify(errorDetails), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
