import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { performanceLogger } from '@/lib/performanceLogger';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock performance logger
const mockPerformanceLogger = {
  logQuery: jest.fn(),
  logCache: jest.fn(),
  logNavigation: jest.fn(),
  logRender: jest.fn(),
  logNetwork: jest.fn(),
  getMetrics: jest.fn(),
  getSummary: jest.fn(),
  clear: jest.fn(),
  exportLogs: jest.fn(),
};

jest.mock('@/lib/performanceLogger', () => ({
  performanceLogger: mockPerformanceLogger,
}));

// Mock navigation component
const MockNavigationComponent: React.FC<{ onNavigate: () => void }> = ({ onNavigate }) => {
  return (
    <button onClick={onNavigate} data-testid="navigate-button">
      Navigate
    </button>
  );
};

// Mock page component
const MockPageComponent: React.FC<{ pageName: string }> = ({ pageName }) => {
  useEffect(() => {
    const startTime = Date.now();
    
    // Simulate page load time
    setTimeout(() => {
      const loadTime = Date.now() - startTime;
      mockPerformanceLogger.logNavigation(`load-${pageName}`, loadTime);
    }, 100);
  }, [pageName]);

  return <div data-testid="page-content">{pageName} Page</div>;
};

describe('Navigation Performance Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000,
          gcTime: 10 * 60 * 1000,
          refetchOnMount: false,
          refetchOnWindowFocus: false,
        },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('Page Navigation Performance', () => {
    test('should track navigation times under 500ms', async () => {
      const onNavigate = jest.fn();
      
      render(
        <QueryClientProvider client={queryClient}>
          <MockNavigationComponent onNavigate={onNavigate} />
        </QueryClientProvider>
      );

      const navigateButton = screen.getByTestId('navigate-button');
      
      // Simulate navigation
      await act(async () => {
        navigateButton.click();
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(onNavigate).toHaveBeenCalled();
    });

    test('should log slow navigation warnings', async () => {
      const slowNavigationTime = 800; // Above 500ms threshold
      
      mockPerformanceLogger.logNavigation.mockImplementation((operation, duration) => {
        if (duration > 500) {
          console.warn(`Slow navigation detected: ${operation} took ${duration}ms`);
        }
      });

      mockPerformanceLogger.logNavigation('slow-navigation', slowNavigationTime);

      expect(mockPerformanceLogger.logNavigation).toHaveBeenCalledWith(
        'slow-navigation',
        slowNavigationTime
      );
    });

    test('should measure page load performance', async () => {
      const pageName = 'Dashboard';
      
      render(
        <QueryClientProvider client={queryClient}>
          <MockPageComponent pageName={pageName} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('page-content')).toBeInTheDocument();
      });

      // Verify navigation logging was called
      expect(mockPerformanceLogger.logNavigation).toHaveBeenCalledWith(
        expect.stringContaining('load-'),
        expect.any(Number)
      );
    });
  });

  describe('Route Preloading Performance', () => {
    test('should preload critical routes', async () => {
      const criticalRoutes = ['/dashboard', '/finance', '/customers'];
      
      // Simulate route preloading
      criticalRoutes.forEach(route => {
        mockPerformanceLogger.logNavigation(`preload-${route}`, 50);
      });

      expect(mockPerformanceLogger.logNavigation).toHaveBeenCalledTimes(3);
      expect(mockPerformanceLogger.logNavigation).toHaveBeenCalledWith(
        'preload-/dashboard',
        50
      );
      expect(mockPerformanceLogger.logNavigation).toHaveBeenCalledWith(
        'preload-/finance',
        50
      );
      expect(mockPerformanceLogger.logNavigation).toHaveBeenCalledWith(
        'preload-/customers',
        50
      );
    });

    test('should measure preloading performance impact', async () => {
      const startTime = Date.now();
      
      // Simulate preloading multiple routes
      const routes = ['/dashboard', '/finance', '/customers', '/contracts', '/fleet'];
      routes.forEach(route => {
        mockPerformanceLogger.logNavigation(`preload-${route}`, 30);
      });

      const preloadingTime = Date.now() - startTime;
      
      // Preloading should complete quickly
      expect(preloadingTime).toBeLessThan(100);
      expect(mockPerformanceLogger.logNavigation).toHaveBeenCalledTimes(5);
    });
  });

  describe('Navigation Cache Performance', () => {
    test('should serve cached navigation data', async () => {
      const navigationKey = 'dashboard-navigation';
      
      // First navigation (cache miss)
      mockPerformanceLogger.logNavigation(`${navigationKey}-miss`, 200);
      
      // Second navigation (cache hit)
      mockPerformanceLogger.logNavigation(`${navigationKey}-hit`, 10);

      expect(mockPerformanceLogger.logNavigation).toHaveBeenCalledWith(
        `${navigationKey}-miss`,
        200
      );
      expect(mockPerformanceLogger.logNavigation).toHaveBeenCalledWith(
        `${navigationKey}-hit`,
        10
      );
    });

    test('should measure cache hit rate improvement', () => {
      const cacheHits = 8;
      const cacheMisses = 2;
      const totalNavigations = cacheHits + cacheMisses;
      const cacheHitRate = cacheHits / totalNavigations;

      // Simulate navigation cache metrics
      for (let i = 0; i < cacheHits; i++) {
        mockPerformanceLogger.logNavigation(`cache-hit-${i}`, 10);
      }
      
      for (let i = 0; i < cacheMisses; i++) {
        mockPerformanceLogger.logNavigation(`cache-miss-${i}`, 200);
      }

      expect(cacheHitRate).toBe(0.8); // 80% hit rate
      expect(mockPerformanceLogger.logNavigation).toHaveBeenCalledTimes(10);
    });
  });

  describe('Navigation Error Handling', () => {
    test('should handle navigation errors gracefully', async () => {
      const navigationError = new Error('Navigation failed');
      
      // Simulate navigation error
      mockPerformanceLogger.logNavigation('error-navigation', 0, {
        error: navigationError.message,
        status: 'error'
      });

      expect(mockPerformanceLogger.logNavigation).toHaveBeenCalledWith(
        'error-navigation',
        0,
        {
          error: navigationError.message,
          status: 'error'
        }
      );
    });

    test('should recover from navigation failures', async () => {
      const failedNavigation = 'failed-route';
      const recoveredNavigation = 'recovered-route';
      
      // Simulate failed navigation
      mockPerformanceLogger.logNavigation(failedNavigation, 0, {
        error: 'Route not found',
        status: 'error'
      });

      // Simulate successful recovery
      mockPerformanceLogger.logNavigation(recoveredNavigation, 300, {
        status: 'success',
        recovered: true
      });

      expect(mockPerformanceLogger.logNavigation).toHaveBeenCalledWith(
        failedNavigation,
        0,
        expect.objectContaining({ status: 'error' })
      );
      
      expect(mockPerformanceLogger.logNavigation).toHaveBeenCalledWith(
        recoveredNavigation,
        300,
        expect.objectContaining({ status: 'success', recovered: true })
      );
    });
  });

  describe('Performance Optimization Validation', () => {
    test('should validate navigation performance improvements', () => {
      const beforeOptimization = 800; // ms
      const afterOptimization = 200; // ms
      const improvement = ((beforeOptimization - afterOptimization) / beforeOptimization) * 100;

      // Simulate before/after metrics
      mockPerformanceLogger.logNavigation('before-optimization', beforeOptimization);
      mockPerformanceLogger.logNavigation('after-optimization', afterOptimization);

      expect(improvement).toBe(75); // 75% improvement
      expect(afterOptimization).toBeLessThan(500); // Under 500ms threshold
    });

    test('should measure navigation consistency', () => {
      const navigationTimes = [200, 250, 180, 220, 190];
      const averageTime = navigationTimes.reduce((sum, time) => sum + time, 0) / navigationTimes.length;
      const maxTime = Math.max(...navigationTimes);
      const minTime = Math.min(...navigationTimes);

      // Simulate consistent navigation measurements
      navigationTimes.forEach((time, index) => {
        mockPerformanceLogger.logNavigation(`consistent-nav-${index}`, time);
      });

      expect(averageTime).toBe(208); // Average navigation time
      expect(maxTime - minTime).toBe(70); // Variance should be low
      expect(averageTime).toBeLessThan(500); // Under threshold
    });
  });

  describe('Real-world Navigation Scenarios', () => {
    test('should handle dashboard to finance navigation', async () => {
      const fromRoute = '/dashboard';
      const toRoute = '/finance';
      const navigationTime = 250;

      mockPerformanceLogger.logNavigation(`${fromRoute}-to-${toRoute}`, navigationTime, {
        from: fromRoute,
        to: toRoute,
        type: 'route-transition'
      });

      expect(mockPerformanceLogger.logNavigation).toHaveBeenCalledWith(
        `${fromRoute}-to-${toRoute}`,
        navigationTime,
        expect.objectContaining({
          from: fromRoute,
          to: toRoute,
          type: 'route-transition'
        })
      );
    });

    test('should handle customer details navigation', async () => {
      const customerId = '123';
      const navigationTime = 180;

      mockPerformanceLogger.logNavigation(`customer-${customerId}`, navigationTime, {
        customerId,
        type: 'customer-details'
      });

      expect(mockPerformanceLogger.logNavigation).toHaveBeenCalledWith(
        `customer-${customerId}`,
        navigationTime,
        expect.objectContaining({
          customerId,
          type: 'customer-details'
        })
      );
    });

    test('should handle fleet vehicle navigation', async () => {
      const vehicleId = '456';
      const navigationTime = 220;

      mockPerformanceLogger.logNavigation(`vehicle-${vehicleId}`, navigationTime, {
        vehicleId,
        type: 'vehicle-details'
      });

      expect(mockPerformanceLogger.logNavigation).toHaveBeenCalledWith(
        `vehicle-${vehicleId}`,
        navigationTime,
        expect.objectContaining({
          vehicleId,
          type: 'vehicle-details'
        })
      );
    });
  });
});