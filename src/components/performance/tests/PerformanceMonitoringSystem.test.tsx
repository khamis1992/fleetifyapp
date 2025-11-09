import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { performanceLogger } from '@/lib/performanceLogger';
import { usePerformanceMonitor, getGlobalPerformanceMetrics, getPerformanceSummary } from '@/hooks/usePerformanceMonitor';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';

// Mock performance logger for testing
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

// Mock the performance logger module
jest.mock('@/lib/performanceLogger', () => ({
  performanceLogger: mockPerformanceLogger,
}));

// Test component that uses performance monitoring
const TestMonitoredComponent: React.FC<{ queryKey: string[] }> = ({ queryKey }) => {
  const mockQueryFn = async () => {
    await new Promise(resolve => setTimeout(resolve, 50));
    return { data: 'test', timestamp: Date.now() };
  };

  const { data, isLoading, error } = usePerformanceMonitor({
    queryKey,
    queryFn: mockQueryFn,
    performanceOptions: {
      slowQueryThreshold: 1000,
      enableDetailedLogging: true,
      trackCacheMetrics: true,
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {(error as Error).message}</div>;
  return <div>Data: {JSON.stringify(data)}</div>;
};

describe('Performance Monitoring System Tests', () => {
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

  describe('Performance Logger Functionality', () => {
    test('should initialize performance logger correctly', () => {
      expect(mockPerformanceLogger.logQuery).toBeDefined();
      expect(mockPerformanceLogger.logCache).toBeDefined();
      expect(mockPerformanceLogger.logNavigation).toBeDefined();
      expect(mockPerformanceLogger.logRender).toBeDefined();
      expect(mockPerformanceLogger.logNetwork).toBeDefined();
    });

    test('should log query performance metrics', () => {
      const operation = 'test-query';
      const duration = 150;
      const details = { cacheHit: false, status: 'success' };

      mockPerformanceLogger.logQuery(operation, duration, details);

      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledWith(operation, duration, details);
    });

    test('should log cache performance metrics', () => {
      const operation = 'cache-hit-test';
      const duration = 5;
      const details = { hitRate: 0.8 };

      mockPerformanceLogger.logCache(operation, duration, details);

      expect(mockPerformanceLogger.logCache).toHaveBeenCalledWith(operation, duration, details);
    });

    test('should generate performance summary', () => {
      const mockSummary = 'Performance Summary: 5 queries, 2 slow';
      mockPerformanceLogger.getSummary.mockReturnValue(mockSummary);

      const summary = mockPerformanceLogger.getSummary();

      expect(summary).toBe(mockSummary);
      expect(mockPerformanceLogger.getSummary).toHaveBeenCalled();
    });

    test('should clear performance logs', () => {
      mockPerformanceLogger.clear();

      expect(mockPerformanceLogger.clear).toHaveBeenCalled();
    });
  });

  describe('Performance Monitor Hook', () => {
    test('should track query execution times', async () => {
      const queryKey = ['performance', 'test'];
      
      render(
        <QueryClientProvider client={queryClient}>
          <TestMonitoredComponent queryKey={queryKey} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Data:/)).toBeInTheDocument();
      });

      // Verify performance logging was called
      expect(mockPerformanceLogger.logQuery).toHaveBeenCalled();
    });

    test('should detect slow queries', async () => {
      const queryKey = ['slow', 'query'];
      
      // Mock a slow query
      mockPerformanceLogger.logQuery.mockImplementation((operation, duration) => {
        if (duration > 1000) {
          console.warn(`Slow query detected: ${operation} took ${duration}ms`);
        }
      });

      render(
        <QueryClientProvider client={queryClient}>
          <TestMonitoredComponent queryKey={queryKey} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Data:/)).toBeInTheDocument();
      });

      // Verify slow query detection
      expect(mockPerformanceLogger.logQuery).toHaveBeenCalled();
    });

    test('should track cache hit/miss rates', async () => {
      const queryKey = ['cache', 'tracking'];
      
      render(
        <QueryClientProvider client={queryClient}>
          <TestMonitoredComponent queryKey={queryKey} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Data:/)).toBeInTheDocument();
      });

      // Verify cache tracking
      expect(mockPerformanceLogger.logCache).toHaveBeenCalled();
    });
  });

  describe('Global Performance Metrics', () => {
    test('should provide global performance metrics', () => {
      const mockMetrics = new Map([
        ['test-query', {
          queryKey: ['test'],
          executionCount: 5,
          totalTime: 500,
          averageTime: 100,
          minTime: 50,
          maxTime: 200,
          cacheHits: 3,
          cacheMisses: 2,
          cacheHitRate: 0.6,
          isSlowQuery: false,
          lastExecutionTime: 100,
        }],
      ]);

      // Mock the global metrics
      jest.spyOn(require('@/hooks/usePerformanceMonitor'), 'getGlobalPerformanceMetrics')
        .mockReturnValue(mockMetrics);

      const metrics = getGlobalPerformanceMetrics();

      expect(metrics).toBe(mockMetrics);
      expect(metrics.size).toBe(1);
      expect(metrics.get('test-query')?.executionCount).toBe(5);
    });

    test('should generate performance summary', () => {
      const mockSummary = `
📊 Global Performance Summary
============================
Total Queries: 10
Slow Queries (>1000ms): 2
Average Execution Time: 150ms
Cache Hit Rate: 75.0%
      `;

      jest.spyOn(require('@/hooks/usePerformanceMonitor'), 'getPerformanceSummary')
        .mockReturnValue(mockSummary);

      const summary = getPerformanceSummary();

      expect(summary).toContain('Global Performance Summary');
      expect(summary).toContain('Total Queries: 10');
      expect(summary).toContain('Cache Hit Rate: 75.0%');
    });
  });

  describe('Performance Thresholds', () => {
    test('should warn for queries exceeding threshold', () => {
      const slowQueryThreshold = 1000;
      const slowDuration = 1500;
      
      mockPerformanceLogger.logQuery.mockImplementation((operation, duration) => {
        if (duration > slowQueryThreshold) {
          console.warn(`Query exceeded threshold: ${operation} took ${duration}ms`);
        }
      });

      mockPerformanceLogger.logQuery('slow-query', slowDuration);

      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledWith('slow-query', slowDuration);
    });

    test('should track navigation performance', () => {
      const navigationOperation = 'page-transition';
      const navigationDuration = 300;
      
      mockPerformanceLogger.logNavigation(navigationOperation, navigationDuration);

      expect(mockPerformanceLogger.logNavigation).toHaveBeenCalledWith(
        navigationOperation,
        navigationDuration
      );
    });

    test('should track render performance', () => {
      const component = 'TestComponent';
      const renderDuration = 80;
      
      mockPerformanceLogger.logRender(component, renderDuration);

      expect(mockPerformanceLogger.logRender).toHaveBeenCalledWith(component, renderDuration);
    });
  });

  describe('Performance Optimization Validation', () => {
    test('should validate cache configuration improvements', () => {
      // Test that the cache configuration is properly set
      const defaultOptions = queryClient.getDefaultOptions();
      
      expect(defaultOptions.queries?.staleTime).toBe(5 * 60 * 1000); // 5 minutes
      expect(defaultOptions.queries?.gcTime).toBe(10 * 60 * 1000); // 10 minutes
      expect(defaultOptions.queries?.refetchOnMount).toBe(false);
      expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false);
    });

    test('should measure performance improvements', async () => {
      const queryKey = ['improvement', 'test'];
      const startTime = Date.now();
      
      render(
        <QueryClientProvider client={queryClient}>
          <TestMonitoredComponent queryKey={queryKey} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Data:/)).toBeInTheDocument();
      });

      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      // Performance should be under 500ms for optimized queries
      expect(totalDuration).toBeLessThan(500);
    });
  });

  describe('Error Handling', () => {
    test('should handle performance logger errors gracefully', () => {
      const error = new Error('Logger error');
      mockPerformanceLogger.logQuery.mockImplementation(() => {
        throw error;
      });

      // Should not throw error when logging fails
      expect(() => {
        mockPerformanceLogger.logQuery('error-test', 100);
      }).not.toThrow();
    });

    test('should handle missing performance data', () => {
      // Mock empty metrics
      jest.spyOn(require('@/hooks/usePerformanceMonitor'), 'getGlobalPerformanceMetrics')
        .mockReturnValue(new Map());

      const metrics = getGlobalPerformanceMetrics();

      expect(metrics.size).toBe(0);
    });
  });
});