import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260806120022_enforce_customer_official_arabic_data.sql',
), 'utf8');
const manualApply = readFileSync(resolve(
  process.cwd(),
  'supabase/manual/20260806120022_apply_customer_official_arabic_data_guard.sql',
), 'utf8');
const rollback = readFileSync(resolve(
  process.cwd(),
  'supabase/rollbacks/20260806120022_enforce_customer_official_arabic_data.rollback.sql',
), 'utf8');

describe('customer official Arabic data guard migration', () => {
  it('uses real Arabic text and rejects mojibake in SQL artifacts', () => {
    for (const sql of [migration, manualApply]) {
      expect(sql).toMatch(
        /~ '\[ء-ي\]'|chr\(1569\)[\s\S]*chr\(1610\)/,
      );
      expect(sql).toContain('الجنسية العربية مطلوبة للعميل');
      expect(sql).toContain('اسم الشركة العربي مطلوب للعميل');
      expect(sql).toContain('الاسم العربي الأول والأخير مطلوبان للعميل');
      expect(sql).not.toMatch(/[\u00D8\u00D9\u00C3\u00C2]/);
    }
  });

  it('guards inserts and official identity-field updates without blocking legacy operational updates', () => {
    expect(migration).toContain("if tg_op = 'INSERT' then");
    expect(migration).toContain("if tg_op = 'UPDATE' then");
    expect(migration).toContain('new.nationality is distinct from old.nationality');
    expect(migration).toContain('new.company_name_ar is distinct from old.company_name_ar');
    expect(migration).toContain('new.first_name_ar is distinct from old.first_name_ar');
    expect(migration).toContain('new.last_name_ar is distinct from old.last_name_ar');
    expect(migration).toContain(
      'before insert or update of customer_type, first_name_ar, last_name_ar, company_name_ar, nationality',
    );
  });

  it('ships a rollback for the trigger and helper functions', () => {
    expect(rollback).toContain('drop trigger if exists trg_enforce_customer_official_arabic_data');
    expect(rollback).toContain('drop function if exists public.enforce_customer_official_arabic_data()');
    expect(rollback).toContain('drop function if exists public.has_arabic_text(text)');
  });
});
