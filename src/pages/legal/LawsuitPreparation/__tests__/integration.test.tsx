/**
 * Lawsuit Preparation Integration Tests
 * اختبارات تكامل تجهيز الدعوى
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
        createSignedUrl: vi.fn(() => Promise.resolve({
          data: { signedUrl: 'https://test.com/signed-file.pdf' },
          error: null,
        })),
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

    // Check for stepper tabs and checklist items (both may render the same label)
    expect(screen.getAllByText('حافظة المستندات').length).toBeGreaterThan(0);
    expect(screen.getAllByText('بيانات التقاضي').length).toBeGreaterThan(0);
    // And the new checklist panel
    expect(screen.getByText('ما عليك إكماله')).toBeInTheDocument();
  });

  it('unlocks intermediate steps but locks the closing step until filing is ready', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('بيانات التقاضي').length).toBeGreaterThan(0);
    });

    const nav = screen.getByRole('navigation', { name: 'مراحل تجهيز الدعوى' });
    const buttons = Array.from(nav.querySelectorAll('button'));
    const taqadiButton = buttons.find((b) => b.textContent?.includes('بيانات التقاضي'));
    const actionsButton = buttons.find((b) => b.textContent?.includes('الإغلاق والمتابعة'));
    if (!taqadiButton || !actionsButton) throw new Error('Expected step buttons in the nav');

    // الخطوات الوسطى مفتوحة دائماً (متطلباتها مترابطة بينها)
    expect(taqadiButton).not.toBeDisabled();
    // خطوة الإغلاق مقفلة حتى تكتمل شروط canStartFiling
    expect(actionsButton).toBeDisabled();
  });

  it('displays document names in the checklist panel', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('حافظة المستندات').length).toBeGreaterThan(0);
    });

    // قائمة التحقق تتضمن "حافظة المستندات"
    expect(screen.getAllByText('حافظة المستندات').length).toBeGreaterThan(0);
  });

  it('offers a single primary CTA and a "More actions" menu', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('تجهيز الدعوى القانونية')).toBeInTheDocument();
    });

    // إجراء أساسي واحد واضح
    expect(screen.getByText('الإجراء التالي')).toBeInTheDocument();
    // قائمة "المزيد من الإجراءات" متاحة عند الحاجة
    expect(screen.getByText('المزيد من الإجراءات')).toBeInTheDocument();
  });
});
