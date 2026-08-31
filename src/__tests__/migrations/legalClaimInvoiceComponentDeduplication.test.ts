import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260831113000_fix_legal_claim_invoice_component_double_count.sql',
), 'utf8');

const rollback = readFileSync(resolve(
  process.cwd(),
  'supabase/rollbacks/20260831113000_fix_legal_claim_invoice_component_double_count.rollback.sql',
), 'utf8');

describe('legal claim invoice component de-duplication', () => {
  it('adds a reversible v3 breakdown and routes the canonical amount through it', () => {
    expect(migration).toContain(
      'CREATE OR REPLACE FUNCTION public.calculate_legal_claim_breakdown_v3',
    );
    expect(migration).toContain(
      'CREATE OR REPLACE FUNCTION public.calculate_legal_claim_amount_v1',
    );
    expect(migration).toContain('(public.calculate_legal_claim_breakdown_v3(');
  });

  it('keeps only rent sales invoices in recorded due', () => {
    expect(migration).toContain('component.penalty_id IS NULL');
    expect(migration).toContain("component.invoice_type = 'sales'");
    expect(migration).toContain("LOWER(COALESCE(i.invoice_type, '')) = 'sales'");
  });

  it('discloses excluded invoice balances without adding them to total', () => {
    expect(migration).toContain("'excluded_penalty_invoice_due_amount'");
    expect(migration).toContain("'excluded_non_rent_invoice_due_amount'");

    const totalExpression = migration.slice(
      migration.indexOf("'total', ROUND"),
      migration.indexOf("'extension_start_date'"),
    );
    expect(totalExpression).not.toContain('penalty_invoice_due_amount');
    expect(totalExpression).not.toContain('non_rent_invoice_due_amount');
  });

  it('adds violations only through the evidence-gated penalties component', () => {
    expect(migration).toContain("d.document_type = 'violations_proof'");
    expect(migration).toContain('t.violations_amount');
  });

  it('keeps security and tenant isolation on the replacement function', () => {
    expect(migration).toContain('SECURITY INVOKER');
    expect(migration).toContain('SET search_path = pg_catalog, public');
    expect(migration).toContain('i.company_id = p_company_id');
    expect(migration).toContain('i.contract_id = p_contract_id');
  });

  it('has an automated rollback that restores v2 and removes v3', () => {
    expect(rollback).toContain('(public.calculate_legal_claim_breakdown_v2(');
    expect(rollback).toContain(
      'DROP FUNCTION public.calculate_legal_claim_breakdown_v3(UUID, UUID, DATE)',
    );
    expect(rollback).toContain('COMMIT;');
  });
});
