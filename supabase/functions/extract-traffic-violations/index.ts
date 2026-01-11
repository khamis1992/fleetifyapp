import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Helper function to convert ArrayBuffer to base64 (handles large files)
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192; // Process in chunks to avoid call stack overflow
  let binary = '';
  
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binary);
}

// System prompt for extracting violations
const EXTRACTION_SYSTEM_PROMPT = `أنت نظام ذكي لاستخراج بيانات المخالفات المرورية من نصوص المستندات.

استخرج جميع المخالفات المرورية الموجودة في النص.

لكل مخالفة، استخرج:
- رقم المخالفة (violation_number)
- تاريخ المخالفة (date بصيغة YYYY-MM-DD)
- وقت المخالفة (time بصيغة HH:MM) - إذا غير موجود اتركه null
- رقم اللوحة (plate_number)
- نوع المخالفة (violation_type)
- وصف المخالفة (description)
- مكان المخالفة (location)
- مبلغ الغرامة (fine_amount كرقم)
- المبلغ الإجمالي (total_amount كرقم) - إذا غير موجود استخدم fine_amount
- الجهة المصدرة (issuing_authority)

أعد JSON فقط بهذا التنسيق:
{
  "violations": [
    {
      "violation_number": "string",
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "plate_number": "string",
      "violation_type": "string",
      "description": "string",
      "location": "string",
      "fine_amount": number,
      "total_amount": number,
      "issuing_authority": "string",
      "status": "pending"
    }
  ]
}

إذا لم تجد مخالفات: { "violations": [] }`;

// Process text with GPT-4 (faster and cheaper than Vision)
async function processTextWithGPT4(text: string): Promise<Response> {
  console.log('Processing PDF text with GPT-4...');
  console.log('Text length:', text.length, 'characters');
  
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
          content: `استخرج جميع المخالفات المرورية من النص التالي:\n\n${text}`
        }
      ]
    }),
  });
  
  return response;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      console.error('OpenAI API key is not configured');
      throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY in Supabase Edge Function secrets.');
    }

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
      
      response = await processTextWithGPT4(text);
      
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
      
      // For images, use GPT-4o Vision API
      const base64Image = arrayBufferToBase64(arrayBuffer);
      const mimeType = file.type || 'image/png';
      
      console.log('Processing as image with Vision API');
      
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

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid response from OpenAI API');
      throw new Error('Invalid response from OpenAI API');
    }

    const content = data.choices[0].message.content;
    console.log('Response content:', content.substring(0, 500));
    
    // Try to parse JSON from the response
    try {
      // Extract JSON from the response (it might be wrapped in markdown)
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                        content.match(/```\n([\s\S]*?)\n```/) || 
                        content.match(/\{[\s\S]*"violations"[\s\S]*\}/);
      
      let jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      
      // Clean up the string
      jsonString = jsonString.trim();
      if (!jsonString.startsWith('{')) {
        // Try to find JSON object in the response
        const startIndex = jsonString.indexOf('{');
        const endIndex = jsonString.lastIndexOf('}');
        if (startIndex !== -1 && endIndex !== -1) {
          jsonString = jsonString.substring(startIndex, endIndex + 1);
        }
      }
      
      const extractedData = JSON.parse(jsonString);

      if (extractedData.error) {
        console.log('OpenAI could not process the file:', extractedData.error);
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
          violations: extractedData.violations,
          total_count: extractedData.violations.length,
          images_processed: 1
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        throw new Error('Invalid response format from AI');
      }
    } catch (parseError) {
      console.error('Failed to parse JSON from OpenAI response:', parseError);
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
    console.error('Error in extract-traffic-violations function:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      details: 'تعذر استخراج المخالفات من الملف. تأكد من أن الملف صالح ويحتوي على مخالفات مرورية واضحة.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
