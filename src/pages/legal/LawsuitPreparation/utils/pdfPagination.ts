export interface PdfContentBlock { top: number; bottom: number }

/** CSS-pixel intervals: keep ordinary rows/paragraphs whole and cover every pixel once. */
export function paginatePdfContent(height: number, pageHeight: number, blocks: PdfContentBlock[]) {
  if (!Number.isFinite(height) || !Number.isFinite(pageHeight) || height <= 0 || pageHeight < 1) {
    throw new Error('تعذر تحديد أبعاد المستند للطباعة');
  }
  const protectedBlocks = blocks.filter(block => Number.isFinite(block.top) && Number.isFinite(block.bottom)
    && block.top >= 0 && block.bottom > block.top && block.bottom - block.top <= pageHeight);
  const pages: PdfContentBlock[] = [];
  let top = 0;
  while (top < height) {
    let bottom = Math.min(height, top + pageHeight);
    // Moving a boundary may enter an earlier overlapping block; settle all overlaps.
    for (;;) {
      const crossing = protectedBlocks.filter(block => block.top > top
        && block.top < bottom && block.bottom > bottom);
      if (!crossing.length) break;
      bottom = Math.min(...crossing.map(block => block.top));
    }
    pages.push({ top, bottom });
    top = bottom;
  }
  return pages;
}
