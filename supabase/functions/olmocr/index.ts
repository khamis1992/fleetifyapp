/**
 * OLMOCR Edge Function
 * 
 * Uses OLMOCR API for advanced Arabic document OCR
 * Free, high-accuracy, preserves document structure
 * 
 * API: https://www.olmocr.com/ar
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OCRRequest {
  imageDataUrls: string[];
  language?: 'ar' | 'en' | 'both';
  preserveLayout?: boolean;
}

interface OCRResponse {
  success: boolean;
  text?: string;
  confidence: number;
  pagesProcessed: number;
  method: 'olmocr';
  error?: string;
}

// OLMOCR API endpoint
const OLMOCR_API_URL = 'https://api.olmocr.com/v1/ocr';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageDataUrls, language = 'ar', preserveLayout = true }: OCRRequest = await req.json();

    console.log('📄 OLMOCR Request:', {
      pageCount: imageDataUrls?.length || 0,
      language,
      preserveLayout,
    });

    if (!imageDataUrls || imageDataUrls.length === 0) {
      throw new Error('No images provided');
    }

    // Get API key from environment (if required)
    const apiKey = Deno.env.get('OLMOCR_API_KEY');

    const pageTexts: string[] = [];

    for (let i = 0; i < Math.min(imageDataUrls.length, 5); i++) {
      console.log(`📖 Processing page ${i + 1}...`);
      
      try {
        // Convert base64 to blob
        const base64Data = imageDataUrls[i].split(',')[1] || imageDataUrls[i];
        
        const response = await fetch(OLMOCR_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify({
            image: base64Data,
            language: language,
            preserve_layout: preserveLayout,
            output_format: 'text', // or 'markdown' for structured output
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.text) {
            pageTexts.push(result.text.trim());
            console.log(`✅ Page ${i + 1}: ${result.text.length} chars`);
          }
        } else {
          console.error(`❌ Page ${i + 1} failed:`, await response.text());
        }
      } catch (pageError) {
        console.error(`❌ Page ${i + 1} error:`, pageError);
      }
    }

    const fullText = pageTexts.join('\n\n--- صفحة جديدة ---\n\n');
    
    if (!fullText || fullText.length === 0) {
      throw new Error('No text extracted');
    }

    const confidence = calculateConfidence(fullText, language);

    console.log(`✅ OLMOCR complete: ${fullText.length} chars, ${Math.round(confidence * 100)}%`);

    return new Response(JSON.stringify({
      success: true,
      text: fullText,
      confidence,
      pagesProcessed: pageTexts.length,
      method: 'olmocr',
    } as OCRResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('❌ OLMOCR Error:', error);
    return new Response(JSON.stringify({
      success: false,
      confidence: 0,
      pagesProcessed: 0,
      method: 'olmocr',
      error: error instanceof Error ? error.message : 'Unknown error',
    } as OCRResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateConfidence(text: string, language: string): number {
  if (!text || text.length < 10) return 0;
  let c = 0.5;
  if (/[\u0600-\u06FF]/.test(text)) { c += 0.2; if (text.length > 200) c += 0.1; }
  if (/\d{8,}/.test(text)) c += 0.1;
  if (/\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}/.test(text)) c += 0.05;
  if (/عقد|contract|اتفاقية|إيجار/i.test(text)) c += 0.05;
  return Math.min(c, 1.0);
}
