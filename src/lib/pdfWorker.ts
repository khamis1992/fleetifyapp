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

    // Set worker to load from CDN (not bundled)
    pdfjs.GlobalWorkerOptions.workerSrc =
      `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

    pdfjsInstance = pdfjs;
    return pdfjs;
  } catch (error) {
    console.error('Failed to load PDF.js worker:', error);
    throw error;
  }
};

export const isPDFWorkerLoaded = () => pdfjsInstance !== null;
