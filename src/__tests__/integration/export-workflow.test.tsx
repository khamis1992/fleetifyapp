/**
 * Integration tests for Export Workflow
 *
 * Tests export functionality across different data types and formats including:
 * - Contract export to PDF
 * - Financial data export to Excel
 * - Customer list export to CSV
 * - Error handling for failed exports
 * - Dashboard export with multiple charts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Mock jsPDF and other export libraries
vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(() => ({
    text: vi.fn(),
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    addImage: vi.fn(),
    addPage: vi.fn(),
    save: vi.fn(),
    internal: {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297
      }
    }
  }))
}));

vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({
    toDataURL: vi.fn().mockReturnValue('data:image/png;base64,test')
  })
}));

vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn().mockReturnValue({}),
    book_new: vi.fn().mockReturnValue({}),
    book_append_sheet: vi.fn(),
    aoa_to_sheet: vi.fn().mockReturnValue({})
  },
  writeFile: vi.fn()
}));

// Mock hooks
vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({
  useUnifiedCompanyAccess: () => ({
    companyId: 'test-company-id',
    browsedCompany: {
      company_name: 'Test Company',
      company_name_ar: 'شركة الاختبار'
    },
    user: { id: 'test-user-id' }
  })
}));

// Import after mocks
import { useExport } from '@/hooks/useExport';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

describe('Export Workflow Integration', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('should export contracts to PDF', async () => {
    const { result } = renderHook(() => useExport(), {
      wrapper: createWrapper()
    });

    // Create mock chart element
    const mockElement = document.createElement('div');
    mockElement.innerHTML = '<h1>Contract Report</h1><table><tr><td>CNT-001</td><td>$10,000</td></tr></table>';

    await act(async () => {
      await result.current.exportChartPDF(
        mockElement,
        'contracts-report.pdf',
        'تقرير العقود - Contracts Report'
      );
    });

    await waitFor(() => {
      expect(result.current.state.isExporting).toBe(false);
    });

    // Verify PDF was generated
    expect(html2canvas).toHaveBeenCalledWith(mockElement, expect.any(Object));
    expect(jsPDF).toHaveBeenCalled();
    expect(result.current.state.error).toBeNull();
  });

  it('should export financial data to Excel', async () => {
    const { result } = renderHook(() => useExport(), {
      wrapper: createWrapper()
    });

    const financialData = [
      {
        account_code: '1110',
        account_name: 'Cash',
        account_name_ar: 'الصندوق',
        debit: 50000,
        credit: 0,
        balance: 50000
      },
      {
        account_code: '2110',
        account_name: 'Accounts Payable',
        account_name_ar: 'الدائنون',
        debit: 0,
        credit: 25000,
        balance: -25000
      },
      {
        account_code: '4110',
        account_name: 'Rental Income',
        account_name_ar: 'إيرادات الإيجار',
        debit: 0,
        credit: 100000,
        balance: -100000
      }
    ];

    const columns = [
      { header: 'رمز الحساب', key: 'account_code' },
      { header: 'اسم الحساب', key: 'account_name_ar' },
      { header: 'مدين', key: 'debit' },
      { header: 'دائن', key: 'credit' },
      { header: 'الرصيد', key: 'balance' }
    ];

    await act(async () => {
      await result.current.exportTableExcel(
        financialData,
        'financial-report.xlsx',
        columns
      );
    });

    await waitFor(() => {
      expect(result.current.state.isExporting).toBe(false);
    });

    // Verify Excel was generated
    expect(XLSX.utils.json_to_sheet).toHaveBeenCalled();
    expect(XLSX.writeFile).toHaveBeenCalled();
    expect(result.current.state.error).toBeNull();
  });

  it('should export customer list to CSV', async () => {
    const { result } = renderHook(() => useExport(), {
      wrapper: createWrapper()
    });

    const customerData = [
      {
        customer_id: 'cust-1',
        first_name: 'أحمد',
        last_name: 'علي',
        phone: '+96512345678',
        email: 'ahmed@example.com',
        active_contracts: 2,
        total_balance: 5000
      },
      {
        customer_id: 'cust-2',
        first_name: 'فاطمة',
        last_name: 'محمد',
        phone: '+96598765432',
        email: 'fatima@example.com',
        active_contracts: 1,
        total_balance: 2500
      },
      {
        customer_id: 'cust-3',
        first_name: 'عبدالله',
        last_name: 'حسن',
        phone: '+96511112222',
        email: 'abdullah@example.com',
        active_contracts: 0,
        total_balance: 0
      }
    ];

    const columns = [
      { header: 'الاسم الأول', key: 'first_name' },
      { header: 'الاسم الأخير', key: 'last_name' },
      { header: 'الهاتف', key: 'phone' },
      { header: 'البريد الإلكتروني', key: 'email' },
      { header: 'العقود النشطة', key: 'active_contracts' },
      { header: 'الرصيد الإجمالي', key: 'total_balance' }
    ];

    await act(async () => {
      await result.current.exportDataCSV(
        customerData,
        'customers-list.csv',
        columns
      );
    });

    await waitFor(() => {
      expect(result.current.state.isExporting).toBe(false);
    });

    // Verify CSV was generated (uses XLSX under the hood)
    expect(XLSX.utils.json_to_sheet).toHaveBeenCalled();
    expect(result.current.state.error).toBeNull();
  });

  it('should handle export errors gracefully', async () => {
    const { result } = renderHook(() => useExport({
      onExportError: vi.fn()
    }), {
      wrapper: createWrapper()
    });

    // Mock html2canvas to throw error
    vi.mocked(html2canvas).mockRejectedValueOnce(new Error('Canvas rendering failed'));

    const mockElement = document.createElement('div');

    await act(async () => {
      try {
        await result.current.exportChartPDF(mockElement, 'test.pdf');
      } catch (error) {
        // Error is caught internally
      }
    });

    await waitFor(() => {
      expect(result.current.state.isExporting).toBe(false);
    });

    // Verify error was captured
    expect(result.current.state.error).toBeTruthy();
    expect(result.current.state.error?.message).toContain('Canvas rendering failed');
  });

  it('should export dashboard with multiple charts', async () => {
    const { result } = renderHook(() => useExport(), {
      wrapper: createWrapper()
    });

    // Create mock chart elements
    const revenueChart = document.createElement('div');
    revenueChart.innerHTML = '<canvas id="revenue-chart">Revenue Chart</canvas>';

    const expenseChart = document.createElement('div');
    expenseChart.innerHTML = '<canvas id="expense-chart">Expense Chart</canvas>';

    const profitChart = document.createElement('div');
    profitChart.innerHTML = '<canvas id="profit-chart">Profit Chart</canvas>';

    const charts = [
      {
        element: revenueChart,
        title: 'إيرادات الشهرية',
        subtitle: 'Monthly Revenue'
      },
      {
        element: expenseChart,
        title: 'المصروفات الشهرية',
        subtitle: 'Monthly Expenses'
      },
      {
        element: profitChart,
        title: 'صافي الربح',
        subtitle: 'Net Profit'
      }
    ];

    await act(async () => {
      await result.current.exportDashboardPDF(
        charts,
        'financial-dashboard.pdf',
        'لوحة المعلومات المالية - Financial Dashboard'
      );
    });

    await waitFor(() => {
      expect(result.current.state.isExporting).toBe(false);
    });

    // Verify all charts were processed
    expect(html2canvas).toHaveBeenCalledTimes(3);
    expect(jsPDF).toHaveBeenCalled();
    expect(result.current.state.error).toBeNull();
  });

  it('should track export progress', async () => {
    const { result } = renderHook(() => useExport(), {
      wrapper: createWrapper()
    });

    const mockElement = document.createElement('div');

    act(() => {
      result.current.exportChartPDF(mockElement, 'test.pdf');
    });

    // Check initial state
    expect(result.current.state.isExporting).toBe(true);
    expect(result.current.state.exportFormat).toBe('pdf');

    await waitFor(() => {
      expect(result.current.state.isExporting).toBe(false);
    });
  });

  it('should reset export state', async () => {
    const { result } = renderHook(() => useExport(), {
      wrapper: createWrapper()
    });

    // Simulate an error state
    act(() => {
      result.current.state.error = new Error('Test error');
      result.current.state.isExporting = true;
    });

    // Reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.state.isExporting).toBe(false);
    expect(result.current.state.error).toBeNull();
    expect(result.current.state.exportFormat).toBeNull();
    expect(result.current.state.exportProgress).toBe(0);
  });

  it('should handle print operation', () => {
    const { result } = renderHook(() => useExport(), {
      wrapper: createWrapper()
    });

    // Mock window.print
    const originalPrint = window.print;
    window.print = vi.fn();

    act(() => {
      result.current.print();
    });

    expect(window.print).toHaveBeenCalled();

    // Restore
    window.print = originalPrint;
  });

  it('should export with custom company name', async () => {
    const { result } = renderHook(() => useExport({
      companyName: 'شركة العراف لتأجير السيارات'
    }), {
      wrapper: createWrapper()
    });

    const mockElement = document.createElement('div');

    await act(async () => {
      await result.current.exportChartPDF(
        mockElement,
        'report.pdf',
        'تقرير مخصص'
      );
    });

    await waitFor(() => {
      expect(result.current.state.isExporting).toBe(false);
    });

    expect(jsPDF).toHaveBeenCalled();
  });

  it('should handle large dataset export to Excel', async () => {
    const { result } = renderHook(() => useExport(), {
      wrapper: createWrapper()
    });

    // Generate large dataset (1000 rows)
    const largeData = Array.from({ length: 1000 }, (_, i) => ({
      id: `row-${i + 1}`,
      contract_number: `CNT-${String(i + 1).padStart(5, '0')}`,
      customer_name: `Customer ${i + 1}`,
      amount: Math.random() * 10000,
      status: i % 3 === 0 ? 'active' : i % 3 === 1 ? 'completed' : 'pending'
    }));

    await act(async () => {
      await result.current.exportTableExcel(
        largeData,
        'large-contracts-report.xlsx'
      );
    });

    await waitFor(() => {
      expect(result.current.state.isExporting).toBe(false);
    });

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith(largeData);
    expect(result.current.state.error).toBeNull();
  });

  it('should support Arabic text in exports', async () => {
    const { result } = renderHook(() => useExport(), {
      wrapper: createWrapper()
    });

    const arabicData = [
      {
        contract_number: 'CNT-001',
        customer_name_ar: 'أحمد محمد علي',
        vehicle_plate_ar: 'أ ب ج - ١٢٣',
        amount: 10000,
        status_ar: 'نشط'
      },
      {
        contract_number: 'CNT-002',
        customer_name_ar: 'فاطمة حسن',
        vehicle_plate_ar: 'د ه و - ٤٥٦',
        amount: 8500,
        status_ar: 'مكتمل'
      }
    ];

    const columns = [
      { header: 'رقم العقد', key: 'contract_number' },
      { header: 'اسم العميل', key: 'customer_name_ar' },
      { header: 'لوحة السيارة', key: 'vehicle_plate_ar' },
      { header: 'المبلغ', key: 'amount' },
      { header: 'الحالة', key: 'status_ar' }
    ];

    await act(async () => {
      await result.current.exportDataCSV(
        arabicData,
        'arabic-contracts.csv',
        columns
      );
    });

    await waitFor(() => {
      expect(result.current.state.isExporting).toBe(false);
    });

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalled();
    expect(result.current.state.error).toBeNull();
  });

  it('should trigger callbacks on export lifecycle', async () => {
    const onExportStart = vi.fn();
    const onExportComplete = vi.fn();
    const onExportError = vi.fn();

    const { result } = renderHook(() => useExport({
      onExportStart,
      onExportComplete,
      onExportError
    }), {
      wrapper: createWrapper()
    });

    const mockElement = document.createElement('div');

    await act(async () => {
      await result.current.exportChartPDF(mockElement, 'test.pdf');
    });

    await waitFor(() => {
      expect(result.current.state.isExporting).toBe(false);
    });

    expect(onExportStart).toHaveBeenCalledWith('pdf');
    expect(onExportComplete).toHaveBeenCalledWith('pdf');
    expect(onExportError).not.toHaveBeenCalled();
  });
});
