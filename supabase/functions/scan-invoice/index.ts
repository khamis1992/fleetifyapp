import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OCRRequest {
  imageBase64: string;
  fileName?: string;
}

interface ExtractedInvoiceData {
  invoice_number?: string;
  invoice_date?: string;
  customer_name?: string;
  contract_number?: string;
  total_amount?: number;
  items?: Array<{
    description: string;
    quantity?: number;
    unit_price?: number;
    total?: number;
  }>;
  notes?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const { imageBase64, fileName }: OCRRequest = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Image data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing invoice OCR for:', fileName || 'unnamed file');

    // Call Gemini 2.5 Flash for OCR and data extraction
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `أنت نظام OCR متخصص في قراءة الفواتير العربية. مهمتك استخراج البيانات من صور الفواتير بدقة عالية.

قم باستخراج المعلومات التالية بتنسيق JSON:
{
  "invoice_number": "رقم الفاتورة",
  "invoice_date": "تاريخ الفاتورة بصيغة YYYY-MM-DD",
  "customer_name": "اسم العميل",
  "contract_number": "رقم العقد إن وجد",
  "total_amount": المبلغ الإجمالي كرقم,
  "items": [
    {
      "description": "وصف البند",
      "quantity": الكمية,
      "unit_price": سعر الوحدة,
      "total": الإجمالي
    }
  ],
  "notes": "أي ملاحظات إضافية"
}

- اقرأ النصوص المكتوبة بخط اليد والمطبوعة
- تعامل مع النصوص العربية والإنجليزية
- استخرج الأرقام بدقة (أزل الفواصل والرموز)
- إذا لم تجد معلومة، اتركها null
- أعط درجة ثقة للبيانات المستخرجة (0-100)`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'قم بتحليل هذه الفاتورة واستخراج جميع البيانات المطلوبة.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64.startsWith('data:') 
                    ? imageBase64 
                    : `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`OCR processing failed: ${response.status}`);
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content;

    if (!extractedText) {
      throw new Error('No content extracted from image');
    }

    console.log('Raw OCR response:', extractedText);

    // Parse JSON from response
    let extractedData: ExtractedInvoiceData = {};
    let confidence = 0;

    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = extractedText.match(/```json\n([\s\S]*?)\n```/) || 
                       extractedText.match(/```\n([\s\S]*?)\n```/) ||
                       extractedText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        extractedData = JSON.parse(jsonStr);
      } else {
        // Try parsing the whole response
        extractedData = JSON.parse(extractedText);
      }

      // Calculate confidence based on extracted fields
      const fields = ['invoice_number', 'invoice_date', 'customer_name', 'total_amount'];
      const foundFields = fields.filter(f => extractedData[f as keyof ExtractedInvoiceData]);
      confidence = (foundFields.length / fields.length) * 100;

    } catch (parseError) {
      console.error('Failed to parse OCR response:', parseError);
      // Return raw text if JSON parsing fails
      extractedData = {
        notes: extractedText
      };
      confidence = 30; // Low confidence for unparsed data
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: extractedData,
        confidence: Math.round(confidence),
        raw_response: extractedText
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in scan-invoice:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
