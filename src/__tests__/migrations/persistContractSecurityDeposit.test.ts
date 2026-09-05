import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260903164536_persist_contract_security_deposit_atomically.sql',
), 'utf8');
const creationHook = readFileSync(resolve(
  process.cwd(),
  'src/hooks/useContractCreation.ts',
), 'utf8');

describe('contract security-deposit persistence', () => {
  it('adds a non-negative contract field and persists it inside the atomic wrapper', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS deposit_amount');
    expect(migration).toContain('CHECK (deposit_amount >= 0)');
    expect(migration).toContain('p_deposit_amount numeric DEFAULT 0');
    expect(migration).toContain('SET deposit_amount = v_deposit');
    expect(migration).toContain('Idempotency key is already bound to a different security deposit');
  });

  it('passes the wizard value to the database RPC instead of dropping it', () => {
    expect(creationHook).toContain('deposit_amount?: number | string');
    expect(creationHook).toContain('p_deposit_amount: Number(inputContractData.deposit_amount || 0)');
  });

  it('backfills the amount printed in signed Agreement 2024/276 only after identity match', () => {
    expect(migration).toContain("contract.contract_number = 'LTO2024276'");
    expect(migration).toContain('contract.monthly_amount = 1800');
    expect(migration).toContain('contract.contract_amount = 64800');
    expect(migration).toContain("document.legal_identity_match_status = 'matched'");
  });
});
