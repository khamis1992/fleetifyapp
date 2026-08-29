import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const migration = read(
  'supabase/migrations/20260827204249_agent_safety_kernel.sql',
);
const rollback = read(
  'supabase/rollbacks/20260827204249_agent_safety_kernel.rollback.sql',
);
const sharedAgent = read('supabase/functions/_shared/agent.ts');
const termsScanner = read('supabase/functions/contract-terms-scanner/index.ts');
const legalReviewer = read('supabase/functions/legal-case-ai-reviewer/index.ts');
const governedManualAgents = [
  'collection-message-agent',
  'correction-verifier-agent',
  'customer-id-autofill-agent',
  'daily-closeout-ai-reviewer',
  'journal-entry-ai-reviewer',
  'legal-case-ai-reviewer',
  'payment-match-agent',
  'intelligent-contract-processor',
].map((agent) => read(`supabase/functions/${agent}/index.ts`));

describe('shared autonomous-agent safety kernel', () => {
  it('places every scheduled gateway caller behind policy and conflict leases', () => {
    expect(sharedAgent).toContain('verify_scheduled_agent_invocation_v2');
    expect(migration).toContain('verify_scheduled_agent_invocation_v1');
    expect(migration).toContain('public.agent_safety_policies');
    expect(migration).toContain('public.agent_invocation_leases');
    expect(migration).toContain('pg_advisory_xact_lock');
    expect(migration).toContain('conflict_group_lease_active');
    expect(migration).toContain('request_id_already_allowed');
    expect(migration).toContain("event.outcome = 'allowed'");
    for (const agentId of [
      'system-audit-orchestrator',
      'system-audit-review-task-sync',
      'agent-operational-alerts',
      'violation-inbox-processor',
      'traffic-mail-ingest',
      'nightly-ops-auditor',
      'smart-contract-assigner',
      'customer-duplicate-detector',
      'customer-proposal-ai-reviewer',
      'contract-id-scanner',
      'contract-terms-scanner',
      'legal-notice-agent',
      'missing-contract-pdf-agent',
      'taqadi-filing-agent',
      'legal-case-ai-reviewer',
      'payment-match-agent',
      'collection-message-agent',
      'correction-verifier-agent',
      'customer-id-autofill-agent',
      'daily-closeout-ai-reviewer',
      'journal-entry-ai-reviewer',
      'intelligent-contract-processor',
      'excel-import-ai-reviewer',
      'historical-invoice-backfill',
      'monthly-contract-invoice-reconciliation',
      'generate-monthly-invoices',
      'monthly-vehicle-depreciation',
      'payment-reminder-agent',
      'legal-judgment-payment-matcher',
      'daily-contract-health-guard',
      'daily-legal-workflow-guard',
      'update-delinquent-customers',
      'close-stale-system-audit-reviews',
      'safe-auto-repair',
      'daily-audit-agent',
      'legacy-legal-case-trigger',
      'legacy-daily-report-agent',
      'legacy-weekly-report-agent',
      'legacy-traffic-fine-webhook',
      'legacy-monitoring-collector',
      'legacy-whatsapp-document-sender',
      'legacy-public-legal-document-upload',
    ]) {
      expect(migration).toContain(`'${agentId}'`);
    }
    expect(migration).toMatch(/SET enabled = false[\s\S]*?WHERE agent_id IN \([\s\S]*?'safe-auto-repair'/);
    expect(migration).toContain("'system-audit-orchestrator-v14'");
    for (const autonomousWriter of [
      'violation-inbox-processor',
      'customer-duplicate-detector',
      'customer-proposal-ai-reviewer',
      'contract-terms-scanner',
      'traffic-mail-ingest',
      'historical-invoice-backfill',
      'monthly-vehicle-depreciation',
    ]) {
      expect(migration).toMatch(new RegExp(`'${autonomousWriter}'[^\\n]+?'auto_apply'`));
    }
  });

  it('governs every interactive reviewer with company scope and releases its lease', () => {
    expect(sharedAgent).toContain('begin_trusted_agent_invocation_v1');
    expect(sharedAgent).toContain('authorizeAgent(req, companyId, true)');
    for (const source of governedManualAgents) {
      expect(source).toContain('authorizeGovernedAgent');
      expect(source).toContain('companyId');
      expect(source).toContain('finishAgentExecution');
    }
  });

  it('makes signed-contract ownership immutable and rejects storage reuse', () => {
    expect(migration).toContain('SIGNED_CONTRACT_EVIDENCE_IMMUTABLE');
    expect(migration).toContain('SIGNED_CONTRACT_FILE_REUSED_ACROSS_CONTRACTS');
    expect(migration).toContain('other.contract_id IS DISTINCT FROM NEW.contract_id');
    expect(migration).toContain('OLD.company_id IS DISTINCT FROM NEW.company_id');
    expect(migration).toContain('OLD.file_path IS DISTINCT FROM NEW.file_path');
    expect(migration).toContain('OLD.document_type IS DISTINCT FROM NEW.document_type');
    expect(migration).toContain('BEFORE INSERT OR UPDATE OF company_id, contract_id, file_path, document_type');
    expect(migration).toContain('trg_00_guard_signed_contract_binding_v1');
  });

  it('allows matched status only from exact customer identity evidence', () => {
    expect(migration).toContain('SIGNED_CONTRACT_MATCH_REQUIRES_DIRECT_FILE_AND_CHECK_TIMESTAMP');
    expect(migration).toContain('SIGNED_CONTRACT_IDENTITY_NOT_EXACT');
    expect(migration).toContain('v_expected_id = v_extracted_id');
    expect(migration).toContain('v_expected_name = v_extracted_name');
    expect(migration).toContain('v_expected_name = v_customer_name_ar');
    expect(migration).toContain('v_expected_name = v_customer_name_en');
    expect(migration).toContain('v_expected_name = v_customer_company_name_ar');
    expect(migration).toContain("v_customer_id <> ''");
    expect(migration).toContain("'[^ء-يa-z0-9]+'");
    expect(migration).not.toMatch(/similarity\s*\(/i);
  });

  it('prevents financial-term automation from reading unverified contracts', () => {
    expect(termsScanner).toContain('contract_terms_scan_batch_candidates_v4');
    expect(termsScanner.match(/legal_identity_match_status/g)?.length).toBeGreaterThanOrEqual(4);
    expect(migration).toContain("doc.legal_identity_match_status = 'matched'");
    expect(legalReviewer).toContain('hasIdentityMatchedSignedContract');
    expect(legalReviewer).toContain('document.legal_identity_match_status === "matched"');
  });

  it('keeps service-only security boundaries and a reversible rollback', () => {
    expect(migration).toContain('ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('FROM PUBLIC, anon, authenticated');
    expect(migration).toContain('TO service_role');
    expect(migration).toContain('public.get_agent_safety_inventory_v1()');
    expect(migration).toContain("SET search_path TO ''");
    expect(rollback).toContain('DROP FUNCTION IF EXISTS public.contract_terms_scan_batch_candidates_v4');
    expect(rollback).toContain('DROP TABLE IF EXISTS public.agent_safety_events');
    expect(rollback).not.toMatch(/DROP TABLE IF EXISTS public\.contract_documents/);
  });
});
