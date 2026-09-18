import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260831173107_add_traffic_violations_only_legal_claim_scope.sql',
  'utf8',
);
const rollback = readFileSync(
  'supabase/rollbacks/20260831173107_add_traffic_violations_only_legal_claim_scope.rollback.sql',
  'utf8',
);

describe('traffic-violations-only legal claim scope migration', () => {
  it('persists a constrained claim scope and defaults legacy cases safely', () => {
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS claim_scope text NOT NULL DEFAULT 'full_outstanding'");
    expect(migration).toContain("CHECK (claim_scope IN ('full_outstanding', 'traffic_violations_only'))");
  });

  it('derives the traffic-only amount from unpaid penalties and requires proof', () => {
    expect(migration).toContain('FROM public.penalties penalty');
    expect(migration).toContain("LOWER(COALESCE(penalty.payment_status, '')) <> 'paid'");
    expect(migration).toContain("document.document_type = 'violations_proof'");
    expect(migration).toContain("'included_invoice_balance', 0");
    expect(migration).toContain("'contractual_compensation', 0");
    expect(migration).toContain("'traffic_violations', ROUND(v_violation_total, 2)");
  });

  it('keeps readiness scope and conversion scope consistent and auditable', () => {
    expect(migration).toContain('v_review_scope IS DISTINCT FROM v_scope');
    expect(migration).toContain("'excluded_rent_and_late_fines', v_scope = 'traffic_violations_only'");
    expect(migration).toContain('لا تشمل المطالبة رصيد الإيجار أو غرامات التأخير');
  });

  it('has a reversible rollback for the column and scoped RPCs', () => {
    expect(rollback).toContain('DROP FUNCTION IF EXISTS public.convert_contract_to_legal_with_scope_v1');
    expect(rollback).toContain('DROP FUNCTION IF EXISTS public.complete_legal_transfer_readiness_with_scope_v1');
    expect(rollback).toContain('DROP COLUMN IF EXISTS claim_scope');
  });
});
