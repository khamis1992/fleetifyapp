/**
 * PDF Export Utility
 *
 * Provides functions for exporting charts, tables, and dashboards to PDF format
 * with company branding, Arabic/RTL support, and high-quality rendering.
 *
 * Features:
 * - Single chart export
 * - Multi-page dashboard export
 * - Company branding (logo, colors)
 * - Headers and footers with metadata
 * - Table of contents for multi-chart exports
 * - High DPI rendering for quality
 * - Arabic/RTL text support
 */

import type { jsPDF } from 'jspdf';
import { buildOfficialReportDocumentHtml, exportOfficialHtmlToPDF } from '@/utils/officialFinancialReportExport';
// Lazy load html2canvas (566KB) - only when exporting

export interface PDFExportOptions {
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'letter' | 'legal';
  scale?: number; // DPI scaling (default: 2 for high quality)
  includeHeader?: boolean;
  includeFooter?: boolean;
  companyName?: string;
  companyLogo?: string;
  title?: string;
  subtitle?: string;
  metadata?: Record<string, string>;
  tableOfContents?: boolean;
}

export interface ChartExportData {
  element: HTMLElement;
  title: string;
  subtitle?: string;
  metadata?: Record<string, string>;
}

/**
 * Default export options
 */
const DEFAULT_OPTIONS: PDFExportOptions = {
  orientation: 'portrait',
  format: 'a4',
  scale: 2, // High DPI
  includeHeader: true,
  includeFooter: true,
  tableOfContents: false,
};

/**
 * Page dimensions for A4 portrait
 */
const PAGE_WIDTH = 210; // mm
const PAGE_HEIGHT = 297; // mm
const MARGIN = 15; // mm
const CONTENT_WIDTH = PAGE_WIDTH - (2 * MARGIN);
const CONTENT_HEIGHT = PAGE_HEIGHT - (2 * MARGIN);

/**
 * Brand colors (FleetifyApp)
 */
const BRAND_COLORS = {
  primary: '#3b82f6', // Blue
  secondary: '#8b5cf6', // Purple
  accent: '#10b981', // Green
  text: '#1f2937', // Dark gray
  lightGray: '#f3f4f6',
};

/**
 * Add branded header to PDF page
 */
export function addBrandedHeader(
  pdf: jsPDF,
  companyName: string,
  title?: string,
  logoUrl?: string
): void {
  const pageWidth = pdf.internal.pageSize.getWidth();

  // Header background
  pdf.setFillColor(BRAND_COLORS.primary);
  pdf.rect(0, 0, pageWidth, 25, 'F');

  // Company logo (if provided)
  if (logoUrl) {
    // TODO: Load and add logo image
    // pdf.addImage(logoUrl, 'PNG', MARGIN, 5, 20, 15);
  }

  // Company name
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  const nameX = logoUrl ? MARGIN + 25 : MARGIN;
  pdf.text(companyName, nameX, 12);

  // Title (if provided)
  if (title) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(title, nameX, 19);
  }

  // Date (top right)
  pdf.setFontSize(10);
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  pdf.text(dateStr, pageWidth - MARGIN, 12, { align: 'right' });

  // Reset text color
  pdf.setTextColor(BRAND_COLORS.text);
}

/**
 * Add branded footer to PDF page
 */
export function addBrandedFooter(
  pdf: jsPDF,
  pageNumber: number,
  totalPages: number,
  companyName?: string
): void {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Footer line
  pdf.setDrawColor(BRAND_COLORS.lightGray);
  pdf.setLineWidth(0.5);
  pdf.line(MARGIN, pageHeight - 15, pageWidth - MARGIN, pageHeight - 15);

  // Page number
  pdf.setTextColor(128, 128, 128);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  const pageText = `صفحة ${pageNumber} من ${totalPages}`;
  pdf.text(pageText, pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Company name (if provided)
  if (companyName) {
    pdf.text(companyName, MARGIN, pageHeight - 10);
  }

  // Generated timestamp
  const timestamp = new Date().toLocaleString('en-US');
  pdf.text(`تم الإنشاء: ${timestamp}`, pageWidth - MARGIN, pageHeight - 10, { align: 'right' });

  // Reset text color
  pdf.setTextColor(BRAND_COLORS.text);
}

/**
 * Capture HTML element as high-quality image
 * Lazy loads html2canvas library (566KB) on-demand
 */
async function captureElement(
  element: HTMLElement,
  scale: number = 2
): Promise<string> {
  try {
    // Dynamically import html2canvas only when needed (saves 566KB from initial bundle)
    const html2canvas = (await import('html2canvas')).default;

    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      imageTimeout: 0,
    });

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error capturing element:', error);
    throw new Error('فشل التقاط العنصر كصورة');
  }
}

/**
 * Export a single chart to PDF
 */
