interface PDFTextItem {
  str?: string;
  hasEOL?: boolean;
}

export const joinPDFTextItems = (items: PDFTextItem[]): string =>
  items
    .map((item) => `${item.str || ''}${item.hasEOL ? '\n' : ' '}`)
    .join('');
