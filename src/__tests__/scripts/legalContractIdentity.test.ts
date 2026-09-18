import { describe, expect, it } from 'vitest';
import {
  assessLegalContractIdentity,
  extractContractTenantIdentity,
} from '../../../supabase/functions/_shared/legal-contract-identity';

describe('legal contract identity assessment', () => {
  it('requires review for a different first name without reliable ID evidence', () => {
    const result = assessLegalContractIdentity({
      expectedName: 'أحمد الشيخ الصديق هاشم الوسيلة',
      extractedName: 'محمد الشيخ الصديق هاشم الوسيلة',
    });

    expect(result.status).toBe('unverified');
    expect(result.expectedName).toContain('احمد');
    expect(result.extractedName).toContain('محمد');
  });

  it('uses the identity number as the strongest match signal', () => {
    expect(assessLegalContractIdentity({
      expectedName: 'أحمد الشيخ',
      extractedName: 'احمد الشيخ الصديق',
      expectedId: '28901234567',
      extractedId: '28901234567',
    }).status).toBe('matched');
  });

  it('ignores Arabic punctuation added by OCR after the tenant name', () => {
    expect(assessLegalContractIdentity({
      expectedName: 'حمزة بادو',
      extractedName: 'حمزه بادو ،',
      expectedId: '29850400215',
      extractedId: '29850400215',
      authoritativeName: true,
    }).status).toBe('matched');
  });

  it('gives the tenant field priority over an attached matching ID card', () => {
    expect(assessLegalContractIdentity({
      expectedName: 'أحمد الشيخ الصديق هاشم الوسيلة',
      extractedName: 'محمد الشيخ الصديق هاشم الوسيلة',
      expectedId: '27773601703',
      extractedId: '27773601703',
      authoritativeName: true,
    }).status).toBe('unverified');
  });

  it('extracts the named tenant from the rental contract body', () => {
    const result = extractContractTenantIdentity(`
      عقد إيجار مركبة
      اسم المستأجر: محمد الشيخ الصديق هاشم الوسيلة
      رقم البطاقة: 28801234567
    `);

    expect(result).toMatchObject({
      nameArabic: 'محمد الشيخ الصديق هاشم الوسيلة',
      identityNumber: '28801234567',
    });
  });

  it('ignores legal boilerplate that merely mentions the tenant label', () => {
    const result = extractContractTenantIdentity(`
      عقد إيجار مركبة
      ويشار إليه لاحقاً بلفظ المؤجر
      وبشار اليه لاحقا بلفظ المستاجر ،
      اسم المستأجر: عصام المزوغي
      رقم البطاقة: 28078801264
    `);

    expect(result).toMatchObject({
      nameArabic: 'عصام المزوغي',
      identityNumber: '28078801264',
    });
  });

  it('does not treat a boilerplate-only sentence as a tenant name', () => {
    expect(extractContractTenantIdentity(
      'وبشار اليه لاحقا بلفظ المستاجر ،',
    )).toEqual({ nameArabic: null, identityNumber: null });
  });

  it('keeps unclear OCR evidence for human review', () => {
    expect(assessLegalContractIdentity({
      expectedName: 'أحمد الشيخ الصديق',
      extractedName: 'الشيخ',
    }).status).toBe('unverified');
  });

  it('does not promote a partial same-first-name overlap to a legal match', () => {
    const result = assessLegalContractIdentity({
      expectedName: 'محمد الشيخ الصديق هاشم',
      extractedName: 'محمد الشيخ الصديق',
      authoritativeName: true,
    });

    expect(result.status).toBe('unverified');
    expect(result.reasonCode).toBe('tenant_name_conflict');
  });

  it('requires exact tenant evidence even when an attached identity number matches', () => {
    expect(assessLegalContractIdentity({
      expectedName: 'محمد الشيخ الصديق هاشم',
      extractedName: 'محمد الشيخ الصديق',
      expectedId: '28901234567',
      extractedId: '28901234567',
      authoritativeName: true,
    }).status).toBe('unverified');
  });
});
