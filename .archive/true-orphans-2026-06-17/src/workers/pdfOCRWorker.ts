/**
 * PDF OCR Web Worker
 *
 * This worker handles OCR processing in an isolated thread to prevent
 * interference with React's hook system. It communicates with the main
 * thread via postMessage API.
 *
 * Key advantages:
 * - Runs in completely separate context from React
 * - No module-level imports affect main thread
 * - Non-blocking UI processing
 * - Can handle multiple concurrent OCR jobs
 */

interface OCRRequest {
  jobId: string;
  type: 'extract_text';
  imageDataUrls: string[];
  fileName: string;
  config: {
    engine: 'openai';
    language: 'ar';
    apiKey?: string;
    supabaseUrl?: string;
  };
}

interface OCRResponse {
  jobId: string;
  success: boolean;
  text?: string;
  error?: string;
  method: 'ocr';
  confidence: number;
  pagesProcessed: number;
}

interface OpenAIResponse {
  choices: Array<{
    message?: {
      content?: string;
    };
  }>;
}

/**
 * Extract text from images using OpenAI Vision API
 * This is called within the worker context
 */
async function extractTextWithOpenAI(
  imageDataUrls: string[],
  apiKey: string,
  supabaseUrl: string
): Promise<{ text: string; confidence: number }> {
  try {
    // Call Supabase Edge Function which proxies to OpenAI
    const response = await fetch(`${supabaseUrl}/functions/v1/pdf-ocr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        imageDataUrls,
        language: 'ar',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OCR API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'OCR processing failed');
    }

    return {
      text: result.text || '',
      confidence: result.confidence || 0.5,
    };
  } catch (error) {
    console.error('OpenAI OCR error:', error);
    throw error;
  }
}

/**
 * Calculate confidence score based on extracted text
 */
function calculateConfidence(text: string): number {
  if (!text || text.length < 10) return 0;

  // Factors that increase confidence:
  const hasArabicText = /[\u0600-\u06FF]/.test(text);
  const hasNumbers = /\d{10,}/.test(text); // Qatar ID format
  const hasDates = /\d{2}\/\d{2}\/\d{4}/.test(text);
  const reasonableLength = text.length > 100;

  let confidence = 0.3; // Base confidence

  if (hasArabicText) confidence += 0.2;
  if (hasNumbers) confidence += 0.15;
  if (hasDates) confidence += 0.15;
  if (reasonableLength) confidence += 0.2;

  return Math.min(confidence, 1.0);
}

/**
 * Main worker message handler
 */
self.onmessage = async (e: MessageEvent<OCRRequest>) => {
  const { jobId, imageDataUrls, fileName, config } = e.data;

  console.log(`[Worker] Starting OCR job ${jobId} for ${fileName}`);
  console.log(`[Worker] Processing ${imageDataUrls.length} page(s)`);

  try {
    // Validate inputs
    if (!imageDataUrls || imageDataUrls.length === 0) {
      throw new Error('No images provided for OCR');
    }

    if (!config.apiKey) {
      throw new Error('API key not provided');
    }

    if (!config.supabaseUrl) {
      throw new Error('Supabase URL not provided');
    }

    // Extract text using OpenAI Vision API
    const { text, confidence } = await extractTextWithOpenAI(
      imageDataUrls,
      config.apiKey,
      config.supabaseUrl
    );

    console.log(`[Worker] OCR complete: ${text.length} characters extracted`);
    console.log(`[Worker] Confidence: ${Math.round(confidence * 100)}%`);

    // Send success response back to main thread
    const response: OCRResponse = {
      jobId,
      success: true,
      text,
      method: 'ocr',
      confidence,
      pagesProcessed: imageDataUrls.length,
    };

    self.postMessage(response);

  } catch (error) {
    console.error(`[Worker] OCR job ${jobId} failed:`, error);

    // Send error response back to main thread
    const response: OCRResponse = {
      jobId,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      method: 'ocr',
      confidence: 0,
      pagesProcessed: 0,
    };

    self.postMessage(response);
  }
};

// Log worker initialization
console.log('[Worker] PDF OCR Worker initialized');
