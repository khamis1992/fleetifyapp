/**
 * Contract PDF Extraction Service
 * Handles extraction of text and data from contract PDF files
 * Supports both text-based PDFs and scanned PDFs using local OCR.
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
 * 3. OCR uses Tesseract locally for scanned/image-based PDFs
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
    /** @deprecated OCR credentials are no longer accepted by the browser. */
    apiKey?: string;
    /** @deprecated OCR credentials are no longer accepted by the browser. */
    supabaseUrl?: string;
    onProgress?: (progress: { stage: string; percent: number }) => void;
  }
): Promise<ExtractedContractData> {
  let fallbackResult: ExtractedContractData | null = null;

  try {
    ocrConfig?.onProgress?.({ stage: 'extracting_text', percent: 10 });
    const textResult = await extractTextFromPDF(file);
    fallbackResult = textResult;

    const hasSufficientText = textResult.confidence > 0.3 && textResult.rawText.length > 100;
    if (hasSufficientText) {
      ocrConfig?.onProgress?.({ stage: 'complete', percent: 100 });
      return { ...textResult, method: 'text' };
    }
  } catch (error) {
    console.warn('[Contract OCR] Text extraction failed, using local OCR:', error);
  }

  try {
    ocrConfig?.onProgress?.({ stage: 'preparing_ocr', percent: 25 });
    const imageDataUrls = await convertAllPagesToImages(file, 3, 3);
    const { extractTextWithTesseract } = await import('./tesseractOCR');
    const tesseractResult = await extractTextWithTesseract(imageDataUrls, (progress) => {
      ocrConfig?.onProgress?.({
        stage: progress.stage,
        percent: 25 + Math.round(progress.percent * 0.75),
      });
    });

    if (tesseractResult.success && tesseractResult.text.trim().length > 50) {
      ocrConfig?.onProgress?.({ stage: 'complete', percent: 100 });
      return {
        rawText: tesseractResult.text,
        confidence: tesseractResult.confidence,
        pages: [tesseractResult.text],
        method: 'ocr',
      };
    }
  } catch (error) {
    console.error('[Contract OCR] Local OCR failed:', error);
  }

  if (fallbackResult) return { ...fallbackResult, method: 'text' };
  return { rawText: '', confidence: 0, pages: [], method: 'text' };
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
  scale: number = 3,
  maxPages?: number
): Promise<string[]> {
  try {
    const pdfjsLib = await loadPDFWorker();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const images: string[] = [];

    const pageCount = Math.min(pdf.numPages, maxPages ?? pdf.numPages);
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const imageDataUrl = await convertPDFToImage(file, pageNum, scale);
      images.push(imageDataUrl);
    }

    return images;
  } catch (error) {
    console.error('Error converting all pages to images:', error);
    throw new Error('فشل تحويل جميع صفحات PDF إلى صور');
  }
}
