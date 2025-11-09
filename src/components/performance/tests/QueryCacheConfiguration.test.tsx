import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { performanceLogger } from '@/lib/performanceLogger';
import { getGlobalPerformanceMetrics } from '@/hooks/usePerformanceMonitor';

// Mock performance logger to track calls
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

// Test component that uses queries
const TestComponent: React.FC<{ queryFn: () => Promise<any>; queryKey: string[] }> = ({ queryFn, queryKey }) => {
  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {(error as Error).message}</div>;
  return <div>Data: {JSON.stringify(data)}</div>;
};

describe('Query Cache Configuration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    // Clear all mocks and create fresh query client with optimized configuration
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          refetchOnMount: false,         // Don't refetch on mount - use cache instead
          refetchOnWindowFocus: false,   // Don't refetch when switching browser tabs
          refetchOnReconnect: true,      // Refetch when internet reconnects
          staleTime: 5 * 60 * 1000,     // 5 minutes cache for frequently accessed data
          gcTime: 10 * 60 * 1000,       // Keep unused data in cache for 10 minutes
          retry: 2,                      // Retry failed queries twice
          retryDelay: (attemptIndex: number) => Math.min(1000 * 1.5 ** attemptIndex, 5000),
          networkMode: 'online',         // Only fetch when online
        },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('Cache Configuration Validation', () => {
    test('should configure QueryClient with optimized cache settings', () => {
      const defaultOptions = queryClient.getDefaultOptions();
      
      expect(defaultOptions.queries?.refetchOnMount).toBe(false);
      expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false);
      expect(defaultOptions.queries?.refetchOnReconnect).toBe(true);
      expect(defaultOptions.queries?.staleTime).toBe(5 * 60 * 1000); // 5 minutes
      expect(defaultOptions.queries?.gcTime).toBe(10 * 60 * 1000); // 10 minutes
      expect(defaultOptions.queries?.retry).toBe(2);
      expect(defaultOptions.queries?.networkMode).toBe('online');
    });

    test('should log performance metrics on query success', async () => {
      const mockData = { id: 1, name: 'Test Data' };
      const mockQueryFn = jest.fn().mockResolvedValue(mockData);
      
      render(
        <QueryClientProvider client={queryClient}>
          <TestComponent queryKey={['test', '1']} queryFn={mockQueryFn} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(`Data: ${JSON.stringify(mockData)}`)).toBeInTheDocument();
      });

      // Verify performance logging was called
      expect(mockPerformanceLogger.logQuery).toHaveBeenCalled();
    });

    test('should log performance metrics on query error', async () => {
      const mockError = new Error('Query failed');
      const mockQueryFn = jest.fn().mockRejectedValue(mockError);
      
      render(
        <QueryClientProvider client={queryClient}>
          <TestComponent queryKey={['test', 'error']} queryFn={mockQueryFn} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(`Error: ${mockError.message}`)).toBeInTheDocument();
      });

      // Verify performance logging was called for error case
      expect(mockPerformanceLogger.logQuery).toHaveBeenCalled();
    });
  });

  describe('Cache Behavior Tests', () => {
    test('should serve data from cache on subsequent renders', async () => {
      const mockData = { id: 1, name: 'Cached Data' };
      const mockQueryFn = jest.fn().mockResolvedValue(mockData);
      
      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <TestComponent queryKey={['cache', 'test']} queryFn={mockQueryFn} />
        </QueryClientProvider>
      );

      // Initial fetch
      await waitFor(() => {
        expect(screen.getByText(`Data: ${JSON.stringify(mockData)}`)).toBeInTheDocument();
      });

      expect(mockQueryFn).toHaveBeenCalledTimes(1);

      // Rerender - should use cache
      rerender(
        <QueryClientProvider client={queryClient}>
          <TestComponent queryKey={['cache', 'test']} queryFn={mockQueryFn} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(`Data: ${JSON.stringify(mockData)}`)).toBeInTheDocument();
      });

      // Query function should not be called again due to cache
      expect(mockQueryFn).toHaveBeenCalledTimes(1);
    });

    test('should not refetch on mount when data is fresh', async () => {
      const mockData = { id: 1, name: 'Fresh Data' };
      const mockQueryFn = jest.fn().mockResolvedValue(mockData);
      
      // First render to populate cache
      const { unmount } = render(
        <QueryClientProvider client={queryClient}>
          <TestComponent queryKey={['fresh', 'data']} queryFn={mockQueryFn} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(`Data: ${JSON.stringify(mockData)}`)).toBeInTheDocument();
      });

      expect(mockQueryFn).toHaveBeenCalledTimes(1);
      unmount();

      // Second render - should not refetch due to refetchOnMount: false
      render(
        <QueryClientProvider client={queryClient}>
          <TestComponent queryKey={['fresh', 'data']} queryFn={mockQueryFn} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(`Data: ${JSON.stringify(mockData)}`)).toBeInTheDocument();
      });

      // Should still be only called once
      expect(mockQueryFn).toHaveBeenCalledTimes(1);
    });

    test('should respect staleTime configuration', async () => {
      const mockData = { id: 1, name: 'Stale Test Data' };
      const mockQueryFn = jest.fn().mockResolvedValue(mockData);
      
      // Create query client with short staleTime for testing
      const shortStaleTimeClient = new QueryClient({
        defaultOptions: {
          queries: {
            ...queryClient.getDefaultOptions().queries,
            staleTime: 100, // 100ms for testing
          },
        },
      });

      const { rerender } = render(
        <QueryClientProvider client={shortStaleTimeClient}>
          <TestComponent queryKey={['stale', 'test']} queryFn={mockQueryFn} />
        </QueryClientProvider>
      );

      // Initial fetch
      await waitFor(() => {
        expect(screen.getByText(`Data: ${JSON.stringify(mockData)}`)).toBeInTheDocument();
      });

      expect(mockQueryFn).toHaveBeenCalledTimes(1);

      // Wait for data to become stale
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
      });

      // Rerender after staleTime - should refetch
      rerender(
        <QueryClientProvider client={shortStaleTimeClient}>
          <TestComponent queryKey={['stale', 'test']} queryFn={mockQueryFn} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(`Data: ${JSON.stringify(mockData)}`)).toBeInTheDocument();
      });

      // Should be called twice due to stale data
      expect(mockQueryFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cache Invalidation Tests', () => {
    test('should invalidate specific queries without affecting others', async () => {
      const mockData1 = { id: 1, name: 'Data 1' };
      const mockData2 = { id: 2, name: 'Data 2' };
      const mockQueryFn1 = jest.fn().mockResolvedValue(mockData1);
      const mockQueryFn2 = jest.fn().mockResolvedValue(mockData2);
      
      render(
        <QueryClientProvider client={queryClient}>
          <>
            <TestComponent queryKey={['test', '1']} queryFn={mockQueryFn1} />
            <TestComponent queryKey={['test', '2']} queryFn={mockQueryFn2} />
          </>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(`Data: ${JSON.stringify(mockData1)}`)).toBeInTheDocument();
        expect(screen.getByText(`Data: ${JSON.stringify(mockData2)}`)).toBeInTheDocument();
      });

      expect(mockQueryFn1).toHaveBeenCalledTimes(1);
      expect(mockQueryFn2).toHaveBeenCalledTimes(1);

      // Invalidate only the first query
      await act(async () => {
        queryClient.invalidateQueries({ queryKey: ['test', '1'] });
      });

      // Only the first query should be refetched
      expect(mockQueryFn1).toHaveBeenCalledTimes(2);
      expect(mockQueryFn2).toHaveBeenCalledTimes(1);
    });

    test('should handle cache invalidation with proper refetching', async () => {
      const initialData = { id: 1, name: 'Initial Data' };
      const updatedData = { id: 1, name: 'Updated Data' };
      const mockQueryFn = jest.fn()
        .mockResolvedValueOnce(initialData)
        .mockResolvedValueOnce(updatedData);
      
      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <TestComponent queryKey={['invalidate', 'test']} queryFn={mockQueryFn} />
        </QueryClientProvider>
      );

      // Initial fetch
      await waitFor(() => {
        expect(screen.getByText(`Data: ${JSON.stringify(initialData)}`)).toBeInTheDocument();
      });

      expect(mockQueryFn).toHaveBeenCalledTimes(1);

      // Invalidate query
      await act(async () => {
        queryClient.invalidateQueries({ queryKey: ['invalidate', 'test'] });
      });

      // Should fetch updated data
      await waitFor(() => {
        expect(screen.getByText(`Data: ${JSON.stringify(updatedData)}`)).toBeInTheDocument();
      });

      expect(mockQueryFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance Monitoring Integration', () => {
    test('should track cache hit/miss rates', async () => {
      const mockData = { id: 1, name: 'Performance Test' };
      const mockQueryFn = jest.fn().mockResolvedValue(mockData);
      
      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <TestComponent queryKey={['performance', 'cache']} queryFn={mockQueryFn} />
        </QueryClientProvider>
      );

      // Initial fetch (cache miss)
      await waitFor(() => {
        expect(screen.getByText(`Data: ${JSON.stringify(mockData)}`)).toBeInTheDocument();
      });

      // Rerender (cache hit)
      rerender(
        <QueryClientProvider client={queryClient}>
          <TestComponent queryKey={['performance', 'cache']} queryFn={mockQueryFn} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(`Data: ${JSON.stringify(mockData)}`)).toBeInTheDocument();
      });

      // Verify cache logging was called
      expect(mockPerformanceLogger.logCache).toHaveBeenCalled();
    });

    test('should measure query execution times', async () => {
      const mockData = { id: 1, name: 'Timing Test' };
      const mockQueryFn = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate network delay
        return mockData;
      });
      
      render(
        <QueryClientProvider client={queryClient}>
          <TestComponent queryKey={['timing', 'test']} queryFn={mockQueryFn} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(`Data: ${JSON.stringify(mockData)}`)).toBeInTheDocument();
      });

      // Verify performance logging was called with execution time
      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        expect.any(Object)
      );
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle network errors gracefully', async () => {
      const networkError = new Error('Network Error');
      const mockQueryFn = jest.fn().mockRejectedValue(networkError);
      
      render(
        <QueryClientProvider client={queryClient}>
          <TestComponent queryKey={['error', 'network']} queryFn={mockQueryFn} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(`Error: ${networkError.message}`)).toBeInTheDocument();
      });

      // Verify error logging
      expect(mockPerformanceLogger.logQuery).toHaveBeenCalled();
    });

    test('should retry failed queries according to configuration', async () => {
      const retryError = new Error('Retry Error');
      const mockQueryFn = jest.fn()
        .mockRejectedValueOnce(retryError)
        .mockRejectedValueOnce(retryError)
        .mockResolvedValueOnce({ id: 1, name: 'Success after retry' });
      
      render(
        <QueryClientProvider client={queryClient}>
          <TestComponent queryKey={['retry', 'test']} queryFn={mockQueryFn} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Data: {"id":1,"name":"Success after retry"}')).toBeInTheDocument();
      });

      // Should retry twice (initial + 2 retries = 3 total calls)
      expect(mockQueryFn).toHaveBeenCalledTimes(3);
    });
  });
});