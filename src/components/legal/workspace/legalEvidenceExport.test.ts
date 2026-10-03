import { describe, expect, it, vi } from 'vitest';
import type { LegalCase } from '@/hooks/useLegalCases';
import { legalCaseCsv, legalCaseExportRows, parseLegalClaimAmount } from './legalCaseExport';
import { generatePackageDocument, recordedPackageDocuments, renderLawsuitPackageManifest } from './lawsuitPackageManifest';

describe('legal monetary and evidence exports', () => {
  it('preserves cents and separates incoming claims from outcomes and actual payment status', () => {
    const row = { id: 'case-a', case_direction: 'filed_against_us', case_value: 123.45, outcome_amount: 109.77, outcome_type: 'settled', outcome_amount_type: 'compensation', payment_direction: 'pay', outcome_payment_status: 'partial', case_status: 'active' } as LegalCase;
    const csv = legalCaseCsv(legalCaseExportRows([row], [{ id: 'doc-a', caseId: row.id, title: '=FORMULA', type: 'court_document', source: 'case', declaredOriginal: true, hasFileReference: true }], () => '=danger', () => 'party'));
    expect(csv).toContain('"123.45"');
    expect(csv).toContain('"109.77"');
    expect(csv).toContain('"filed_against_us"');
    expect(csv).toContain('"pay"');
    expect(csv).toContain('"partial"');
    expect(csv).toContain('لا يشمل ملفات المستندات أو أصولها');
    expect(csv).toContain('"\'=danger"');
    expect(parseLegalClaimAmount('123.45')).toBe(123.45);
  });

  it('requires a deliberate monetary claim and rejects silently rounded values', () => {
    expect(parseLegalClaimAmount('0')).toBe(0);
    for (const value of ['', '-1', '1.234', 'NaN', 'Infinity']) expect(() => parseLegalClaimAmount(value)).toThrow();
  });

  it('marks stored references as not included and missing documents separately', () => {
    const documents = recordedPackageDocuments([{ id: 'stored', title: 'contract', type: 'contract', hasReference: true }, { id: 'empty', title: 'scan', type: 'scan', hasReference: false }], [{ type: 'commercial_register', title: 'register' }]);
    expect(documents.map(row => row.status)).toEqual(['recorded_not_included', 'missing', 'missing']);
    expect(documents.every(row => !row.included && !row.originalIncluded)).toBe(true);
    const html = renderLawsuitPackageManifest('<script>alert(1)</script>', documents);
    expect(html).toContain('لم يُنزّل ولم يُضم للحزمة');
    expect(html).toContain('لا تشمل أصول المستندات');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('مرفق');
  });

  it('includes a generated document only after a successful archive write and explicitly records failures', async () => {
    const write = vi.fn();
    const success = await generatePackageDocument('memo', 'memo.html', async () => '<p>memo</p>', write);
    expect(write).toHaveBeenCalledWith('memo.html', '<p>memo</p>');
    expect(success).toMatchObject({ included: true, originalIncluded: false, status: 'included_generated' });
    write.mockClear();
    const failure = await generatePackageDocument('claims', 'claims.html', async () => { throw new Error('claim source unavailable'); }, write);
    expect(failure).toMatchObject({ included: false, status: 'failed', error: 'claim source unavailable' });
    expect(write).not.toHaveBeenCalled();
    const writeFailure = await generatePackageDocument('memo', 'memo.html', async () => '<p>memo</p>', () => { throw new Error('archive write failed'); });
    expect(writeFailure.status).toBe('failed');
    expect(writeFailure.included).toBe(false);
  });
});
