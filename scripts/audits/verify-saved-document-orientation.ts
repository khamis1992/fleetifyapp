import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { PDFDocument } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

config({ path: '.env', quiet: true });
config({ path: '.env.taqadi-agent', quiet: true });
config({ path: '.env.document-orientation-agent', quiet: true, override: true });
const requestId = process.argv[2];
if (!requestId || !/^[a-f0-9-]{36}$/.test(requestId)) throw new Error('Expected revision request UUID');
const url = process.env.ORIENTATION_SUPABASE_URL || process.env.TAQADI_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.ORIENTATION_SUPABASE_SERVICE_ROLE_KEY || process.env.TAQADI_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || new URL(url).hostname !== 'qwhunliohlkkahbspfiu.supabase.co') throw new Error('Private project configuration required');
const client = createClient(url, key, { auth: { persistSession: false } });
const { data: revision, error } = await client.from('contract_document_orientation_revisions').select('*')
  .eq('company_id', '24bc0b21-4e2d-4413-9842-31719a3669f4').eq('request_id', requestId).single();
if (error || !revision) throw new Error('Revision not found');
const pdfs: PDFDocument[] = [];
const verificationPage = (revision.rotations as number[]).findIndex(Boolean) + 1;
const folder = path.resolve('.document-orientation-agent', 'verification');
await mkdir(folder, { recursive: true });
for (const [label, filePath, expectedHash] of [
  ['before', revision.previous_file_path, revision.source_sha256],
  ['after', revision.corrected_file_path, revision.output_sha256],
]) {
  const { data: blob, error: downloadError } = await client.storage.from('contract-documents').download(filePath);
  if (downloadError || !blob) throw new Error('Revision download failed');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  assert.equal(createHash('sha256').update(bytes).digest('hex'), expectedHash);
  pdfs.push(await PDFDocument.load(bytes));
  const task = getDocument({ data: bytes.slice(), isEvalSupported: false, useSystemFonts: true });
  try {
    const pdf = await task.promise; const page = await pdf.getPage(verificationPage);
    const viewport = page.getViewport({ scale: 1.25 });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await page.render({ canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: canvas.getContext('2d') as unknown as CanvasRenderingContext2D, viewport }).promise;
    const target = path.join(folder, `${requestId}-${label}.png`);
    await writeFile(target, canvas.toBuffer('image/png'));
    console.log(JSON.stringify({ label, page: verificationPage, image: target }));
  } finally { await task.destroy(); }
}
assert.equal(pdfs[0].getPageCount(), pdfs[1].getPageCount());
pdfs[0].getPages().forEach((page, index) => {
  assert.equal(pdfs[1].getPage(index).getRotation().angle, (page.getRotation().angle + revision.rotations[index]) % 360);
});
console.log(JSON.stringify({ verified: true, pageCount: pdfs[0].getPageCount(), correctedPages: revision.rotations.filter(Boolean).length }));