export async function exportChartToPDF(
  element: HTMLElement,
  filename: string,
  options: PDFExportOptions = {}
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    const imgData = await captureElement(element, opts.scale);
    const metadataRows = opts.metadata
      ? Object.entries(opts.metadata)
          .map(([key, value]) => `<tr><th>${key}</th><td>${value}</td></tr>`)
          .join('')
      : '';
    const bodyHtml = `
      <h2 style="margin: 0 0 12px; font-size: 16pt; color: #1e3a5f;">${opts.title || 'تقرير بياني'}</h2>
      ${opts.subtitle ? `<p style="margin: 0 0 12px;">${opts.subtitle}</p>` : ''}
      <img src="${imgData}" alt="${opts.title || 'chart'}" />
      ${metadataRows ? `<h3>بيانات التقرير</h3><table><tbody>${metadataRows}</tbody></table>` : ''}
    `;
    const officialHtml = buildOfficialReportDocumentHtml({
      metadata: {
        reportTitle: opts.title || filename.replace(/\.pdf$/i, ''),
        reportType: 'chart_report',
        companyName: opts.companyName || 'Fleetify',
        currency: 'QAR',
        asOfDate: new Date().toISOString().slice(0, 10),
        sourceFingerprint: `chart:${filename}:${element.id || element.className || 'element'}`,
        status: 'published',
      },
      bodyHtml,
    });

    await exportOfficialHtmlToPDF(officialHtml, filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  } catch (error) {
    console.error('Error exporting chart to PDF:', error);
    throw new Error('Failed to export chart to official PDF');
  }
}
/**
 * Export multiple charts to multi-page PDF
 */
export async function exportDashboardToPDF(
  charts: ChartExportData[],
  filename: string,
  options: PDFExportOptions = {}
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (charts.length === 0) {
    throw new Error('No charts available for export');
  }

  try {
    const sections = await Promise.all(charts.map(async (chart, index) => {
      const imgData = await captureElement(chart.element, opts.scale);
      const metadataRows = chart.metadata
        ? Object.entries(chart.metadata)
            .map(([key, value]) => `<tr><th>${key}</th><td>${value}</td></tr>`)
            .join('')
        : '';
      return `
        <section style="page-break-inside: avoid; margin-bottom: 18px;">
          <h2 style="margin: 0 0 8px; font-size: 15pt; color: #1e3a5f;">${index + 1}. ${chart.title}</h2>
          ${chart.subtitle ? `<p style="margin: 0 0 10px;">${chart.subtitle}</p>` : ''}
          <img src="${imgData}" alt="${chart.title}" />
          ${metadataRows ? `<table><tbody>${metadataRows}</tbody></table>` : ''}
        </section>
      `;
    }));

    const officialHtml = buildOfficialReportDocumentHtml({
      metadata: {
        reportTitle: opts.title || filename.replace(/\.pdf$/i, ''),
        reportType: 'dashboard_report',
        companyName: opts.companyName || 'Fleetify',
        currency: 'QAR',
        asOfDate: new Date().toISOString().slice(0, 10),
        sourceFingerprint: `dashboard:${filename}:${charts.length}`,
        status: 'published',
      },
      bodyHtml: sections.join(''),
    });

    await exportOfficialHtmlToPDF(officialHtml, filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  } catch (error) {
    console.error('Error exporting dashboard to PDF:', error);
    throw new Error('Failed to export dashboard to official PDF');
  }
}
/**
 * Export table data to PDF
 */
export async function exportTableToPDF(
  data: Record<string, any>[],
  columns: { header: string; key: string }[],
  filename: string,
  options: PDFExportOptions = {}
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    const headers = columns.map((column) => `<th>${column.header}</th>`).join('');
    const rows = data
      .map((row) => `<tr>${columns.map((column) => `<td>${row[column.key] ?? ''}</td>`).join('')}</tr>`)
      .join('');
    const bodyHtml = `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
    const officialHtml = buildOfficialReportDocumentHtml({
      metadata: {
        reportTitle: opts.title || filename.replace(/\.pdf$/i, ''),
        reportType: 'table_report',
        companyName: opts.companyName || 'Fleetify',
        currency: 'QAR',
        asOfDate: new Date().toISOString().slice(0, 10),
        sourceFingerprint: `table:${filename}:${columns.length}:${data.length}`,
        status: 'published',
      },
      bodyHtml,
    });

    await exportOfficialHtmlToPDF(officialHtml, filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  } catch (error) {
    console.error('Error exporting table to PDF:', error);
    throw new Error('Failed to export table to official PDF');
  }
}
/**
 * Generate filename with timestamp
 */
export function generateFilename(
  baseName: string,
  extension: string = 'pdf'
): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .split('T')
    .join('_')
    .slice(0, -5);

  return `${baseName}_${timestamp}.${extension}`;
}

