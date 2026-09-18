/** Test-only observation of real exporter blobs. Native downloads still run unchanged. */
type Observation = {
  sequence: number;
  mime: string;
  bytes: number;
  inspection: 'reading' | 'complete' | 'error';
  signature?: string;
  validPdf?: boolean;
  pageCount?: number;
  pages?: { page: number; widthPoints: number; heightPoints: number; widthMm: number; heightMm: number }[];
  zipSignature?: boolean;
  error?: string;
};

const originalCreateObjectURL = URL.createObjectURL;
const listeners = new Set<() => void>();
let observations: Observation[] = [];
let sequence = 0;
let visible = 'No PDF or Excel blob has been observed yet.';
const publish = () => {
  visible = JSON.stringify(observations, null, 2);
  listeners.forEach(listener => listener());
};

async function inspect(blob: Blob) {
  const observation: Observation = { sequence: ++sequence, mime: blob.type, bytes: blob.size, inspection: 'reading' };
  observations = [observation, ...observations].slice(0, 4);
  publish();
  try {
    const bytes = await blob.arrayBuffer();
    if (blob.type.includes('pdf')) {
      const signature = new TextDecoder('ascii').decode(bytes.slice(0, 5));
      observation.signature = signature;
      if (signature !== '%PDF-') throw new Error('The generated blob does not have a PDF signature');
      const { PDFDocument } = await import('pdf-lib');
      const document = await PDFDocument.load(bytes);
      observation.validPdf = true;
      observation.pageCount = document.getPageCount();
      observation.pages = document.getPages().map((page, index) => {
        const { width, height } = page.getSize();
        const round = (value: number) => Math.round(value * 100) / 100;
        return { page: index + 1, widthPoints: round(width), heightPoints: round(height), widthMm: round(width * 25.4 / 72), heightMm: round(height * 25.4 / 72) };
      });
    } else {
      observation.zipSignature = new Uint8Array(bytes.slice(0, 4)).join(',') === '80,75,3,4';
    }
    observation.inspection = 'complete';
  } catch (error) {
    observation.inspection = 'error';
    observation.error = error instanceof Error ? error.message : String(error);
  }
  publish();
}

URL.createObjectURL = function (object: Blob | MediaSource) {
  // Always preserve the original return value and browser download behavior.
  const url = originalCreateObjectURL.call(URL, object);
  if (object instanceof Blob && /pdf|spreadsheetml\.sheet|vnd\.ms-excel/.test(object.type)) void inspect(object);
  return url;
};

export const subscribeToDownloadInspection = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export const getDownloadInspection = () => visible;

if (import.meta.hot) import.meta.hot.dispose(() => {
  URL.createObjectURL = originalCreateObjectURL;
  listeners.clear();
});
