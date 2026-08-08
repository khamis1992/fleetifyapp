import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const assigner = read('supabase/functions/smart-contract-assigner/index.ts');
const inbox = read('supabase/functions/violation-inbox-processor/index.ts');
const auditor = read('supabase/functions/nightly-ops-auditor/index.ts');
const duplicates = read('supabase/functions/customer-duplicate-detector/index.ts');
const repair = read('supabase/functions/safe-auto-repair/index.ts');
const crons = read('supabase/migrations/20260808162040_automation_wave_safe_repairs_crons.sql');
const mergeMigration = read('supabase/migrations/20260808162039_customer_merge_proposals.sql');

describe('automation wave agents', () => {
  it('smart assigner scores by workload and collection rate with audit log', () => {
    expect(assigner).toContain('collectionRate');
    expect(assigner).toContain('workload');
    expect(assigner).toContain('smart_assignment');
    expect(assigner).toContain('rebalance');
  });

  it('violation inbox extracts, matches, inserts and files the source', () => {
    expect(inbox).toContain('moi-inbox');
    expect(inbox).toContain('extract-traffic-violations');
    expect(inbox).toContain('penalties');
    expect(inbox).toContain('processed');
    expect(inbox).toContain('needs_review');
  });

  it('nightly auditor deduplicates findings by finding key', () => {
    expect(auditor).toContain('finding_key');
    expect(auditor).toContain('legal-claim-drift');
    expect(auditor).toContain('schedule-mismatch');
    expect(auditor).toContain('orphan-payment');
  });

  it('duplicate detector proposes merges and applies them without deleting', () => {
    expect(duplicates).toContain('customer_merge_proposals');
    expect(duplicates).toContain('merged_into_customer_id');
    expect(mergeMigration).toContain('customer_merge_distinct_pair');
  });

  it('safe auto-repair stores before/after state and supports rollback', () => {
    expect(repair).toContain('safe_auto_repairs');
    expect(repair).toContain('before_state');
    expect(repair).toContain('rollbackRepair');
    expect(repair).toContain('recalculate_contract_financial_state');
  });

  it('schedules every agent with the shared vault secret', () => {
    expect(crons).toContain('violation-inbox-processor');
    expect(crons).toContain('nightly-ops-auditor');
    expect(crons).toContain('smart-contract-assigner');
    expect(crons).toContain('safe-auto-repair');
    expect(crons).toContain('customer-duplicate-detector');
  });
});
