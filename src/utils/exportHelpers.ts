/**
 * Export Helpers
 * Utility functions for exporting data to CSV and PDF formats
 */

import html2pdf from 'html2pdf.js';
import { toast } from 'sonner';

interface ExportData {
  [key: string]: any;
}

/**
 * Export data to CSV format
 * @param data - Array of objects to export
 * @param filename - Name of the file (without extension)
 * @param headers - Optional custom headers. If not provided, uses object keys
 */
export const exportToCSV = (
  data: ExportData[],
  filename: string,
  headers?: string[]
): void => {
  try {
    if (!data || data.length === 0) {
      toast.error('No data available to export');
      return;
    }

    // Get headers from data if not provided
    const csvHeaders = headers || Object.keys(data[0]);

    // Create CSV header row
    const headerRow = csvHeaders.join(',');

    // Create CSV data rows
    const dataRows = data.map(row => {
      return csvHeaders.map(header => {
        const value = row[header];
        // Handle values that might contain commas or quotes
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',');
    });

    // Combine header and data
    const csv = [headerRow, ...dataRows].join('\n');

    // Create blob and download
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel UTF-8
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success(`Exported ${data.length} records to CSV`);
  } catch (error) {
    console.error('CSV export error:', error);
    toast.error('Failed to export CSV');
  }
};

/**
 * Export analytics data to CSV with proper formatting
 */
export const exportAnalyticsToCSV = (analytics: any[], filename: string): void => {
  if (!analytics || analytics.length === 0) {
    toast.error('No analytics data available to export');
    return;
  }

  const formattedData = analytics.map(item => ({
    'Date': item.created_at ? new Date(item.created_at).toLocaleDateString() : '',
    'Page Path': item.page_path || '',
    'Page Title': item.page_title || '',
    'Visitor ID': item.visitor_id || '',
    'Device Type': item.device_type || '',
    'Traffic Source': item.traffic_source || '',
    'Views': item.views || 0,
    'Time on Page (s)': item.time_on_page || 0,
    'Bounced': item.bounced ? 'Yes' : 'No',
    'Converted': item.converted ? 'Yes' : 'No',
  }));

  exportToCSV(formattedData, filename);
};

/**
 * Export data to PDF format
 * @param elementId - ID of the HTML element to convert to PDF
 * @param filename - Name of the file (without extension)
 * @param options - Optional PDF configuration
 */
export const exportToPDF = async (
  elementId: string,
  filename: string,
  options?: any
): Promise<void> => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      toast.error('Content not found for PDF export');
      return;
    }

    const defaultOptions = {
      margin: [10, 10],
      filename: `${filename}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    };

    const pdfOptions = { ...defaultOptions, ...options };

    await html2pdf().set(pdfOptions).from(element).save();

    toast.success('PDF exported successfully');
  } catch (error) {
    console.error('PDF export error:', error);
    toast.error('Failed to export PDF');
  }
};

/**
 * Export analytics metrics summary to PDF
 */
export const exportAnalyticsSummaryToPDF = async (
  metrics: {
    totalViews: number;
    uniqueVisitors: number;
    conversionRate: number;
    averageTimeOnPage: string;
    bounceRate: number;
    topPages: Array<{path: string; views: number; title: string}>;
    deviceBreakdown: {desktop: number; mobile: number; tablet: number};
    trafficSources: {direct: number; organic: number; social: number; referral: number; email: number};
  },
  companyName: string,
  dateRange: { from: Date; to: Date }
): Promise<void> => {
  try {
    // Create temporary container for PDF content
    const container = document.createElement('div');
    container.id = 'analytics-pdf-export';
    container.style.padding = '20px';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.direction = 'rtl'; // RTL for Arabic

    container.innerHTML = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #333; font-size: 24px; margin-bottom: 10px;">تقرير تحليلات الصفحة المقصودة</h1>
        <h2 style="color: #666; font-size: 18px; margin-bottom: 5px;">${companyName}</h2>
        <p style="color: #999; font-size: 14px;">
          ${dateRange.from.toLocaleDateString('ar-SA')} - ${dateRange.to.toLocaleDateString('ar-SA')}
        </p>
      </div>

      <div style="margin-bottom: 30px;">
        <h3 style="color: #333; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #3b82f6; padding-bottom: 5px;">المقاييس الرئيسية</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">إجمالي المشاهدات</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${metrics.totalViews.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">الزوار الفريدون</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${metrics.uniqueVisitors.toLocaleString()}</td>
          </tr>
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">معدل التحويل</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${metrics.conversionRate.toFixed(1)}%</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">متوسط الوقت في الصفحة</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${metrics.averageTimeOnPage}</td>
          </tr>
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">معدل الارتداد</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${metrics.bounceRate.toFixed(1)}%</td>
          </tr>
        </table>
      </div>

      ${metrics.topPages.length > 0 ? `
      <div style="margin-bottom: 30px;">
        <h3 style="color: #333; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #3b82f6; padding-bottom: 5px;">أكثر الصفحات زيارة</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #3b82f6; color: white;">
              <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">الصفحة</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">المسار</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">المشاهدات</th>
            </tr>
          </thead>
          <tbody>
            ${metrics.topPages.map((page, index) => `
              <tr style="${index % 2 === 0 ? 'background-color: #f5f5f5;' : ''}">
                <td style="padding: 10px; border: 1px solid #ddd;">${page.title}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${page.path}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${page.views.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      <div style="margin-bottom: 30px;">
        <h3 style="color: #333; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #3b82f6; padding-bottom: 5px;">توزيع الأجهزة</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">سطح المكتب</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${metrics.deviceBreakdown.desktop.toFixed(1)}%</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">الجوال</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${metrics.deviceBreakdown.mobile.toFixed(1)}%</td>
          </tr>
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">الجهاز اللوحي</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${metrics.deviceBreakdown.tablet.toFixed(1)}%</td>
          </tr>
        </table>
      </div>

      <div>
        <h3 style="color: #333; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #3b82f6; padding-bottom: 5px;">مصادر الزيارات</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">مباشر</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${metrics.trafficSources.direct.toFixed(1)}%</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">بحث طبيعي</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${metrics.trafficSources.organic.toFixed(1)}%</td>
          </tr>
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">وسائل التواصل</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${metrics.trafficSources.social.toFixed(1)}%</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">إحالة</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${metrics.trafficSources.referral.toFixed(1)}%</td>
          </tr>
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">بريد إلكتروني</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${metrics.trafficSources.email.toFixed(1)}%</td>
          </tr>
        </table>
      </div>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #999; font-size: 12px;">
        <p>تم إنشاء هذا التقرير بواسطة FleetifyApp - ${new Date().toLocaleDateString('ar-SA')}</p>
      </div>
    `;

    document.body.appendChild(container);

    await exportToPDF('analytics-pdf-export', `landing-analytics-${companyName}-${Date.now()}`, {
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    });

    // Remove temporary container
    document.body.removeChild(container);
  } catch (error) {
    console.error('Analytics PDF export error:', error);
    toast.error('Failed to export analytics PDF');
  }
};
