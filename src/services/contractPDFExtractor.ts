/**
 * Contract PDF Extraction Service
 * Handles extraction of text and data from contract PDF files
 * Supports both text-based PDFs (fast, free) and scanned PDFs (OCR via OpenAI Vision API)
 * Uses hybrid approach with Web Worker for non-blocking processing
 */

import { loadPDFWorker } from '@/lib/pdfWorker';

export interface ExtractedContractData {
  rawText: string;
  confidence: number;
  pages: string[];
  method: 'text' | 'ocr';
}

/**
 * Extract text content from a PDF file (text-based)
 */
export async function extractTextFromPDF(file: File): Promise<ExtractedContractData> {
  try {
    const pdfjsLib = await loadPDFWorker();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const pages: string[] = [];
    let fullText = '';
    let totalConfidence = 0;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .trim();

      pages.push(pageText);
      fullText += pageText + '\n\n';

      // Calculate confidence based on text extraction quality
      const itemLength = textContent.items.length;
      totalConfidence += itemLength > 0 ? Math.min(itemLength / 50, 1) : 0;
    }

    const averageConfidence = totalConfidence / pdf.numPages;

    return {
      rawText: fullText.trim(),
      confidence: averageConfidence,
      pages,
      method: 'text',
    };
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('فشل استخراج النص من ملف PDF');
  }
}

/**
 * Smart text extraction - hybrid approach with OCR fallback
 *
 * This function implements a smart extraction strategy:
 * 1. First tries text-based extraction (fast, free, accurate for text PDFs)
 * 2. If text extraction fails or returns insufficient data, falls back to OCR
 * 3. OCR uses OpenAI Vision API via Web Worker for scanned/image-based PDFs
 *
 * @param file - The PDF file to extract text from
 * @param language - Target language for OCR (default: 'ara' for Arabic)
 * @param ocrConfig - Optional configuration for OCR processing
 * @returns Extracted contract data with method used and confidence score
 */
