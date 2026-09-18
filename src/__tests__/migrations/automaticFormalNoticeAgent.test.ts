import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const migration = read(
  'supabase/migrations/20260827172506_automatic_formal_notice_agent.sql',
);
const rollback = read(
  'supabase/rollbacks/20260827172506_automatic_formal_notice_agent.rollback.sql',
);
const indexesMigration = read(
  'supabase/migrations/20260827172747_index_automatic_formal_notice_foreign_keys.sql',
);
const agent = read('supabase/functions/legal-notice-agent/index.ts');
const webhook = read('supabase/functions/ultramsg-ack-webhook/index.ts');
const config = read('supabase/config.toml');

describe('automatic formal WhatsApp notice agent', () => {
  it('runs daily with a dedicated scheduled identity and no approval gate', () => {
    expect(migration).toContain("'automatic-formal-notice-agent'");
    expect(migration).toContain("'15 7 * * *'");
    expect(migration).toContain("'x-agent-id', 'legal-notice-agent'");
    expect(migration).toContain('agent_secret_legal_notice');
    expect(agent).toContain('prepareAndSend');
    expect(agent).not.toMatch(/approval|approved_by|human.review/i);
  });

  it('deduplicates by contract and delinquency cycle and retries safely', () => {
    expect(migration).toContain('UNIQUE (contract_id, notice_type, cycle_key)');
    expect(migration).toContain("'draft', 'sending', 'sent', 'delivered', 'read', 'failed', 'cancelled'");
    expect(agent).toContain('loadLiveInvoices');
    expect(migration).toContain('canonical_invoice_paid_amount(invoice.id, NULL)');
    expect(migration).toContain('get_automatic_formal_notice_live_invoices_v1');
    expect(migration).toContain('public.payment_allocations allocation');
    expect(migration).toContain("allocation.allocation_type = 'contract'");
    expect(agent).toContain('attempts');
    expect(agent).toContain('providerMessageId');
    expect(agent).toContain('Persist the external id before finalizing');
    expect(agent).toContain('if (!providerMessageId)');
  });

  it('does not claim formal delivery until provider evidence is stored', () => {
    expect(migration).toContain('delivery_confirmed,');
    expect(migration).toMatch(/delivery_confirmed,\s*grace_period_days[\s\S]*?false,/);
    expect(migration).toContain('p_proof_document_id uuid');
    expect(migration).toContain('delivery_confirmed = true');
    expect(webhook).toContain('fleetify.formal-notice-delivery-proof.v1');
    expect(webhook).toContain('.from("contract-documents")');
    expect(webhook).toContain('formal_notice_proof');
    expect(webhook).not.toContain('message_body: job.message_body');
    expect(webhook).not.toContain('phone_e164: job.phone_e164');
  });

  it('protects webhook ingress with a Vault secret and disables gateway JWT only there', () => {
    expect(migration).toContain('ultramsg_webhook_secret');
    expect(migration).toContain('verify_ultramsg_webhook_secret_v1');
    expect(webhook).toContain('verify_ultramsg_webhook_secret_v1');
    expect(config).toMatch(/\[functions\.legal-notice-agent\]\s*verify_jwt = false/);
    expect(config).toMatch(/\[functions\.ultramsg-ack-webhook\]\s*verify_jwt = false/);
  });

  it('provides a non-sending health check and a data-preserving rollback', () => {
    expect(agent).toContain('action === "healthcheck"');
    expect(agent).toContain('dispatch: "not_requested"');
    expect(agent).toContain('acknowledgement webhook did not persist');
    expect(rollback).toContain('DROP TABLE IF EXISTS public.legal_notice_agent_jobs');
    expect(rollback).not.toMatch(/DELETE\s+FROM\s+public\.legal_case_formal_notices/i);
    expect(rollback).not.toMatch(/DELETE\s+FROM\s+public\.contract_documents/i);
  });

  it('indexes every workflow foreign key used by cleanup and joins', () => {
    expect(indexesMigration).toContain('legal_notice_agent_customer_idx');
    expect(indexesMigration).toContain('legal_notice_agent_formal_notice_idx');
    expect(indexesMigration).toContain('legal_notice_agent_proof_document_idx');
  });
});
