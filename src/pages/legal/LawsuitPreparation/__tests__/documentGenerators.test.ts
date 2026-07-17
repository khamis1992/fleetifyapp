import { describe, expect, it } from 'vitest';
import { buildViolationEvidenceDocumentEntries } from '../utils/documentGenerators';

describe('buildViolationEvidenceDocumentEntries', () => {
  it('omits the traffic report when no evidence file exists', () => {
    expect(buildViolationEvidenceDocumentEntries([])).toEqual([]);
  });

  it('adds the Ministry of Interior traffic report to the uploaded documents list', () => {
    expect(buildViolationEvidenceDocumentEntries([{
      id: 'report-1',
      name: '2766.pdf',
      url: 'https://example.test/2766.pdf',
      mimeType: 'application/pdf',
    }])).toEqual([{
      name: 'تقرير مخالفات وزارة الداخلية',
      status: 'مرفق',
      url: 'https://example.test/2766.pdf',
      type: 'pdf',
    }]);
  });

  it('lists every report when the contract has multiple evidence files', () => {
    const entries = buildViolationEvidenceDocumentEntries([
      { id: 'report-1', name: 'first.pdf', url: 'https://example.test/1.pdf', mimeType: 'application/pdf' },
      { id: 'report-2', name: 'second.pdf', url: 'https://example.test/2.pdf', mimeType: 'application/pdf' },
    ]);

    expect(entries.map(entry => entry.name)).toEqual([
      'تقرير مخالفات وزارة الداخلية (1 من 2)',
      'تقرير مخالفات وزارة الداخلية (2 من 2)',
    ]);
  });
});
