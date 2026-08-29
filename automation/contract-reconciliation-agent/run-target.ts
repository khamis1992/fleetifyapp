import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { createCanvas } from '@napi-rs/canvas';
import { createClient } from '@supabase/supabase-js';
import { config as loadDotenv } from 'dotenv';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createWorker } from 'tesseract.js';

loadDotenv({ path: path.resolve(process.cwd(), '.env'), override: false, quiet: true });
loadDotenv({
  path: path.resolve(process.cwd(), '.env.taqadi-agent'),
  override: false,
  quiet: true,
});

const COMPANY_ID = '24bc0b21-4e2d-4413-9842-31719a3669f4';
const MAX_PAGES = 12;

type ContractDocument = {
  id: string;
  company_id: string;
  contract_id: string;
  document_name: string | null;
  document_type: string;
  file_path: string;
  mime_type: string | null;
  legal_identity_match_status: string;
};

function argumentValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

async function renderPdfPages(bytes: Uint8Array) {
  const pdf = await getDocument({
    data: bytes,
    isEvalSupported: false,
    useSystemFonts: true,
    disableFontFace: true,
  }).promise;
  const pages: Array<{ pageNumber: number; imageBase64: string }> = [];

  try {
    const pageCount = Math.min(pdf.numPages, MAX_PAGES);
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.6 });
      const canvas = createCanvas(
        Math.ceil(viewport.width),
        Math.ceil(viewport.height),
      );
      const canvasContext = canvas.getContext('2d');
      await page.render({ canvas, canvasContext, viewport }).promise;
      pages.push({
        pageNumber,
        imageBase64: canvas.toBuffer('image/jpeg', 84).toString('base64'),
      });
      page.cleanup();
    }
  } finally {
    await pdf.destroy();
  }

  return pages;
}

async function loadTargetDocument(
  supabase: ReturnType<typeof createClient>,
  contractId: string,
): Promise<ContractDocument> {
  const { data, error } = await supabase
    .from('contract_documents')
    .select('id,company_id,contract_id,document_name,document_type,file_path,mime_type,legal_identity_match_status')
    .eq('company_id', COMPANY_ID)
    .eq('contract_id', contractId)
    .in('document_type', ['signed_contract', 'signed_contract_image'])
    .eq('legal_identity_match_status', 'matched')
    .not('file_path', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.file_path) {
    const { data: request, error: requestError } = await supabase.rpc(
      'enqueue_missing_contract_pdf_request_v1',
      {
        p_company_id: COMPANY_ID,
        p_contract_id: contractId,
        p_reason: null,
        p_actor_id: null,
      },
    );
    if (requestError) throw requestError;
    const requestStatus = request && typeof request === 'object' && 'status' in request
      ? String(request.status)
      : 'pending';
    throw new Error(
      `No identity-matched signed contract was found; WhatsApp request status: ${requestStatus}`,
    );
  }
  return data as ContractDocument;
}

async function main() {
  const contractId = argumentValue('--contract-id');
  const dryRun = process.argv.includes('--dry-run');
  const localOcr = process.argv.includes('--local-ocr');
  const renderOnly = process.argv.includes('--render-only');
  if (!contractId) {
    throw new Error('Usage: --contract-id <uuid> [--dry-run]');
  }

  const supabaseUrl = process.env.TAQADI_SUPABASE_URL
    || process.env.VITE_SUPABASE_URL
    || '';
  const serviceRoleKey = process.env.TAQADI_SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    || '';
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase URL and service-role key are required');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const document = await loadTargetDocument(supabase, contractId);
  const { data: file, error: downloadError } = await supabase.storage
    .from('contract-documents')
    .download(document.file_path);
  if (downloadError || !file) {
    throw downloadError || new Error('Signed contract download failed');
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const isPdf = document.mime_type?.includes('pdf')
    || document.file_path.toLowerCase().endsWith('.pdf');
  const pages = isPdf
    ? await renderPdfPages(bytes)
    : [{ pageNumber: 1, imageBase64: Buffer.from(bytes).toString('base64') }];
  if (pages.length === 0) throw new Error('No document pages could be rendered');

  if (renderOnly) {
    const outputDir = await mkdtemp(path.join(os.tmpdir(), 'fleetify-contract-pages-'));
    const outputPaths: string[] = [];
    for (const page of pages) {
      const outputPath = path.join(outputDir, `page-${page.pageNumber}.jpg`);
      await writeFile(outputPath, Buffer.from(page.imageBase64, 'base64'));
      outputPaths.push(outputPath);
    }
    console.log(JSON.stringify({ outputDir, outputPaths }, null, 2));
    return;
  }

  if (localOcr) {
    const worker = await createWorker(['ara', 'eng']);
    const textParts: string[] = [];
    try {
      for (const page of pages) {
        const { data } = await worker.recognize(
          Buffer.from(page.imageBase64, 'base64'),
        );
        textParts.push(`--- page ${page.pageNumber} ---\n${data.text}`);
      }
    } finally {
      await worker.terminate();
    }
    console.log(JSON.stringify({
      contractId,
      documentId: document.id,
      documentName: document.document_name,
      pageCount: pages.length,
      localOcr: true,
      text: textParts.join('\n'),
    }, null, 2));
    return;
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/contract-terms-scanner`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mode: 'pages',
      contractDocumentId: document.id,
      pages,
      autoApply: !dryRun,
      dryRun,
    }),
    signal: AbortSignal.timeout(240_000),
  });
  const result = await response.json().catch(() => ({
    success: false,
    error: `Non-JSON response (HTTP ${response.status})`,
  }));
  console.log(JSON.stringify({
    httpStatus: response.status,
    contractId,
    documentId: document.id,
    documentName: document.document_name,
    pageCount: pages.length,
    dryRun,
    result,
  }, null, 2));
  if (!response.ok || result?.success !== true) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
