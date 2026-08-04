import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const migration = read('supabase/migrations/20260803165500_persist_invoice_journal_links.sql');
const rollback = read('supabase/rollbacks/20260803165500_persist_invoice_journal_links.rollback.sql');

describe('invoice journal link persistence migration', () => {
  it('runs the canonical journal trigger before insert so NEW is persisted', () => {
    expect(migration).toMatch(/CREATE TRIGGER trg_invoice_journal_entry\s+BEFORE INSERT ON public\.invoices/);
    expect(migration).toContain('EXECUTE FUNCTION public.trg_invoice_journal_entry_fn()');
    expect(migration).not.toMatch(/CREATE TRIGGER trg_invoice_journal_entry\s+AFTER INSERT/);
    expect(migration).toMatch(/CREATE TRIGGER zz_persist_invoice_reference_journal_link\s+BEFORE INSERT ON public\.invoices/);
    expect(migration).toContain('NEW.journal_entry_id := v_journal_id');
    expect(migration).toContain('Invoice % has multiple reference journals');
  });

  it('backfills only one company-scoped canonical reference journal', () => {
    expect(migration).toContain('entry.company_id = invoice.company_id');
    expect(migration).toContain("entry.reference_type = 'invoice'");
    expect(migration).toContain('entry.reference_id = invoice.id');
    expect(migration).toContain('HAVING count(*) = 1');
    expect(migration).toContain('(array_agg(entry.id ORDER BY entry.id))[1]');
    expect(migration).not.toContain('min(entry.id)');
  });

  it('temporarily bypasses closed-period write guards and always restores the prior value', () => {
    expect(migration).toContain("set_config('app.financial_controls_bypass', 'on', true)");
    expect(migration.match(/set_config\('app\.financial_controls_bypass', v_previous_bypass, true\)/g)).toHaveLength(2);
    expect(migration).toMatch(/EXCEPTION\s+WHEN OTHERS THEN[\s\S]*?RAISE;/);
  });

  it('rollback restores AFTER timing without erasing legitimate historical links', () => {
    expect(rollback).toMatch(/CREATE TRIGGER trg_invoice_journal_entry\s+AFTER INSERT ON public\.invoices/);
    expect(rollback).toContain('DROP TRIGGER IF EXISTS zz_persist_invoice_reference_journal_link');
    expect(rollback).toContain('DROP FUNCTION IF EXISTS public.persist_invoice_reference_journal_link_before_insert()');
    expect(rollback).not.toMatch(/UPDATE public\.invoices/);
  });
});
