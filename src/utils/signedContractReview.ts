import { loadPDFWorker } from '@/lib/pdfWorker';

// The identity scanner accepts at most 20 pages. Never silently approve a truncated scan.
export const MAX_SIGNED_CONTRACT_PAGES = 20;
export const contractQrPayload = (number: string) => `FLEETIFY:CONTRACT:1:${encodeURIComponent(number.trim())}`;

export function readContractQr(value: string): string | null {
  if (!value.startsWith('FLEETIFY:CONTRACT:1:')) return null;
  try { return decodeURIComponent(value.slice('FLEETIFY:CONTRACT:1:'.length)); }
  catch { throw new Error('رمز تعريف العقد تالف؛ أعد رفع نسخة واضحة'); }
}

export const normalizeContractNumber = (value: string) => value.trim().toUpperCase()
  .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x660))
  .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x6f0));

export function extractLabeledContractNumbers(text: string): string[] {
  const normalized = normalizeContractNumber(text);
  return Array.from(normalized.matchAll(/(?:رقم\s*(?:العقد|عقد)|(?:العقد|عقد)\s*رقم|CONTRACT\s*(?:NO\.?|NUMBER|#))\s*[:#-]?\s*([A-Z0-9][A-Z0-9/-]{2,})/g), (match) => match[1]);
}

export interface ReviewPage { image: string; width: number; height: number; contractNumber: string | null; textContractNumbers?: string[] }

export function findMismatchedContractPage(pages: ReviewPage[], expected?: string): number {
  if (!expected) return -1;
  const number = normalizeContractNumber(expected);
  return pages.findIndex((page) => [page.contractNumber, ...(page.textContractNumbers || [])]
    .some((found) => found !== null && normalizeContractNumber(found) !== number));
}

export async function loadSignedContractPages(file: File, options: { readContractMarkers?: boolean } = {}): Promise<ReviewPage[]> {
  if (file.size > 100 * 1024 * 1024) throw new Error('الحد الأقصى 100 ميجابايت');
  const jsQR = options.readContractMarkers === false ? null : (await import('jsqr')).default;
  const pages: ReviewPage[] = [];
  const capture = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')!;
    const pixels = jsQR ? ctx.getImageData(0, 0, canvas.width, canvas.height) : null;
    const qr = jsQR && pixels ? jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'attemptBoth' }) : null;
    pages.push({ image: canvas.toDataURL('image/jpeg', 0.9), width: canvas.width, height: canvas.height,
      contractNumber: qr ? readContractQr(qr.data) : null });
    canvas.width = canvas.height = 0;
  };
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    const pdfjs = await loadPDFWorker();
    const task = pdfjs.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false });
    try {
      const pdf = await task.promise;
      if (pdf.numPages > MAX_SIGNED_CONTRACT_PAGES) throw new Error(`الحد الأقصى ${MAX_SIGNED_CONTRACT_PAGES} صفحة؛ لن يتم اقتطاع الملف`);
      for (let index = 1; index <= pdf.numPages; index++) {
        const page = await pdf.getPage(index);
        const original = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(3, 3000 / Math.max(original.width, original.height)) });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        await page.render({ canvasContext: canvas.getContext('2d')!, canvas, viewport }).promise;
        capture(canvas);
        if (options.readContractMarkers !== false) {
          const text = await page.getTextContent();
          pages[pages.length - 1].textContractNumbers = extractLabeledContractNumbers(
            text.items.map((item: { str?: string }) => item.str || '').join(' '),
          );
        }
        page.cleanup();
      }
    } finally { await task.destroy(); }
  } else if (['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      capture(canvas);
    } finally { bitmap.close(); }
  } else throw new Error('نسخة العقد الموقعة يجب أن تكون PDF أو صورة JPG أو PNG أو WebP');
  if (!pages.length) throw new Error('الملف لا يحتوي على صفحات');
  return pages;
}

export async function applySignedContractRotations(file: File, rotations: number[]): Promise<File> {
  if (!rotations.some((value) => value % 360)) {
    return file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf'
      ? new File([file], file.name, { type: 'application/pdf' }) : file;
  }
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    const { PDFDocument, PDFSignature, degrees } = await import('pdf-lib');
    const pdf = await PDFDocument.load(new Uint8Array(await file.arrayBuffer()));
    if (pdf.getForm().getFields().some((field) => field instanceof PDFSignature)) {
      throw new Error('الملف يحتوي على توقيع رقمي؛ ارفع الأصل دون تدوير للحفاظ على التوقيع');
    }
    if (pdf.getPageCount() !== rotations.length) throw new Error('عدد الصفحات لا يطابق المعاينة');
    pdf.getPages().forEach((page, i) => page.setRotation(degrees((page.getRotation().angle + rotations[i]) % 360)));
    const bytes = await pdf.save();
    return new File([new Uint8Array(bytes)], file.name, { type: 'application/pdf' });
  }
  const bitmap = await createImageBitmap(file);
  try {
    const angle = rotations[0] % 360;
    const swap = angle % 180 !== 0;
    const canvas = document.createElement('canvas');
    canvas.width = swap ? bitmap.height : bitmap.width;
    canvas.height = swap ? bitmap.width : bitmap.height;
    const ctx = canvas.getContext('2d')!;
    ctx.translate(canvas.width / 2, canvas.height / 2); ctx.rotate(angle * Math.PI / 180);
    ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('تعذر حفظ التدوير')), 'image/png'));
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.png', { type: 'image/png' });
  } finally { bitmap.close(); }
}
