import { createCanvas } from '@napi-rs/canvas';
import { getDocument, type PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createWorker, type Worker } from 'tesseract.js';
import * as pdfLib from 'pdf-lib';
import { correctPdfOrientation, MAX_ORIENTATION_BYTES, MAX_ORIENTATION_PAGES } from '../../supabase/functions/_shared/pdf-orientation.ts';
import { decidePageOrientation, reliableReading, type OrientationReading, type PageOrientationEvidence } from './policy.ts';

async function render(pdf: PDFDocumentProxy, pageNumber: number, dimension: number): Promise<Buffer> {
  const page = await pdf.getPage(pageNumber);
  const size = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: Math.min(3, dimension / Math.max(size.width, size.height)) });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  try {
    await page.render({ canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: canvas.getContext('2d') as unknown as CanvasRenderingContext2D, viewport }).promise;
    return canvas.toBuffer('image/png');
  } finally { page.cleanup(); canvas.width = canvas.height = 0; }
}

export async function createOrientationDetector(cachePath: string) {
  let worker: Worker | undefined;
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const initialization = createWorker('osd', 0, {
    legacyCore: true, legacyLang: true, cachePath,
    langPath: 'https://tessdata.projectnaptha.com/4.0.0',
  }).then((created) => { if (closed) void created.terminate(); return created; });
  try {
    worker = await Promise.race([initialization, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('OSD initialization timed out')), 90_000);
    })]);
  } catch (error) { closed = true; throw error; }
  finally { clearTimeout(timer); }
  const read = async (image: Buffer): Promise<OrientationReading> => {
    if (closed) throw new Error('Detector is closed');
    let deadline: ReturnType<typeof setTimeout> | undefined;
    try {
      const { data } = await Promise.race([worker!.detect(image), new Promise<never>((_, reject) => {
        deadline = setTimeout(() => { closed = true; void worker?.terminate(); reject(new Error('OSD page timed out')); }, 60_000);
      })]);
      return { rotation: data.orientation_degrees, confidence: data.orientation_confidence };
    } finally { clearTimeout(deadline); }
  };
  return {
    async inspect(source: Uint8Array) {
      if (source.length > MAX_ORIENTATION_BYTES) throw new Error('PDF exceeds 25 MiB');
      // pdf-lib rejects encrypted files. Refuse signed PDFs before any OCR.
      const document = await pdfLib.PDFDocument.load(source, { updateMetadata: false });
      const count = document.getPageCount();
      if (count < 1 || count > MAX_ORIENTATION_PAGES) throw new Error('PDF exceeds 50 pages');
      if (document.context.enumerateIndirectObjects().some(([, object]) => object instanceof pdfLib.PDFDict
        && (object.has(pdfLib.PDFName.of('ByteRange')) || object.get(pdfLib.PDFName.of('FT'))?.toString() === '/Sig'
          || object.get(pdfLib.PDFName.of('Type'))?.toString() === '/Sig'))) throw new Error('Digitally signed PDF requires review');
      const task = getDocument({ data: source.slice(), isEvalSupported: false, useSystemFonts: true });
      const evidence: PageOrientationEvidence[] = [];
      try {
        const pdf = await task.promise;
        for (let number = 1; number <= count; number++) {
          const first = await read(await render(pdf, number, 1800));
          const second = await read(await render(pdf, number, 2200));
          // Upright consensus is terminal; rotated consensus needs a second
          // complete PDF render below to verify the stored /Rotate semantics.
          evidence.push(decidePageOrientation(number, first, second));
        }
      } finally { await task.destroy(); }
      const proposed = evidence.map((item) => reliableReading(item.first) && reliableReading(item.second)
        && item.first.rotation === item.second.rotation ? item.first.rotation! : 0);
      if (proposed.some(Boolean)) {
        const output = await correctPdfOrientation(source, proposed, pdfLib);
        const verificationTask = getDocument({ data: output.slice(), isEvalSupported: false, useSystemFonts: true });
        try {
          const corrected = await verificationTask.promise;
          for (let index = 0; index < count; index++) {
            if (!proposed[index]) continue;
            const verification = await read(await render(corrected, index + 1, 2000));
            evidence[index] = decidePageOrientation(index + 1, evidence[index].first, evidence[index].second, verification);
          }
        } finally { await verificationTask.destroy(); }
      }
      return { rotations: evidence.map((item) => item.rotation), evidence };
    },
    async close() { closed = true; await worker?.terminate(); },
  };
}
