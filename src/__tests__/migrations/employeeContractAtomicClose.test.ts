import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260803171000_close_employee_contract_atomically.sql',
), 'utf8');
const rollback = readFileSync(resolve(
  process.cwd(),
  'supabase/rollbacks/20260803171000_close_employee_contract_atomically.rollback.sql',
), 'utf8');

describe('employee contract atomic close migration', () => {
  it('locks the contract and invoices before the status update', () => {
    const contractLock = migration.indexOf('FOR UPDATE;');
    const invoiceLock = migration.indexOf('FOR UPDATE OF invoice;');
    const contractUpdate = migration.indexOf('UPDATE public.contracts contract');

    expect(contractLock).toBeGreaterThan(-1);
    expect(invoiceLock).toBeGreaterThan(contractLock);
    expect(contractUpdate).toBeGreaterThan(invoiceLock);
  });

  it('rechecks every employee workspace closure invariant in the database', () => {
    for (const guard of [
      'assigned_to_profile_id IS DISTINCT FROM v_profile_id',
      "lower(COALESCE(v_contract.status, '')) <> 'active'",
      'Contract has an active unsettled invoice',
      'Contract balance requires billing reconciliation before closure',
      'public.generate_payment_schedules_for_contract(',
      "v_schedule_preview ->> 'schedules_created'",
      'Contract billing schedule graph is incomplete',
      'FROM public.contract_payment_schedules schedule',
      'public.system_invoice_has_single_balanced_posted_journal(',
      'Contract billing graph has a missing or unjournaled invoice month',
      'FROM public.penalties penalty',
      'FROM public.employee_tasks task',
      'FROM public.contract_documents document',
      "document.document_type IN ('signed_contract', 'signed_contract_image')",
      'COALESCE(v_contract.vehicle_returned, false) IS NOT TRUE',
    ]) {
      expect(migration).toContain(guard);
    }
  });

  it('uses the contract-scoped employee task table rather than the generic task board', () => {
    expect(migration).toContain('FROM public.employee_tasks task');
    expect(migration).not.toContain('FROM public.tasks task');
  });

  it('exposes only the narrow authenticated RPC and has a rollback', () => {
    expect(migration).toContain('SECURITY DEFINER');
    expect(migration).toContain("SET search_path = ''");
    expect(migration).toContain('FROM PUBLIC, anon, authenticated, service_role');
    expect(migration).toContain('TO authenticated;');
    expect(rollback).toContain(
      'DROP FUNCTION IF EXISTS public.employee_close_assigned_contract(uuid)',
    );
  });
});
