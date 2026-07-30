// Enqueues the daily Taqadi canary: a dry-run filing that reuses the most
// recently filed job's payload, walks the portal up to the parties page, and
// stops. If Taqadi changed its UI, the canary fails at dawn instead of a real
// lawsuit failing at noon.
//
// Usage: npm run taqadi:agent:canary
// Schedule daily (see README "Canary check").

import { createClient } from '@supabase/supabase-js';
import { agentConfig } from './config';
import type { FilingPayload } from './types';

interface SourceJobRow {
  id: string;
  company_id: string;
  legal_case_id: string;
  contract_id: string;
  requested_by: string;
  payload: FilingPayload;
}

async function main() {
  if (!agentConfig.supabaseUrl || !agentConfig.supabaseServiceRoleKey) {
    throw new Error(
      'Missing TAQADI_SUPABASE_URL or TAQADI_SUPABASE_SERVICE_ROLE_KEY',
    );
  }

  const client = createClient(
    agentConfig.supabaseUrl,
    agentConfig.supabaseServiceRoleKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: source, error: sourceError } = await client
    .from('taqadi_filing_jobs')
    .select('id,company_id,legal_case_id,contract_id,requested_by,payload')
    .eq('status', 'filed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (sourceError) throw sourceError;
  if (!source) {
    console.log(
      '[TaqadiCanary] no filed job found yet; canary needs one successful filing to clone.',
    );
    return;
  }

  const sourceJob = source as unknown as SourceJobRow;
  const today = new Date().toISOString().slice(0, 10);
  const payload: FilingPayload = {
    ...sourceJob.payload,
    canary: true,
    finalApproval: false,
  };

  const { data: created, error: insertError } = await client
    .from('taqadi_filing_jobs')
    .insert({
      company_id: sourceJob.company_id,
      legal_case_id: sourceJob.legal_case_id,
      contract_id: sourceJob.contract_id,
      status: 'queued',
      current_step: 'queued',
      progress: 0,
      payload,
      idempotency_key: `taqadi:canary:${today}`,
      final_approval: false,
      max_attempts: 1,
      requested_by: sourceJob.requested_by,
    })
    .select('id')
    .maybeSingle();

  if (insertError) {
    if (insertError.code === '23505') {
      console.log(
        `[TaqadiCanary] canary for ${today} already exists or another job is active for this case; nothing to do.`,
      );
      return;
    }
    throw insertError;
  }

  console.log(
    `[TaqadiCanary] queued canary job ${created?.id} for ${today} (clone of ${sourceJob.id}); the worker will stop after the parties page.`,
  );
}

main().catch((error) => {
  console.error('[TaqadiCanary] failed:', error);
  process.exitCode = 1;
});
