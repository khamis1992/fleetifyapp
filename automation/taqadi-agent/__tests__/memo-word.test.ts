import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import { afterEach, describe, expect, it } from 'vitest';
import { agentConfig } from '../config';
import { materializeFilingDocuments } from '../document-materializer';
import {
  createMemoDocxBuffer,
  isValidDocxBuffer,
} from '../memo-docx';
import type { FilingJob } from '../types';

const createdJobDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    createdJobDirs.splice(0).map((jobDir) =>
      fs.rm(jobDir, { recursive: true, force: true })
    ),
  );
});

describe('Taqadi memo Word materialization', () => {
  it('creates a true DOCX using the same generator as the preparation page', async () => {
    const buffer = await createMemoDocxBuffer(`
      <!doctype html>
      <html lang="ar" dir="rtl">
        <body>
          <div class="company-ar"><h1>شركة العراف لتأجير السيارات</h1></div>
          <div class="subject-box">
            <strong>المذكرة الشارحة</strong>
            <span>مطالبة مالية</span>
          </div>
          <div class="info-row">
            <span class="info-label">رقم العقد:</span> C-TEST-1
          </div>
          <div class="section">
            <div class="section-title">الوقائع</div>
            <div class="section-content">
              <p>مطالبة مالية بقيمة 1000 ريال</p>
            </div>
          </div>
        </body>
      </html>
    `);
    expect(buffer.subarray(0, 2).toString('ascii')).toBe('PK');
    expect(await isValidDocxBuffer(buffer)).toBe(true);
    const archive = await JSZip.loadAsync(buffer);
    const documentXml = await archive.file('word/document.xml')?.async('string');
    expect(documentXml).toContain('المذكرة الشارحة');
    expect(documentXml).toContain('C-TEST-1');
    expect(documentXml).toContain('مطالبة مالية بقيمة 1000 ريال');
  });

  it('materializes matching PDF and Word copies for the memo', async () => {
    const jobId = `memo-word-test-${process.pid}-${Date.now()}`;
    const jobDir = path.join(agentConfig.jobsDir, jobId);
    createdJobDirs.push(jobDir);
    const html = `
      <!doctype html>
      <html lang="ar" dir="rtl">
        <head><meta charset="utf-8"><style>body { font-family: Arial; }</style></head>
        <body><h1>مذكرة شارحة</h1><p>نص الدعوى المعتمد</p></body>
      </html>
    `;
    const job = {
      id: jobId,
      payload: {
        documents: [{
          key: 'memo',
          name: 'المذكرة الشارحة',
          required: true,
          ready: true,
          url: null,
          htmlContent: html,
          mimeType: 'text/html',
        }],
      },
    } as FilingJob;

    const documents = await materializeFilingDocuments(job);

    expect(documents).toHaveLength(2);
    expect(documents.map((document) => document.key)).toEqual([
      'memo',
      'memoWord',
    ]);
    expect(documents[0].filePath).toMatch(/\.pdf$/i);
    expect(documents[1]).toMatchObject({
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    expect(documents[1].filePath).toMatch(/\.docx$/i);
    expect(path.parse(documents[1].filePath).name).toBe(
      path.parse(documents[0].filePath).name,
    );
    expect(
      await isValidDocxBuffer(await fs.readFile(documents[1].filePath)),
    ).toBe(true);

    const legacyWordPath = path.join(
      path.dirname(documents[1].filePath),
      `${path.parse(documents[1].filePath).name}_Word.docx`,
    );
    const obsoleteBinaryWordPath = path.join(
      path.dirname(documents[1].filePath),
      `${path.parse(documents[1].filePath).name}_Word.doc`,
    );
    await fs.rename(documents[1].filePath, legacyWordPath);
    await fs.writeFile(obsoleteBinaryWordPath, Buffer.alloc(600, 1));

    const retriedDocuments = await materializeFilingDocuments(job);
    expect(path.parse(retriedDocuments[1].filePath).name).toBe(
      path.parse(retriedDocuments[0].filePath).name,
    );
    await expect(fs.stat(retriedDocuments[1].filePath)).resolves.toBeDefined();
    await expect(fs.stat(legacyWordPath)).rejects.toMatchObject({
      code: 'ENOENT',
    });
    await expect(fs.stat(obsoleteBinaryWordPath)).rejects.toMatchObject({
      code: 'ENOENT',
    });
  }, 45_000);

  it('rejects empty memo HTML instead of producing a fake Word file', async () => {
    await expect(createMemoDocxBuffer('   ')).rejects.toThrow('Memo HTML is empty');
  });
});

describe('Taqadi PDF normalization', () => {
  it('rasterizes Ministry of Interior evidence before portal upload', async () => {
    const jobId = `moi-pdf-test-${process.pid}-${Date.now()}`;
    const jobDir = path.join(agentConfig.jobsDir, jobId);
    createdJobDirs.push(jobDir);
    const job = {
      id: jobId,
      payload: {
        documents: [{
          key: 'violationsEvidence',
          name: 'Ministry of Interior violations evidence',
          required: true,
          ready: true,
          url: null,
          htmlContent: `
            <!doctype html>
            <html><body>
              <h1>Traffic violations</h1>
              <a href="https://example.com/interactive-link">Source link</a>
            </body></html>
          `,
          mimeType: 'text/html',
        }],
      },
    } as FilingJob;

    const [document] = await materializeFilingDocuments(job);
    const markerPath = `${document.filePath}.taqadi-raster-v1`;
    await expect(fs.stat(markerPath)).resolves.toBeDefined();

    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdf = await getDocument({
      data: new Uint8Array(await fs.readFile(document.filePath)),
      isEvalSupported: false,
      useSystemFonts: true,
    }).promise;
    try {
      expect(pdf.numPages).toBe(1);
      const page = await pdf.getPage(1);
      expect(await page.getAnnotations()).toHaveLength(0);
    } finally {
      await pdf.destroy();
    }
  }, 45_000);
});
