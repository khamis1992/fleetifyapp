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

import jsPDF from 'jspdf';
// Lazy load html2canvas (566KB) - only when exporting
import autoTable from 'jspdf-autotable';

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
    // Create PDF document
    const pdf = new jsPDF({
      orientation: opts.orientation,
      unit: 'mm',
      format: opts.format,
    });

    // Add header
    if (opts.includeHeader) {
      addBrandedHeader(
        pdf,
        opts.companyName || 'FleetifyApp',
        opts.title,
        opts.companyLogo
      );
    }

    // Capture chart as image
    const imgData = await captureElement(element, opts.scale);

    // Calculate image dimensions to fit page
    const headerHeight = opts.includeHeader ? 30 : MARGIN;
    const footerHeight = opts.includeFooter ? 20 : MARGIN;
    const availableHeight = PAGE_HEIGHT - headerHeight - footerHeight;

    const imgWidth = CONTENT_WIDTH;
    const imgHeight = (element.offsetHeight / element.offsetWidth) * CONTENT_WIDTH;

    // Add image to PDF
    const yPosition = headerHeight;
    pdf.addImage(
      imgData,
      'PNG',
      MARGIN,
      yPosition,
      imgWidth,
      Math.min(imgHeight, availableHeight)
    );

    // Add metadata table (if provided)
    if (opts.metadata) {
      const metadataY = yPosition + Math.min(imgHeight, availableHeight) + 10;

      if (metadataY + 20 < PAGE_HEIGHT - footerHeight) {
        const tableData = Object.entries(opts.metadata).map(([key, value]) => [key, value]);

        autoTable(pdf, {
          startY: metadataY,
          head: [['المعلومة', 'القيمة']],
          body: tableData,
          theme: 'grid',
          headStyles: {
            fillColor: BRAND_COLORS.primary,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
          },
          styles: {
            font: 'helvetica',
            fontSize: 9,
            cellPadding: 3,
          },
          margin: { left: MARGIN, right: MARGIN },
        });
      }
    }

    // Add footer
    if (opts.includeFooter) {
      addBrandedFooter(pdf, 1, 1, opts.companyName);
    }

    // Save PDF
    pdf.save(filename);
  } catch (error) {
    console.error('Error exporting chart to PDF:', error);
    throw new Error('فشل تصدير الرسم البياني إلى PDF');
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
    throw new Error('لا توجد رسوم بيانية لتصديرها');
  }

  try {
    // Create PDF document
    const pdf = new jsPDF({
      orientation: opts.orientation,
      unit: 'mm',
      format: opts.format,
    });

    const totalPages = opts.tableOfContents ? charts.length + 1 : charts.length;
    let currentPage = 1;

    // Add table of contents (if enabled)
    if (opts.tableOfContents) {
      addBrandedHeader(
        pdf,
        opts.companyName || 'FleetifyApp',
        'جدول المحتويات',
        opts.companyLogo
      );

      // TOC title
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('جدول المحتويات', MARGIN, 40);

      // TOC entries
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      let tocY = 50;

      charts.forEach((chart, index) => {
        const pageNum = index + 2; // +1 for TOC page, +1 for 1-indexed
        pdf.text(`${index + 1}. ${chart.title}`, MARGIN + 5, tocY);
        pdf.text(`${pageNum}`, PAGE_WIDTH - MARGIN - 10, tocY, { align: 'right' });
        tocY += 8;

        if (chart.subtitle) {
          pdf.setFontSize(9);
          pdf.setTextColor(128, 128, 128);
          pdf.text(chart.subtitle, MARGIN + 10, tocY);
          pdf.setFontSize(11);
          pdf.setTextColor(BRAND_COLORS.text);
          tocY += 6;
        }
      });

      addBrandedFooter(pdf, currentPage, totalPages, opts.companyName);
      currentPage++;
    }

    // Export each chart
    for (let i = 0; i < charts.length; i++) {
      const chart = charts[i];

      // Add new page (except for first chart after TOC)
      if (i > 0 || opts.tableOfContents) {
        pdf.addPage();
      }

      // Add header
      if (opts.includeHeader) {
        addBrandedHeader(
          pdf,
          opts.companyName || 'FleetifyApp',
          chart.title,
          opts.companyLogo
        );
      }

      // Capture chart as image
      const imgData = await captureElement(chart.element, opts.scale);

      // Calculate image dimensions
      const headerHeight = opts.includeHeader ? 30 : MARGIN;
      const footerHeight = opts.includeFooter ? 20 : MARGIN;
      const availableHeight = PAGE_HEIGHT - headerHeight - footerHeight;

      const imgWidth = CONTENT_WIDTH;
      const imgHeight = (chart.element.offsetHeight / chart.element.offsetWidth) * CONTENT_WIDTH;

      // Add image to PDF
      const yPosition = headerHeight;
      pdf.addImage(
        imgData,
        'PNG',
        MARGIN,
        yPosition,
        imgWidth,
        Math.min(imgHeight, availableHeight)
      );

      // Add metadata (if provided)
      if (chart.metadata) {
        const metadataY = yPosition + Math.min(imgHeight, availableHeight) + 10;

        if (metadataY + 20 < PAGE_HEIGHT - footerHeight) {
          const tableData = Object.entries(chart.metadata).map(([key, value]) => [key, value]);

          autoTable(pdf, {
            startY: metadataY,
            head: [['المعلومة', 'القيمة']],
            body: tableData,
            theme: 'grid',
            headStyles: {
              fillColor: BRAND_COLORS.primary,
              textColor: [255, 255, 255],
              fontStyle: 'bold',
            },
            styles: {
              font: 'helvetica',
              fontSize: 9,
              cellPadding: 3,
            },
            margin: { left: MARGIN, right: MARGIN },
          });
        }
      }

      // Add footer
      if (opts.includeFooter) {
        addBrandedFooter(pdf, currentPage, totalPages, opts.companyName);
      }

      currentPage++;
    }

    // Save PDF
    pdf.save(filename);
  } catch (error) {
    console.error('Error exporting dashboard to PDF:', error);
    throw new Error('فشل تصدير لوحة المعلومات إلى PDF');
  }
}

