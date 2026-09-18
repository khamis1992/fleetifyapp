import { describe, expect, it } from 'vitest';
import { describeError, workerErrorDetails } from '../error-details';

describe('worker error diagnostics', () => {
  it('retains the PostgREST failure instead of coercing an object to text', () => {
    expect(workerErrorDetails({ code: 'P0001', message: 'claim amount changed', details: 'review the claim', hint: 'refresh the package' }))
      .toEqual({ code: 'P0001', message: 'claim amount changed', details: 'review the claim', hint: 'refresh the package' });
  });
  it('supports native errors and plain strings', () => {
    expect(describeError(new Error('network unavailable'))).toBe('network unavailable');
    expect(describeError('timeout')).toBe('timeout');
  });
  it('does not dump an arbitrary object or credentials', () => {
    const error: Record<string, unknown> = { message: {}, access_token: 'secret' };
    error.cause = error;
    const result = workerErrorDetails(error);
    expect(result.message).not.toContain('[object Object]');
    expect(JSON.stringify(result)).not.toContain('secret');
  });
  it('provides a readable fallback for absent and malformed messages', () => {
    for (const value of [null, undefined, {}, { message: '[object Object]' }]) {
      expect(describeError(value)).toContain('حدث خطأ');
    }
    expect(describeError({ details: 'permission denied' })).toBe('permission denied');
  });
  it('summarizes a gateway HTML error without exposing the page markup', () => {
    const result = workerErrorDetails({ message: '<!DOCTYPE html><html><title>supabase.co | 525: SSL handshake failed</title></html>' });
    expect(result.code).toBe('525');
    expect(result.message).toContain('HTTP 525');
    expect(result.message).not.toContain('<html>');
  });
});
