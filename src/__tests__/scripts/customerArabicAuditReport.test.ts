import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const script = readFileSync(resolve(
  process.cwd(),
  'scripts/audit-customer-arabic-data.cjs',
), 'utf8');
const applyScript = readFileSync(resolve(
  process.cwd(),
  'scripts/apply-customer-arabic-data-guard-management-api.cjs',
), 'utf8');

describe('customer Arabic data audit report script', () => {
  it('generates employee-friendly Arabic action columns', () => {
    expect(script).toContain('issues_ar,required_action');
    expect(script).toContain('الاسم العربي الرسمي ناقص أو غير عربي');
    expect(script).toContain('الجنسية العربية ناقصة أو غير عربية');
    expect(script).toContain('استكمال الاسم العربي الرسمي من الهوية أو الجواز');
    expect(script).toContain('استكمال الجنسية بالعربي من مستند رسمي');
  });

  it('writes CSV files with UTF-8 BOM for Excel Arabic compatibility', () => {
    expect(script).toContain('`\\uFEFF${buildIssueCsv(issueRows)}`');
    expect(script).toContain('`\\uFEFF${buildIssueCsv(activeIssueRows)}`');
  });

  it('rejects mojibake in report labels', () => {
    expect(script).not.toMatch(/[\u00D8\u00D9\u00C3\u00C2]/);
  });

  it('gives actionable guidance when the production guard token is missing', () => {
    expect(applyScript).toContain('Missing SUPABASE_ACCESS_TOKEN.');
    expect(applyScript).toContain('database_write permission');
    expect(applyScript).toContain('npm run customers:apply-arabic-data-guard -- --dry-run');
    expect(applyScript).toContain('supabase/manual/20260806120022_apply_customer_official_arabic_data_guard.sql');
  });
});
