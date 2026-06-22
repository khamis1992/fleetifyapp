import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { toHaveNoViolations } from 'jest-axe';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Extend Vitest's expect with jest-axe matchers for accessibility testing
expect.extend(toHaveNoViolations);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock HTMLElement methods
HTMLElement.prototype.scrollTo = vi.fn();
HTMLElement.prototype.scroll = vi.fn();

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        download: vi.fn(),
        getPublicUrl: vi.fn(),
      })),
    },
  },
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    button: 'button',
    span: 'span',
    p: 'p',
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      company: { id: 'test-company-id', name: 'Test Company' },
      company_id: 'test-company-id',
      profile: {
        company_id: 'test-company-id',
      },
      roles: ['user'],
    },
    session: {
      access_token: 'test-token',
      refresh_token: 'test-refresh-token',
    },
    loading: false,
    sessionError: null,
    isSigningOut: false,
    signOut: vi.fn().mockResolvedValue(undefined),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock CompanyContext
vi.mock('@/contexts/CompanyContext', () => ({
  useCompanyContext: () => ({
    browsedCompany: null,
    isBrowsingMode: false,
    setBrowsedCompany: vi.fn(),
    exitBrowsingMode: vi.fn(),
  }),
  CompanyProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock financial hooks
vi.mock('@/hooks/useFinance', () => ({
  useEnhancedFinancialOverview: () => ({
    data: {
      totalRevenue: 150000,
      totalExpenses: 100000,
      netProfit: 50000,
      profitMargin: 33.33,
      financialHealthScore: 85,
      alerts: [],
      trends: {
        revenue: { value: 5, isPositive: true },
        expenses: { value: 2, isPositive: false },
        netProfit: { value: 10, isPositive: true },
      },
    },
    isLoading: false,
    error: null,
  }),
  useVendors: () => ({
    data: [],
    isLoading: false,
    error: null,
  }),
  useCustomerBalances: () => ({
    data: [],
    isLoading: false,
    error: null,
  }),
}));

// Mock currency formatter hook
vi.mock('@/hooks/useCurrencyFormatter', () => ({
  useCurrencyFormatter: () => ({
    formatCurrency: (amount: number) => `${amount.toLocaleString('ar-KW')} KWD`,
    formatNumber: (num: number) => num.toLocaleString('ar-KW'),
    currency: 'KWD',
    locale: 'ar-KW',
  }),
}));

// Mock useUnifiedCompanyAccess hook
vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({
  useUnifiedCompanyAccess: () => ({
    companyId: 'test-company-id',
    user: { id: 'test-user-id', user_metadata: { company_id: 'test-company-id' } },
    getQueryKey: (baseKey: string[], additionalKeys: unknown[] = []) => {
      return [baseKey, 'test-company-id', ...additionalKeys].filter(Boolean);
    },
    validateCompanyAccess: (targetCompanyId: string) => {
      if (!targetCompanyId) {
        throw new Error('Company ID is required');
      }
      if (targetCompanyId !== 'test-company-id') {
        throw new Error('Access denied: Cannot access data from different company');
      }
    },
    filter: { company_id: 'test-company-id' },
    isSystemLevel: false,
    isCompanyScoped: true,
    hasGlobalAccess: false,
    hasCompanyAdminAccess: false,
    hasFullCompanyControl: false,
    isBrowsingAsCompanyAdmin: false,
    canManageCompanyAsAdmin: false,
    canAccessCompany: (targetCompanyId?: string) => targetCompanyId === 'test-company-id',
    canAccessMultipleCompanies: () => false,
    getFilterForOwnCompany: () => ({ company_id: 'test-company-id' }),
    getFilterForGlobalView: () => ({ company_id: 'test-company-id' }),
    isBrowsingMode: false,
    browsedCompany: null,
    actualUserCompanyId: 'test-company-id',
    isAuthenticating: false,
    authError: null,
    context: {
      companyId: 'test-company-id',
      isSystemLevel: false,
      isCompanyScoped: true,
    },
  }),
  useCompanyFilter: () => ({ company_id: 'test-company-id' }),
  useHasAdminAccess: () => false,
  useCurrentCompanyId: () => 'test-company-id',
}));
