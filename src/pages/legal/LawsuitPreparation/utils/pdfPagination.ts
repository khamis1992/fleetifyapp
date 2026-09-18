export interface PdfContentBlock { top: number; bottom: number }
export interface RepeatedTableHeader extends PdfContentBlock { tableBottom: number }
export interface PdfContentPage extends PdfContentBlock { header?: PdfContentBlock }

/** CSS-pixel intervals: keep ordinary rows/paragraphs whole and cover every pixel once. */
export function paginatePdfContent(height: number, pageHeight: number, blocks: PdfContentBlock[], headers: RepeatedTableHeader[] = []) {
  if (!Number.isFinite(height) || !Number.isFinite(pageHeight) || height <= 0 || pageHeight < 1) {
    throw new Error('تعذر تحديد أبعاد المستند للطباعة');
  }
  const protectedBlocks = blocks.filter(block => Number.isFinite(block.top) && Number.isFinite(block.bottom)
    && block.top >= 0 && block.bottom > block.top && block.bottom - block.top <= pageHeight);
  const pages: PdfContentPage[] = [];
  let top = 0;
  while (top < height) {
    const header = headers.find(item => item.bottom <= top && item.tableBottom > top && item.bottom > item.top && item.bottom - item.top < pageHeight / 2);
    let bottom = Math.min(height, top + pageHeight - (header ? header.bottom - header.top : 0));
    // Moving a boundary may enter an earlier overlapping block; settle all overlaps.
    for (;;) {
      const crossing = protectedBlocks.filter(block => block.top > top
        && block.top < bottom && block.bottom > bottom);
      if (!crossing.length) break;
      bottom = Math.min(...crossing.map(block => block.top));
    }
    pages.push({ top, bottom, ...(header ? { header: {top:header.top,bottom:header.bottom} } : {}) });
    top = bottom;
  }
  return pages;
}
