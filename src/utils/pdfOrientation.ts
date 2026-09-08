import type { Worker } from 'tesseract.js';
import { loadPDFWorker } from '@/lib/pdfWorker';

export interface OrientationPage { image: string; width: number; height: number }
export interface OrientationSuggestion { rotation: number; confidence: number; reliable: boolean }

export function orientationSuggestion(degrees: number | null, confidence: number | null): OrientationSuggestion {
  // Tesseract.js returns the clockwise corrective angle (OSD orientation_id is
  // mapped to [0,270,180,90] by its worker). Confidence is an OSD score, not %.
  const reliable = degrees !== null && [0, 90, 180, 270].includes(degrees)
    && confidence !== null && Number.isFinite(confidence) && confidence >= 15;
  return { rotation: reliable ? degrees : 0, confidence: confidence ?? 0, reliable };
}

export async function renderOrientationPages(file: Blob): Promise<OrientationPage[]> {
  if (file.size > 25 * 1024 * 1024) throw new Error('الحد الأقصى لتصحيح الملف 25 ميجابايت');
  const pdfjs = await loadPDFWorker();
  const task = pdfjs.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false });
  try {
    const pdf = await task.promise;
    if (pdf.numPages < 1 || pdf.numPages > 50) throw new Error('التصحيح يدعم الملفات حتى 50 صفحة');
    const pages: OrientationPage[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const original = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min(2.5, 1800 / Math.max(original.width, original.height)) });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
      try {
        await page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport }).promise;
        pages.push({ image: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height });
      } finally { canvas.width = canvas.height = 0; page.cleanup(); }
    }
    return pages;
  } finally { await task.destroy(); }
}

export async function detectPageOrientations(
  pages: OrientationPage[], signal: AbortSignal, onProgress: (page: number) => void,
): Promise<OrientationSuggestion[]> {
  const { createWorker } = await import('tesseract.js');
  let worker: Worker | undefined;
  let rejectAbort: (reason: Error) => void = () => {};
  const aborted = new Promise<never>((_, reject) => { rejectAbort = reject; });
  // Prevent an unhandled rejection if cancellation happens between page tasks.
  void aborted.catch(() => undefined);
  const stop = () => { rejectAbort(new Error('تم إيقاف الفحص')); void worker?.terminate(); };
  signal.addEventListener('abort', stop, { once: true });
  let initializationTimeout: ReturnType<typeof setTimeout> | undefined;
  let finished = false;
  try {
    if (signal.aborted) throw new Error('تم إيقاف الفحص');
    const initialization = createWorker('osd', 0, {
      legacyCore: true, legacyLang: true, langPath: 'https://tessdata.projectnaptha.com/4.0.0',
    }).then((created) => {
      if (signal.aborted || finished) void created.terminate();
      return created;
    });
    worker = await Promise.race([initialization, aborted, new Promise<never>((_, reject) => {
      initializationTimeout = setTimeout(() => reject(new Error('تعذر تحميل نموذج الاتجاه؛ يمكنك التدوير يدويًا')), 60000);
    })]);
    clearTimeout(initializationTimeout);
    if (signal.aborted) throw new Error('تم إيقاف الفحص');
    const suggestions: OrientationSuggestion[] = [];
    for (let i = 0; i < pages.length; i++) {
      if (signal.aborted) throw new Error('تم إيقاف الفحص');
      onProgress(i + 1);
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        const result = await Promise.race([
          worker.detect(pages[i].image),
          aborted,
          new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('استغرق الفحص وقتًا طويلًا؛ يمكنك تدوير الصفحات يدويًا')), 60000); }),
        ]);
        suggestions.push(orientationSuggestion(result.data.orientation_degrees, result.data.orientation_confidence));
      } finally { clearTimeout(timeout); }
    }
    return suggestions;
  } finally {
    finished = true; clearTimeout(initializationTimeout);
    signal.removeEventListener('abort', stop); await worker?.terminate();
  }
}
