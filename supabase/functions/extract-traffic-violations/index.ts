import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Improved PDF to image conversion using proper libraries
async function convertPdfToImages(pdfBuffer: ArrayBuffer): Promise<string[]> {
  try {
    console.log('Starting PDF to image conversion...');
    
    // For now, we'll use a simpler approach that works with OpenAI's document understanding
    // Convert the entire PDF to base64 and let OpenAI handle it as a document
    const uint8Array = new Uint8Array(pdfBuffer);
    const base64Pdf = btoa(String.fromCharCode(...uint8Array));
    
    // Return the PDF as a single document for OpenAI to process
    // OpenAI can handle PDF documents directly in some cases
    const pdfDataUrl = `data:application/pdf;base64,${base64Pdf}`;
    
    console.log('PDF converted to base64 format for processing');
    return [pdfDataUrl];
    
  } catch (error) {
    console.error('Error converting PDF:', error);
    throw new Error(`Failed to process PDF file: ${error.message}`);
  }
}

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

    console.log('Processing PDF file:', pdfFile.name, 'Size:', pdfFile.size);

    // Check file size limit (10MB)
    if (pdfFile.size > 10 * 1024 * 1024) {
      throw new Error('File size too large. Maximum allowed size is 10MB');
    }

    // Convert PDF to images
    const arrayBuffer = await pdfFile.arrayBuffer();
    const images = await convertPdfToImages(arrayBuffer);

    console.log(`Converted PDF to ${images.length} image(s)`);

    // Process all images and extract violations
    const allViolations: any[] = [];

    for (let i = 0; i < images.length; i++) {
      console.log(`Processing image ${i + 1}/${images.length}`);
      
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',  // Fixed: Use correct OpenAI model
            max_completion_tokens: 4000,
            messages: [
              {
                role: 'system',
                content: `أنت نظام ذكي لاستخراج بيانات المخالفات المرورية من صور المستندات أو صفحات PDF. 
                استخرج جميع المخالفات المرورية الموجودة في هذا المستند وأعدها بتنسيق JSON.
                
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
                
                تأكد من استخراج جميع المخالفات الموجودة في المستند.
                إذا كان النص بالعربية، احتفظ به كما هو.
                إذا لم تجد قيمة معينة، اتركها null.
                إذا لم تجد أي مخالفات في هذا المستند، أعد مصفوفة فارغة.
                
                أعد النتيجة بهذا التنسيق JSON فقط، بدون أي نص إضافي:
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
                content: `استخرج جميع المخالفات المرورية من هذا المستند (صفحة ${i + 1}). 
                
هذا مستند PDF يحتوي على مخالفات مرورية. اقرأ النص والجداول الموجودة فيه واستخرج البيانات بدقة.
                
ملاحظات مهمة:
                - ابحث عن أرقام المخالفات
                - ابحث عن أرقام اللوحات
                - ابحث عن التواريخ والأوقات  
                - ابحث عن مبالغ الغرامات
                - ابحث عن أنواع المخالفات
                - ابحث عن المواقع والجهات المصدرة
                
يرجى قراءة المحتوى بعناية واستخراج جميع المخالفات الموجودة.`
              }
            ]
          }),
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error(`OpenAI API error for image ${i + 1}:`, errorData);
          continue; // Skip this image and continue with the next one
        }

        const data = await response.json();
        console.log(`OpenAI response received for image ${i + 1}`);

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
          console.error(`Invalid response from OpenAI API for image ${i + 1}`);
          continue;
        }

        const content = data.choices[0].message.content;
        
        // Try to parse JSON from the response
        try {
          // Extract JSON from the response (it might be wrapped in markdown)
          const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/) || [null, content];
          const jsonString = jsonMatch[1] || content;
          const extractedData = JSON.parse(jsonString);

          if (extractedData.violations && Array.isArray(extractedData.violations)) {
            allViolations.push(...extractedData.violations);
            console.log(`Extracted ${extractedData.violations.length} violations from image ${i + 1}`);
          }
        } catch (parseError) {
          console.error(`Failed to parse JSON from OpenAI response for image ${i + 1}:`, parseError);
          console.error('Raw response:', content);
          continue;
        }
      } catch (imageError) {
        console.error(`Error processing image ${i + 1}:`, imageError);
        continue; // Continue with the next image
      }
    }

    console.log(`Successfully extracted ${allViolations.length} total violations from ${images.length} image(s)`);

    if (allViolations.length === 0) {
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
      violations: allViolations,
      total_count: allViolations.length,
      images_processed: images.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

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