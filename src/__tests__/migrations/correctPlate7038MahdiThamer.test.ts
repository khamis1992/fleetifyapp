import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260831014000_correct_plate_7038_mahdi_thamer.sql',
  'utf8',
);

describe('plate 7038 Mahdi/Thamer production correction', () => {
  it('uses canonical financial cancellation paths and a single transaction', () => {
    expect(migration).toMatch(/^BEGIN;/m);
    expect(migration).toMatch(/public\.cancel_payment_with_reversal\(/);
    expect(migration).toMatch(/public\.cancel_invoice_with_reversal\(/);
    expect(migration).toMatch(/public\.recalculate_contract_financial_state\(/);
    expect(migration).toContain(
      'DROP TRIGGER IF EXISTS trigger_auto_delete_cancelled_invoice',
    );
    expect(migration).toContain(
      'DROP TRIGGER IF EXISTS trigger_create_payment_schedules',
    );
    expect(migration).toContain(
      'DROP CONSTRAINT IF EXISTS invoices_payment_status_check',
    );
    expect(migration).toContain("'cancelled'::text");
    expect(migration).toContain(
      "set_config('fleetify.atomic_contract_creation', 'on', true)",
    );
    expect(migration).toContain(
      "set_config('fleetify.vehicle_identity_repair', 'on', true)",
    );
    expect(migration).toContain('retired_duplicate_invoice_journal');
    expect(migration).toContain(
      'every Mahdi invoice must have one balanced posted journal',
    );
    expect(migration).toMatch(/COMMIT;\s*$/);
  });

  it('enforces the approved Mahdi terms and removes the erroneous identifier', () => {
    expect(migration).toContain("v_new_contract_number constant text := 'CNT-26-7038'");
    expect(migration).toContain("v_mahdi_start constant date := DATE '2026-01-01'");
    expect(migration).toContain("v_mahdi_end constant date := DATE '2028-06-01'");
    expect(migration).toContain('contract_amount = 48000');
    expect(migration).toContain('monthly_amount = 1600');
    expect(migration).toContain('HIST-XLS-T77-7038 still exists');
    expect(migration).toContain('30 active installments totaling QAR 48,000');
    expect(migration).toContain(
      "IN ('sales', 'service', 'rental', 'monthly')",
    );
  });

  it('cuts off Thamer before Mahdi starts and reopens the audited legal claim', () => {
    expect(migration).toContain("v_cutoff_date constant date := DATE '2025-12-31'");
    expect(migration).toContain('v_thamer_claim constant numeric := 17240');
    expect(migration).toContain('public.reopen_legal_case_v1(');
    expect(migration).toContain("legal_case.workflow_stage = 'preparation'");
    expect(migration).toContain('Thamer valid receipts must total QAR 32,960');
    expect(migration).toContain('ten verified penalties totaling QAR 4,000');
    expect(migration).toContain('verified_penalties');
  });

  it('preserves an immutable before snapshot and refuses unsafe reactivation', () => {
    expect(migration).toContain('plate_7038_mahdi_thamer_correction_started');
    expect(migration).toContain("'payments_to_cancel'");
    expect(migration).toContain("'allocations_to_deactivate'");
    expect(migration).toContain('signed_contract_evidence_ready');
  });
});
