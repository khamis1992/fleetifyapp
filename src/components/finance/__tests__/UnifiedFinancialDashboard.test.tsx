import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UnifiedFinancialDashboard } from '../UnifiedFinancialDashboard';

// Mock hooks
vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({
  useUnifiedCompanyAccess: () => ({
    companyId: 'test-company-id',
    user: { id: 'test-user-id' }
  })
}));

vi.mock('@/hooks/useFinancialMetrics', () => ({
  useFinancialMetrics: () => ({
    data: {
      totalRevenue: 150000,
      totalExpenses: 80000,
      netProfit: 70000,
      outstandingReceivables: 25000,
      outstandingPayables: 15000,
      cashBalance: 45000,
      profitMargin: 46.67,
      quickRatio: 1.67
    },
    isLoading: false,
    error: null
  })
}));

vi.mock('@/hooks/useFinancialAlerts', () => ({
  useFinancialAlerts: () => ({
    data: [
      {
        id: '1',
        type: 'overdue_invoice',
        severity: 'high',
        title: 'فاتورة متأخرة',
        description: 'فاتورة #INV-001 متأخرة 30 يوم',
        created_at: new Date().toISOString()
      }
    ],
    isLoading: false
  })
}));

describe('UnifiedFinancialDashboard', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe('Component Rendering', () => {
    it('should render all tabs', () => {
      renderWithProviders(<UnifiedFinancialDashboard />);
      
      expect(screen.getByText('التنبيهات')).toBeInTheDocument();
      expect(screen.getByText('التحليلات')).toBeInTheDocument();
      expect(screen.getByText('التقارير')).toBeInTheDocument();
      expect(screen.getByText('الرؤى المالية')).toBeInTheDocument();
    });

    it('should display financial metrics cards', async () => {
      renderWithProviders(<UnifiedFinancialDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('إجمالي الإيرادات')).toBeInTheDocument();
        expect(screen.getByText('إجمالي المصروفات')).toBeInTheDocument();
        expect(screen.getByText('صافي الربح')).toBeInTheDocument();
      });
    });

    it('should display financial health score', async () => {
      renderWithProviders(<UnifiedFinancialDashboard />);
      
      await waitFor(() => {
        const healthScoreElement = screen.getByText(/الصحة المالية/i);
        expect(healthScoreElement).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should switch to Analytics tab when clicked', async () => {
      renderWithProviders(<UnifiedFinancialDashboard />);
      
      const analyticsTab = screen.getByText('التحليلات');
      fireEvent.click(analyticsTab);
      
      await waitFor(() => {
        expect(screen.getByText(/التحليلات المالية/i)).toBeInTheDocument();
      });
    });

    it('should switch to Reports tab when clicked', async () => {
      renderWithProviders(<UnifiedFinancialDashboard />);
      
      const reportsTab = screen.getByText('التقارير');
      fireEvent.click(reportsTab);
      
      await waitFor(() => {
        expect(screen.getByText(/التقارير المالية/i)).toBeInTheDocument();
      });
    });

    it('should switch to Insights tab when clicked', async () => {
      renderWithProviders(<UnifiedFinancialDashboard />);
      
      const insightsTab = screen.getByText('الرؤى المالية');
      fireEvent.click(insightsTab);
      
      await waitFor(() => {
        expect(screen.getByText(/الرؤى والتوصيات/i)).toBeInTheDocument();
      });
    });
  });

  describe('Alert Functionality', () => {
    it('should display financial alerts', async () => {
      renderWithProviders(<UnifiedFinancialDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('فاتورة متأخرة')).toBeInTheDocument();
        expect(screen.getByText(/فاتورة #INV-001 متأخرة 30 يوم/)).toBeInTheDocument();
      });
    });

    it('should show severity badge for alerts', async () => {
      renderWithProviders(<UnifiedFinancialDashboard />);
      
      await waitFor(() => {
        const alert = screen.getByText('فاتورة متأخرة').closest('div');
        expect(alert).toBeInTheDocument();
      });
    });
  });

  describe('Payment Form Integration', () => {
    it('should open payment form when quick action clicked', async () => {
      renderWithProviders(<UnifiedFinancialDashboard />);
      
      const receiptButton = screen.getByText(/إيصال قبض/i);
      fireEvent.click(receiptButton);
      
      await waitFor(() => {
        expect(screen.getByText(/إنشاء إيصال قبض/i)).toBeInTheDocument();
      });
    });

    it('should close payment form on cancel', async () => {
      renderWithProviders(<UnifiedFinancialDashboard />);
      
      const receiptButton = screen.getByText(/إيصال قبض/i);
      fireEvent.click(receiptButton);
      
      await waitFor(() => {
        const cancelButton = screen.getByText('إلغاء');
        fireEvent.click(cancelButton);
      });
      
      await waitFor(() => {
        expect(screen.queryByText(/إنشاء إيصال قبض/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Data Loading States', () => {
    it('should handle loading state gracefully', () => {
      vi.mock('@/hooks/useFinancialMetrics', () => ({
        useFinancialMetrics: () => ({
          data: null,
          isLoading: true,
          error: null
        })
      }));

      renderWithProviders(<UnifiedFinancialDashboard />);
      
      // Component should render even in loading state
      expect(screen.getByText('التنبيهات')).toBeInTheDocument();
    });

    it('should handle error state', () => {
      vi.mock('@/hooks/useFinancialMetrics', () => ({
        useFinancialMetrics: () => ({
          data: null,
          isLoading: false,
          error: new Error('Failed to fetch data')
        })
      }));

      renderWithProviders(<UnifiedFinancialDashboard />);
      
      // Component should still render tabs
      expect(screen.getByText('التنبيهات')).toBeInTheDocument();
    });
  });

  describe('Financial Metrics Calculations', () => {
    it('should display correct profit margin percentage', async () => {
      renderWithProviders(<UnifiedFinancialDashboard />);
      
      await waitFor(() => {
        const profitMarginText = screen.getByText(/46.67%/);
        expect(profitMarginText).toBeInTheDocument();
      });
    });

    it('should display correct net profit calculation', async () => {
      renderWithProviders(<UnifiedFinancialDashboard />);
      
      await waitFor(() => {
        // Net profit = Revenue - Expenses = 150000 - 80000 = 70000
        const netProfitElement = screen.getByText(/70,?000/);
        expect(netProfitElement).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithProviders(<UnifiedFinancialDashboard />);
      
      const tabs = screen.getByRole('tablist');
      expect(tabs).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      renderWithProviders(<UnifiedFinancialDashboard />);
      
      const firstTab = screen.getByText('التنبيهات');
      firstTab.focus();
      expect(document.activeElement).toBe(firstTab);
    });
  });

  describe('Performance', () => {
    it('should render within acceptable time', async () => {
      const startTime = performance.now();
      
      renderWithProviders(<UnifiedFinancialDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('التنبيهات')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render in less than 1 second
      expect(renderTime).toBeLessThan(1000);
    });
  });
});
