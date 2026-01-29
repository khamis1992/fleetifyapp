/**
 * Lawsuit Preparation Integration Tests
 * اختبارات تكامل تجهيز الدعوى
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
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
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              id: 'contract-1',
              contract_number: 'C-001',
              start_date: '2024-01-01',
              monthly_amount: 5000,
              customer_id: 'customer-1',
              vehicle_id: 'vehicle-1',
            },
            error: null,
          })),
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
        })),
        lt: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({
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
          })),
        })),
        neq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
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
        <BrowserRouter>
          <LawsuitPreparationPage />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };
  
  it('shows loading state initially', () => {
    renderPage();
    
    expect(screen.getByText('جاري تحميل البيانات...')).toBeInTheDocument();
  });
  
  it('renders the main components after loading', async () => {
    renderPage();
    
    await waitFor(() => {
      expect(screen.getByText('تجهيز الدعوى')).toBeInTheDocument();
    });
    
    // Check for main components
    expect(screen.getByText('المستندات الإلزامية')).toBeInTheDocument();
    expect(screen.getByText('بيانات تقاضي (للنسخ)')).toBeInTheDocument();
  });
  
  it('allows toggling Taqadi data section', async () => {
    renderPage();
    
    await waitFor(() => {
      expect(screen.getByText('بيانات تقاضي (للنسخ)')).toBeInTheDocument();
    });
    
    const taqadiHeader = screen.getByText('بيانات تقاضي (للنسخ)');
    fireEvent.click(taqadiHeader);
    
    await waitFor(() => {
      expect(screen.getByText('عنوان الدعوى')).toBeInTheDocument();
    });
  });
  
  it('displays generate buttons for mandatory documents', async () => {
    renderPage();
    
    await waitFor(() => {
      expect(screen.getByText('المذكرة الشارحة')).toBeInTheDocument();
    });
    
    const generateButtons = screen.getAllByText('توليد');
    expect(generateButtons.length).toBeGreaterThan(0);
  });
  
  it('displays action buttons', async () => {
    renderPage();
    
    await waitFor(() => {
      expect(screen.getByText('تجهيز الدعوى')).toBeInTheDocument();
    });
    
    expect(screen.getByText('توليد جميع المستندات')).toBeInTheDocument();
    expect(screen.getByText('تسجيل القضية في النظام')).toBeInTheDocument();
    expect(screen.getByText('تحميل الكل ZIP')).toBeInTheDocument();
  });
});
