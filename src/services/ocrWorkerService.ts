/**
 * OCR Worker Service
 *
 * Manages communication between the main thread and the PDF OCR Web Worker.
 * Handles job queuing, progress reporting, and worker lifecycle.
 *
 * This service ensures that:
 * - Only one worker instance exists at a time
 * - Jobs are properly tracked and resolved
 * - Workers are cleaned up when not needed
 * - Errors are properly handled and reported
 */

// Worker URL will be created dynamically

interface OCRJob {
  id: string;
  resolve: (value: OCRResult) => void;
  reject: (error: Error) => void;
  fileName: string;
  startTime: number;
}

interface OCRResult {
  success: boolean;
  text?: string;
  method: 'text' | 'ocr';
  confidence: number;
  pagesProcessed?: number;
  error?: string;
}

interface WorkerRequest {
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

interface WorkerResponse {
  jobId: string;
  success: boolean;
  text?: string;
  error?: string;
  method: 'ocr';
  confidence: number;
  pagesProcessed: number;
}

class OCRWorkerServiceClass {
  private worker: Worker | null = null;
  private activeJobs = new Map<string, OCRJob>();
  private isInitializing = false;

  /**
   * Initialize the Web Worker
   * Uses dynamic import for Vite compatibility
   */
  private async initializeWorker(): Promise<void> {
    if (this.worker) return;
    if (this.isInitializing) {
      // Wait for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      return this.initializeWorker();
    }

    this.isInitializing = true;

    try {
      // Create worker using dynamic URL for Vite compatibility
      const workerUrl = new URL('../workers/pdfOCRWorker.ts', import.meta.url);
      this.worker = new Worker(workerUrl, { type: 'module' });

      // Set up message handler
      this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        this.handleWorkerMessage(e.data);
      };

      this.worker.onerror = (error) => {
        console.error('[OCR Worker] Worker error:', error);
      };

      console.log('[OCR Worker] Worker initialized successfully');
    } catch (error) {
      console.error('[OCR Worker] Failed to initialize worker:', error);
      throw new Error('Failed to initialize OCR worker');
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Handle messages from the worker
   */
  private handleWorkerMessage(response: WorkerResponse): void {
    const job = this.activeJobs.get(response.jobId);

    if (!job) {
      console.warn(`[OCR Worker] No job found with ID: ${response.jobId}`);
      return;
    }

    const duration = Date.now() - job.startTime;
    console.log(`[OCR Worker] Job ${response.jobId} completed in ${duration}ms`);

    if (response.success) {
      job.resolve({
        success: true,
        text: response.text,
        method: 'ocr',
        confidence: response.confidence,
        pagesProcessed: response.pagesProcessed,
      });
    } else {
      job.reject(new Error(response.error || 'OCR processing failed'));
    }

    this.activeJobs.delete(response.jobId);
  }

  /**
   * Generate a unique job ID
   */
  private generateJobId(): string {
    return `ocr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Convert PDF pages to images using PDF.js
   * Now uses smart page selection for faster processing
   */
  private async convertPDFToImages(file: File, maxPages: number = 3): Promise<string[]> {
    // Import functions from contractPDFExtractor
    const { convertAllPagesToImages } = await import('./contractPDFExtractor');
    
    // Get all images but we'll only process priority pages
    const allImages = await convertAllPagesToImages(file);
    
    // For smart extraction, we only need first few pages
    // Most contract data is in pages 1-3
    if (allImages.length > maxPages) {
      console.log(`[OCR Worker] Smart page selection: Using first ${maxPages} of ${allImages.length} pages`);
      return allImages.slice(0, maxPages);
    }
    
    return allImages;
  }

  /**
   * Process a PDF file with OCR
   * This method handles both text-based and scanned PDFs
   */
  async processPDF(
    file: File,
    config: {
      apiKey: string;
      supabaseUrl: string;
      language?: string;
    },
    onProgress?: (progress: { stage: string; percent: number }) => void
  ): Promise<OCRResult> {
    onProgress?.({ stage: 'initializing', percent: 0 });

    // Step 1: Try text extraction first (fast, free)
    onProgress?.({ stage: 'extracting_text', percent: 10 });

    try {
      const { extractTextFromPDF } = await import('./contractPDFExtractor');
      const textResult = await extractTextFromPDF(file);

      // Check if text extraction was successful
      if (textResult.confidence > 0.3 && textResult.rawText.length > 100) {
        console.log('[OCR Worker] Sufficient text found, skipping OCR');
        onProgress?.({ stage: 'complete', percent: 100 });

        return {
          success: true,
          text: textResult.rawText,
          method: 'text',
          confidence: textResult.confidence,
        };
      }

      console.log('[OCR Worker] Insufficient text, falling back to OCR');
    } catch (error) {
      console.log('[OCR Worker] Text extraction failed, using OCR:', error);
    }

    // Step 2: Fall back to OCR
    onProgress?.({ stage: 'converting_to_images', percent: 20 });

    try {
      // Initialize worker
      await this.initializeWorker();

      // Convert PDF to images (smart: only first 3 pages for speed)
      onProgress?.({ stage: 'preparing_ocr', percent: 30 });
      const SMART_MAX_PAGES = 3; // Process only first 3 pages for speed
      const imageDataUrls = await this.convertPDFToImages(file, SMART_MAX_PAGES);

      if (imageDataUrls.length === 0) {
        throw new Error('Failed to convert PDF to images');
      }

      console.log(`[OCR Worker] Smart OCR: Processing ${imageDataUrls.length} page(s) (optimized)`);

      // Create job
      const jobId = this.generateJobId();
      const ocrPromise = new Promise<OCRResult>((resolve, reject) => {
        this.activeJobs.set(jobId, {
          id: jobId,
          resolve,
          reject,
          fileName: file.name,
          startTime: Date.now(),
        });
      });

      // Send to worker
      onProgress?.({ stage: 'processing_ocr', percent: 50 });

      const request: WorkerRequest = {
        jobId,
        type: 'extract_text',
        imageDataUrls,
        fileName: file.name,
        config: {
          engine: 'openai',
          language: config.language || 'ar',
          apiKey: config.apiKey,
          supabaseUrl: config.supabaseUrl,
        },
      };

      this.worker!.postMessage(request);

      // Wait for completion with timeout (60 seconds for OpenAI)
      onProgress?.({ stage: 'finalizing', percent: 90 });
      
      const OPENAI_TIMEOUT = 60000; // 60 seconds timeout
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          // Clean up the job
          this.activeJobs.delete(jobId);
          reject(new Error('OpenAI OCR timeout - switching to Tesseract'));
        }, OPENAI_TIMEOUT);
      });

      try {
        const result = await Promise.race([ocrPromise, timeoutPromise]);
        onProgress?.({ stage: 'complete', percent: 100 });
        return result;
      } catch (openAiError) {
        console.warn('[OCR Worker] OpenAI OCR failed or timed out, trying Tesseract...', openAiError);
        
        // Fallback to Tesseract.js (free, local OCR)
        onProgress?.({ stage: 'tesseract_fallback', percent: 50 });
        
        try {
          const { extractTextWithTesseract } = await import('./tesseractOCR');
          
          const tesseractResult = await extractTextWithTesseract(imageDataUrls, (progress) => {
            onProgress?.({
              stage: `tesseract_${progress.stage}`,
              percent: 50 + Math.round(progress.percent * 0.5),
            });
          });

          if (tesseractResult.success && tesseractResult.text.length > 0) {
            console.log(`[OCR Worker] Tesseract fallback successful: ${tesseractResult.text.length} chars`);
            onProgress?.({ stage: 'complete', percent: 100 });
            
            return {
              success: true,
              text: tesseractResult.text,
              method: 'ocr' as const,
              confidence: tesseractResult.confidence,
              pagesProcessed: tesseractResult.pagesProcessed,
            };
          }
          
          throw new Error('Tesseract extraction returned no text');
        } catch (tesseractError) {
          console.error('[OCR Worker] Tesseract fallback also failed:', tesseractError);
          throw new Error(`OCR failed: OpenAI timed out and Tesseract failed`);
        }
      }

    } catch (error) {
      console.error('[OCR Worker] OCR processing failed:', error);
      throw error;
    }
  }

  /**
   * Check if there are any active jobs
   */
  hasActiveJobs(): boolean {
    return this.activeJobs.size > 0;
  }

  /**
   * Get the number of active jobs
   */
  getActiveJobCount(): number {
    return this.activeJobs.size;
  }

  /**
   * Terminate the worker and clean up resources
   */
  terminate(): void {
    console.log('[OCR Worker] Terminating worker');

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    // Reject all pending jobs
    this.activeJobs.forEach((job, jobId) => {
      job.reject(new Error('Worker terminated'));
    });

    this.activeJobs.clear();
  }
}

// Singleton instance
let ocrWorkerServiceInstance: OCRWorkerServiceClass | null = null;

export function getOCRWorkerService(): OCRWorkerServiceClass {
  if (!ocrWorkerServiceInstance) {
    ocrWorkerServiceInstance = new OCRWorkerServiceClass();
  }
  return ocrWorkerServiceInstance;
}

export { OCRWorkerServiceClass };
