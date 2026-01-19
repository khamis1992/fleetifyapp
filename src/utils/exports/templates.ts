/**
 * Export Templates Utility
 *
 * Provides branded templates and styling for PDF and Excel exports
 * to maintain consistent corporate identity across all exports.
 *
 * Features:
 * - PDF templates with company branding
 * - Excel cell styles and themes
 * - Configurable color schemes
 * - Professional report layouts
 */

import jsPDF from 'jspdf';

/**
 * Brand theme configuration
 */
export interface BrandTheme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
    headerBg: string;
    headerText: string;
  };
  fonts: {
    primary: string;
    secondary: string;
  };
  logo?: {
    url: string;
    width: number;
    height: number;
  };
}

/**
 * Default FleetifyApp brand theme
 */
export const DEFAULT_THEME: BrandTheme = {
  name: 'FleetifyApp',
  colors: {
    primary: '#3b82f6', // Blue
    secondary: '#8b5cf6', // Purple
    accent: '#10b981', // Green
    text: '#1f2937', // Dark gray
    background: '#ffffff', // White
    headerBg: '#3b82f6',
    headerText: '#ffffff',
  },
  fonts: {
    primary: 'helvetica',
    secondary: 'helvetica',
  },
};

/**
 * Alternative brand themes
 */
export const THEMES: Record<string, BrandTheme> = {
  default: DEFAULT_THEME,
  professional: {
    name: 'Professional',
    colors: {
      primary: '#1e3a8a', // Dark blue
      secondary: '#475569', // Slate
      accent: '#059669', // Emerald
      text: '#0f172a',
      background: '#ffffff',
      headerBg: '#1e3a8a',
      headerText: '#ffffff',
    },
    fonts: {
      primary: 'helvetica',
      secondary: 'helvetica',
    },
  },
  modern: {
    name: 'Modern',
    colors: {
      primary: '#7c3aed', // Purple
      secondary: '#ec4899', // Pink
      accent: '#f59e0b', // Amber
      text: '#111827',
      background: '#ffffff',
      headerBg: '#7c3aed',
      headerText: '#ffffff',
    },
    fonts: {
      primary: 'helvetica',
      secondary: 'helvetica',
    },
  },
  elegant: {
    name: 'Elegant',
    colors: {
      primary: '#0f172a', // Slate 900
      secondary: '#64748b', // Slate 500
      accent: '#eab308', // Yellow 500
      text: '#1e293b',
      background: '#ffffff',
      headerBg: '#0f172a',
      headerText: '#ffffff',
    },
    fonts: {
      primary: 'helvetica',
      secondary: 'helvetica',
    },
  },
};

/**
 * PDF template layouts
 */
export enum PDFTemplateLayout {
  STANDARD = 'standard', // Header + content + footer
  MINIMAL = 'minimal', // No header, minimal footer
  BRANDED = 'branded', // Full branding with large header
  REPORT = 'report', // Professional report with table of contents
}

/**
 * Apply theme to PDF document
 */
export function applyThemeToPDF(
  pdf: jsPDF,
  theme: BrandTheme = DEFAULT_THEME
): void {
  // Set default colors
  pdf.setTextColor(theme.colors.text);
  pdf.setFont(theme.fonts.primary);
}

/**
 * Create standard PDF header
 */
export function createStandardHeader(
  pdf: jsPDF,
  title: string,
  companyName: string,
  theme: BrandTheme = DEFAULT_THEME
): void {
  const pageWidth = pdf.internal.pageSize.getWidth();

  // Header background
  const rgb = hexToRgb(theme.colors.headerBg);
  pdf.setFillColor(rgb.r, rgb.g, rgb.b);
  pdf.rect(0, 0, pageWidth, 25, 'F');

  // Company name
  const textRgb = hexToRgb(theme.colors.headerText);
  pdf.setTextColor(textRgb.r, textRgb.g, textRgb.b);
  pdf.setFontSize(16);
  pdf.setFont(theme.fonts.primary, 'bold');
  pdf.text(companyName, 15, 12);

  // Title
  pdf.setFontSize(12);
  pdf.setFont(theme.fonts.primary, 'normal');
  pdf.text(title, 15, 19);

  // Date
  pdf.setFontSize(10);
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  pdf.text(dateStr, pageWidth - 15, 12, { align: 'right' });

  // Reset
  const mainTextRgb = hexToRgb(theme.colors.text);
  pdf.setTextColor(mainTextRgb.r, mainTextRgb.g, mainTextRgb.b);
}

