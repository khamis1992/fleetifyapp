import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260803173000_automated_invoice_reminder_idempotency.sql',
), 'utf8');
const rollback = readFileSync(resolve(
  process.cwd(),
  'supabase/rollbacks/20260803173000_automated_invoice_reminder_idempotency.rollback.sql',
), 'utf8');

describe('automated invoice reminder idempotency migration', () => {
  it('claims each invoice cadence stage once and bounds failed retries', () => {
    expect(migration).toContain('UNIQUE (invoice_id, reminder_type)');
    expect(migration).toContain('ON CONFLICT ON CONSTRAINT automated_invoice_reminder_delivery_unique');
    expect(migration).toContain("WHERE delivery.status = 'failed'");
    expect(migration).toContain('delivery.attempts < 3');
    expect(migration).toContain("delivery.updated_at <= now() - interval '15 minutes'");
    expect(migration).toContain("v_role <> 'service_role'");
  });

  it('records completion without exposing the ledger to users', () => {
    expect(migration).toContain('complete_automated_invoice_reminder_delivery');
    expect(migration).toContain("CASE WHEN p_success THEN 'sent' ELSE 'failed' END");
    expect(migration).toContain('ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('FROM PUBLIC, anon, authenticated');
    expect(rollback).toContain('DROP TABLE IF EXISTS public.automated_invoice_reminder_deliveries');
  });
});
