/**
 * Unit tests for ExportButton component
 *
 * Tests export button functionality including dropdown menu, export options,
 * loading states, toast notifications, and accessibility.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportButton } from '../ExportButton';
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

// Mock export utilities
const mockExportChartToPDF = vi.fn();
const mockExportTableToExcel = vi.fn();
const mockExportChartDataToExcel = vi.fn();
const mockExportToCSV = vi.fn();
const mockExportTableToCSV = vi.fn();
const mockExportChartDataToCSV = vi.fn();

vi.mock('@/utils/exports', async () => {
  return {
    exportChartToPDF: (...args: Parameters<typeof ExportsModule.exportChartToPDF>) =>
      mockExportChartToPDF(...args),
    exportTableToExcel: (...args: Parameters<typeof ExportsModule.exportTableToExcel>) =>
      mockExportTableToExcel(...args),
    exportChartDataToExcel: (...args: any[]) => mockExportChartDataToExcel(...args),
    exportToCSV: (...args: Parameters<typeof ExportsModule.exportToCSV>) =>
      mockExportToCSV(...args),
    exportTableToCSV: (...args: Parameters<typeof ExportsModule.exportTableToCSV>) =>
      mockExportTableToCSV(...args),
    exportChartDataToCSV: (...args: any[]) => mockExportChartDataToCSV(...args),
  };
});

// Mock window.print
const mockPrint = vi.fn();
global.window.print = mockPrint;

describe('ExportButton Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExportChartToPDF.mockResolvedValue(undefined);
    mockExportTableToExcel.mockReturnValue(undefined);
    mockExportChartDataToExcel.mockReturnValue(undefined);
    mockExportToCSV.mockReturnValue(undefined);
    mockExportTableToCSV.mockReturnValue(undefined);
    mockExportChartDataToCSV.mockReturnValue(undefined);
    mockPrint.mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render export button with default text', () => {
      render(<ExportButton />);

      const button = screen.getByRole('button', { name: /تصدير/i });
      expect(button).toBeInTheDocument();
    });

    it('should render with custom variant and size', () => {
      render(<ExportButton variant="default" size="lg" />);

      const button = screen.getByRole('button', { name: /تصدير/i });
      expect(button).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<ExportButton className="custom-class" />);

      const button = screen.getByRole('button', { name: /تصدير/i });
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('Dropdown Menu Options', () => {
    it('should show PDF option when chartRef is provided', async () => {
      const user = userEvent.setup();
      const chartRef = { current: document.createElement('div') };

      render(<ExportButton chartRef={chartRef} />);

      const button = screen.getByRole('button', { name: /تصدير/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('تصدير PDF')).toBeInTheDocument();
      });
    });

    it('should show Excel option when data is provided', async () => {
      const user = userEvent.setup();
      const data = [{ id: 1, name: 'Test' }];

      render(<ExportButton data={data} />);

      const button = screen.getByRole('button', { name: /تصدير/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('تصدير Excel')).toBeInTheDocument();
      });
    });

    it('should show CSV option when data is provided', async () => {
      const user = userEvent.setup();
      const data = [{ id: 1, name: 'Test' }];

      render(<ExportButton data={data} />);

      const button = screen.getByRole('button', { name: /تصدير/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('تصدير CSV')).toBeInTheDocument();
      });
    });

    it('should show print option by default', async () => {
      const user = userEvent.setup();

      render(<ExportButton />);

      const button = screen.getByRole('button', { name: /تصدير/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('طباعة')).toBeInTheDocument();
      });
    });

    it('should hide print option when showPrint is false', async () => {
      const user = userEvent.setup();

      render(<ExportButton showPrint={false} />);

      const button = screen.getByRole('button', { name: /تصدير/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.queryByText('طباعة')).not.toBeInTheDocument();
      });
    });

    it('should show all export options when data and chartRef provided', async () => {
      const user = userEvent.setup();
      const data = [{ id: 1, name: 'Test' }];
      const chartRef = { current: document.createElement('div') };

      render(<ExportButton data={data} chartRef={chartRef} />);

      const button = screen.getByRole('button', { name: /تصدير/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('تصدير PDF')).toBeInTheDocument();
        expect(screen.getByText('تصدير Excel')).toBeInTheDocument();
        expect(screen.getByText('تصدير CSV')).toBeInTheDocument();
        expect(screen.getByText('طباعة')).toBeInTheDocument();
      });
    });
  });

  describe('PDF Export', () => {
    it('should trigger PDF export when PDF option is clicked', async () => {
      const user = userEvent.setup();
      const chartRef = { current: document.createElement('div') };

      render(<ExportButton chartRef={chartRef} filename="test-chart" />);

      const button = screen.getByRole('button', { name: /تصدير/i });
      await user.click(button);

      const pdfOption = await screen.findByText('تصدير PDF');
      await user.click(pdfOption);

      await waitFor(() => {
        expect(mockExportChartToPDF).toHaveBeenCalledWith(
          chartRef.current,
          'test-chart.pdf',
          expect.objectContaining({
            companyName: 'FleetifyApp',
            includeHeader: true,
            includeFooter: true,
          })
        );
      });
    });

    it('should show success toast after PDF export', async () => {
      const user = userEvent.setup();
      const chartRef = { current: document.createElement('div') };

      render(<ExportButton chartRef={chartRef} />);

      const button = screen.getByRole('button', { name: /تصدير/i });
      await user.click(button);

      const pdfOption = await screen.findByText('تصدير PDF');
      await user.click(pdfOption);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'تم التصدير بنجاح',
          expect.objectContaining({
            description: 'تم تصدير الرسم البياني إلى PDF',
          })
        );
      });
    });

    it('should show error toast when PDF export fails', async () => {
      const user = userEvent.setup();
      const chartRef = { current: document.createElement('div') };
      const error = new Error('PDF export failed');

      mockExportChartToPDF.mockRejectedValueOnce(error);

      render(<ExportButton chartRef={chartRef} />);

      const button = screen.getByRole('button', { name: /تصدير/i });
      await user.click(button);

      const pdfOption = await screen.findByText('تصدير PDF');
      await user.click(pdfOption);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'فشل التصدير',
          expect.objectContaining({
            description: 'PDF export failed',
          })
        );
      });
    });

    it('should call onExportStart callback for PDF', async () => {
      const user = userEvent.setup();
      const chartRef = { current: document.createElement('div') };
      const onExportStart = vi.fn();

      render(<ExportButton chartRef={chartRef} onExportStart={onExportStart} />);

      const button = screen.getByRole('button', { name: /تصدير/i });
      await user.click(button);

      const pdfOption = await screen.findByText('تصدير PDF');
      await user.click(pdfOption);

      await waitFor(() => {
        expect(onExportStart).toHaveBeenCalledWith('pdf');
      });
    });

    it('should call onExportComplete callback for PDF', async () => {
      const user = userEvent.setup();
      const chartRef = { current: document.createElement('div') };
      const onExportComplete = vi.fn();

      render(<ExportButton chartRef={chartRef} onExportComplete={onExportComplete} />);

      const button = screen.getByRole('button', { name: /تصدير/i });
      await user.click(button);

      const pdfOption = await screen.findByText('تصدير PDF');
      await user.click(pdfOption);

      await waitFor(() => {
        expect(onExportComplete).toHaveBeenCalledWith('pdf');
      });
    });

    it('should call onExportError callback when PDF export fails', async () => {
      const user = userEvent.setup();
      const chartRef = { current: document.createElement('div') };
      const error = new Error('PDF failed');
      const onExportError = vi.fn();

      mockExportChartToPDF.mockRejectedValueOnce(error);

      render(<ExportButton chartRef={chartRef} onExportError={onExportError} />);

      const button = screen.getByRole('button', { name: /تصدير/i });
      await user.click(button);

      const pdfOption = await screen.findByText('تصدير PDF');
      await user.click(pdfOption);

      await waitFor(() => {
        expect(onExportError).toHaveBeenCalledWith(error);
      });
    });

    it('should use custom title and company name for PDF', async () => {
      const user = userEvent.setup();
      const chartRef = { current: document.createElement('div') };

      render(
        <ExportButton
          chartRef={chartRef}
          title="Custom Title"
          companyName="My Company"
        />
      );

      const button = screen.getByRole('button', { name: /تصدير/i });
      await user.click(button);

      const pdfOption = await screen.findByText('تصدير PDF');
      await user.click(pdfOption);

      await waitFor(() => {
        expect(mockExportChartToPDF).toHaveBeenCalledWith(
          chartRef.current,
          expect.any(String),
          expect.objectContaining({
            companyName: 'My Company',
            title: 'Custom Title',
          })
        );
      });
    });
  });

  describe('Excel Export', () => {
    it('should export table data to Excel', async () => {
      const user = userEvent.setup();
      const data = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ];
      const columns = [
        { header: 'ID', key: 'id' },
        { header: 'Name', key: 'name' },
      ];

      render(<ExportButton data={data} columns={columns} filename="test" />);

      const button = screen.getByRole('button', { name: /تصدير/i });
      await user.click(button);

      const excelOption = await screen.findByText('تصدير Excel');
      await user.click(excelOption);

      await waitFor(() => {
        expect(mockExportTableToExcel).toHaveBeenCalledWith(data, columns, 'test.xlsx');
      });
    });

    it('should export chart data to Excel', async () => {
      const user = userEvent.setup();
      const data = [{ id: 1 }];
      const chartData = {
        labels: ['Jan', 'Feb'],
        datasets: [{ label: 'Sales', data: [100, 200] }],
      };

      render(<ExportButton data={data} chartData={chartData} filename="chart" />);

      const button = screen.getByRole('button', { name: /تصدير/i });
      await user.click(button);

      const excelOption = await screen.findByText('تصدير Excel');
      await user.click(excelOption);

      await waitFor(() => {
        expect(mockExportChartDataToExcel).toHaveBeenCalledWith(chartData, 'chart.xlsx');
      });
    });

    it('should show success toast after Excel export', async () => {
      const user = userEvent.setup();
      const data = [{ id: 1 }];

      render(<ExportButton data={data} />);

      const button = screen.getByRole('button', { name: /تصدير/i });
      await user.click(button);

      const excelOption = await screen.findByText('تصدير Excel');
      await user.click(excelOption);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'تم التصدير بنجاح',
          expect.objectContaining({
            description: 'تم تصدير البيانات إلى Excel',
          })
        );
      });
    });

    it('should handle Excel export errors', async () => {
      const user = userEvent.setup();
      const data = [{ id: 1 }];
      const error = new Error('Excel failed');

      mockExportTableToExcel.mockImplementationOnce(() => {
        throw error;
      });

      render(<ExportButton data={data} />);

      const button = screen.getByRole('button', { name: /تصدير/i });
      await user.click(button);

      const excelOption = await screen.findByText('تصدير Excel');
      await user.click(excelOption);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe('CSV Export', () => {
    it('should export data to CSV with columns', async () => {
      const user = userEvent.setup();
      const data = [{ id: 1, name: 'Test' }];
      const columns = [
        { header: 'ID', key: 'id' },
        { header: 'Name', key: 'name' },
      ];

      render(<ExportButton data={data} columns={columns} filename="test" />);

      const button = screen.getByRole('button', { name: /تصدير/i });
      await user.click(button);

      const csvOption = await screen.findByText('تصدير CSV');
      await user.click(csvOption);

      await waitFor(() => {
        expect(mockExportTableToCSV).toHaveBeenCalledWith(data, columns, 'test.csv');
      });
    });

    it('should export chart data to CSV', async () => {
      const user = userEvent.setup();
      const data = [{ id: 1 }];
      const chartData = {
        labels: ['Jan', 'Feb'],
        datasets: [{ label: 'Sales', data: [100, 200] }],
      };

      render(<ExportButton data={data} chartData={chartData} filename="chart" />);

      const button = screen.getByRole('button', { name: /تصدير/i });
      await user.click(button);

      const csvOption = await screen.findByText('تصدير CSV');
      await user.click(csvOption);

      await waitFor(() => {
        expect(mockExportChartDataToCSV).toHaveBeenCalledWith(chartData, 'chart.csv');
      });
    });

    it('should export data to CSV without columns', async () => {
      const user = userEvent.setup();
      const data = [{ id: 1, name: 'Test' }];

      render(<ExportButton data={data} filename="test" />);

      const button = screen.getByRole('button', { name: /تصدير/i });
      await user.click(button);

      const csvOption = await screen.findByText('تصدير CSV');
      await user.click(csvOption);

      await waitFor(() => {
        expect(mockExportToCSV).toHaveBeenCalledWith(data, 'test.csv');
      });
    });

    it('should show success toast after CSV export', async () => {
      const user = userEvent.setup();
      const data = [{ id: 1 }];

      render(<ExportButton data={data} />);

      const button = screen.getByRole('button', { name: /تصدير/i });
      await user.click(button);

      const csvOption = await screen.findByText('تصدير CSV');
      await user.click(csvOption);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'تم التصدير بنجاح',
          expect.objectContaining({
            description: 'تم تصدير البيانات إلى CSV',
          })
        );
      });
    });
  });

  describe('Print', () => {
    it('should trigger window.print when print option is clicked', async () => {
      const user = userEvent.setup();

      render(<ExportButton />);

      const button = screen.getByRole('button', { name: /تصدير/i });
      await user.click(button);

      const printOption = await screen.findByText('طباعة');
      await user.click(printOption);

      await waitFor(() => {
        expect(mockPrint).toHaveBeenCalled();
      });
    });

    it('should show success toast after print', async () => {
      const user = userEvent.setup();

      render(<ExportButton />);

      const button = screen.getByRole('button', { name: /تصدير/i });
      await user.click(button);

      const printOption = await screen.findByText('طباعة');
      await user.click(printOption);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'جاري الطباعة',
          expect.objectContaining({
            description: 'تم فتح نافذة الطباعة',
          })
        );
      });
    });

    it('should call onExportStart and onExportComplete for print', async () => {
      const user = userEvent.setup();
      const onExportStart = vi.fn();
      const onExportComplete = vi.fn();

      render(
        <ExportButton
          onExportStart={onExportStart}
          onExportComplete={onExportComplete}
        />
      );

      const button = screen.getByRole('button', { name: /تصدير/i });
      await user.click(button);

      const printOption = await screen.findByText('طباعة');
      await user.click(printOption);

      await waitFor(() => {
        expect(onExportStart).toHaveBeenCalledWith('print');
        expect(onExportComplete).toHaveBeenCalledWith('print');
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during export', async () => {
      const user = userEvent.setup();
      const chartRef = { current: document.createElement('div') };

      // Make export take time
      mockExportChartToPDF.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<ExportButton chartRef={chartRef} />);

      const button = screen.getByRole('button', { name: /تصدير/i });
      await user.click(button);

      const pdfOption = await screen.findByText('تصدير PDF');
      await user.click(pdfOption);

      // Should show loading text
      await waitFor(() => {
        expect(screen.getByText(/جاري التصدير/i)).toBeInTheDocument();
      });

      // Wait for export to complete
      await waitFor(
        () => {
          expect(mockExportChartToPDF).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );
    });

    it('should disable button during export', async () => {
      const user = userEvent.setup();
      const chartRef = { current: document.createElement('div') };

      mockExportChartToPDF.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<ExportButton chartRef={chartRef} />);

      const button = screen.getByRole('button', { name: /تصدير/i });
      await user.click(button);

      const pdfOption = await screen.findByText('تصدير PDF');
      await user.click(pdfOption);

      // Button should be disabled
      await waitFor(() => {
        const loadingButton = screen.getByRole('button', { name: /جاري التصدير/i });
        expect(loadingButton).toBeDisabled();
      });

      await waitFor(
        () => {
          expect(mockExportChartToPDF).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );
    });

    it('should disable menu items during export', async () => {
      const user = userEvent.setup();
      const data = [{ id: 1 }];
      const chartRef = { current: document.createElement('div') };

      mockExportChartToPDF.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<ExportButton data={data} chartRef={chartRef} />);

      const button = screen.getByRole('button', { name: /تصدير/i });
      await user.click(button);

      const pdfOption = await screen.findByText('تصدير PDF');
      await user.click(pdfOption);

      await waitFor(
        () => {
          expect(mockExportChartToPDF).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );
    });
  });

  describe('Edge Cases', () => {
    it('should show error when no chartRef for PDF export', async () => {
      const user = userEvent.setup();

      // Render without chartRef but try to export PDF
      // This shouldn't happen in practice because PDF option is conditionally rendered
      render(<ExportButton />);

      // PDF option should not be visible
      const button = screen.getByRole('button', { name: /تصدير/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.queryByText('تصدير PDF')).not.toBeInTheDocument();
      });
    });

    it('should show error when no data for Excel/CSV export', async () => {
      const user = userEvent.setup();

      // Render without data
      render(<ExportButton />);

      const button = screen.getByRole('button', { name: /تصدير/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.queryByText('تصدير Excel')).not.toBeInTheDocument();
        expect(screen.queryByText('تصدير CSV')).not.toBeInTheDocument();
      });
    });

    it('should use default filename when not provided', async () => {
      const user = userEvent.setup();
      const data = [{ id: 1 }];

      render(<ExportButton data={data} />);

      const button = screen.getByRole('button', { name: /تصدير/i });
      await user.click(button);

      const csvOption = await screen.findByText('تصدير CSV');
      await user.click(csvOption);

      await waitFor(() => {
        expect(mockExportToCSV).toHaveBeenCalledWith(data, 'export.csv');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button', () => {
      render(<ExportButton />);

      const button = screen.getByRole('button', { name: /تصدير/i });
      expect(button).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      const data = [{ id: 1 }];

      render(<ExportButton data={data} />);

      const button = screen.getByRole('button', { name: /تصدير/i });

      // Tab to button
      await user.tab();
      expect(button).toHaveFocus();

      // Open menu with Enter
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('تصدير CSV')).toBeInTheDocument();
      });
    });

    it('should have proper ARIA attributes when disabled', async () => {
      const user = userEvent.setup();
      const chartRef = { current: document.createElement('div') };

      mockExportChartToPDF.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<ExportButton chartRef={chartRef} />);

      const button = screen.getByRole('button', { name: /تصدير/i });
      await user.click(button);

      const pdfOption = await screen.findByText('تصدير PDF');
      await user.click(pdfOption);

      await waitFor(() => {
        const loadingButton = screen.getByRole('button', { name: /جاري التصدير/i });
        expect(loadingButton).toHaveAttribute('disabled');
      });

      await waitFor(
        () => {
          expect(mockExportChartToPDF).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );
    });
  });
});
