import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser } from 'playwright';
import { agentConfig } from './config';
import {
  createMemoDocxBuffer,
  isValidDocxBuffer,
  MEMO_DOCX_MIME,
} from './memo-docx';
import type {
  FilingDocument,
  FilingJob,
  MaterializedDocument,
} from './types';

const PDF_HEADER = Buffer.from('%PDF-');
const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
const TAQADI_NORMALIZED_MARKER_VERSION = 'taqadi-raster-v1';

const safeName = (value: string) =>
  value
    // Windows file names cannot contain ASCII control characters.
    // eslint-disable-next-line no-control-regex
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);

async function isPdf(filePath: string) {
  const handle = await fs.open(filePath, 'r');
  try {
    const header = Buffer.alloc(PDF_HEADER.length);
    await handle.read(header, 0, header.length, 0);
    return header.equals(PDF_HEADER);
  } finally {
    await handle.close();
  }
}

async function isMemoWordFile(filePath: string) {
  const buffer = await fs.readFile(filePath);
  return isValidDocxBuffer(buffer);
}

function authenticatedStorageUrl(url: string) {
  const signedPrefix = '/storage/v1/object/sign/';
  const parsed = new URL(url);
  const markerIndex = parsed.pathname.indexOf(signedPrefix);
  if (
    markerIndex < 0
    || parsed.origin !== new URL(agentConfig.supabaseUrl).origin
  ) return null;

  const objectPath = parsed.pathname.slice(markerIndex + signedPrefix.length);
  if (!objectPath.includes('/')) return null;
  return `${parsed.origin}/storage/v1/object/authenticated/${objectPath}`;
}

async function fetchBuffer(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    let response = await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': 'Fleetify-Taqadi-Agent/1.0' },
    });
    const authenticatedUrl = authenticatedStorageUrl(url);
    if (!response.ok && authenticatedUrl) {
      response = await fetch(authenticatedUrl, {
        signal: controller.signal,
        headers: {
          apikey: agentConfig.supabaseServiceRoleKey,
          Authorization: `Bearer ${agentConfig.supabaseServiceRoleKey}`,
          'user-agent': 'Fleetify-Taqadi-Agent/1.0',
        },
      });
    }
    if (!response.ok) {
      throw new Error(
        `document download failed with HTTP ${response.status}`,
      );
    }
    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get('content-type') || '',
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function renderHtmlPdf(
  browser: Browser,
  html: string,
  outputPath: string,
) {
  const page = await browser.newPage({
    viewport: { width: 1240, height: 1754 },
  });
  try {
    await page.setContent(html, {
      waitUntil: 'networkidle',
      timeout: 60_000,
    });
    await page.emulateMedia({ media: 'print' });
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '8mm',
        right: '8mm',
        bottom: '8mm',
        left: '8mm',
      },
    });
  } finally {
    await page.close();
  }
}

async function renderImagePdf(
  browser: Browser,
  data: Buffer,
  contentType: string,
  outputPath: string,
) {
  const dataUrl = `data:${contentType};base64,${data.toString('base64')}`;
  await renderHtmlPdf(
    browser,
    `<!doctype html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <style>
            @page { size: A4; margin: 8mm; }
            html, body { margin: 0; padding: 0; }
            body { min-height: 100vh; display: grid; place-items: center; }
            img { display: block; max-width: 100%; max-height: 277mm; object-fit: contain; }
          </style>
        </head>
        <body><img src="${dataUrl}" alt="مستند الدعوى" /></body>
      </html>`,
    outputPath,
  );
}