export async function extractTextFromPDFSmart(
  file: File,
  language: string = 'ara',
  ocrConfig?: {
    apiKey?: string;
    supabaseUrl?: string;
    onProgress?: (progress: { stage: string; percent: number }) => void;
  }
): Promise<ExtractedContractData> {
  console.log('📄 Extracting text from PDF (hybrid approach)');
  console.log(`📁 File: ${file.name} (${Math.round(file.size / 1024)} KB)`);

  // Step 1: Try text-based extraction first (fast, free)
  try {
    console.log('🔍 Attempting text-based extraction...');
    ocrConfig?.onProgress?.({ stage: 'extracting_text', percent: 10 });

    const textResult = await extractTextFromPDF(file);

    // Check if text extraction was successful
    const hasSufficientText = textResult.confidence > 0.3 && textResult.rawText.length > 100;

    if (hasSufficientText) {
      console.log(`✅ Text extraction successful: ${textResult.rawText.length} characters extracted`);
      console.log(`📊 Confidence: ${Math.round(textResult.confidence * 100)}% (method: text)`);

      ocrConfig?.onProgress?.({ stage: 'complete', percent: 100 });

      return {
        ...textResult,
        method: 'text',
      };
    }

    console.log(`⚠️  Text extraction insufficient (${textResult.rawText.length} chars, ${Math.round(textResult.confidence * 100)}% confidence)`);
  } catch (error) {
    console.log('❌ Text extraction failed:', error);
  }

  // Step 2: Fall back to OCR for scanned/image-based PDFs
  if (!ocrConfig?.apiKey || !ocrConfig?.supabaseUrl) {
    console.warn('⚠️  OCR config not provided, cannot process scanned PDFs');
    console.warn('⚠️  ملف PDF ممسوح ضوئياً ويحتاج إلى OCR');
    console.warn('⚠️  للتفعيل: اذهب إلى الإعدادات وأدخل OpenAI API Key');

    // Return low-confidence result from text extraction
    const fallbackResult = await extractTextFromPDF(file);
    
    // Add helpful error message
    if (fallbackResult.rawText.length < 50) {
      console.error('❌ لم يتم استخراج نص كافٍ - الملف على الأرجح ممسوح ضوئياً');
    }
    
    return {
      ...fallbackResult,
      method: 'text',
    };
  }

  console.log('🤖 Falling back to OCR processing...');
  ocrConfig?.onProgress?.({ stage: 'initializing_ocr', percent: 20 });

  try {
    // Dynamically import the OCR worker service to avoid module loading issues
    const { getOCRWorkerService } = await import('./ocrWorkerService');
    const ocrService = getOCRWorkerService();

    ocrConfig?.onProgress?.({ stage: 'processing_pdf', percent: 30 });

    // Process PDF with OCR worker (includes text extraction retry + OCR fallback)
    const result = await ocrService.processPDF(file, {
      apiKey: ocrConfig.apiKey!,
      supabaseUrl: ocrConfig.supabaseUrl!,
      language,
    }, (progress) => {
      ocrConfig?.onProgress?.(progress);
    });

    if (result.success && result.text) {
      // Check if OpenAI refused to process (common refusal phrases)
      const refusalPhrases = [
        "I'm sorry, I can't assist",
        "I cannot assist",
        "I'm unable to",
        "I can't help with",
        "I apologize, but I cannot",
      ];
      
      const hasRefusal = refusalPhrases.some(phrase => 
        result.text.toLowerCase().includes(phrase.toLowerCase())
      );
      
      // Calculate actual useful text (excluding refusal messages)
      const usefulText = result.text
        .split('---')
        .filter(part => !refusalPhrases.some(phrase => 
          part.toLowerCase().includes(phrase.toLowerCase())
        ))
        .join('---');
      
      if (hasRefusal && usefulText.length < 200) {
        console.warn('⚠️ OpenAI refused to process most pages, trying Tesseract...');
        throw new Error('OpenAI refused to process document');
      }
      
      console.log(`✅ OCR extraction successful: ${result.text.length} characters extracted`);
      console.log(`📊 Confidence: ${Math.round((result.confidence || 0) * 100)}% (method: ${result.method})`);
      console.log(`📄 Pages processed: ${result.pagesProcessed || 1}`);

      return {
        rawText: result.text,
        confidence: result.confidence || 0.5,
        pages: [result.text],
        method: result.method,
      };
    }

    throw new Error(result.error || 'OCR processing failed');
  } catch (error) {
    console.error('❌ OpenAI OCR processing failed:', error);
    console.log('🔄 Trying Tesseract.js (free, local OCR)...');

    // Try Tesseract.js as fallback (free, no API needed)
    try {
      ocrConfig?.onProgress?.({ stage: 'trying_tesseract', percent: 40 });
      
      const { extractTextWithTesseract } = await import('./tesseractOCR');
      
      // Convert PDF to images first
      const imageDataUrls = await convertAllPagesToImages(file);
      
      if (imageDataUrls.length > 0) {
        const tesseractResult = await extractTextWithTesseract(imageDataUrls, (progress) => {
          ocrConfig?.onProgress?.({
            stage: progress.stage,
            percent: 40 + Math.round(progress.percent * 0.6), // 40-100%
          });
        });

        if (tesseractResult.success && tesseractResult.text.length > 50) {
          console.log(`✅ Tesseract extraction successful: ${tesseractResult.text.length} characters`);
          console.log(`📊 Confidence: ${Math.round(tesseractResult.confidence * 100)}%`);
          
          return {
            rawText: tesseractResult.text,
            confidence: tesseractResult.confidence,
            pages: [tesseractResult.text],
            method: 'ocr',
          };
        }
      }
    } catch (tesseractError) {
      console.error('❌ Tesseract OCR also failed:', tesseractError);
    }

    // Final fallback: return whatever text we could extract
    const fallbackResult = await extractTextFromPDF(file);
    console.warn(`⚠️  Using fallback extraction: ${fallbackResult.rawText.length} characters`);

    return {
      ...fallbackResult,
      method: 'text',
    };
  }
}

/**
 * Convert PDF page to image for OCR processing
 */
export async function convertPDFToImage(
  file: File,
  pageNumber: number = 1,
  scale: number = 2
): Promise<string> {
  try {
    const pdfjsLib = await loadPDFWorker();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('فشل إنشاء سياق Canvas');
    }

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    return canvas.toDataURL('image/png', 0.95);
  } catch (error) {
    console.error('Error converting PDF to image:', error);
    throw new Error('فشل تحويل PDF إلى صورة');
  }
}

/**
 * Check if PDF has extractable text or needs OCR
 */
export async function needsOCR(file: File): Promise<boolean> {
  try {
    const result = await extractTextFromPDF(file);
    // If text extraction confidence is low or text is too short, it needs OCR
    return result.confidence < 0.3 || result.rawText.length < 100;
  } catch {
    return true;
  }
}

/**
 * Extract all pages as images for OCR processing
 */
export async function convertAllPagesToImages(
  file: File,
  scale: number = 3 // Increased for better OCR quality (especially Arabic text)
): Promise<string[]> {
  try {
    const pdfjsLib = await loadPDFWorker();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const images: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const imageDataUrl = await convertPDFToImage(file, pageNum, scale);
      images.push(imageDataUrl);
    }

    return images;
  } catch (error) {
    console.error('Error converting all pages to images:', error);
    throw new Error('فشل تحويل جميع صفحات PDF إلى صور');
  }
}
