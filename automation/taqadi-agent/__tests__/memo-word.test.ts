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
    expect(
      await isValidDocxBuffer(await fs.readFile(documents[1].filePath)),
    ).toBe(true);
  }, 30_000);

  it('rejects empty memo HTML instead of producing a fake Word file', async () => {
    await expect(createMemoDocxBuffer('   ')).rejects.toThrow('Memo HTML is empty');
  });
});
