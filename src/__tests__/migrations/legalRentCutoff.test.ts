import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260903163803_enforce_legal_rent_cutoff_on_due_rows.sql',
), 'utf8');
const replacement = readFileSync(resolve(process.cwd(),
  'supabase/migrations/20260904024349_integrate_canonical_legal_claim_rows.sql'), 'utf8');

describe('legal rent cutoff migration', () => {
  it('retires the rejected global cutoff wrapper and case-specific mutation before deployment', () => {
    expect(migration).toContain('Superseded before deployment');
    expect(migration).not.toContain('ALTER FUNCTION');
    expect(migration).not.toContain('UPDATE public.legal_cases');
    expect(migration).not.toContain('INSERT INTO public.audit_logs');
    expect(replacement).toContain('p_company_id,p_contract_id,p_as_of_date,v_recorded');
    expect(replacement).toContain('LEGAL_CLAIM_RECONCILIATION_REQUIRED');
  });

  it('keeps raw calculators private behind a company-authorized gateway', () => {
    expect(replacement).toContain(
      'REVOKE ALL ON ALL FUNCTIONS IN SCHEMA legal_claim_internal FROM PUBLIC,anon,authenticated,service_role',
    );
    expect(replacement).toContain('public.get_user_company_id() IS DISTINCT FROM p_company_id');
    expect(replacement).toContain('p.user_id=auth.uid() AND p.company_id=p_company_id AND p.is_active IS NOT FALSE');
  });
});
