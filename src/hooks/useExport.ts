/**
 * useExport Hook
 *
 * Provides export state management and helper functions for exporting data
 * in various formats (PDF, Excel, CSV).
 */

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';

export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'print';

export interface ExportState {
  isExporting: boolean;
  exportProgress: number;
  exportFormat: ExportFormat | null;
  error: Error | null;
}

export interface UseExportOptions {
  companyName?: string;
  onExportStart?: (format: ExportFormat) => void;
  onExportComplete?: (format: ExportFormat) => void;
  onExportError?: (error: Error) => void;
}

export interface UseExportReturn {
  /** Current export state */
  state: ExportState;
  /** Export chart to PDF */
  exportChartPDF: (element: HTMLElement, filename: string, title?: string) => Promise<void>;
  /** Export table to Excel */
  exportTableExcel: (
    data: Record<string, any>[],
    filename: string,
    columns?: { header: string; key: string }[]
  ) => Promise<void>;
  /** Export data to CSV */
  exportDataCSV: (
    data: Record<string, any>[],
    filename: string,
    columns?: { header: string; key: string }[]
  ) => Promise<void>;
  /** Export dashboard (multiple charts) to PDF */
  exportDashboardPDF: (
    charts: { element: HTMLElement; title: string; subtitle?: string }[],
    filename: string,
    title?: string
  ) => Promise<void>;
  /** Trigger print */
  print: () => void;
  /** Reset export state */
  reset: () => void;
}

/**
 * Hook for managing export operations
 */
export function useExport(options: UseExportOptions = {}): UseExportReturn {
  const { browsedCompany } = useUnifiedCompanyAccess();
  const companyName = options.companyName || browsedCompany?.company_name || 'FleetifyApp';

  const [state, setState] = useState<ExportState>({
    isExporting: false,
    exportProgress: 0,
    exportFormat: null,
    error: null,
  });

  /**
   * Update export state
   */
  const updateState = useCallback((updates: Partial<ExportState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  /**
   * Reset export state
   */
  const reset = useCallback(() => {
    setState({
      isExporting: false,
      exportProgress: 0,
      exportFormat: null,
      error: null,
    });
  }, []);

  /**
   * Handle export start
   */
  const handleExportStart = useCallback(
    (format: ExportFormat) => {
      updateState({
        isExporting: true,
        exportFormat: format,
        exportProgress: 0,
        error: null,
      });
      options.onExportStart?.(format);
    },
    [options, updateState]
  );

  /**
   * Handle export complete
   */
  const handleExportComplete = useCallback(
    (format: ExportFormat) => {
      updateState({
        isExporting: false,
        exportProgress: 100,
      });
      options.onExportComplete?.(format);
    },
    [options, updateState]
  );

  /**
   * Handle export error
   */
  const handleExportError = useCallback(
    (error: Error, format: ExportFormat) => {
      updateState({
        isExporting: false,
        exportProgress: 0,
        error,
      });
      options.onExportError?.(error);

      toast.error('فشل التصدير', {
        description: error.message || 'حدث خطأ أثناء التصدير',
      });
    },
    [options, updateState]
  );

  /**
   * Export chart to PDF
   */
  const exportChartPDF = useCallback(
    async (element: HTMLElement, filename: string, title?: string) => {
      handleExportStart('pdf');

      try {
        const { exportChartToPDF } = await import('@/utils/exports');

        updateState({ exportProgress: 30 });

        await exportChartToPDF(element, filename, {
          companyName,
          title,
          includeHeader: true,
          includeFooter: true,
        });

        updateState({ exportProgress: 100 });

        toast.success('تم التصدير بنجاح', {
          description: 'تم تصدير الرسم البياني إلى PDF',
        });

        handleExportComplete('pdf');
      } catch (error) {
        handleExportError(
          error instanceof Error ? error : new Error('Unknown error'),
          'pdf'
        );
      }
    },
    [companyName, handleExportStart, handleExportComplete, handleExportError, updateState]
  );

  /**
   * Export table to Excel
   */
  const exportTableExcel = useCallback(
    async (
      data: Record<string, any>[],
      filename: string,
      columns?: { header: string; key: string }[]
    ) => {
      handleExportStart('excel');

      try {
        const { exportTableToExcel } = await import('@/utils/exports');

        updateState({ exportProgress: 30 });

        exportTableToExcel(data, columns, filename);

        updateState({ exportProgress: 100 });

        toast.success('تم التصدير بنجاح', {
          description: 'تم تصدير البيانات إلى Excel',
        });

        handleExportComplete('excel');
      } catch (error) {
        handleExportError(
          error instanceof Error ? error : new Error('Unknown error'),
          'excel'
        );
      }
    },
    [handleExportStart, handleExportComplete, handleExportError, updateState]
  );

  /**
   * Export data to CSV
   */
  const exportDataCSV = useCallback(
    async (
      data: Record<string, any>[],
      filename: string,
      columns?: { header: string; key: string }[]
    ) => {
      handleExportStart('csv');

      try {
        if (columns) {
          const { exportTableToCSV } = await import('@/utils/exports');
          updateState({ exportProgress: 30 });
          exportTableToCSV(data, columns, filename);
        } else {
          const { exportToCSV } = await import('@/utils/exports');
          updateState({ exportProgress: 30 });
          exportToCSV(data, filename);
        }

        updateState({ exportProgress: 100 });

        toast.success('تم التصدير بنجاح', {
          description: 'تم تصدير البيانات إلى CSV',
        });

        handleExportComplete('csv');
      } catch (error) {
        handleExportError(
          error instanceof Error ? error : new Error('Unknown error'),
          'csv'
        );
      }
    },
    [handleExportStart, handleExportComplete, handleExportError, updateState]
  );

  /**
   * Export dashboard (multiple charts) to PDF
   */
  const exportDashboardPDF = useCallback(
    async (
      charts: { element: HTMLElement; title: string; subtitle?: string }[],
      filename: string,
      title?: string
    ) => {
      handleExportStart('pdf');

      try {
        const { exportDashboardToPDF } = await import('@/utils/exports');

        updateState({ exportProgress: 20 });

        await exportDashboardToPDF(charts, filename, {
          companyName,
          title,
          tableOfContents: charts.length > 1,
          includeHeader: true,
          includeFooter: true,
        });

        updateState({ exportProgress: 100 });

        toast.success('تم التصدير بنجاح', {
          description: 'تم تصدير لوحة المعلومات إلى PDF',
        });

        handleExportComplete('pdf');
      } catch (error) {
        handleExportError(
          error instanceof Error ? error : new Error('Unknown error'),
          'pdf'
        );
      }
    },
    [companyName, handleExportStart, handleExportComplete, handleExportError, updateState]
  );

  /**
   * Trigger print
   */
  const print = useCallback(() => {
    handleExportStart('print');

    try {
      window.print();

      toast.success('جاري الطباعة', {
        description: 'تم فتح نافذة الطباعة',
      });

      handleExportComplete('print');
    } catch (error) {
      handleExportError(
        error instanceof Error ? error : new Error('Unknown error'),
        'print'
      );
    }
  }, [handleExportStart, handleExportComplete, handleExportError]);

  return {
    state,
    exportChartPDF,
    exportTableExcel,
    exportDataCSV,
    exportDashboardPDF,
    print,
    reset,
  };
}
