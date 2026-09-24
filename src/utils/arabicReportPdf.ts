/**
 * Text-based Arabic PDF generation for official financial reports.
 *
 * jsPDF v4 ships a full Unicode Bidi engine and an Arabic glyph shaper
 * (__bidiEngine__ / __arabicParser__), so embedding the Amiri TTF gives us
 * selectable, searchable Arabic text — the accounting-firm output standard —
 * with no html2canvas rasterization.
 */
import { jsPDF } from 'jspdf';

export const ARABIC_FONT_NAME = 'Amiri';
const FONT_FILES = {
  regular: '/fonts/Amiri-Regular.ttf',
  bold: '/fonts/Amiri-Bold.ttf',
} as const;

const fontCache = new Map<string, string>();

async function loadFontBase64(url: string): Promise<string> {
  const cached = fontCache.get(url);
  if (cached) return cached;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to load report font: ${url}`);
  const buffer = await response.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  const base64 = btoa(binary);
  fontCache.set(url, base64);
  return base64;
}

/** Creates a jsPDF instance with Amiri embedded; safe to call repeatedly. */
export async function createArabicPdf(): Promise<jsPDF> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const [regular, bold] = await Promise.all([
    loadFontBase64(FONT_FILES.regular),
    loadFontBase64(FONT_FILES.bold),
  ]);
  pdf.addFileToVFS('Amiri-Regular.ttf', regular);
  pdf.addFileToVFS('Amiri-Bold.ttf', bold);
  pdf.addFont('Amiri-Regular.ttf', ARABIC_FONT_NAME, 'normal');
  pdf.addFont('Amiri-Bold.ttf', ARABIC_FONT_NAME, 'bold');
  pdf.setFont(ARABIC_FONT_NAME, 'normal');
  return pdf;
}

export type PdfAlign = 'right' | 'left' | 'center';

export interface PdfTableRow {
  cells: string[];
  /** Column share of the table width, values should sum to 100. */
  widths: number[];
  aligns?: PdfAlign[];
  bold?: boolean;
  shading?: string;
  textColor?: [number, number, number];
  fontSize?: number;
}

export interface PdfSection {
  title?: string;
  paragraphs?: string[];
  table?: {
    header: PdfTableRow;
    rows: PdfTableRow[];
    summaryRows?: PdfTableRow[];
  };
}

export interface ArabicReportPdfPayload {
  /** Document metadata / audit trail printed on every export. */
  metadata: {
    reportTitle: string;
    companyAr: string;
    companyEn: string;
    commercialRegister: string;
    addressAr: string;
    currency: string;
    asOfDate?: string | null;
    periodStart?: string | null;
    periodEnd?: string | null;
    status?: string | null;
    sourceFingerprint?: string | null;
    preparedBy?: string | null;
    approvedBy?: string | null;
    exportedAt?: string | null;
  };
  sections: PdfSection[];
  footerNote?: string;
}

const PAGE = { width: 210, height: 297, marginX: 15, top: 22, bottom: 20 } as const;
const CONTENT_WIDTH = PAGE.width - PAGE.marginX * 2;

/**
 * Renders the report as vector text: repeated letterhead, auto page breaks at
 * row boundaries, and real Arabic shaping via jsPDF's built-in Bidi engine.
 */
export async function exportArabicReportPdf(payload: ArabicReportPdfPayload, fileName: string): Promise<void> {
  const pdf = await createArabicPdf();
  const meta = payload.metadata;
  const state = { page: 1 };
  pdf.setProperties({
    title: meta.reportTitle,
    subject: meta.asOfDate || meta.periodEnd || '',
    author: meta.companyAr || meta.companyEn,
  });

  const drawLetterhead = () => {
    pdf.setFont(ARABIC_FONT_NAME, 'bold');
    pdf.setFontSize(17);
    pdf.text(meta.companyAr, PAGE.width - PAGE.marginX, 14, { align: 'right' });
    pdf.setFontSize(9);
    pdf.setFont(ARABIC_FONT_NAME, 'normal');
    pdf.text(`سجل تجاري: ${meta.commercialRegister} — ${meta.addressAr}`, PAGE.width - PAGE.marginX, 19.5, { align: 'right' });
    pdf.text(meta.companyEn, PAGE.marginX, 14, { align: 'left' });
    pdf.setDrawColor(30, 58, 95);
    pdf.setLineWidth(0.8);
    pdf.line(PAGE.marginX, 22, PAGE.width - PAGE.marginX, 22);
    state.page = pdf.getNumberOfPages();
  };

  const drawFooter = () => {
    const pages = pdf.getNumberOfPages();
    pdf.setFont(ARABIC_FONT_NAME, 'normal');
    pdf.setFontSize(8);
    pdf.setDrawColor(150);
    pdf.setLineWidth(0.2);
    pdf.line(PAGE.marginX, PAGE.height - 16, PAGE.width - PAGE.marginX, PAGE.height - 16);
    pdf.text(
      meta.sourceFingerprint ? `بصمة المصدر: ${meta.sourceFingerprint}` : '',
      PAGE.width - PAGE.marginX,
      PAGE.height - 12,
      { align: 'right' },
    );
    pdf.text(`صفحة ${pages}`, PAGE.marginX, PAGE.height - 12, { align: 'left' });
  };

  const newPage = () => {
    pdf.addPage();
    drawLetterhead();
  };

  const needsSpace = (usedY: number, needed: number): boolean => usedY + needed > PAGE.height - PAGE.bottom;

  const drawRow = (row: PdfTableRow, y: number): number => {
    const fontSize = row.fontSize ?? 10;
    pdf.setFont(ARABIC_FONT_NAME, row.bold ? 'bold' : 'normal');
    pdf.setFontSize(fontSize);
    const columns = row.cells.length;
    const widths = row.widths.length === columns ? row.widths : Array(columns).fill(100 / columns);
    const heights = row.cells.map((cell, index) => {
      const width = (widths[index] / 100) * CONTENT_WIDTH;
      const lines = pdf.splitTextToSize(String(cell ?? ' '), width - 4);
      return Math.max(6, lines.length * (fontSize * 0.42) + 3);
    });
    const rowHeight = Math.max(...heights);
    if (row.shading) {
      pdf.setFillColor(...hexToRgb(row.shading));
      pdf.rect(PAGE.marginX, y - 4, CONTENT_WIDTH, rowHeight, 'F');
    }
    const color = row.textColor ?? [20, 25, 35];
    pdf.setTextColor(color[0], color[1], color[2]);
    let x = PAGE.width - PAGE.marginX;
    row.cells.forEach((cell, index) => {
      const width = (widths[index] / 100) * CONTENT_WIDTH;
      const align = row.aligns?.[index] ?? 'right';
      pdf.text(String(cell ?? ''), align === 'left' ? x - width + 2 : align === 'center' ? x - width / 2 : x - 2, y, { align });
      x -= width;
    });
    pdf.setTextColor(20, 25, 35);
    pdf.setDrawColor(200);
    pdf.setLineWidth(0.1);
    pdf.line(PAGE.marginX, y - 4 + rowHeight, PAGE.width - PAGE.marginX, y - 4 + rowHeight);
    return y + rowHeight;
  };

  pdf.setFont(ARABIC_FONT_NAME, 'bold');
  drawLetterhead();
  let y = 30;
  pdf.setFontSize(14);
  pdf.text(meta.reportTitle, PAGE.width / 2, y, { align: 'center' });
  y += 8;
  pdf.setFont(ARABIC_FONT_NAME, 'normal');
  pdf.setFontSize(9);
  const scopeLine = [
    meta.asOfDate ? `كما في: ${meta.asOfDate}` : '',
    meta.periodStart && meta.periodEnd ? `الفترة: ${meta.periodStart} — ${meta.periodEnd}` : '',
    `العملة: ${meta.currency}`,
    meta.status ? `الحالة: ${meta.status}` : '',
  ].filter(Boolean).join('     ');
  pdf.text(scopeLine, PAGE.width / 2, y, { align: 'center' });
  y += 6;

  for (const section of payload.sections) {
    if (section.title) {
      if (needsSpace(y, 12)) { drawFooter(); newPage(); y = 30; }
      pdf.setFont(ARABIC_FONT_NAME, 'bold');
      pdf.setFontSize(12);
      pdf.text(section.title, PAGE.width - PAGE.marginX, y, { align: 'right' });
      y += 6;
    }
    for (const paragraph of section.paragraphs || []) {
      const lines = pdf.splitTextToSize(paragraph, CONTENT_WIDTH - 4);
      for (const line of lines) {
        if (needsSpace(y, 6)) { drawFooter(); newPage(); y = 30; }
        pdf.setFont(ARABIC_FONT_NAME, 'normal');
        pdf.setFontSize(10);
        pdf.text(line, PAGE.width - PAGE.marginX - 2, y, { align: 'right' });
        y += 5;
      }
      y += 2;
    }
    const table = section.table;
    if (table) {
      const headerHeight = 8;
      if (needsSpace(y, headerHeight + 10)) { drawFooter(); newPage(); y = 30; }
      y = drawRow({ ...table.header, bold: true, shading: '#1e3a5f', textColor: [255, 255, 255], fontSize: 10 }, y);
      for (const row of table.rows) {
        const rowNeeded = 8;
        if (needsSpace(y, rowNeeded)) { drawFooter(); newPage(); y = 30; }
        y = drawRow(row, y);
      }
      for (const row of table.summaryRows || []) {
        const rowNeeded = 8;
        if (needsSpace(y, rowNeeded)) { drawFooter(); newPage(); y = 30; }
        y = drawRow({ ...row, bold: true, shading: '#eef2f6' }, y);
      }
    }
    y += 4;
  }

  if (payload.footerNote) {
    if (needsSpace(y, 14)) { drawFooter(); newPage(); y = 30; }
    pdf.setFont(ARABIC_FONT_NAME, 'normal');
    pdf.setFontSize(8.5);
    const lines = pdf.splitTextToSize(payload.footerNote, CONTENT_WIDTH - 4);
    for (const line of lines) {
      pdf.text(line, PAGE.width - PAGE.marginX - 2, y, { align: 'right' });
      y += 4.5;
    }
  }

  drawFooter();
  pdf.save(fileName);
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

/**
 * Accounting number format shared with the official HTML export: parentheses
 * for negatives, thousands separators, no repeated currency symbols.
 */
export function formatPdfMoney(value: number): string {
  const amount = Number.isFinite(value) ? value : 0;
  const body = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `(${body})` : body;
}