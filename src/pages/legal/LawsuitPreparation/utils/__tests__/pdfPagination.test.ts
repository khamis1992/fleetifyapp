import { describe, expect, it } from 'vitest';
import { paginatePdfContent } from '../pdfPagination';

describe('complete memorandum PDF pagination', () => {
  it('moves a row crossing the page end intact onto the next page', () => {
    expect(paginatePdfContent(180, 100, [{ top: 90, bottom: 120 }]))
      .toEqual([{ top: 0, bottom: 90 }, { top: 90, bottom: 180 }]);
  });
  it('settles overlapping row and paragraph boundaries', () => {
    expect(paginatePdfContent(180, 100, [{ top: 90, bottom: 120 }, { top: 80, bottom: 95 }])[0].bottom).toBe(80);
  });
  it('exports beyond twenty pages without dropping content or duplicating pixels', () => {
    const pages = paginatePdfContent(2501, 100, []);
    expect(pages).toHaveLength(26);
    expect(pages[0].top).toBe(0);
    expect(pages.at(-1)!.bottom).toBe(2501);
    expect(pages.reduce((sum, page) => sum + page.bottom - page.top, 0)).toBe(2501);
    pages.slice(1).forEach((page, index) => expect(page.top).toBe(pages[index].bottom));
  });
  it('can split an oversized block rather than looping or losing its end', () => {
    expect(paginatePdfContent(250, 100, [{ top: 0, bottom: 250 }]))
      .toEqual([{ top: 0, bottom: 100 }, { top: 100, bottom: 200 }, { top: 200, bottom: 250 }]);
  });
});
