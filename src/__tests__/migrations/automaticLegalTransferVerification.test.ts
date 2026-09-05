import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260902155000_automate_legal_transfer_system_verification.sql'),
  'utf8',
);

const rollback = readFileSync(
  resolve(process.cwd(), 'supabase/rollbacks/20260902155000_automate_legal_transfer_system_verification.rollback.sql'),
  'utf8',
);

const hardeningMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260902162000_harden_automatic_legal_transfer_internal_rpcs.sql'),
  'utf8',
);

describe('automatic legal transfer verification migration', () => {
  it('records an explicit system verification without impersonating employee approval', () => {
    expect(migration).toContain("'system_verified'");
    expect(migration).toContain('auto_verify_legal_transfer_review_v1');
    expect(migration).toContain("'verification_source', 'system'");
    expect(migration).toContain('reviewed_by = NULL');
  });

  it('remains fail-closed on every legal readiness gate', () => {
    expect(migration).toContain('check_contract_has_verified_signed_lease_v1');
    expect(migration).toContain('check_contract_identity_verified_v1');
    expect(migration).toContain("'financial_reviewed'");
    expect(migration).toContain("'violation_proof_ready'");
    expect(migration).toContain('A customer phone number is required for legal transfer');
  });

  it('invokes system verification from the legacy employee-review gate', () => {
    expect(migration).toContain('convert_contract_to_legal_v1_pre_pdf_request_agent');
    expect(migration).toContain('FROM public.auto_verify_legal_transfer_review_v1');
    expect(migration).toContain('Data changed after system verification; retry conversion');
  });

  it('ships a rollback that restores the manual approval requirement', () => {
    expect(rollback).toContain('Employee verification is required before legal conversion');
    expect(rollback).toContain('DROP FUNCTION IF EXISTS public.auto_verify_legal_transfer_review_v1');
    expect(rollback).toContain("WHERE status = 'system_verified'");
  });

  it('keeps internal verification stages off the authenticated RPC surface', () => {
    expect(hardeningMigration).toContain(
      'FROM PUBLIC, anon, authenticated',
    );
    expect(hardeningMigration).toContain(
      'auto_verify_legal_transfer_review_v1',
    );
    expect(hardeningMigration).toContain(
      'convert_contract_to_legal_v1_pre_pdf_request_agent',
    );
    expect(hardeningMigration).toContain('TO service_role');
  });
});
