/**
 * Export Button Component
 *
 * Provides a dropdown menu for exporting data in various formats (PDF, Excel, CSV, Print).
 * Can be used in widgets, tables, and dashboards.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileSpreadsheet, FileType, Printer, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export interface ExportButtonProps {
  /** Data to export (for CSV/Excel) */
  data?: Record<string, any>[];
  /** Chart element reference (for PDF) */
  chartRef?: React.RefObject<HTMLElement>;
  /** Base filename (without extension) */
  filename?: string;
  /** Chart data for structured exports */
  chartData?: {
    labels: string[];
    datasets: { label: string; data: number[] }[];
  };
  /** Custom column definitions */
  columns?: { header: string; key: string }[];
  /** Callback when export starts */
  onExportStart?: (format: 'pdf' | 'excel' | 'csv' | 'print') => void;
  /** Callback when export completes */
  onExportComplete?: (format: 'pdf' | 'excel' | 'csv' | 'print') => void;
  /** Callback when export fails */
  onExportError?: (error: Error) => void;
  /** Show print option */
  showPrint?: boolean;
  /** Button variant */
  variant?: 'default' | 'outline' | 'ghost';
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Additional CSS classes */
  className?: string;
  /** Company name for branding */
  companyName?: string;
  /** Title for export */
  title?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  data,
  chartRef,
  filename = 'export',
  chartData,
  columns,
  onExportStart,
  onExportComplete,
  onExportError,
  showPrint = true,
  variant = 'outline',
  size = 'sm',
  className = '',
  companyName = 'FleetifyApp',
  title,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);

  /**
   * Handle PDF export
   */
  const handlePDFExport = async () => {
    if (!chartRef?.current) {
      toast.error('لا يمكن تصدير الرسم البياني', {
        description: 'عنصر الرسم البياني غير متاح',
      });
      return;
    }

    setIsExporting(true);
    setExportingFormat('pdf');
    onExportStart?.('pdf');

    try {
      // Dynamically import to reduce bundle size
      const { exportChartToPDF } = await import('@/utils/exports');

      await exportChartToPDF(chartRef.current, `${filename}.pdf`, {
        companyName,
        title,
        includeHeader: true,
        includeFooter: true,
      });

      toast.success('تم التصدير بنجاح', {
        description: 'تم تصدير الرسم البياني إلى PDF',
      });

      onExportComplete?.('pdf');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('فشل التصدير', {
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء التصدير',
      });
      onExportError?.(error instanceof Error ? error : new Error('Unknown error'));
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  };

  /**
   * Handle Excel export
   */
  const handleExcelExport = async () => {
    if (!data || data.length === 0) {
      toast.error('لا توجد بيانات للتصدير', {
        description: 'لم يتم العثور على بيانات',
      });
      return;
    }

    setIsExporting(true);
    setExportingFormat('excel');
    onExportStart?.('excel');

    try {
      // Dynamically import to reduce bundle size
      if (chartData) {
        const { exportChartDataToExcel } = await import('@/utils/exports');
        exportChartDataToExcel(chartData, `${filename}.xlsx`);
      } else {
        const { exportTableToExcel } = await import('@/utils/exports');
        exportTableToExcel(data, columns, `${filename}.xlsx`);
      }

      toast.success('تم التصدير بنجاح', {
        description: 'تم تصدير البيانات إلى Excel',
      });

      onExportComplete?.('excel');
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('فشل التصدير', {
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء التصدير',
      });
      onExportError?.(error instanceof Error ? error : new Error('Unknown error'));
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  };

  /**
   * Handle CSV export
   */
  const handleCSVExport = async () => {
    if (!data || data.length === 0) {
      toast.error('لا توجد بيانات للتصدير', {
        description: 'لم يتم العثور على بيانات',
      });
      return;
    }

    setIsExporting(true);
    setExportingFormat('csv');
    onExportStart?.('csv');

    try {
      // Dynamically import to reduce bundle size
      if (chartData) {
        const { exportChartDataToCSV } = await import('@/utils/exports');
        exportChartDataToCSV(chartData, `${filename}.csv`);
      } else if (columns) {
        const { exportTableToCSV } = await import('@/utils/exports');
        exportTableToCSV(data, columns, `${filename}.csv`);
      } else {
        const { exportToCSV } = await import('@/utils/exports');
        exportToCSV(data, `${filename}.csv`);
      }

      toast.success('تم التصدير بنجاح', {
        description: 'تم تصدير البيانات إلى CSV',
      });

      onExportComplete?.('csv');
    } catch (error) {
      console.error('CSV export error:', error);
      toast.error('فشل التصدير', {
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء التصدير',
      });
      onExportError?.(error instanceof Error ? error : new Error('Unknown error'));
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  };

  /**
   * Handle print
   */
  const handlePrint = () => {
    setIsExporting(true);
    setExportingFormat('print');
    onExportStart?.('print');

    try {
      window.print();

      toast.success('جاري الطباعة', {
        description: 'تم فتح نافذة الطباعة',
      });

      onExportComplete?.('print');
    } catch (error) {
      console.error('Print error:', error);
      toast.error('فشلت الطباعة', {
        description: 'حدث خطأ أثناء فتح نافذة الطباعة',
      });
      onExportError?.(error instanceof Error ? error : new Error('Unknown error'));
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          disabled={isExporting}
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              جاري التصدير...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              تصدير
            </>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        {/* PDF Export */}
        {chartRef && (
          <DropdownMenuItem
            onClick={handlePDFExport}
            disabled={isExporting}
            className="cursor-pointer"
          >
            <FileText className="h-4 w-4 ml-2 text-red-500" />
            <span>تصدير PDF</span>
            {exportingFormat === 'pdf' && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
          </DropdownMenuItem>
        )}

        {/* Excel Export */}
        {data && (
          <DropdownMenuItem
            onClick={handleExcelExport}
            disabled={isExporting}
            className="cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 ml-2 text-green-500" />
            <span>تصدير Excel</span>
            {exportingFormat === 'excel' && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
          </DropdownMenuItem>
        )}

        {/* CSV Export */}
        {data && (
          <DropdownMenuItem
            onClick={handleCSVExport}
            disabled={isExporting}
            className="cursor-pointer"
          >
            <FileType className="h-4 w-4 ml-2 text-blue-500" />
            <span>تصدير CSV</span>
            {exportingFormat === 'csv' && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
          </DropdownMenuItem>
        )}

        {/* Print */}
        {showPrint && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handlePrint}
              disabled={isExporting}
              className="cursor-pointer"
            >
              <Printer className="h-4 w-4 ml-2 text-gray-500" />
              <span>طباعة</span>
              {exportingFormat === 'print' && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
