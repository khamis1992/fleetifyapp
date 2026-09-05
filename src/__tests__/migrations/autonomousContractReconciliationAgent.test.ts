import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const migration = read(
  'supabase/migrations/20260827102000_autonomous_contract_reconciliation_agent.sql',
);
const rollback = read(
  'supabase/rollbacks/20260827102000_autonomous_contract_reconciliation_agent.rollback.sql',
);
const scanner = read('supabase/functions/contract-terms-scanner/index.ts');
const gatewayJwtMigration = read(
  'supabase/migrations/20260827102500_harden_contract_scanner_gateway_jwt.sql',
);
const gatewayJwtRollback = read(
  'supabase/rollbacks/20260827102500_harden_contract_scanner_gateway_jwt.rollback.sql',
);
const supabaseConfig = read('supabase/config.toml');
const localCoordinator = read(
  'automation/contract-reconciliation-agent/run-target.ts',
);

describe('autonomous signed-contract reconciliation agent', () => {
  it('routes missing invoice graphs and failed repairs to document analysis', () => {
    expect(migration).toContain("finding.code = 'schedule.missing_invoice'");
    expect(migration).toContain("finding.status = 'failed'");
    expect(migration).toContain("finding.evidence ->> 'contractId'");
    expect(migration).toContain('graph.missing_invoice_count > 0');
    expect(scanner).toContain('contract_terms_scan_batch_candidates_v4');
  });

  it('binds autonomous changes to signed evidence and service identity', () => {
    expect(migration).toContain("v_role <> 'service_role'");
    expect(migration).toContain('overall_confidence, 0) < 0.90');
    expect(migration).toContain("extracted_terms -> 'evidence'");
    expect(migration).toContain('scenario_does_not_match_signed_document_terms');
    expect(scanner).toContain('hasScheduledIdentity');
    expect(scanner).toContain('isServiceRoleCaller');
  });

  it('preserves received money and verifies every generated invoice', () => {
    expect(migration).toContain('protected_payment_history_requires_financial_review');
    expect(migration).toContain('public.generate_invoice_for_contract_month');
    expect(migration).toContain('public.system_invoice_has_single_balanced_posted_journal');
    expect(migration).toContain('contract_reconciliation_final_graph_verification_failed');
    expect(migration).not.toMatch(/DELETE\s+FROM\s+public\.(payments|invoices|contract_payment_schedules)/i);
  });

  it('does not flatten an established partial-period schedule from incomplete OCR', () => {
    expect(scanner).toContain('graph.activeScheduleCount !== duration');
    expect(scanner).toContain('Math.abs(graph.scheduleTotal - total)');
    expect(scanner).toContain('graph.lastScheduleMonth !== lastBillingMonth');
    expect(scanner).toContain('existing schedule count differs from the extracted installment duration');
  });

  it('assigns ambiguous scenarios instead of silently stopping', () => {
    expect(migration).toContain('upsert_contract_reconciliation_review_task_v1');
    expect(migration).toContain("'contract_reconciliation_review'");
    expect(migration).toContain("'agent-decision'");
    expect(scanner).toContain('ensureFinancialReviewTask');
  });

  it('keeps the fleet-wide nightly scanner in proposal mode and provides a rollback', () => {
    expect(migration).toContain("'maxDocuments', 10");
    expect(migration).toContain("'autoApply', false");
    expect(rollback).toContain('DROP FUNCTION IF EXISTS public.apply_autonomous_contract_reconciliation_v1');
    expect(rollback).toContain("'autoApply', false");
  });

  it('requires the Supabase gateway JWT in addition to the scheduled agent identity', () => {
    expect(supabaseConfig).toMatch(
      /\[functions\.contract-terms-scanner\]\s*verify_jwt = true/,
    );
    expect(gatewayJwtMigration).toContain("'Authorization', 'Bearer '");
    expect(gatewayJwtMigration).toContain('agent_secret_contract_terms_scanner');
    expect(gatewayJwtMigration).toContain("'autoApply', false");
    expect(gatewayJwtRollback).toContain('nightly-contract-terms-scan');
  });

  it('provides a local OCR coordinator for scanned PDFs without a text layer', () => {
    expect(localCoordinator).toContain("createWorker(['ara', 'eng'])");
    expect(localCoordinator).toContain("import { createCanvas } from '@napi-rs/canvas'");
    expect(localCoordinator).toContain("mode: 'pages'");
    expect(scanner).toContain('mayAutoApply');
  });
});
