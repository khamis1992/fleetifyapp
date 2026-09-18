import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { financialStatementPackageError } from '../financialStatementPackage';
import { balanceSheetErrorMessage } from '../professionalBalanceSheet';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: vi.fn() } }));

describe('financial report error messages', () => {
  it.each([
    { code: '57014', message: 'canceling statement due to statement timeout' },
    { message: 'AbortError: signal is aborted without reason' },
  ])('identifies timeouts without promising that a mutation did not commit', error => {
    for (const format of [financialStatementPackageError, balanceSheetErrorMessage]) {
      expect(format(error, 'en')).toContain('Refresh to check its status');
      expect(format(error, 'ar')).toContain('للتحقق من حالته');
      expect(format(error, 'en')).not.toContain('no data was changed');
    }
  });
  it('does not mistake a response-schema note field for incomplete user disclosures', () => {
    const result = z.object({ noteNumbers: z.array(z.number()) }).safeParse({ noteNumbers: null });
    expect(result.success).toBe(false);
    if (!result.success) expect(financialStatementPackageError(result.error, 'en')).toContain('could not be verified');
  });
});