/**
 * Create branded PDF header (larger, more prominent)
 */
export function createBrandedHeader(
  pdf: jsPDF,
  title: string,
  subtitle: string,
  companyName: string,
  theme: BrandTheme = DEFAULT_THEME
): void {
  const pageWidth = pdf.internal.pageSize.getWidth();

  // Large header background (gradient effect with two rectangles)
  const primaryRgb = hexToRgb(theme.colors.headerBg);
  const secondaryRgb = hexToRgb(theme.colors.secondary);

  pdf.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  pdf.rect(0, 0, pageWidth, 40, 'F');

  pdf.setFillColor(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b);
  pdf.setGState(new (pdf as any).GState({ opacity: 0.1 }));
  pdf.rect(0, 30, pageWidth, 10, 'F');
  pdf.setGState(new (pdf as any).GState({ opacity: 1 }));

  // Company name (large)
  const textRgb = hexToRgb(theme.colors.headerText);
  pdf.setTextColor(textRgb.r, textRgb.g, textRgb.b);
  pdf.setFontSize(20);
  pdf.setFont(theme.fonts.primary, 'bold');
  pdf.text(companyName, 15, 15);

  // Title
  pdf.setFontSize(16);
  pdf.text(title, 15, 25);

  // Subtitle
  pdf.setFontSize(12);
  pdf.setFont(theme.fonts.primary, 'normal');
  pdf.text(subtitle, 15, 33);

  // Date (top right)
  pdf.setFontSize(10);
  const dateStr = new Date().toLocaleDateString('en-US');
  pdf.text(dateStr, pageWidth - 15, 15, { align: 'right' });

  // Reset
  const mainTextRgb = hexToRgb(theme.colors.text);
  pdf.setTextColor(mainTextRgb.r, mainTextRgb.g, mainTextRgb.b);
}

/**
 * Create minimal PDF header
 */
export function createMinimalHeader(
  pdf: jsPDF,
  title: string,
  theme: BrandTheme = DEFAULT_THEME
): void {
  const pageWidth = pdf.internal.pageSize.getWidth();

  // Simple line
  const accentRgb = hexToRgb(theme.colors.accent);
  pdf.setDrawColor(accentRgb.r, accentRgb.g, accentRgb.b);
  pdf.setLineWidth(1);
  pdf.line(15, 15, pageWidth - 15, 15);

  // Title
  const textRgb = hexToRgb(theme.colors.text);
  pdf.setTextColor(textRgb.r, textRgb.g, textRgb.b);
  pdf.setFontSize(14);
  pdf.setFont(theme.fonts.primary, 'bold');
  pdf.text(title, 15, 12);

  // Date
  pdf.setFontSize(9);
  pdf.setFont(theme.fonts.primary, 'normal');
  const dateStr = new Date().toLocaleDateString('en-US');
  pdf.text(dateStr, pageWidth - 15, 12, { align: 'right' });
}

/**
 * Create standard PDF footer
 */
export function createStandardFooter(
  pdf: jsPDF,
  pageNumber: number,
  totalPages: number,
  companyName?: string,
  theme: BrandTheme = DEFAULT_THEME
): void {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Footer line
  const accentRgb = hexToRgb(theme.colors.accent);
  pdf.setDrawColor(accentRgb.r, accentRgb.g, accentRgb.b);
  pdf.setLineWidth(0.5);
  pdf.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);

  // Page number
  pdf.setTextColor(128, 128, 128);
  pdf.setFontSize(9);
  pdf.setFont(theme.fonts.primary, 'normal');
  const pageText = `صفحة ${pageNumber} من ${totalPages}`;
  pdf.text(pageText, pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Company name
  if (companyName) {
    pdf.text(companyName, 15, pageHeight - 10);
  }

  // Timestamp
  const timestamp = new Date().toLocaleString('en-US');
  pdf.text(`تم الإنشاء: ${timestamp}`, pageWidth - 15, pageHeight - 10, { align: 'right' });

  // Reset
  const textRgb = hexToRgb(theme.colors.text);
  pdf.setTextColor(textRgb.r, textRgb.g, textRgb.b);
}

