import { describe, expect, it } from 'vitest';

import { joinPDFTextItems } from '../pdfTextExtraction';

describe('joinPDFTextItems', () => {
  it('preserves PDF row boundaries needed by table parsers', () => {
    const text = joinPDFTextItems([
      { str: '1 3301740845 2026-07-12', hasEOL: true },
      { str: '17:49', hasEOL: true },
      { str: '007054/LIMOUSINE', hasEOL: true },
      { str: '500.0 0', hasEOL: false },
    ]);

    expect(text).toBe(
      '1 3301740845 2026-07-12\n17:49\n007054/LIMOUSINE\n500.0 0 '
    );
  });
});
