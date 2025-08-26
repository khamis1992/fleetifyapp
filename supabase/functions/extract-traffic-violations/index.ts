import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    const formData = await req.formData();
    const pdfFile = formData.get('file') as File;
    
    if (!pdfFile) {
      throw new Error('No PDF file provided');
    }

    // Convert PDF file to base64
    const arrayBuffer = await pdfFile.arrayBuffer();
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    console.log('Processing PDF file:', pdfFile.name, 'Size:', pdfFile.size);

    // Use OpenAI Vision API to extract traffic violations from PDF
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        max_completion_tokens: 4000,
        messages: [
          {
            role: 'system',
            content: `أنت نظام ذكي لاستخراج بيانات المخالفات المرورية من ملفات PDF. 
            استخرج جميع المخالفات المرورية الموجودة في الملف وأعدها بتنسيق JSON.
            
            لكل مخالفة، استخرج المعلومات التالية:
            - رقم المخالفة (violation_number)
            - تاريخ المخالفة (date بصيغة YYYY-MM-DD)
            - وقت المخالفة (time بصيغة HH:MM)
            - رقم اللوحة (plate_number)
            - نوع المخالفة (violation_type)
            - وصف المخالفة (description)
            - مكان المخالفة (location)
            - مبلغ الغرامة (fine_amount كرقم)
            - المبلغ الإجمالي (total_amount كرقم)
            - الجهة المصدرة (issuing_authority)
            - الحالة (status: pending, paid, disputed, cancelled)
            
            تأكد من استخراج جميع المخالفات الموجودة في الملف، وليس فقط 3 مخالفات.
            إذا كان النص بالعربية، احتفظ به كما هو.
            إذا لم تجد قيمة معينة، اتركها null.
            
            أعد النتيجة بهذا التنسيق JSON:
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
            }`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'استخرج جميع المخالفات المرورية من هذا الملف:'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64Data}`
                }
              }
            ]
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from OpenAI API');
    }

    const content = data.choices[0].message.content;
    
    // Try to parse JSON from the response
    let extractedData;
    try {
      // Extract JSON from the response (it might be wrapped in markdown)
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/) || [null, content];
      const jsonString = jsonMatch[1] || content;
      extractedData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse JSON from OpenAI response:', parseError);
      console.error('Raw response:', content);
      throw new Error('Failed to parse extracted data');
    }

    if (!extractedData.violations || !Array.isArray(extractedData.violations)) {
      throw new Error('No violations found in the extracted data');
    }

    console.log(`Successfully extracted ${extractedData.violations.length} violations`);

    return new Response(JSON.stringify({
      success: true,
      violations: extractedData.violations,
      total_count: extractedData.violations.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in extract-traffic-violations function:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      details: 'تعذر استخراج المخالفات من الملف. تأكد من أن الملف يحتوي على مخالفات مرورية واضحة.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});