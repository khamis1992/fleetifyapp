/**
 * DeepSeek VL2 OCR Edge Function
 *
 * Uses DeepSeek VL2 Vision API for document text extraction.
 * Unlike OpenAI, DeepSeek does NOT refuse to process personal documents!
 * 
 * Benefits:
 * - 90% cheaper than OpenAI
 * - No content policy refusals for documents
 * - High accuracy for Arabic text
 * - OpenAI-compatible API format
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildLongCatHeaders, getLongCatApiKey, LONGCAT_CHAT_COMPLETIONS_URL, LONGCAT_MODEL } from "../_shared/longcat.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OCRRequest {
  imageDataUrls: string[];
  language?: 'ar' | 'en' | 'both';
  detail?: 'low' | 'high' | 'auto';
  provider?: 'longcat';
}

interface OCRResponse {
  success: boolean;
  text?: string;
  confidence: number;
  pagesProcessed: number;
  method: 'longcat';
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageDataUrls, language = 'ar', detail = 'high', provider = 'longcat' }: OCRRequest = await req.json();

    console.log('📄 DeepSeek/Qwen OCR Request received:', {
      pageCount: imageDataUrls?.length || 0,
      language,
      detail,
      provider,
    });

    // Validate input
    if (!imageDataUrls || !Array.isArray(imageDataUrls) || imageDataUrls.length === 0) {
      throw new Error('No images provided for OCR processing');
    }

    if (imageDataUrls.length > 10) {
      throw new Error('Too many pages - maximum 10 pages per request');
    }

    const apiKey = getLongCatApiKey();

    if (!apiKey) {
      console.error('LongCat API key not configured');
      throw new Error('LongCat API key not configured. Please set LONGCAT_API_KEY in Supabase environment.');
    }

    console.log(`🔍 Processing ${imageDataUrls.length} page(s) with ${provider}...`);

    // Extract text from all pages
    const pageTexts: string[] = [];

    for (let i = 0; i < imageDataUrls.length; i++) {
      const imageUrl = imageDataUrls[i];
      console.log(`📖 Processing page ${i + 1}/${imageDataUrls.length}...`);

      try {
        const pageText = await extractTextFromImage(
          imageUrl,
          apiKey,
          language,
          detail,
          provider
        );

        if (pageText && pageText.trim().length > 0) {
          pageTexts.push(pageText.trim());
          console.log(`✅ Page ${i + 1}: ${pageText.trim().length} characters extracted`);
        } else {
          console.warn(`⚠️  Page ${i + 1}: No text extracted`);
        }
      } catch (error) {
        console.error(`❌ Error processing page ${i + 1}:`, error);
        pageTexts.push(`[Error processing page ${i + 1}: ${error}]`);
      }
    }

    // Combine all page texts
    const fullText = pageTexts.join('\n\n--- صفحة جديدة ---\n\n');

    if (!fullText || fullText.trim().length === 0) {
      throw new Error('No text could be extracted from any pages');
    }

    // Calculate confidence score
    const confidence = calculateConfidence(fullText, language);

    console.log(`✅ OCR complete: ${fullText.length} characters extracted`);
    console.log(`📊 Confidence score: ${Math.round(confidence * 100)}%`);

    const response: OCRResponse = {
      success: true,
      text: fullText,
      confidence,
      pagesProcessed: imageDataUrls.length,
      method: 'longcat',
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('❌ OCR Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    const response: OCRResponse = {
      success: false,
      confidence: 0,
      pagesProcessed: 0,
      method: 'longcat',
      error: errorMessage,
    };

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Extract text from a single image using LongCat.
 */
async function extractTextFromImage(
  imageUrl: string,
  apiKey: string,
  language: string,
  detail: string,
  provider: string
): Promise<string> {
  // Build the prompt for document extraction
  const systemPrompt = buildSystemPrompt(language);
  const userPrompt = language === 'ar'
    ? 'استخرج كل النص من هذه الصورة بدقة عالية. هذا مستند تجاري/عقد. استخرج جميع التفاصيل بما في ذلك الأسماء والأرقام والتواريخ.'
    : 'Extract all text from this image with high accuracy. This is a business document/contract. Extract all details including names, numbers, and dates.';

  console.log(`📤 Calling ${provider} Vision API...`);

  // Build message content based on provider
  const imageContent = buildImageContent(imageUrl, detail, provider);

  const response = await fetch(LONGCAT_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: buildLongCatHeaders(apiKey),
    body: JSON.stringify({
      model: LONGCAT_MODEL,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            ...imageContent
          ]
        }
      ],
      max_tokens: 4096,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`${provider} API error:`, response.status, errorText);
    throw new Error(`${provider} Vision API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();

  if (!result.choices || result.choices.length === 0) {
    throw new Error(`No response from ${provider} Vision API`);
  }

  const extractedText = result.choices[0].message.content || '';

  console.log(`📥 ${provider} response: ${extractedText.length} characters`);

  return extractedText;
}

/**
 * Build image content based on provider format
 */
function buildImageContent(imageUrl: string, detail: string, provider: string): any[] {
  // Both DeepSeek and Qwen use OpenAI-compatible format
  return [{
    type: 'image_url',
    image_url: {
      url: imageUrl,
      detail: detail
    }
  }];
}

/**
 * Build system prompt for document extraction
 */
function buildSystemPrompt(language: string): string {
  if (language === 'ar') {
    return `
أنت خبير في استخراج النصوص من المستندات والعقود الممسوحة ضوئياً.

مهمتك:
1. استخرج كل النص من الصورة بدقة 100%
2. احتفظ بالتنسيق الأصلي (فقرات، جداول، أعمدة)
3. استخرج جميع:
   - الأسماء كاملة (عربية وإنجليزية)
   - أرقام الهوية (QID) والهواتف
   - التواريخ بجميع صيغها
   - المبالغ المالية والعملات
   - أرقام لوحات المركبات
   - تفاصيل المركبات (الماركة، الموديل، السنة)
4. لا تضف أي تفسيرات - فقط النص الخام
5. إذا كان النص غير واضح، ضع [غير واضح]

أخرج النص الخام فقط.
`;
  }

  return `
You are an expert in extracting text from scanned documents and contracts.

Your task:
1. Extract ALL text from the image with 100% accuracy
2. Preserve original formatting (paragraphs, tables, columns)
3. Extract all:
   - Full names (Arabic and English)
   - ID numbers (QID) and phone numbers
   - Dates in all formats
   - Financial amounts and currencies
   - Vehicle plate numbers
   - Vehicle details (make, model, year)
4. Do not add any interpretations - raw text only
5. If text is unclear, mark with [unclear]

Output raw text only.
`;
}

/**
 * Calculate confidence score based on extracted text quality
 */
function calculateConfidence(text: string, language: string): number {
  if (!text || text.length < 10) return 0;

  let confidence = 0.4; // Higher base for DeepSeek

  // Arabic text presence
  if (/[\u0600-\u06FF]/.test(text)) {
    confidence += 0.2;
    if (text.length > 200) confidence += 0.1;
  }

  // Numbers (QID, phone)
  if (/\d{8,}/.test(text)) confidence += 0.1;

  // Dates
  if (/\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}/.test(text)) confidence += 0.1;

  // Length bonus
  if (text.length > 100) confidence += 0.05;
  if (text.length > 500) confidence += 0.05;

  // Document markers
  if (/عقد|contract|اتفاقية|agreement|إيجار|rental/i.test(text)) {
    confidence += 0.1;
  }

  return Math.min(confidence, 1.0);
}
