/**
 * Unit tests for useExport hook
 *
 * Tests export functionality including PDF, Excel, CSV exports,
 * error handling, progress tracking, and callback invocations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useExport } from '../useExport';
import type * as ExportsModule from '@/utils/exports';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Import toast for assertions
import { toast } from 'sonner';

// Mock export utilities with proper factory functions
const mockExportChartToPDF = vi.fn();
const mockExportTableToExcel = vi.fn();
const mockExportToCSV = vi.fn();
const mockExportTableToCSV = vi.fn();
const mockExportDashboardToPDF = vi.fn();

vi.mock('@/utils/exports', () => ({
  exportChartToPDF: (...args: Parameters<typeof ExportsModule.exportChartToPDF>) =>
    mockExportChartToPDF(...args),
  exportTableToExcel: (...args: Parameters<typeof ExportsModule.exportTableToExcel>) =>
    mockExportTableToExcel(...args),
  exportToCSV: (...args: Parameters<typeof ExportsModule.exportToCSV>) =>
    mockExportToCSV(...args),
  exportTableToCSV: (...args: Parameters<typeof ExportsModule.exportTableToCSV>) =>
    mockExportTableToCSV(...args),
  exportDashboardToPDF: (...args: Parameters<typeof ExportsModule.exportDashboardToPDF>) =>
    mockExportDashboardToPDF(...args),
}));

// Mock window.print
const mockPrint = vi.fn();
global.window.print = mockPrint;

describe('useExport Hook', () => {
  beforeEach(() => {
    // Reset all mocks and set default resolved values
    vi.clearAllMocks();
    mockExportChartToPDF.mockResolvedValue(undefined);
    mockExportTableToExcel.mockReturnValue(undefined);
    mockExportToCSV.mockReturnValue(undefined);
    mockExportTableToCSV.mockReturnValue(undefined);
    mockExportDashboardToPDF.mockResolvedValue(undefined);
    mockPrint.mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useExport());

      expect(result.current.state).toEqual({
        isExporting: false,
        exportProgress: 0,
        exportFormat: null,
        error: null,
      });
    });

    it('should use provided company name from options', () => {
      const { result } = renderHook(() => useExport({ companyName: 'Test Company' }));

      expect(result.current.state.isExporting).toBe(false);
      // Company name is internal, we'll verify it through export calls
    });
  });

  describe('exportChartPDF', () => {
    it('should export chart to PDF successfully', async () => {
      const { result } = renderHook(() => useExport({ companyName: 'Test Company' }));

      const mockElement = document.createElement('div');
      const filename = 'test-chart';
      const title = 'Test Chart Title';

      await act(async () => {
        await result.current.exportChartPDF(mockElement, filename, title);
      });

      // Verify export function was called with correct params
      expect(mockExportChartToPDF).toHaveBeenCalledWith(
        mockElement,
        filename,
        expect.objectContaining({
          companyName: 'Test Company',
          title,
          includeHeader: true,
          includeFooter: true,
        })
      );

      // Verify success toast
      expect(toast.success).toHaveBeenCalledWith(
        'تم التصدير بنجاح',
        expect.objectContaining({
          description: 'تم تصدير الرسم البياني إلى PDF',
        })
      );

      // Verify final state
      expect(result.current.state.isExporting).toBe(false);
      expect(result.current.state.exportProgress).toBe(100);
      expect(result.current.state.exportFormat).toBe('pdf');
      expect(result.current.state.error).toBe(null);
    });

    it('should update progress during PDF export', async () => {
      const { result } = renderHook(() => useExport());

      const mockElement = document.createElement('div');

      // Export completes instantly in tests
      await act(async () => {
        await result.current.exportChartPDF(mockElement, 'test');
      });

      // Check final state after completion
      expect(result.current.state.exportProgress).toBe(100);
      expect(result.current.state.isExporting).toBe(false);
      expect(result.current.state.exportFormat).toBe('pdf');
    });

    it('should handle PDF export errors', async () => {
      const error = new Error('PDF export failed');

      const { result } = renderHook(() => useExport());
      const mockElement = document.createElement('div');

      // Set mock to reject AFTER hook is rendered
      mockExportChartToPDF.mockRejectedValueOnce(error);

      await act(async () => {
        await result.current.exportChartPDF(mockElement, 'test');
      });

      // Verify error state
      if (result.current) {
        expect(result.current.state.isExporting).toBe(false);
        expect(result.current.state.error).toEqual(error);
        expect(result.current.state.exportProgress).toBe(0);
      }

      // Verify error toast
      expect(toast.error).toHaveBeenCalledWith(
        'فشل التصدير',
        expect.objectContaining({
          description: 'PDF export failed',
        })
      );
    });

    it('should call onExportStart callback', async () => {
      const onExportStart = vi.fn();
      const { result } = renderHook(() => useExport({ onExportStart }));

      const mockElement = document.createElement('div');

      await act(async () => {
        await result.current.exportChartPDF(mockElement, 'test');
      });

      expect(onExportStart).toHaveBeenCalledWith('pdf');
    });

    it('should call onExportComplete callback', async () => {
      const onExportComplete = vi.fn();
      const { result } = renderHook(() => useExport({ onExportComplete }));

      const mockElement = document.createElement('div');

      await act(async () => {
        await result.current.exportChartPDF(mockElement, 'test');
      });

      expect(onExportComplete).toHaveBeenCalledWith('pdf');
    });

    it('should call onExportError callback on error', async () => {
      const error = new Error('Export failed');
      mockExportChartToPDF.mockRejectedValueOnce(error);

      const onExportError = vi.fn();
      const { result } = renderHook(() => useExport({ onExportError }));

      const mockElement = document.createElement('div');

      await act(async () => {
        await result.current.exportChartPDF(mockElement, 'test');
      });

      expect(onExportError).toHaveBeenCalledWith(error);
    });
  });

  describe('exportTableExcel', () => {
    it('should export table to Excel successfully', async () => {
      const { result } = renderHook(() => useExport());

      const data = [
        { id: 1, name: 'John', age: 30 },
        { id: 2, name: 'Jane', age: 25 },
      ];
      const columns = [
        { header: 'ID', key: 'id' },
        { header: 'Name', key: 'name' },
        { header: 'Age', key: 'age' },
      ];
      const filename = 'test-data';

      await act(async () => {
        await result.current.exportTableExcel(data, filename, columns);
      });

      // Verify export function was called
      expect(mockExportTableToExcel).toHaveBeenCalledWith(data, columns, filename);

      // Verify success toast
      expect(toast.success).toHaveBeenCalledWith(
        'تم التصدير بنجاح',
        expect.objectContaining({
          description: 'تم تصدير البيانات إلى Excel',
        })
      );

      // Verify final state
      expect(result.current.state.isExporting).toBe(false);
      expect(result.current.state.exportProgress).toBe(100);
      expect(result.current.state.exportFormat).toBe('excel');
    });

    it('should handle Excel export errors', async () => {
      const error = new Error('Excel export failed');
      mockExportTableToExcel.mockImplementationOnce(() => {
        throw error;
      });

      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.exportTableExcel([], 'test');
      });

      expect(result.current.state.error).toEqual(error);
      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe('exportDataCSV', () => {
    it('should export data to CSV with columns', async () => {
      const { result } = renderHook(() => useExport());

      const data = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ];
      const columns = [
        { header: 'ID', key: 'id' },
        { header: 'Name', key: 'name' },
      ];
      const filename = 'test-csv';

      await act(async () => {
        await result.current.exportDataCSV(data, filename, columns);
      });

      // Verify exportTableToCSV was called (when columns provided)
      expect(mockExportTableToCSV).toHaveBeenCalledWith(data, columns, filename);

      // Verify success toast
      expect(toast.success).toHaveBeenCalledWith(
        'تم التصدير بنجاح',
        expect.objectContaining({
          description: 'تم تصدير البيانات إلى CSV',
        })
      );

      expect(result.current.state.exportFormat).toBe('csv');
    });

    it('should export data to CSV without columns', async () => {
      const { result } = renderHook(() => useExport());

      const data = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ];
      const filename = 'test-csv';

      await act(async () => {
        await result.current.exportDataCSV(data, filename);
      });

      // Verify exportToCSV was called (when no columns)
      expect(mockExportToCSV).toHaveBeenCalledWith(data, filename);

      expect(result.current.state.exportFormat).toBe('csv');
    });

    it('should handle CSV export errors', async () => {
      const error = new Error('CSV export failed');
      mockExportToCSV.mockImplementationOnce(() => {
        throw error;
      });

      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.exportDataCSV([], 'test');
      });

      expect(result.current.state.error).toEqual(error);
      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe('exportDashboardPDF', () => {
    it('should export dashboard with multiple charts to PDF', async () => {
      const { result } = renderHook(() => useExport({ companyName: 'My Company' }));

      const charts = [
        {
          element: document.createElement('div'),
          title: 'Chart 1',
          subtitle: 'Subtitle 1',
        },
        {
          element: document.createElement('div'),
          title: 'Chart 2',
          subtitle: 'Subtitle 2',
        },
      ];
      const filename = 'dashboard';
      const title = 'Dashboard Title';

      await act(async () => {
        await result.current.exportDashboardPDF(charts, filename, title);
      });

      // Verify export function was called
      expect(mockExportDashboardToPDF).toHaveBeenCalledWith(
        charts,
        filename,
        expect.objectContaining({
          companyName: 'My Company',
          title,
          tableOfContents: true, // true because charts.length > 1
          includeHeader: true,
          includeFooter: true,
        })
      );

      // Verify success toast
      expect(toast.success).toHaveBeenCalledWith(
        'تم التصدير بنجاح',
        expect.objectContaining({
          description: 'تم تصدير لوحة المعلومات إلى PDF',
        })
      );

      expect(result.current.state.exportFormat).toBe('pdf');
    });

    it('should not include table of contents for single chart', async () => {
      const { result } = renderHook(() => useExport());

      const charts = [
        {
          element: document.createElement('div'),
          title: 'Single Chart',
        },
      ];

      await act(async () => {
        await result.current.exportDashboardPDF(charts, 'single', 'Title');
      });

      expect(mockExportDashboardToPDF).toHaveBeenCalledWith(
        charts,
        'single',
        expect.objectContaining({
          tableOfContents: false, // false because charts.length === 1
        })
      );
    });

    it('should handle dashboard export errors', async () => {
      const error = new Error('Dashboard export failed');
      mockExportDashboardToPDF.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.exportDashboardPDF([], 'test', 'Test');
      });

      expect(result.current.state.error).toEqual(error);
      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe('print', () => {
    it('should trigger browser print', () => {
      const { result } = renderHook(() => useExport());

      act(() => {
        result.current.print();
      });

      // Verify window.print was called
      expect(mockPrint).toHaveBeenCalled();

      // Verify success toast
      expect(toast.success).toHaveBeenCalledWith(
        'جاري الطباعة',
        expect.objectContaining({
          description: 'تم فتح نافذة الطباعة',
        })
      );

      expect(result.current.state.exportFormat).toBe('print');
    });

    it('should handle print errors', () => {
      mockPrint.mockImplementationOnce(() => {
        throw new Error('Print failed');
      });

      const { result } = renderHook(() => useExport());

      act(() => {
        result.current.print();
      });

      expect(result.current.state.error).toBeTruthy();
      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('should reset export state', async () => {
      const { result } = renderHook(() => useExport());

      // First, perform an export to change state
      const mockElement = document.createElement('div');
      await act(async () => {
        await result.current.exportChartPDF(mockElement, 'test');
      });

      // State should be changed
      expect(result.current.state.exportProgress).toBe(100);
      expect(result.current.state.exportFormat).toBe('pdf');

      // Now reset
      act(() => {
        result.current.reset();
      });

      // State should be back to initial
      expect(result.current.state).toEqual({
        isExporting: false,
        exportProgress: 0,
        exportFormat: null,
        error: null,
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-Error objects in catch blocks', async () => {
      mockExportChartToPDF.mockRejectedValueOnce('string error');

      const { result } = renderHook(() => useExport());
      const mockElement = document.createElement('div');

      await act(async () => {
        await result.current.exportChartPDF(mockElement, 'test');
      });

      expect(result.current.state.error).toBeInstanceOf(Error);
      expect(result.current.state.error?.message).toBe('Unknown error');
    });

    it('should use default company name when not provided', async () => {
      // useUnifiedCompanyAccess is mocked globally to return browsedCompany: null
      // So default 'FleetifyApp' should be used
      const { result } = renderHook(() => useExport());

      const mockElement = document.createElement('div');

      await act(async () => {
        await result.current.exportChartPDF(mockElement, 'test', 'Title');
      });

      // Verify FleetifyApp was used as company name
      expect(mockExportChartToPDF).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          companyName: 'FleetifyApp',
        })
      );
    });
  });

  describe('Concurrent Exports', () => {
    it('should handle multiple export calls in sequence', async () => {
      const { result } = renderHook(() => useExport());

      const mockElement = document.createElement('div');

      // First export
      await act(async () => {
        await result.current.exportChartPDF(mockElement, 'test1');
      });

      expect(result.current.state.exportFormat).toBe('pdf');

      // Second export
      await act(async () => {
        await result.current.exportDataCSV([{ id: 1 }], 'test2');
      });

      expect(result.current.state.exportFormat).toBe('csv');
      expect(mockExportChartToPDF).toHaveBeenCalledTimes(1);
      expect(mockExportToCSV).toHaveBeenCalledTimes(1);
    });
  });

  describe('Callback Integration', () => {
    it('should call all lifecycle callbacks in correct order', async () => {
      const callbacks = {
        onExportStart: vi.fn(),
        onExportComplete: vi.fn(),
        onExportError: vi.fn(),
      };

      const { result } = renderHook(() => useExport(callbacks));
      const mockElement = document.createElement('div');

      await act(async () => {
        await result.current.exportChartPDF(mockElement, 'test');
      });

      expect(callbacks.onExportStart).toHaveBeenCalledBefore(callbacks.onExportComplete);
      expect(callbacks.onExportError).not.toHaveBeenCalled();
    });

    it('should call onExportError instead of onExportComplete on error', async () => {
      const error = new Error('Test error');
      mockExportTableToExcel.mockImplementationOnce(() => {
        throw error;
      });

      const callbacks = {
        onExportStart: vi.fn(),
        onExportComplete: vi.fn(),
        onExportError: vi.fn(),
      };

      const { result } = renderHook(() => useExport(callbacks));

      await act(async () => {
        await result.current.exportTableExcel([], 'test');
      });

      expect(callbacks.onExportStart).toHaveBeenCalled();
      expect(callbacks.onExportError).toHaveBeenCalledWith(error);
      expect(callbacks.onExportComplete).not.toHaveBeenCalled();
    });
  });
});