/**
 * Create table of contents page
 */
export function createTableOfContents(
  pdf: jsPDF,
  items: { title: string; subtitle?: string; page: number }[],
  theme: BrandTheme = DEFAULT_THEME
): void {
  const pageWidth = pdf.internal.pageSize.getWidth();

  // Title
  const textRgb = hexToRgb(theme.colors.text);
  pdf.setTextColor(textRgb.r, textRgb.g, textRgb.b);
  pdf.setFontSize(18);
  pdf.setFont(theme.fonts.primary, 'bold');
  pdf.text('جدول المحتويات', 15, 40);

  // Items
  let y = 55;
  pdf.setFontSize(11);

  items.forEach((item, index) => {
    // Item number and title
    pdf.setFont(theme.fonts.primary, 'normal');
    pdf.text(`${index + 1}. ${item.title}`, 20, y);

    // Page number (with dots)
    const titleWidth = pdf.getTextWidth(`${index + 1}. ${item.title}`);
    const dotsWidth = pageWidth - 35 - titleWidth - 15;
    const dotCount = Math.floor(dotsWidth / 3);
    const dots = '.'.repeat(Math.max(dotCount, 3));

    pdf.setTextColor(180, 180, 180);
    pdf.text(dots, 20 + titleWidth + 2, y);

    pdf.setTextColor(textRgb.r, textRgb.g, textRgb.b);
    pdf.text(String(item.page), pageWidth - 20, y, { align: 'right' });

    y += 8;

    // Subtitle (if provided)
    if (item.subtitle) {
      pdf.setFontSize(9);
      pdf.setTextColor(128, 128, 128);
      pdf.text(item.subtitle, 25, y);
      pdf.setFontSize(11);
      pdf.setTextColor(textRgb.r, textRgb.g, textRgb.b);
      y += 6;
    }

    // Add page break if needed
    if (y > 260) {
      pdf.addPage();
      y = 40;
    }
  });
}

/**
 * Excel cell styles
 */
export const EXCEL_STYLES = {
  header: {
    font: {
      bold: true,
      color: { rgb: 'FFFFFFFF' },
      sz: 12,
    },
    fill: {
      fgColor: { rgb: 'FF3B82F6' },
    },
    alignment: {
      horizontal: 'center',
      vertical: 'center',
    },
  },
  subheader: {
    font: {
      bold: true,
      color: { rgb: 'FF1F2937' },
      sz: 11,
    },
    fill: {
      fgColor: { rgb: 'FFF3F4F6' },
    },
    alignment: {
      horizontal: 'left',
      vertical: 'center',
    },
  },
  data: {
    font: {
      color: { rgb: 'FF1F2937' },
      sz: 10,
    },
    alignment: {
      horizontal: 'left',
      vertical: 'center',
    },
  },
  number: {
    font: {
      color: { rgb: 'FF1F2937' },
      sz: 10,
    },
    alignment: {
      horizontal: 'right',
      vertical: 'center',
    },
    numFmt: '#,##0.00',
  },
  currency: {
    font: {
      color: { rgb: 'FF1F2937' },
      sz: 10,
    },
    alignment: {
      horizontal: 'right',
      vertical: 'center',
    },
    numFmt: '#,##0.00',
  },
  percentage: {
    font: {
      color: { rgb: 'FF1F2937' },
      sz: 10,
    },
    alignment: {
      horizontal: 'right',
      vertical: 'center',
    },
    numFmt: '0.00%',
  },
  date: {
    font: {
      color: { rgb: 'FF1F2937' },
      sz: 10,
    },
    alignment: {
      horizontal: 'center',
      vertical: 'center',
    },
    numFmt: 'yyyy-mm-dd',
  },
};

/**
 * Helper: Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}
