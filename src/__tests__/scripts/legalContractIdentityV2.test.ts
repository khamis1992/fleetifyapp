import { describe, expect, it } from 'vitest';
import { assessLegalContractIdentity, extractContractTenantIdentity, extractLabelledIdentityNumbers, normalizeIdentityNumber } from '../../../supabase/functions/_shared/legal-contract-identity';

describe('identity matching v2 regression matrix', () => {
  const base = { expectedName: 'عبدالله علي أحمد', extractedName: 'عبد الله علي احمد', expectedId: '29900000001', extractedId: '29900000001', authoritativeName: true };
  it.each(['29900000001', '٢٩٩٠٠٠٠٠٠٠١', '۲۹۹۰۰۰۰۰۰۰۱', '299 0000-0001'])('normalizes complete QID %s without changing identity', (value) => {
    expect(normalizeIdentityNumber(value)).toBe('29900000001');
    expect(assessLegalContractIdentity({ ...base, extractedId: value }).status).toBe('matched');
  });
  it.each(['12345', '2990000000', '299000000011', '299OOOOOOO1', 'QID29900000001', '', null])('never approves incomplete or corrupt identifiers %s', (value) => {
    expect(normalizeIdentityNumber(value)).toBeNull();
    expect(assessLegalContractIdentity({ ...base, expectedId: value, extractedId: value }).status).toBe('unverified');
  });
  it('normalizes compound names without reordering name tokens', () => {
    expect(assessLegalContractIdentity(base).status).toBe('matched');
    expect(assessLegalContractIdentity({ ...base, extractedName: 'أحمد علي عبدالله' }).reasonCode).toBe('tenant_name_conflict');
  });
  it('does not certify exact names with conflicting complete QIDs', () => {
    expect(assessLegalContractIdentity({ ...base, extractedId: '29900000002' }).status).toBe('mismatch');
  });
  it('routes a low confidence digit conflict to review', () => {
    expect(assessLegalContractIdentity({ ...base, extractedId: '29900000002', idConfidence: 0.65 }).reasonCode).toBe('low_ocr_confidence');
  });
  it.each([{ incompleteScan: true }, { ambiguousEvidence: true }])('never certifies incomplete or contradictory evidence %#', (flags) => {
    expect(assessLegalContractIdentity({ ...base, ...flags }).status).toBe('unverified');
  });
  it('preserves original readings alongside normalized values and reason codes', () => {
    const result = assessLegalContractIdentity({ ...base, extractedId: '٢٩٩٠٠٠٠٠٠٠١' });
    expect(result.engineVersion).toBeTruthy();
    expect(result.details).toMatchObject({ raw: { extractedId: '٢٩٩٠٠٠٠٠٠٠١' }, normalized: { extractedId: '29900000001' }, reasonCode: 'exact_identity_number' });
  });
  it('rejects the LTO2024252 boilerplate pattern before extracting a name', () => {
    expect(extractContractTenantIdentity('الطرف الثاني:\nللطرف الاول بموجب هذا العقد ولا يمكن استرجاع')).toEqual({ nameArabic: null, identityNumber: null });
    expect(assessLegalContractIdentity({ ...base, extractedName: 'للطرف الاول بموجب هذا العقد ولا يمكن استرجاع' }).status).toBe('matched');
  });
  it('extracts a labelled Arabic QID and its original source quote', () => {
    expect(extractContractTenantIdentity('اسم المستأجر: عبد الله علي أحمد\nرقم البطاقة: ٢٩٩٠٠٠٠٠٠٠١')).toMatchObject({ nameArabic: 'عبد الله علي أحمد', identityNumber: '29900000001', evidence: expect.stringContaining('رقم البطاقة') });
  });
  it('flags multiple tenants rather than using the first candidate', () => {
    expect(extractContractTenantIdentity('اسم المستأجر: عبد الله علي أحمد\nاسم المستأجر: محمد علي أحمد').ambiguous).toBe(true);
  });
  it('does not turn digits in the first-party section into a tenant identifier', () => {
    expect(extractContractTenantIdentity('الطرف الأول: محمد علي أحمد\nرقم البطاقة: 29900000002\nاسم المستأجر: عبد الله علي أحمد').identityNumber).toBeNull();
  });
  it('excludes arbitrary numbers in Qatar bank attachments from identity conflicts', () => {
    const candidates = extractLabelledIdentityNumbers('Second Party: TEST\nQID No: 29900000001\nQatar Bank\nCheque: 28800000002\nAccount: 27700000003');
    expect(candidates.map((candidate) => candidate.value)).toEqual(['29900000001']);
  });
  it('retains conflicts between two explicitly labelled complete identity numbers', () => {
    expect(extractLabelledIdentityNumbers('QID No: 29900000001\nرقم البطاقة: ٢٨٨٠٠٠٠٠٠٠٢').map((candidate) => candidate.value)).toEqual(['29900000001', '28800000002']);
  });
  it('does not interpret continuation lines in deposit and notice clauses as multiple tenants', () => {
    expect(extractContractTenantIdentity('الطرف الثاني للطرف الأول بموجب هذا العقد ولا يمكن استرجاع\nمبلغ الضمان بعد تسلم السيارة .\nمادة 7- المعاينة\nالطرف الثاني\nتُعتبر الإشعارات المرسلة على النحو الوارد أعلاه')).toEqual({ nameArabic: null, identityNumber: null });
  });
});
