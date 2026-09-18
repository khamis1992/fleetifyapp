import { describe, expect, it } from 'vitest';
import { z, ZodError, type ZodIssue } from 'zod';
import { summarizeFinancialReportError } from '../financialReportDiagnostics';

describe('financial report diagnostics', () => {
  it('reports schema paths and issue codes without financial values or error metadata', () => {
    const parsed = z.object({ company: z.object({ currency: z.string() }), current: z.object({ assets: z.number() }) })
      .safeParse({ company: { currency: 123456.78 }, current: { assets: 'secret-bank-reference' } });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(summarizeFinancialReportError(parsed.error)).toEqual({
      code: 'REPORT_VALIDATION_FAILED',
      issues: [{ path: 'company.currency', code: 'invalid_type' }, { path: 'current.assets', code: 'invalid_type' }],
    });
    const output = JSON.stringify(summarizeFinancialReportError(parsed.error));
    for (const secret of ['123456.78', 'secret-bank-reference', 'received', 'expected', 'message']) expect(output).not.toContain(secret);
  });

  it('redacts record keys, UUIDs and numeric identifiers in paths', () => {
    const error = new ZodError([{ code: 'custom', path: ['accounts', 124578, '24bc0b21-4e2d-4413-9842-31719a3669f4', 'access-token-secret', 'balance'], message: 'Financial balance 998877.66, bearer secret' }]);
    expect(summarizeFinancialReportError(error)).toEqual({ code: 'REPORT_VALIDATION_FAILED', issues: [{ path: 'accounts.[].[redacted].[redacted].balance', code: 'custom' }] });
    expect(JSON.stringify(summarizeFinancialReportError(error))).not.toMatch(/124578|24bc0b21|access-token|998877|bearer/);
  });

  it('does not expose unknown-key names, enum options or nested union errors', () => {
    const parsed = z.object({ status: z.enum(['draft', 'approved']) }).strict().safeParse({ status: 'SECRET_STATUS', 'token-secret': 'secret' });
    if (parsed.success) throw new Error('Expected invalid fixture');
    const output = JSON.stringify(summarizeFinancialReportError(parsed.error));
    expect(output).not.toMatch(/SECRET_STATUS|token-secret|"options"|"keys"|"expected"|"received"/);
    const nested = z.union([z.number(), z.boolean()]).safeParse('private-financial-text');
    if (nested.success) throw new Error('Expected invalid fixture');
    expect(summarizeFinancialReportError(nested.error)).toEqual({ code: 'REPORT_VALIDATION_FAILED', issues: [{ path: '$', code: 'invalid_union' }] });
  });

  it('bounds diagnostic count and path depth', () => {
    const error = new ZodError(Array.from({ length: 30 }, () => ({ code: 'custom' as const, path: Array(30).fill('payload'), message: 'private' })));
    const summary = summarizeFinancialReportError(error);
    expect(summary.issues).toHaveLength(20);
    expect(summary.issues?.[0].path.split('.')).toHaveLength(16);
  });

  it('replaces a forged issue code rather than emitting arbitrary text', () => {
    const error = new ZodError([{ code: 'secret-value', path: ['company'], message: 'private' } as unknown as ZodIssue]);
    expect(summarizeFinancialReportError(error).issues?.[0]).toEqual({ path: 'company', code: 'custom' });
  });

  it.each(['BALANCE_SHEET_TOTALS_MISMATCH', 'FINANCIAL_STATEMENT_COLUMN_SCOPE', 'FINANCIAL_STATEMENT_INVALID_APPROVAL'])('preserves the exact known code %s', code => {
    expect(summarizeFinancialReportError(new Error(code))).toEqual({ code });
    expect(summarizeFinancialReportError({ code, message: 'secret' })).toEqual({ code });
  });

  it.each([
    'BALANCE_SHEET_TOTALS_MISMATCH: 123456.78',
    'BALANCE_SHEET_SECRET_TOKEN',
    'FINANCIAL_STATEMENT_SCOPE_MISMATCH\n',
    'FINANCIAL_STATEMENT_SCOPE_MISMATCH\nsecret',
    'postgres error account 24bc0b21-4e2d-4413-9842-31719a3669f4',
  ])('redacts unrecognized or extended error text', message => {
    expect(summarizeFinancialReportError(new Error(message))).toEqual({ code: 'REPORT_VALIDATION_FAILED' });
  });

  it('handles generic, forged and hostile error objects without serialization', () => {
    for (const error of [null, undefined, 998877.66, 'secret', { name: 'ZodError', issues: [{ path: ['secret'], code: 'secret' }] }, { get code() { throw new Error('secret'); } }]) {
      expect(summarizeFinancialReportError(error)).toEqual({ code: 'REPORT_VALIDATION_FAILED' });
    }
  });

  it.each(['57014', '42501', 'PGRST202', 'PGRST301'])('preserves only the allowlisted request code %s', code => {
    expect(summarizeFinancialReportError({ code, message: 'Secret statement 123456.78 timeout', details: 'private' })).toEqual({ code });
  });

  it.each(['Aborted request secret-token', 'request TIMEOUT balance 998877.66', 'request timed out for private-account', 'canceling statement due to statement timeout'])('classifies a request timeout without its message', message => {
    expect(summarizeFinancialReportError({ message })).toEqual({ code: 'REPORT_REQUEST_TIMEOUT' });
  });

  it('recognizes AbortError by name without exposing its text', () => {
    const error = new Error('private payload');
    error.name = 'AbortError';
    expect(summarizeFinancialReportError(error)).toEqual({ code: 'REPORT_REQUEST_TIMEOUT' });
  });

  it('bounds timeout inspection and rejects unlisted or extended server codes', () => {
    expect(summarizeFinancialReportError({ message: `${'x'.repeat(2000)} timeout secret` })).toEqual({ code: 'REPORT_VALIDATION_FAILED' });
    for (const code of ['23505', 'P0001', '42501 secret-token', 'PGRST202\n', 'PGRST999']) {
      expect(summarizeFinancialReportError({ code, details: 'secret' })).toEqual({ code: 'REPORT_VALIDATION_FAILED' });
    }
  });
});
