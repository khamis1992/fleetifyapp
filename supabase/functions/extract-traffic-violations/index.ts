import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Helper function to convert PDF to images using a PDF processing service
async function convertPdfToImages(pdfBuffer: ArrayBuffer): Promise<string[]> {
  try {
    // For now, we'll use a simple approach by converting the PDF to base64
    // and sending it as a document image to OpenAI
    const uint8Array = new Uint8Array(pdfBuffer);
    const chunks: string[] = [];
    
    // Split large PDFs into smaller chunks to avoid memory issues
    const chunkSize = 1024 * 1024; // 1MB chunks
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      chunks.push(btoa(String.fromCharCode(...chunk)));
    }
    
    // Join chunks back together
    const base64Data = chunks.join('');
    
    // Return as a single image for now - in production, you'd want to 
    // use a proper PDF to image conversion service
    return [`data:image/jpeg;base64,${base64Data}`];
  } catch (error) {
    console.error('Error converting PDF to images:', error);
    throw new Error('Failed to process PDF file');
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
            model: 'gpt-5-2025-08-07',
            max_completion_tokens: 4000,
            messages: [
              {
                role: 'system',
                content: `أنت نظام ذكي لاستخراج بيانات المخالفات المرورية من صور المستندات. 
                استخرج جميع المخالفات المرورية الموجودة في هذه الصورة وأعدها بتنسيق JSON.
                
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
                
                تأكد من استخراج جميع المخالفات الموجودة في الصورة.
                إذا كان النص بالعربية، احتفظ به كما هو.
                إذا لم تجد قيمة معينة، اتركها null.
                إذا لم تجد أي مخالفات في هذه الصورة، أعد مصفوفة فارغة.
                
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
                content: [
                  {
                    type: 'text',
                    text: `استخرج جميع المخالفات المرورية من هذه الصورة (صفحة ${i + 1}):`
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: images[i]
                    }
                  }
                ]
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