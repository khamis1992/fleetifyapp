import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260813072633_traffic_penalty_rental_invoice_legal_guards.sql'), 'utf8');

describe('traffic penalty rental lifecycle migration', () => {
  it('uses a durable unique penalty-to-invoice link and automatic trigger', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS penalty_id');
    expect(migration).toContain('CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_penalty_id');
    expect(migration).toContain('trg_penalty_contract_invoice_after_write');
    expect(migration).toContain("'مخالفة مرورية '");
  });

  it('backfills missing linked unpaid penalty invoices idempotently', () => {
    expect(migration).toContain('NOT EXISTS (SELECT 1 FROM public.invoices invoice WHERE invoice.penalty_id = penalty.id)');
    expect(migration).toContain('ON CONFLICT (penalty_id) WHERE penalty_id IS NOT NULL DO NOTHING');
  });

  it('blocks terminal contract status changes with unpaid penalties', () => {
    expect(migration).toContain('trg_block_contract_close_with_unpaid_penalties');
    expect(migration).toContain('لا يمكن إغلاق العقد');
  });

  it('persists and propagates MOI case-follow-up notices', () => {
    expect(migration).toContain('case_follow_up boolean NOT NULL DEFAULT false');
    expect(migration).toContain('29263400736');
    expect(migration).toContain('moi_case_follow_up');
  });

  it('persists reservation customer identity for authoritative penalty checks', () => {
    expect(migration).toContain('save_vehicle_reservation_v2');
    expect(migration).toContain('p_customer_id uuid');
    expect(migration).toContain('customer_id = EXCLUDED.customer_id');
    expect(migration).toContain("TG_TABLE_NAME = 'vehicle_reservations' AND NEW.customer_id IS NULL");
    expect(migration).toContain('v_count >= 3 OR v_total >= 500');
  });
});
