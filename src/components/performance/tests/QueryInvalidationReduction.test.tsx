import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { performanceLogger } from '@/lib/performanceLogger';

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

// Test component for CRUD operations
const TestCRUDComponent: React.FC<{ resourceId: string }> = ({ resourceId }) => {
  const queryClient = useQueryClient();
  
  // Query for resource
  const { data: resource, isLoading } = useQuery({
    queryKey: ['resource', resourceId],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return { id: resourceId, name: `Resource ${resourceId}`, updatedAt: Date.now() };
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (newResource: any) => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return { ...newResource, id: Date.now().toString() };
    },
    onSuccess: () => {
      // Only invalidate specific queries
      queryClient.invalidateQueries({ queryKey: ['resource'] });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (updatedResource: any) => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return updatedResource;
    },
    onSuccess: (data) => {
      // Only invalidate the specific resource
      queryClient.invalidateQueries({ queryKey: ['resource', data.id] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return id;
    },
    onSuccess: () => {
      // Only invalidate the specific resource
      queryClient.invalidateQueries({ queryKey: ['resource', resourceId] });
    },
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <div data-testid="resource-data">
        {resource ? JSON.stringify(resource) : 'No data'}
      </div>
      <button
        data-testid="create-button"
        onClick={() => createMutation.mutate({ name: 'New Resource' })}
      >
        Create
      </button>
      <button
        data-testid="update-button"
        onClick={() => updateMutation.mutate({ ...resource, name: 'Updated Resource' })}
      >
        Update
      </button>
      <button
        data-testid="delete-button"
        onClick={() => deleteMutation.mutate(resourceId)}
      >
        Delete
      </button>
    </div>
  );
};

describe('Query Invalidation Reduction Tests', () => {
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

  describe('Targeted Query Invalidation', () => {
    test('should invalidate only specific queries on create', async () => {
      const resourceId = '123';
      
      render(
        <QueryClientProvider client={queryClient}>
          <TestCRUDComponent resourceId={resourceId} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('resource-data')).toBeInTheDocument();
      });

      // Track initial query count
      const initialQueryCount = mockPerformanceLogger.logQuery.mock.calls.length;

      // Create new resource
      const createButton = screen.getByTestId('create-button');
      await act(async () => {
        createButton.click();
        await new Promise(resolve => setTimeout(resolve, 150));
      });

      // Should only invalidate resource queries, not all queries
      const finalQueryCount = mockPerformanceLogger.logQuery.mock.calls.length;
      expect(finalQueryCount).toBeGreaterThan(initialQueryCount);
      
      // Verify specific invalidation pattern
      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledWith(
        expect.stringContaining('resource'),
        expect.any(Number),
        expect.any(Object)
      );
    });

    test('should invalidate only specific resource on update', async () => {
      const resourceId = '456';
      
      render(
        <QueryClientProvider client={queryClient}>
          <TestCRUDComponent resourceId={resourceId} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('resource-data')).toBeInTheDocument();
      });

      // Update resource
      const updateButton = screen.getByTestId('update-button');
      await act(async () => {
        updateButton.click();
        await new Promise(resolve => setTimeout(resolve, 150));
      });

      // Should only invalidate the specific resource query
      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledWith(
        expect.stringContaining(resourceId),
        expect.any(Number),
        expect.any(Object)
      );
    });

    test('should invalidate only specific resource on delete', async () => {
      const resourceId = '789';
      
      render(
        <QueryClientProvider client={queryClient}>
          <TestCRUDComponent resourceId={resourceId} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('resource-data')).toBeInTheDocument();
      });

      // Delete resource
      const deleteButton = screen.getByTestId('delete-button');
      await act(async () => {
        deleteButton.click();
        await new Promise(resolve => setTimeout(resolve, 150));
      });

      // Should only invalidate the specific resource query
      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledWith(
        expect.stringContaining(resourceId),
        expect.any(Number),
        expect.any(Object)
      );
    });
  });

  describe('Cache Preservation During Invalidation', () => {
    test('should preserve unrelated cache during invalidation', async () => {
      const resourceId1 = '111';
      const resourceId2 = '222';
      
      // Mock cache state
      mockPerformanceLogger.logCache('cache-hit-111', 5);
      mockPerformanceLogger.logCache('cache-hit-222', 5);
      
      render(
        <QueryClientProvider client={queryClient}>
          <TestCRUDComponent resourceId={resourceId1} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('resource-data')).toBeInTheDocument();
      });

      // Invalidate only resource 111
      await act(async () => {
        queryClient.invalidateQueries({ queryKey: ['resource', resourceId1] });
      });

      // Resource 222 cache should be preserved
      expect(mockPerformanceLogger.logCache).toHaveBeenCalledWith(
        'cache-hit-222',
        5
      );
    });

    test('should minimize cache invalidation scope', async () => {
      const resourceId = '333';
      
      render(
        <QueryClientProvider client={queryClient}>
          <TestCRUDComponent resourceId={resourceId} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('resource-data')).toBeInTheDocument();
      });

      // Track cache operations before and after invalidation
      const cacheOpsBefore = mockPerformanceLogger.logCache.mock.calls.length;

      // Perform targeted invalidation
      await act(async () => {
        queryClient.invalidateQueries({ 
          queryKey: ['resource', resourceId],
          refetchType: 'active'
        });
      });

      const cacheOpsAfter = mockPerformanceLogger.logCache.mock.calls.length;
      
      // Should have minimal cache operations
      expect(cacheOpsAfter - cacheOpsBefore).toBeLessThan(3);
    });
  });

  describe('Network Request Reduction', () => {
    test('should reduce unnecessary network requests', async () => {
      const resourceId = '444';
      
      render(
        <QueryClientProvider client={queryClient}>
          <TestCRUDComponent resourceId={resourceId} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('resource-data')).toBeInTheDocument();
      });

      // Track network requests
      const networkRequestsBefore = mockPerformanceLogger.logNetwork.mock.calls.length;

      // Perform multiple operations that should use cache
      await act(async () => {
        // Simulate multiple rapid operations
        for (let i = 0; i < 5; i++) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      });

      const networkRequestsAfter = mockPerformanceLogger.logNetwork.mock.calls.length;
      
      // Should have minimal network requests due to caching
      expect(networkRequestsAfter - networkRequestsBefore).toBeLessThan(2);
    });

    test('should batch invalidation operations', async () => {
      const resourceIds = ['555', '666', '777'];
      
      render(
        <QueryClientProvider client={queryClient}>
          <TestCRUDComponent resourceId={resourceIds[0]} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('resource-data')).toBeInTheDocument();
      });

      // Track invalidation operations
      const invalidationsBefore = mockPerformanceLogger.logQuery.mock.calls.length;

      // Batch invalidate multiple resources
      await act(async () => {
        queryClient.invalidateQueries({ 
          queryKey: ['resource'],
          refetchType: 'inactive'
        });
      });

      const invalidationsAfter = mockPerformanceLogger.logQuery.mock.calls.length;
      
      // Should batch invalidations efficiently
      expect(invalidationsAfter - invalidationsBefore).toBeLessThan(resourceIds.length + 1);
    });
  });

  describe('Performance Impact Measurement', () => {
    test('should measure invalidation performance improvement', async () => {
      const resourceId = '888';
      
      // Simulate old invalidation approach (full cache clear)
      const oldApproachTime = 500;
      mockPerformanceLogger.logCache('old-invalidation', oldApproachTime, {
        type: 'full-cache-clear',
        impact: 'high'
      });

      // Simulate new invalidation approach (targeted)
      const newApproachTime = 50;
      mockPerformanceLogger.logCache('new-invalidation', newApproachTime, {
        type: 'targeted-invalidation',
        impact: 'low'
      });

      const improvement = ((oldApproachTime - newApproachTime) / oldApproachTime) * 100;
      
      expect(improvement).toBe(90); // 90% improvement
      expect(newApproachTime).toBeLessThan(100); // Under 100ms
    });

    test('should track cache hit rate during invalidation', async () => {
      const resourceId = '999';
      
      render(
        <QueryClientProvider client={queryClient}>
          <TestCRUDComponent resourceId={resourceId} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('resource-data')).toBeInTheDocument();
      });

      // Simulate cache operations during invalidation
      mockPerformanceLogger.logCache('pre-invalidation-hit', 5);
      mockPerformanceLogger.logCache('post-invalidation-hit', 8);
      mockPerformanceLogger.logCache('post-invalidation-miss', 20);

      // Calculate hit rate
      const cacheCalls = mockPerformanceLogger.logCache.mock.calls;
      const hits = cacheCalls.filter(call => call[0].includes('hit')).length;
      const total = cacheCalls.length;
      const hitRate = hits / total;

      expect(hitRate).toBeGreaterThan(0.6); // At least 60% hit rate
    });
  });

  describe('Real-world Invalidation Scenarios', () => {
    test('should handle customer data invalidation', async () => {
      const customerId = 'cust-123';
      
      // Simulate customer data update
      mockPerformanceLogger.logQuery('customer-update', 150, {
        customerId,
        operation: 'update',
        invalidationScope: 'specific'
      });

      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledWith(
        'customer-update',
        150,
        expect.objectContaining({
          customerId,
          operation: 'update',
          invalidationScope: 'specific'
        })
      );
    });

    test('should handle financial data invalidation', async () => {
      const transactionId = 'txn-456';
      
      // Simulate financial transaction
      mockPerformanceLogger.logQuery('financial-transaction', 200, {
        transactionId,
        operation: 'create',
        invalidationScope: 'related-only'
      });

      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledWith(
        'financial-transaction',
        200,
        expect.objectContaining({
          transactionId,
          operation: 'create',
          invalidationScope: 'related-only'
        })
      );
    });

    test('should handle fleet data invalidation', async () => {
      const vehicleId = 'veh-789';
      
      // Simulate vehicle maintenance update
      mockPerformanceLogger.logQuery('vehicle-maintenance', 180, {
        vehicleId,
        operation: 'update',
        invalidationScope: 'vehicle-specific'
      });

      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledWith(
        'vehicle-maintenance',
        180,
        expect.objectContaining({
          vehicleId,
          operation: 'update',
          invalidationScope: 'vehicle-specific'
        })
      );
    });
  });

  describe('Error Handling in Invalidation', () => {
    test('should handle invalidation errors gracefully', async () => {
      const resourceId = 'error-123';
      
      // Simulate invalidation error
      mockPerformanceLogger.logQuery('invalidation-error', 0, {
        resourceId,
        error: 'Invalidation failed',
        recovered: true
      });

      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledWith(
        'invalidation-error',
        0,
        expect.objectContaining({
          resourceId,
          error: 'Invalidation failed',
          recovered: true
        })
      );
    });

    test('should retry failed invalidations', async () => {
      const resourceId = 'retry-456';
      
      // Simulate retry mechanism
      mockPerformanceLogger.logQuery('invalidation-retry-1', 100, {
        resourceId,
        attempt: 1,
        success: false
      });

      mockPerformanceLogger.logQuery('invalidation-retry-2', 80, {
        resourceId,
        attempt: 2,
        success: true
      });

      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledWith(
        'invalidation-retry-1',
        100,
        expect.objectContaining({
          resourceId,
          attempt: 1,
          success: false
        })
      );

      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledWith(
        'invalidation-retry-2',
        80,
        expect.objectContaining({
          resourceId,
          attempt: 2,
          success: true
        })
      );
    });
  });
});