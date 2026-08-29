import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSql = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const readiness = readSql(
  'supabase/migrations/20260826091101_legal_filing_readiness_guards.sql',
);
const amendmentGuard = readSql(
  'supabase/migrations/20260826094500_fix_contract_amendment_atomic_guard.sql',
);
const hardening = readSql(
  'supabase/migrations/20260826095500_harden_legal_filing_guard_privileges.sql',
);
const repair = readSql(
  'supabase/migrations/20260826100000_repair_lto2024284_legal_filing_data.sql',
);
const repairRollback = readSql(
  'supabase/rollbacks/20260826100000_repair_lto2024284_legal_filing_data.rollback.sql',
);
const emailAvailability = readSql(
  'supabase/migrations/20260826124518_add_defendant_email_availability.sql',
);
const emailAvailabilityRollback = readSql(
  'supabase/rollbacks/20260826124518_add_defendant_email_availability.rollback.sql',
);
const verifiedCustomerEmail = readSql(
  'supabase/migrations/20260826130340_verify_customer_record_defendant_emails.sql',
);
const verifiedCustomerEmailRollback = readSql(
  'supabase/rollbacks/20260826130340_verify_customer_record_defendant_emails.rollback.sql',
);

describe('legal filing readiness database guards', () => {
  it('separates unavailable defendant email from the claimant email', () => {
    expect(emailAvailability).toContain('defendant_email_status');
    expect(emailAvailability).toContain("IN ('unknown', 'verified', 'unavailable')");
    expect(emailAvailability).toContain('لا يجوز استخدام بريد المدعية بدلاً منه');
    expect(emailAvailability).toContain('legal_case_defendant_email_block_reason_v1');
    expect(emailAvailabilityRollback).toContain('DROP COLUMN IF EXISTS defendant_email_status');
  });

  it('uses the verified customer record as the canonical defendant email', () => {
    expect(verifiedCustomerEmail).toContain("defendant_contact_source = 'customer_record'");
    expect(verifiedCustomerEmail).toContain('JOIN public.customers cu');
    expect(verifiedCustomerEmail).toContain("SET defendant_email_status = 'verified'");
    expect(verifiedCustomerEmail).toContain('THEN NULLIF(BTRIM(cu.email)');
    expect(verifiedCustomerEmailRollback).toContain("SET defendant_email_status = 'unavailable'");
  });
  it('uses one canonical due-only claim and prevents incomplete filing', () => {
    expect(readiness).toContain('CREATE OR REPLACE FUNCTION public.calculate_legal_claim_amount_v1');
    expect(readiness).toContain('s.due_date <= p_as_of_date');
    expect(readiness).toContain('s.invoice_id IS NULL');
    expect(readiness).toContain('CREATE OR REPLACE FUNCTION public.legal_case_filing_block_reason_v1');
    expect(readiness).toContain('CREATE TRIGGER trg_guard_legal_case_filing_readiness');
    expect(readiness).toContain('CREATE OR REPLACE FUNCTION public.finalize_legal_case_filing_v1');
    expect(readiness).toContain("'filed'");
  });

  it('keeps trigger helpers and repair internals outside public RPC access', () => {
    expect(readiness).toContain(
      'REVOKE ALL ON FUNCTION public.guard_legal_case_filing_readiness_v1()',
    );
    expect(readiness).toContain(
      'REVOKE ALL ON FUNCTION public.repair_legal_preparation_case_v1(UUID, UUID, UUID)',
    );
    expect(readiness).toContain(
      'REVOKE ALL ON TABLE public.legal_filing_repair_audit FROM PUBLIC, anon, authenticated',
    );
    expect(hardening).toContain(
      'REVOKE ALL ON FUNCTION public.guard_legal_case_filing_readiness_v1()',
    );
    expect(hardening).toContain('idx_legal_filing_repair_audit_contract_id');
  });

  it('opens the billing guard only inside the validated amendment command', () => {
    const authorization = amendmentGuard.indexOf("IF v_actor_role <> 'service_role'");
    const approval = amendmentGuard.indexOf("IF v_amendment.status <> 'approved'");
    const vehicleCheck = amendmentGuard.indexOf('Amendment vehicle does not belong');
    const guardOptIn = amendmentGuard.indexOf(
      "PERFORM set_config('fleetify.atomic_contract_creation', 'on', true)",
    );
    const contractWrite = amendmentGuard.indexOf('UPDATE public.contracts contract');

    expect(authorization).toBeGreaterThan(-1);
    expect(approval).toBeGreaterThan(authorization);
    expect(vehicleCheck).toBeGreaterThan(approval);
    expect(guardOptIn).toBeGreaterThan(vehicleCheck);
    expect(contractWrite).toBeGreaterThan(guardOptIn);
  });
});

describe('LTO2024284 legal filing data repair', () => {
  it('fails closed before writes unless every production precondition is unique', () => {
    const contractAssertion = repair.indexOf('Expected exactly one contract LTO2024284');
    const vehicleAssertion = repair.indexOf('Expected exactly one same-company vehicle');
    const profileAssertion = repair.indexOf('Expected no existing litigation profile');
    const caseAssertion = repair.indexOf('Expected exactly one preparation case');
    const amendmentInsert = repair.indexOf('INSERT INTO public.contract_amendments');

    expect(contractAssertion).toBeGreaterThan(-1);
    expect(vehicleAssertion).toBeGreaterThan(contractAssertion);
    expect(profileAssertion).toBeGreaterThan(vehicleAssertion);
    expect(caseAssertion).toBeGreaterThan(profileAssertion);
    expect(amendmentInsert).toBeGreaterThan(caseAssertion);
    expect(repair).not.toContain('EXCEPTION WHEN OTHERS');
  });

  it('records a zero-impact approved vehicle amendment before repairing the case', () => {
    const amendmentInsert = repair.indexOf('INSERT INTO public.contract_amendments');
    const contractWrite = repair.indexOf('UPDATE public.contracts c');
    const repairCall = repair.indexOf('public.repair_legal_preparation_case_v1(');

    expect(repair).toContain("'change_vehicle'");
    expect(repair).toContain('amount_difference');
    expect(repair).toContain("'approved'");
    expect(repair).toContain("PERFORM set_config('fleetify.atomic_contract_creation', 'on', true)");
    expect(contractWrite).toBeGreaterThan(amendmentInsert);
    expect(repairCall).toBeGreaterThan(contractWrite);
    expect(repair).toContain("(v_repair_result ->> 'claim_amount')::NUMERIC <> 36000");
  });

  it('has a rollback for the case, seeded profile, vehicle link, audit and amendment', () => {
    expect(repairRollback).toContain('v_audit.legal_cases_before');
    expect(repairRollback).toContain('DELETE FROM public.legal_case_litigation_profile');
    expect(repairRollback).toContain('SET vehicle_id =');
    expect(repairRollback).toContain('DELETE FROM public.legal_filing_repair_audit');
    expect(repairRollback).toContain('DELETE FROM public.contract_amendments');
  });
});