async function normalizePdfForTaqadi(
  browser: Browser,
  sourcePath: string,
) {
  const markerPath = `${sourcePath}.${TAQADI_NORMALIZED_MARKER_VERSION}`;
  if (await fs.stat(markerPath).catch(() => null)) return;

  const [{ getDocument }, { createCanvas }] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('@napi-rs/canvas'),
  ]);
  const source = await fs.readFile(sourcePath);
  const pdf = await getDocument({
    data: new Uint8Array(source),
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  const pageImages: string[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const pdfPage = await pdf.getPage(pageNumber);
      const viewport = pdfPage.getViewport({ scale: 2 });
      const canvas = createCanvas(
        Math.ceil(viewport.width),
        Math.ceil(viewport.height),
      );
      const canvasContext = canvas.getContext('2d');
      await pdfPage.render({
        canvas,
        canvasContext,
        viewport,
      }).promise;
      pageImages.push(
        `data:image/jpeg;base64,${canvas.toBuffer('image/jpeg', 90).toString('base64')}`,
      );
      pdfPage.cleanup();
    }
  } finally {
    await pdf.destroy();
  }

  const page = await browser.newPage({
    viewport: { width: 1240, height: 1754 },
  });
  const normalizedPath = `${sourcePath}.normalized.tmp.pdf`;
  try {
    const pages = pageImages
      .map((dataUrl) => `<section><img src="${dataUrl}" alt="" /></section>`)
      .join('');
    await page.setContent(
      `<!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              @page { size: A4; margin: 0; }
              html, body { margin: 0; padding: 0; }
              section {
                width: 210mm;
                height: 297mm;
                break-after: page;
                display: grid;
                place-items: center;
                overflow: hidden;
              }
              section:last-child { break-after: auto; }
              img { display: block; width: 100%; height: 100%; object-fit: contain; }
            </style>
          </head>
          <body>${pages}</body>
        </html>`,
      { waitUntil: 'load', timeout: 60_000 },
    );
    await page.pdf({
      path: normalizedPath,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
  } finally {
    await page.close();
  }

  const normalizedStat = await fs.stat(normalizedPath);
  if (
    normalizedStat.size < 500
    || normalizedStat.size > MAX_DOCUMENT_BYTES
    || !(await isPdf(normalizedPath))
  ) {
    await fs.unlink(normalizedPath).catch(() => undefined);
    throw new Error('Normalized PDF is invalid or exceeds 20 MB');
  }
  await fs.rename(normalizedPath, sourcePath);
  await fs.writeFile(markerPath, TAQADI_NORMALIZED_MARKER_VERSION, 'utf8');
}

async function materializeOne(
  browser: Browser,
  document: FilingDocument,
  outputPath: string,
) {
  if (document.htmlContent) {
    await renderHtmlPdf(browser, document.htmlContent, outputPath);
    return;
  }
  if (!document.url) {
    throw new Error(`No file source was supplied for ${document.name}`);
  }

  const { buffer, contentType } = await fetchBuffer(document.url);
  if (
    contentType.includes('application/pdf')
    || buffer.subarray(0, PDF_HEADER.length).equals(PDF_HEADER)
  ) {
    await fs.writeFile(outputPath, buffer);
    return;
  }
  if (contentType.startsWith('image/')) {
    await renderImagePdf(browser, buffer, contentType, outputPath);
    return;
  }
  if (contentType.includes('text/html')) {
    await renderHtmlPdf(browser, buffer.toString('utf8'), outputPath);
    return;
  }

  throw new Error(
    `Unsupported document type for ${document.name}: ${contentType || 'unknown'}`,
  );
}

async function memoHtml(document: FilingDocument) {
  if (document.htmlContent?.trim()) return document.htmlContent;
  if (!document.url) {
    throw new Error('Memo HTML is required to generate the Word copy');
  }

  const { buffer, contentType } = await fetchBuffer(document.url);
  if (contentType.includes('text/html')) return buffer.toString('utf8');
  throw new Error(
    'Memo Word copy requires the original HTML source; the available source is not HTML',
  );
}

async function materializeMemoWord(
  document: FilingDocument,
  outputPath: string,
) {
  const html = await memoHtml(document);
  const buffer = await createMemoDocxBuffer(html);
  await fs.writeFile(outputPath, buffer);
}

export async function materializeFilingDocuments(
  job: FilingJob,
): Promise<MaterializedDocument[]> {
  const jobDir = path.join(agentConfig.jobsDir, job.id, 'documents');
  await fs.mkdir(jobDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  try {
    const results: MaterializedDocument[] = [];
    for (let index = 0; index < job.payload.documents.length; index += 1) {
      const document = job.payload.documents[index];
      if (document.required && !document.ready) {
        throw new Error(`Required document is not ready: ${document.name}`);
      }

      const fileStem = `${String(index + 1).padStart(2, '0')}_${safeName(document.name)}`;
      const fileName = `${fileStem}.pdf`;
      const outputPath = path.join(jobDir, fileName);
      const existingStat = await fs.stat(outputPath).catch(() => null);
      const reusable = Boolean(
        existingStat
        && existingStat.size >= 500
        && existingStat.size <= MAX_DOCUMENT_BYTES
        && await isPdf(outputPath).catch(() => false),
      );
      if (!reusable) {
        await materializeOne(browser, document, outputPath).catch((error) => {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to prepare "${document.name}": ${message}`);
        });
      }

      if (!(await isPdf(outputPath))) {
        throw new Error(`Generated file is not a valid PDF: ${document.name}`);
      }
      if (document.key === 'violationsEvidence') {
        await normalizePdfForTaqadi(browser, outputPath).catch((error) => {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to normalize "${document.name}" for Taqadi: ${message}`);
        });
      }
      const stat = await fs.stat(outputPath);
      if (stat.size < 500) {
        throw new Error(`Generated PDF is empty: ${document.name}`);
      }
      if (stat.size > MAX_DOCUMENT_BYTES) {
        throw new Error(`PDF exceeds 20 MB: ${document.name}`);
      }

      results.push({
        key: document.key,
        name: document.name,
        filePath: outputPath,
        mimeType: 'application/pdf',
      });

      if (document.key === 'memo') {
        // Taqadi requires the PDF and Word memo copies to have the exact same
        // base file name; only their extensions may differ.
        const wordFileName = `${fileStem}.docx`;
        const wordOutputPath = path.join(jobDir, wordFileName);
        const legacyWordOutputPath = path.join(jobDir, `${fileStem}_Word.docx`);
        const obsoleteBinaryWordOutputPath = path.join(jobDir, `${fileStem}_Word.doc`);
        const currentWordStat = await fs.stat(wordOutputPath).catch(() => null);
        if (!currentWordStat) {
          const legacyWordStat = await fs.stat(legacyWordOutputPath)
            .catch(() => null);
          const reusableLegacyWord = Boolean(
            legacyWordStat
            && legacyWordStat.size >= 500
            && legacyWordStat.size <= MAX_DOCUMENT_BYTES
            && await isMemoWordFile(legacyWordOutputPath).catch(() => false),
          );
          if (reusableLegacyWord) {
            await fs.rename(legacyWordOutputPath, wordOutputPath);
          }
        }
        const wordStat = await fs.stat(wordOutputPath).catch(() => null);
        const reusableWord = Boolean(
          wordStat
          && wordStat.size >= 500
          && wordStat.size <= MAX_DOCUMENT_BYTES
          && await isMemoWordFile(wordOutputPath).catch(() => false),
        );
        if (!reusableWord) {
          await materializeMemoWord(document, wordOutputPath).catch((error) => {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to prepare Word copy of "${document.name}": ${message}`);
          });
        }

        if (!(await isMemoWordFile(wordOutputPath))) {
          throw new Error(`Generated file is not a valid Word document: ${document.name}`);
        }
        const finalWordStat = await fs.stat(wordOutputPath);
        if (finalWordStat.size > MAX_DOCUMENT_BYTES) {
          throw new Error(`Word document exceeds 20 MB: ${document.name}`);
        }

        // A previous agent version produced a second `_Word.doc` copy. Once
        // the matching DOCX is valid, remove stale variants so retries cannot
        // accidentally upload a memo whose base name differs from the PDF.
        await Promise.all(
          [legacyWordOutputPath, obsoleteBinaryWordOutputPath].map(async (legacyPath) => {
            await fs.unlink(legacyPath).catch((error: NodeJS.ErrnoException) => {
              if (error.code !== 'ENOENT') {
                throw error;
              }
            });
          }),
        );

        results.push({
          key: 'memoWord',
          name: `${document.name} (Word)`,
          filePath: wordOutputPath,
          mimeType: MEMO_DOCX_MIME,
        });
      }
    }
    return results;
  } finally {
    await browser.close();
  }
}
