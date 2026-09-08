import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config as loadDotenv } from 'dotenv';
import { createOrientationDetector } from './detect.ts';
import { ORIENTATION_AGENT_ID, ORIENTATION_DETECTOR_VERSION } from './policy.ts';

const COMPANY = '24bc0b21-4e2d-4413-9842-31719a3669f4';
type Candidate = { document_id: string; contract_id: string; file_path: string; source_fingerprint: string; human_reviewed: boolean; attempt_count: number };
type Inspection = { saved?: boolean; file_path: string; can_save: boolean; revision: string; source_sha256: string };
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

export async function invokeOrientation(service: SupabaseClient, body: Record<string, unknown>): Promise<Inspection> {
  const { data, error } = await service.functions.invoke('correct-contract-document-orientation', { body });
  if (error) {
    if (error.context instanceof Response) {
      const failure = await error.context.clone().json().catch(() => null);
      if (typeof failure?.error === 'string') throw new Error(failure.error);
    }
    throw new Error('Orientation service request failed');
  }
  if (!data || data.error) throw new Error(data?.error || 'Empty orientation response');
  return data;
}

export async function runOrientationScan(options: { apply: boolean; documentId?: string; maxDocuments?: number; maxMinutes?: number }) {
  loadDotenv({ path: '.env', quiet: true });
  loadDotenv({ path: '.env.taqadi-agent', quiet: true });
  loadDotenv({ path: '.env.document-orientation-agent', quiet: true, override: true });
  const url = process.env.ORIENTATION_SUPABASE_URL || process.env.TAQADI_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.ORIENTATION_SUPABASE_SERVICE_ROLE_KEY || process.env.TAQADI_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('A private server Supabase URL and service-role key are required');
  if (new URL(url).hostname !== 'qwhunliohlkkahbspfiu.supabase.co') throw new Error('Unexpected Supabase project');
  const service = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const report = { startedAt: new Date().toISOString(), finishedAt: '', apply: options.apply,
    scanned: 0, corrected: 0, needsReview: 0, skipped: 0, failed: 0, paused: false,
    results: [] as Record<string, unknown>[] };
  const cache = path.resolve('.document-orientation-agent');
  await mkdir(cache, { recursive: true });
  let detector: Awaited<ReturnType<typeof createOrientationDetector>> | undefined;
  const deadline = Date.now() + Math.max(1, Math.min(options.maxMinutes || 240, 360)) * 60_000;
  const limit = Math.max(1, Math.min(options.maxDocuments || 500, 1000));
  const visited = new Set<string>();
  try {
    if (options.apply) {
      const { error } = await service.rpc('assert_orientation_agent_enabled_v1', { p_company_id: COMPANY });
      if (error) { report.paused = true; return report; }
    }
    while (visited.size < limit && Date.now() < deadline) {
      const { data, error } = await service.rpc('contract_orientation_candidates_v1', { p_company_id: COMPANY, p_limit: 100, p_document_id: options.documentId || null });
      if (error) throw new Error(`Candidate selection failed (${error.code || 'database'})`);
      const candidates = (data as Candidate[]).filter((row) => !!row.contract_id && !visited.has(row.document_id)
        && (!options.documentId || row.document_id === options.documentId));
      if (!candidates.length) break;
      for (const candidate of candidates) {
        if (visited.size >= limit || Date.now() >= deadline) break;
        visited.add(candidate.document_id);
        const agentRequestId = randomUUID();
        let lease = false;
        let status = 'failed';
        let reason: string | null = null;
        let result: Record<string, unknown> = {};
        try {
          if (candidate.human_reviewed) { status = 'human_reviewed'; report.skipped++; }
          else {
            let inspection: Inspection | undefined;
            if (options.apply) {
              const { error: gateError } = await service.rpc('assert_orientation_agent_enabled_v1', { p_company_id: COMPANY });
              if (gateError) { report.paused = true; return report; }
              const { data: allowed, error: beginError } = await service.rpc('begin_trusted_agent_invocation_v1', {
                p_agent_id: ORIENTATION_AGENT_ID, p_company_id: COMPANY, p_request_id: agentRequestId, p_actor_id: null,
              });
              if (beginError || allowed !== true) { report.paused = true; return report; }
              lease = true;
              inspection = await invokeOrientation(service, { action: 'auto_inspect', companyId: COMPANY,
                contractId: candidate.contract_id, documentId: candidate.document_id, agentRequestId });
              if (inspection.file_path !== candidate.file_path) throw new Error('Source changed during selection');
            }
            if (inspection?.can_save === false) { status = 'protected'; report.skipped++; }
            else {
              const { data: blob, error: downloadError } = await service.storage.from('contract-documents').download(candidate.file_path);
              if (downloadError || !blob) throw new Error('Document download failed');
              const bytes = new Uint8Array(await blob.arrayBuffer());
              if (inspection && hash(bytes) !== inspection.source_sha256) throw new Error('Source changed before detection');
              detector ??= await createOrientationDetector(cache);
              let documentTimeout: ReturnType<typeof setTimeout> | undefined;
              const analysis = await Promise.race([detector.inspect(bytes), new Promise<never>((_, reject) => {
                documentTimeout = setTimeout(() => reject(new Error('Document scan timed out')), 10 * 60_000);
              })]).finally(() => clearTimeout(documentTimeout));
              const correctedPages = analysis.rotations.filter(Boolean).length;
              const reviewPages = analysis.evidence.filter((item) => item.needsReview).map((item) => item.page);
              report.scanned++;
              status = reviewPages.length ? 'needs_review' : correctedPages ? 'corrected' : 'upright';
              result = { page_count: analysis.rotations.length, corrected_pages: correctedPages, review_pages: reviewPages, evidence: analysis.evidence };
              if (reviewPages.length) report.needsReview++;
              if (correctedPages && options.apply && inspection) {
                const requestId = randomUUID();
                const saveBody = { action: 'auto_save', companyId: COMPANY, contractId: candidate.contract_id,
                  documentId: candidate.document_id, agentRequestId, requestId, revision: inspection.revision,
                  sourceSha256: inspection.source_sha256, rotations: analysis.rotations, evidence: analysis.evidence };
                let saved: Inspection;
                try { saved = await invokeOrientation(service, saveBody); }
                catch { saved = await invokeOrientation(service, saveBody); } // exact idempotent retry
                if (!saved.saved) throw new Error('The service did not confirm the correction');
                report.corrected++;
                // Use the exact post-save fingerprint; otherwise the new object
                // would be needlessly rescanned on tomorrow's run.
                const { data: current, error: currentError } = await service.rpc('contract_orientation_candidates_v1', { p_company_id: COMPANY, p_limit: 1, p_document_id: candidate.document_id });
                if (currentError) throw currentError;
                const updated = (current as Candidate[]).find((row) => row.document_id === candidate.document_id && row.file_path === saved.file_path);
                if (!updated) throw new Error('Corrected document changed before result recording');
                candidate.file_path = updated.file_path; candidate.source_fingerprint = updated.source_fingerprint;
              }
            }
          }
        } catch (error) {
          status = 'failed'; report.failed++;
          reason = error instanceof Error ? error.message.slice(0, 250) : 'Orientation scan failed';
          // A terminated OSD worker must not poison the following documents.
          await detector?.close().catch(() => undefined); detector = undefined;
        } finally {
          if (options.apply && !report.paused) {
            const retryHours = status === 'protected' ? 24 : status === 'failed' ? (candidate.attempt_count >= 2 ? 168 : 24) : null;
            const { error } = await service.from('contract_document_orientation_checks').upsert({
              document_id: candidate.document_id, company_id: COMPANY, contract_id: candidate.contract_id,
              file_path: candidate.file_path, source_fingerprint: candidate.source_fingerprint,
              detector_version: ORIENTATION_DETECTOR_VERSION, checked_at: new Date().toISOString(), status,
              reason, retry_after: retryHours ? new Date(Date.now() + retryHours * 3600_000).toISOString() : null,
              attempt_count: candidate.attempt_count + 1, ...result,
              page_count: result.page_count ?? null, corrected_pages: result.corrected_pages ?? 0,
              review_pages: result.review_pages ?? [], evidence: result.evidence ?? [],
            });
            if (error) {
              report.failed++; status = 'failed'; reason = `Result recording failed (${error.code || 'database'})`;
            }
          }
          if (lease) {
            const { error } = await service.rpc('finish_agent_execution_v1', { p_company_id: COMPANY,
              p_agent_id: ORIENTATION_AGENT_ID, p_request_id: agentRequestId, p_success: status !== 'failed',
              p_summary: { document_id: candidate.document_id, status, reason }, p_failure_code: status === 'failed' ? 'orientation_scan_failed' : null });
            if (error) throw new Error('Could not close orientation execution lease');
          }
        }
        report.results.push({ documentId: candidate.document_id, status, reason, ...result });
        await writeFile(path.join(cache, options.apply ? 'progress.json' : 'dry-run-progress.json'), JSON.stringify({
          ...report, updatedAt: new Date().toISOString(), results: undefined, lastDocumentId: candidate.document_id, lastStatus: status,
        }));
        if (options.documentId) break;
      }
      if (!options.apply || options.documentId) break; // dry runs do not advance persisted selection
    }
    return report;
  } finally {
    await detector?.close();
    report.finishedAt = new Date().toISOString();
    // Contains only document IDs and OSD geometry scores, never names or OCR text.
    await writeFile(path.join(cache, options.apply ? 'latest-run.json' : 'latest-dry-run.json'), JSON.stringify(report, null, 2));
  }
}
