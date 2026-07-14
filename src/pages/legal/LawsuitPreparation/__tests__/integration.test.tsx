/**
 * Lawsuit Preparation Integration Tests
 * اختبارات تكامل تجهيز الدعوى
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LawsuitPreparationPage from '../index';

// Create a test query client
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      const results: Record<string, { data: unknown; error: null }> = {
        contracts: {
          data: {
            id: 'contract-1',
            contract_number: 'C-001',
            start_date: '2024-01-01',
            monthly_amount: 5000,
            customer_id: 'customer-1',
            vehicle_id: 'vehicle-1',
          },
          error: null,
        },
        customers: {
          data: {
            id: 'customer-1',
            first_name: 'Test',
            last_name: 'Customer',
            national_id: '12345678901',
            phone: '50000000',
          },
          error: null,
        },
        vehicles: {
          data: { make: 'Toyota', model: 'Corolla', year: 2024, plate_number: '123456' },
          error: null,
        },
        invoices: {
          data: [
            {
              id: 'inv-1',
              invoice_number: 'INV-001',
              due_date: '2024-02-01',
              total_amount: 5000,
              paid_amount: 0,
            },
          ],
          error: null,
        },
        penalties: { data: [], error: null },
        contract_documents: { data: null, error: null },
      };
      const result = results[table] ?? { data: [], error: null };
      const query: Record<string, unknown> = {};

      for (const method of ['select', 'eq', 'lt', 'neq', 'order', 'limit']) {
        query[method] = vi.fn(() => query);
      }
      query.single = vi.fn(() => Promise.resolve(result));
      query.maybeSingle = vi.fn(() => Promise.resolve(result));
      query.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
        Promise.resolve(result).then(resolve, reject);

      return query;
    }),
    storage: {
      from: vi.fn(() => ({
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://test.com/file.pdf' } })),
      })),
    },
  },
}));

// Mock auth context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
  }),
}));

// Mock company access hook
vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({
  useUnifiedCompanyAccess: () => ({
    companyId: 'company-1',
    isLoading: false,
  }),
}));

describe('LawsuitPreparation Integration', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = createTestQueryClient();
  });
  
  const renderPage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/legal/lawsuit-preparation/contract-1']}>
          <Routes>
            <Route
              path="/legal/lawsuit-preparation/:contractId"
              element={<LawsuitPreparationPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
  
  it('shows loading state initially', () => {
    renderPage();
    
    expect(screen.getByText('جاري تحميل بيانات القضية...')).toBeInTheDocument();
  });
  
  it('renders the main components after loading', async () => {
    renderPage();
    
    await waitFor(() => {
      expect(screen.getByText('تجهيز الدعوى القانونية')).toBeInTheDocument();
    });
    
    // Check for main components
    expect(screen.getByText('حافظة المستندات')).toBeInTheDocument();
    expect(screen.getByText('بيانات التقاضي')).toBeInTheDocument();
  });
  
  it('allows toggling Taqadi data section', async () => {
    renderPage();
    
    await waitFor(() => {
      expect(screen.getByText('بيانات التقاضي')).toBeInTheDocument();
    });
    
    const taqadiHeader = screen.getByText('بيانات التقاضي');
    fireEvent.click(taqadiHeader);
    
    await waitFor(() => {
      expect(screen.getByText('بيانات نظام التقاضي')).toBeInTheDocument();
    });
  });
  
  it('displays generate buttons for mandatory documents', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('حافظة المستندات')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('حافظة المستندات'));
    
    await waitFor(() => {
      expect(screen.getAllByText('المذكرة الشارحة').length).toBeGreaterThan(0);
    });
    
    const generateButtons = screen.getAllByText('توليد');
    expect(generateButtons.length).toBeGreaterThan(0);
  });
  
  it('displays action buttons', async () => {
    renderPage();
    
    await waitFor(() => {
      expect(screen.getByText('الإغلاق والمتابعة')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('الإغلاق والمتابعة'));

    expect(screen.getByText('تسجيل القضية في النظام')).toBeInTheDocument();
  });
});
