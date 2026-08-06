import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const exampleEnv = readFileSync(resolve(
  process.cwd(),
  '.env.taqadi-agent.example',
), 'utf8');

describe('Taqadi environment example', () => {
  it('documents the Supabase Management API variables needed for database guards', () => {
    expect(exampleEnv).toContain('SUPABASE_PROJECT_REF=qwhunliohlkkahbspfiu');
    expect(exampleEnv).toContain('SUPABASE_ACCESS_TOKEN=');
    expect(exampleEnv).toContain('customers:apply-arabic-data-guard');
    expect(exampleEnv).toContain('database_write');
  });

  it('keeps Arabic representative defaults readable', () => {
    expect(exampleEnv).toContain('TAQADI_REPRESENTATIVE_NAME=خميس الجبر');
    expect(exampleEnv).toContain('TAQADI_REPRESENTATIVE_ADDRESS=الدوحة قطر');
    expect(exampleEnv).toContain('TAQADI_REPRESENTATIVE_NATIONALITY=قطر');
    expect(exampleEnv).toContain('TAQADI_REPRESENTATIVE_ID_TYPE=بطاقة شخصية');
    expect(exampleEnv).toContain('TAQADI_COMPANY_ESTABLISHMENT_NUMBER=17201586');
    expect(exampleEnv).toContain('TAQADI_COMPANY_ESTABLISHMENT_ISSUER=وزارة التجارة والصناعة');
  });

  it('rejects mojibake and does not ship real Supabase secrets', () => {
    expect(exampleEnv).not.toMatch(/[\u00D8\u00D9\u00C3\u00C2]/);
    expect(exampleEnv).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
    expect(exampleEnv).not.toMatch(/sbp_[A-Za-z0-9_-]{20,}/);
  });
});