/**
 * Export table data to PDF
 */
export function exportTableToPDF(
  data: Record<string, any>[],
  columns: { header: string; key: string }[],
  filename: string,
  options: PDFExportOptions = {}
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    // Create PDF document
    const pdf = new jsPDF({
      orientation: opts.orientation || 'landscape', // Tables work better in landscape
      unit: 'mm',
      format: opts.format,
    });

    // Add header
    if (opts.includeHeader) {
      addBrandedHeader(
        pdf,
        opts.companyName || 'FleetifyApp',
        opts.title || 'تقرير بيانات',
        opts.companyLogo
      );
    }

    // Prepare table data
    const headers = columns.map(col => col.header);
    const tableData = data.map(row => columns.map(col => row[col.key] || ''));

    // Add table
    autoTable(pdf, {
      startY: opts.includeHeader ? 35 : MARGIN,
      head: [headers],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: BRAND_COLORS.primary,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 3,
        overflow: 'linebreak',
      },
      columnStyles: {
        // Auto-size columns
      },
      margin: { left: MARGIN, right: MARGIN },
      didDrawPage: (data) => {
        // Add footer on each page
        if (opts.includeFooter) {
          const pageCount = (pdf as any).internal.getNumberOfPages();
          addBrandedFooter(pdf, data.pageNumber, pageCount, opts.companyName);
        }
      },
    });

    // Save PDF
    pdf.save(filename);
  } catch (error) {
    console.error('Error exporting table to PDF:', error);
    throw new Error('فشل تصدير الجدول إلى PDF');
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
