import { describe, expect, it } from 'vitest';
import { findCorruptedConfigValues } from '../config';

const healthyConfig = {
  representative: {
    name: 'خميس الجبر',
    phone: '66707063',
    email: 'rep@example.com',
    address: 'الدوحة قطر',
    nationality: 'قطر',
    identityType: 'بطاقة شخصية',
    identityNumber: '29263400736',
  },
  defendantDefaults: {
    email: 'def@example.com',
    address: 'الدوحة قطر',
  },
  company: {
    phone: '66707063',
    email: 'co@example.com',
    address: 'الدوحة قطر',
    country: 'قطري',
    bankNameAr: 'مصرف قطر الوطني',
    bankNameEn: 'Qatar National Bank',
    iban: 'QA00',
    swift: 'QNBAQAQA',
    bankAddress: 'Doha',
    bankCountry: 'قطري',
  },
};

describe('findCorruptedConfigValues', () => {
  it('accepts a healthy Arabic configuration', () => {
    expect(findCorruptedConfigValues(healthyConfig)).toEqual([]);
  });

  it('flags ANSI-corrupted values (literal question marks)', () => {
    const corrupted = findCorruptedConfigValues({
      ...healthyConfig,
      company: {
        ...healthyConfig.company,
        country: '???',
        bankCountry: '????',
      },
    });
    expect(corrupted).toEqual([
      'TAQADI_COMPANY_COUNTRY',
      'TAQADI_COMPANY_BANK_COUNTRY',
    ]);
  });

  it('flags corrupted representative and defendant fields', () => {
    const corrupted = findCorruptedConfigValues({
      ...healthyConfig,
      representative: {
        ...healthyConfig.representative,
        name: '???? ?????',
        nationality: '?????',
      },
      defendantDefaults: {
        ...healthyConfig.defendantDefaults,
        address: '?????? ???',
      },
    });
    expect(corrupted).toEqual([
      'TAQADI_REPRESENTATIVE_NAME',
      'TAQADI_REPRESENTATIVE_NATIONALITY',
      'TAQADI_DEFENDANT_ADDRESS',
    ]);
  });

  it('does not flag values that merely contain a question mark', () => {
    expect(findCorruptedConfigValues({
      ...healthyConfig,
      company: {
        ...healthyConfig.company,
        bankAddress: 'P.O. Box 1000, Doha?',
      },
    })).toEqual([]);
  });

  it('does not flag empty values (handled by the missing-config check)', () => {
    expect(findCorruptedConfigValues({
      ...healthyConfig,
      company: { ...healthyConfig.company, bankNameAr: '' },
    })).toEqual([]);
  });
});
