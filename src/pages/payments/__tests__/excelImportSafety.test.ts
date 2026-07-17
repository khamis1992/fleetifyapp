import { describe, expect, it } from 'vitest';
import {
  AUTO_CONTRACT_MATCH_MIN_CONFIDENCE,
  areNearMonthlyAmounts,
  areNearIdentityNumbers,
  buildWorkbookContentId,
  deduplicateWorkbookInputs,
  getContractIdentityConflict,
  getImportedDelayDays,
  hasCompatibleIdentityName,
  hasBlockingImportWarnings,
  isBlockingImportWarning,
  isAutomaticContractMatch,
  mapInBatches,
  parseImportedTrafficAmounts,
  parseStructuredImportAmount,
} from '../excelImportSafety';

describe('Excel payment import safety', () => {
  it('rejects a contract when both plates exist and do not match', () => {
    expect(getContractIdentityConflict({
      fileHasName: true,
      namesMatch: true,
      fileHasPlate: true,
      contractHasPlate: true,
      platesMatch: false,
      fileNationalId: '',
      contractNationalId: '',
      nationalIdsMatch: false,
      phonesMatch: false,
    })).toContain('لوحة');
  });

  it('rejects a plate-only match when the customer names conflict', () => {
    expect(getContractIdentityConflict({
      fileHasName: true,
      namesMatch: false,
      fileNationalId: '29678801036',
      contractNationalId: '',
      nationalIdsMatch: false,
      phonesMatch: false,
    })).toContain('تطابق اللوحة وحده غير كافٍ');
  });

  it('rejects conflicting national IDs even when another signal matches', () => {
    expect(getContractIdentityConflict({
      fileHasName: true,
      namesMatch: true,
      platesMatch: false,
      fileNationalId: '111',
      contractNationalId: '222',
      nationalIdsMatch: false,
      phonesMatch: true,
    })).toContain('الرقم الشخصي');
  });

  it('accepts a one-digit identity typo only with corroborating plate and identity evidence', () => {
    expect(areNearIdentityNumbers('29278800778', '29278800776')).toBe(true);
    expect(getContractIdentityConflict({
      fileHasName: true,
      namesMatch: false,
      platesMatch: true,
      fileNationalId: '29278800778',
      contractNationalId: '29278800776',
      nationalIdsMatch: false,
      phonesMatch: true,
    })).toBeNull();
  });

  it('accepts a conflicting identity only when name, phone, and plate all agree', () => {
    expect(getContractIdentityConflict({
      fileHasName: true,
      namesMatch: true,
      platesMatch: true,
      fileNationalId: '29050401901',
      contractNationalId: '2978800578',
      nationalIdsMatch: false,
      phonesMatch: true,
    })).toBeNull();
  });

  it('still rejects a conflicting identity when only the plate agrees', () => {
    expect(getContractIdentityConflict({
      fileHasName: true,
      namesMatch: false,
      platesMatch: true,
      fileNationalId: '11111111111',
      contractNationalId: '22222222222',
      nationalIdsMatch: false,
      phonesMatch: false,
    })).toContain('الرقم الشخصي');
  });

  it('accepts a stale identity only when name, plate, rent, and contract start all corroborate it', () => {
    expect(getContractIdentityConflict({
      fileHasName: true,
      namesMatch: true,
      platesMatch: true,
      fileNationalId: '28476001834',
      contractNationalId: '28376002415',
      nationalIdsMatch: false,
      phonesMatch: false,
      monthlyAmountsMatch: true,
      contractStartMatches: true,
    })).toBeNull();
  });

  it('allows identity-compatible candidates', () => {
    expect(getContractIdentityConflict({
      fileHasName: true,
      namesMatch: false,
      fileNationalId: '111',
      contractNationalId: '111',
      nationalIdsMatch: true,
      phonesMatch: false,
    })).toBeNull();
  });

  it('requires the automatic match confidence floor', () => {
    expect(AUTO_CONTRACT_MATCH_MIN_CONFIDENCE).toBe(80);
    expect(isAutomaticContractMatch(79)).toBe(false);
    expect(isAutomaticContractMatch(80)).toBe(true);
  });

  it('matches a customer against each stored language alias independently', () => {
    expect(hasCompatibleIdentityName('حمزةبادو', ['HamzaBADOU', 'حمزةبادو'])).toBe(true);
    expect(hasCompatibleIdentityName('عبدالرزاقالهنيديس', ['عبدالرزاقالهنديسيس'])).toBe(true);
    expect(hasCompatibleIdentityName('حمزةبادو', ['محمداحمد', 'HamzaBADOU'])).toBe(false);
  });

  it('uses a small monthly-rent variance as corroborating evidence', () => {
    expect(areNearMonthlyAmounts(1050, 1060)).toBe(true);
    expect(areNearMonthlyAmounts(1050, 1600)).toBe(false);
  });

  it('does not invent delay days when the workbook has no delay column', () => {
    expect(getImportedDelayDays({
      delayColumnIndex: -1,
      paymentAmount: 0,
      parsedDelayDays: 560,
    })).toBe(0);
  });

  it('keeps an explicit delay value from the workbook', () => {
    expect(getImportedDelayDays({
      delayColumnIndex: 4,
      paymentAmount: 0,
      parsedDelayDays: 12,
    })).toBe(12);
  });

  it('uses the workbook contents rather than its file name for identity', async () => {
    const bytes = new TextEncoder().encode('same workbook contents');
    const first = await buildWorkbookContentId(bytes.buffer);
    const renamedCopy = await buildWorkbookContentId(bytes.buffer.slice(0));

    expect(first).toBe(renamedCopy);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  it('removes repeated workbook contents from one upload selection', () => {
    const result = deduplicateWorkbookInputs([
      { name: 'original.xlsx', contentId: 'same' },
      { name: 'renamed.xlsx', contentId: 'same' },
      { name: 'different.xlsx', contentId: 'different' },
    ]);

    expect(result.unique.map((item) => item.name)).toEqual(['original.xlsx', 'different.xlsx']);
    expect(result.duplicates.map((item) => item.name)).toEqual(['renamed.xlsx']);
  });

  it('limits concurrent parsing work to the configured batch size', async () => {
    let active = 0;
    let maximumActive = 0;
    const values = Array.from({ length: 12 }, (_, index) => index);
    const results = await mapInBatches(values, 5, async (value) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await Promise.resolve();
      active -= 1;
      return value * 2;
    });

    expect(results).toEqual(values.map((value) => value * 2));
    expect(maximumActive).toBeLessThanOrEqual(5);
  });

  it('parses explicit traffic amounts and sums plus-separated fines', () => {
    expect(parseImportedTrafficAmounts('500+1000+500')).toEqual({
      amounts: [500, 1000, 500],
      rejected: false,
    });
  });

  it('ignores reference-like traffic cells instead of turning them into huge fines', () => {
    expect(parseImportedTrafficAmounts('7200/            2024')).toEqual({
      amounts: [],
      rejected: false,
    });
  });

  it('rejects implausibly large traffic amounts', () => {
    expect(parseImportedTrafficAmounts('72002024')).toEqual({
      amounts: [],
      rejected: true,
    });
  });

  it('keeps rejected traffic references visible without blocking valid payments', () => {
    const warning = 'تم تجاهل قيمة مخالفة غير آمنة في الصف 19 لأنها تشبه تاريخًا أو رقم مرجع أو تتجاوز الحد المسموح.';

    expect(isBlockingImportWarning(warning)).toBe(false);
    expect(hasBlockingImportWarnings([warning])).toBe(false);
  });

  it('continues blocking files that are missing required import identity', () => {
    expect(hasBlockingImportWarnings(['لا يوجد رقم لوحة أو هوية أو هاتف للمطابقة.'])).toBe(true);
  });

  it('reads structured amounts without extracting numbers from descriptive notes', () => {
    expect(parseStructuredImportAmount('1,500 + 500')).toBe(2000);
    expect(parseStructuredImportAmount('دافع 21800 كل أقساط السيارة')).toBeNull();
  });
});
