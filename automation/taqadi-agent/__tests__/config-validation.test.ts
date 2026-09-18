import { describe, expect, it } from 'vitest';
import {
  agentConfig,
  findCorruptedConfigValues,
  validateScraplingConfig,
} from '../config';

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
  it('runs all production portal steps including final approval automatically', () => {
    expect(agentConfig.guidedMode).toBe(false);
    expect(agentConfig.finalApproval).toBe(true);
    expect(agentConfig.pauseBeforeFinalApproval).toBe(false);
  });

  it('uses the approved claimant email for both the company and representative', () => {
    expect(agentConfig.representative.email).toBe('khamis-1992@hotmail.com');
    expect(agentConfig.company.email).toBe('khamis-1992@hotmail.com');
  });

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

  it('flags corrupted representative fields', () => {
    const corrupted = findCorruptedConfigValues({
      ...healthyConfig,
      representative: {
        ...healthyConfig.representative,
        name: '???? ?????',
        nationality: '?????',
      },
    });
    expect(corrupted).toEqual([
      'TAQADI_REPRESENTATIVE_NAME',
      'TAQADI_REPRESENTATIVE_NATIONALITY',
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

  it('keeps Scrapling disabled by default and rejects remote sidecars', () => {
    expect(agentConfig.scrapling.enabled).toBe(false);
    expect(validateScraplingConfig({
      enabled: true,
      baseUrl: 'https://adaptive.example.com',
      token: '123456789012345678901234',
      minSimilarity: 80,
    })).toContain('TAQADI_SCRAPLING_URL must be a local loopback HTTP URL');
  });

  it('accepts a strongly authenticated loopback Scrapling sidecar', () => {
    expect(validateScraplingConfig({
      enabled: true,
      baseUrl: 'http://127.0.0.1:4318',
      token: '123456789012345678901234',
      minSimilarity: 80,
    })).toEqual([]);
  });
});
