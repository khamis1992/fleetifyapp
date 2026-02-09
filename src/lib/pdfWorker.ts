/**
 * PDF.js Worker Lazy Loader
 * Dynamically loads PDF.js worker only when needed
 * Prevents 1.2MB worker from being bundled in main app
 */

let pdfjsInstance: any = null;

export const loadPDFWorker = async () => {
  // Return cached instance if already loaded
  if (pdfjsInstance) {
    return pdfjsInstance;
  }

  try {
    // Dynamically import pdfjs-dist
    const pdfjs = await import('pdfjs-dist');

    // Use local worker via URL import (Vite handles this correctly)
    const workerUrl = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url);
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl.href;

    pdfjsInstance = pdfjs;
    return pdfjs;
  } catch (error) {
    console.error('Failed to load PDF.js worker:', error);
    throw error;
  }
};

export const isPDFWorkerLoaded = () => pdfjsInstance !== null;
