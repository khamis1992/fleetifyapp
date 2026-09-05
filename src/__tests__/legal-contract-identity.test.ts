import { describe, expect, it } from 'vitest';
import { assessLegalContractIdentity } from '../../supabase/functions/_shared/legal-contract-identity';

describe('assessLegalContractIdentity', () => {
  it('gives an exact QID match priority over a noisy OCR name', () => {
    const result = assessLegalContractIdentity({
      expectedName: 'سعيد الحبابي',
      extractedName: 'للطرف الاول بموجب هذا العقد ولا يمكن استرجاع',
      expectedId: '28663402985',
      extractedId: '28663402985',
      authoritativeName: true,
    });

    expect(result.status).toBe('matched');
    expect(result.reason).toContain('identity number');
  });

  it('keeps an identity-number conflict as a hard mismatch', () => {
    const result = assessLegalContractIdentity({
      expectedName: 'سعيد الحبابي',
      extractedName: 'سعيد الحبابي',
      expectedId: '28663402985',
      extractedId: '28663402986',
      authoritativeName: true,
    });

    expect(result.status).toBe('mismatch');
    expect(result.reason).toContain('different person');
  });
});
