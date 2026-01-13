/**
 * Contract PDF Extraction Service
 * Handles extraction of text and data from contract PDF files
 */

import * as pdfjsLib from 'pdfjs-dist';

// Initialize PDF.js worker
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  }
}

export interface ExtractedContractData {
  rawText: string;
  confidence: number;
  pages: string[];
}

/**
 * Extract text content from a PDF file
 */
export async function extractTextFromPDF(file: File): Promise<ExtractedContractData> {
  try {
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
    };
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('فشل استخراج النص من ملف PDF');
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
  scale: number = 2
): Promise<string[]> {
  try {
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
