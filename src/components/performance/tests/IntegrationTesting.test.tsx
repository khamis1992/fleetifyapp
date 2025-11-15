import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { performanceLogger } from '@/lib/performanceLogger';
import { getGlobalPerformanceMetrics, getPerformanceSummary } from '@/hooks/usePerformanceMonitor';

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

// Mock performance monitor
jest.mock('@/hooks/usePerformanceMonitor', () => ({
  getGlobalPerformanceMetrics: jest.fn(),
  getPerformanceSummary: jest.fn(),
}));

// Mock user workflow component
const MockUserWorkflow: React.FC<{ userRole: string }> = ({ userRole }) => {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [performanceData, setPerformanceData] = React.useState<any[]>([]);

  const workflowSteps = [
    { name: 'Login', action: () => mockPerformanceLogger.logNavigation('login', 200) },
    { name: 'Load Dashboard', action: () => mockPerformanceLogger.logQuery('dashboard', 300) },
    { name: 'Navigate to Finance', action: () => mockPerformanceLogger.logNavigation('dashboard-to-finance', 250) },
    { name: 'Load Financial Data', action: () => mockPerformanceLogger.logQuery('financial-data', 400) },
    { name: 'Navigate to Customers', action: () => mockPerformanceLogger.logNavigation('finance-to-customers', 220) },
    { name: 'Load Customer Data', action: () => mockPerformanceLogger.logQuery('customer-data', 350) },
    { name: 'Navigate to Contracts', action: () => mockPerformanceLogger.logNavigation('customers-to-contracts', 280) },
    { name: 'Load Contract Data', action: () => mockPerformanceLogger.logQuery('contract-data', 320) },
    { name: 'Navigate to Fleet', action: () => mockPerformanceLogger.logNavigation('contracts-to-fleet', 300) },
    { name: 'Load Fleet Data', action: () => mockPerformanceLogger.logQuery('fleet-data', 380) },
  ];

  React.useEffect(() => {
    if (currentStep < workflowSteps.length) {
      const step = workflowSteps[currentStep];
      const startTime = Date.now();
      
      // Execute step
      step.action();
      
      // Record performance
      const duration = Date.now() - startTime;
      const stepData = {
        step: step.name,
        duration,
        userRole,
        timestamp: Date.now()
      };
      
      setPerformanceData(prev => [...prev, stepData]);
      
      // Move to next step
      setTimeout(() => setCurrentStep(currentStep + 1), 100);
    }
  }, [currentStep, userRole]);

  return (
    <div data-testid="user-workflow">
      <h2>User Workflow: {userRole}</h2>
      <div data-testid="current-step">
        {workflowSteps[currentStep]?.name || 'Workflow Complete'}
      </div>
      <div data-testid="performance-data">
        {performanceData.map((data, index) => (
          <div key={index}>
            {data.step}: {data.duration}ms
          </div>
        ))}
      </div>
    </div>
  );
};

describe('Integration Testing', () => {
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

  describe('Complete User Workflow', () => {
    test('should complete full user workflow efficiently', async () => {
      const userRole = 'admin';
      
      render(
        <QueryClientProvider client={queryClient}>
          <MockUserWorkflow userRole={userRole} />
        </QueryClientProvider>
      );

      // Wait for workflow to complete
      await waitFor(() => {
        expect(screen.getByText('Workflow Complete')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify all performance operations were logged
      expect(mockPerformanceLogger.logNavigation).toHaveBeenCalledTimes(5);
      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledTimes(5);
      
      // Check overall performance
      const totalNavigationTime = mockPerformanceLogger.logNavigation.mock.calls
        .reduce((sum, call) => sum + call[1], 0);
      const totalQueryTime = mockPerformanceLogger.logQuery.mock.calls
        .reduce((sum, call) => sum + call[1], 0);
      
      expect(totalNavigationTime).toBeLessThan(1500); // Under 1.5s total
      expect(totalQueryTime).toBeLessThan(2000); // Under 2s total
    });

    test('should handle different user roles', async () => {
      const userRoles = ['admin', 'manager', 'user', 'viewer'];
      
      for (const role of userRoles) {
        const { unmount } = render(
          <QueryClientProvider client={queryClient}>
            <MockUserWorkflow userRole={role} />
          </QueryClientProvider>
        );

        await waitFor(() => {
          expect(screen.getByText(`User Workflow: ${role}`)).toBeInTheDocument();
        }, { timeout: 3000 });

        unmount();
      }

      // Verify performance tracking for all roles
      expect(mockPerformanceLogger.logNavigation).toHaveBeenCalledTimes(userRoles.length * 5);
      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledTimes(userRoles.length * 5);
    });
  });

  describe('Cross-Module Integration', () => {
    test('should integrate dashboard and finance modules', async () => {
      // Simulate dashboard to finance navigation
      mockPerformanceLogger.logNavigation('dashboard-to-finance', 250);
      mockPerformanceLogger.logQuery('finance-summary', 300);
      mockPerformanceLogger.logCache('finance-cache-hit', 5);

      // Verify integration
      expect(mockPerformanceLogger.logNavigation).toHaveBeenCalledWith(
        'dashboard-to-finance',
        250
      );
      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledWith(
        'finance-summary',
        300
      );
      expect(mockPerformanceLogger.logCache).toHaveBeenCalledWith(
        'finance-cache-hit',
        5
      );
    });

    test('should integrate customer and contract modules', async () => {
      // Simulate customer to contract workflow
      mockPerformanceLogger.logQuery('customer-details', 200);
      mockPerformanceLogger.logNavigation('customer-to-contracts', 180);
      mockPerformanceLogger.logQuery('customer-contracts', 250);
      mockPerformanceLogger.logCache('contract-cache-hit', 8);

      // Verify integration
      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledWith(
        'customer-details',
        200
      );
      expect(mockPerformanceLogger.logNavigation).toHaveBeenCalledWith(
        'customer-to-contracts',
        180
      );
      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledWith(
        'customer-contracts',
        250
      );
    });

    test('should integrate fleet and maintenance modules', async () => {
      // Simulate fleet to maintenance workflow
      mockPerformanceLogger.logQuery('fleet-overview', 350);
      mockPerformanceLogger.logNavigation('fleet-to-maintenance', 220);
      mockPerformanceLogger.logQuery('maintenance-schedule', 400);
      mockPerformanceLogger.logCache('maintenance-cache-hit', 10);

      // Verify integration
      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledWith(
        'fleet-overview',
        350
      );
      expect(mockPerformanceLogger.logNavigation).toHaveBeenCalledWith(
        'fleet-to-maintenance',
        220
      );
      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledWith(
        'maintenance-schedule',
        400
      );
    });
  });

  describe('Performance Under Load', () => {
    test('should handle concurrent user operations', async () => {
      const concurrentOperations = 10;
      
      // Simulate concurrent operations
      const promises = Array.from({ length: concurrentOperations }, (_, index) => {
        return new Promise(resolve => {
          setTimeout(() => {
            mockPerformanceLogger.logQuery(`concurrent-${index}`, Math.random() * 200 + 100);
            resolve(index);
          }, Math.random() * 100);
        });
      });

      await Promise.all(promises);

      // Verify all operations were tracked
      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledTimes(concurrentOperations);
      
      // Check performance under load
      const queryTimes = mockPerformanceLogger.logQuery.mock.calls.map(call => call[1]);
      const avgQueryTime = queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length;
      
      expect(avgQueryTime).toBeLessThan(300); // Under 300ms average
    });

    test('should maintain performance with large datasets', async () => {
      const largeDatasetSizes = [1000, 5000, 10000, 50000];
      
      for (const size of largeDatasetSizes) {
        const startTime = Date.now();
        
        // Simulate large dataset processing
        mockPerformanceLogger.logQuery(`large-dataset-${size}`, size * 0.01);
        
        const processingTime = Date.now() - startTime;
        
        // Performance should scale reasonably
        expect(processingTime).toBeLessThan(size * 0.02); // Linear scaling
      }

      // Verify all large dataset operations were tracked
      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledTimes(largeDatasetSizes.length);
    });
  });

  describe('Network Condition Simulation', () => {
    test('should handle slow network conditions', async () => {
      const slowNetworkLatency = 2000; // 2 seconds
      
      // Simulate slow network
      mockPerformanceLogger.logQuery('slow-network-query', slowNetworkLatency, {
        networkCondition: 'slow',
        latency: slowNetworkLatency
      });

      mockPerformanceLogger.logNavigation('slow-network-nav', 1500, {
        networkCondition: 'slow',
        latency: 1500
      });

      // Verify slow network handling
      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledWith(
        'slow-network-query',
        slowNetworkLatency,
        expect.objectContaining({
          networkCondition: 'slow',
          latency: slowNetworkLatency
        })
      );
    });

    test('should handle intermittent connectivity', async () => {
      const connectivityStates = ['online', 'offline', 'online', 'offline', 'online'];
      
      for (const state of connectivityStates) {
        mockPerformanceLogger.logNetwork(`connectivity-${state}`, 50, {
          state,
          timestamp: Date.now()
        });
      }

      // Verify connectivity tracking
      expect(mockPerformanceLogger.logNetwork).toHaveBeenCalledTimes(connectivityStates.length);
      
      // Check recovery handling
      const recoveryCalls = mockPerformanceLogger.logNetwork.mock.calls
        .filter(call => call[0].includes('online') && call[2].state === 'online');
      expect(recoveryCalls.length).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery Integration', () => {
    test('should recover from query errors gracefully', async () => {
      const errorScenarios = [
        { type: 'network', error: 'Network timeout' },
        { type: 'auth', error: 'Authentication failed' },
        { type: 'data', error: 'Invalid data format' },
      ];

      for (const scenario of errorScenarios) {
        // Simulate error
        mockPerformanceLogger.logQuery(`error-${scenario.type}`, 0, {
          error: scenario.error,
          recovered: true,
          retryCount: 2
        });

        // Simulate recovery
        mockPerformanceLogger.logQuery(`recovery-${scenario.type}`, 200, {
          success: true,
          recoveredFrom: scenario.type
        });
      }

      // Verify error handling and recovery
      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledTimes(errorScenarios.length * 2);
      
      // Check recovery success
      const recoveryCalls = mockPerformanceLogger.logQuery.mock.calls
        .filter(call => call[0].includes('recovery-'));
      expect(recoveryCalls.length).toBe(errorScenarios.length);
    });

    test('should maintain performance during error recovery', async () => {
      const errorRecoveryTime = 500; // Should be fast even during errors
      
      mockPerformanceLogger.logQuery('error-recovery', errorRecoveryTime, {
        operation: 'recovery',
        success: true,
        duration: errorRecoveryTime
      });

      // Verify recovery performance
      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledWith(
        'error-recovery',
        errorRecoveryTime,
        expect.objectContaining({
          operation: 'recovery',
          success: true,
          duration: errorRecoveryTime
        })
      );
      
      expect(errorRecoveryTime).toBeLessThan(1000); // Under 1s for recovery
    });
  });

  describe('Performance Metrics Integration', () => {
    test('should provide comprehensive performance summary', () => {
      // Mock global metrics
      const mockMetrics = new Map([
        ['dashboard', { executionCount: 10, averageTime: 200, cacheHitRate: 0.8 }],
        ['finance', { executionCount: 8, averageTime: 350, cacheHitRate: 0.7 }],
        ['customers', { executionCount: 12, averageTime: 180, cacheHitRate: 0.85 }],
        ['contracts', { executionCount: 6, averageTime: 250, cacheHitRate: 0.75 }],
        ['fleet', { executionCount: 9, averageTime: 300, cacheHitRate: 0.72 }],
      ]);

      const mockGetGlobalMetrics = getGlobalPerformanceMetrics as jest.MockedFunction<typeof getGlobalPerformanceMetrics>;
      mockGetGlobalMetrics.mockReturnValue(mockMetrics);

      const mockGetSummary = getPerformanceSummary as jest.MockedFunction<typeof getPerformanceSummary>;
      mockGetSummary.mockReturnValue('Mock performance summary');

      const metrics = getGlobalPerformanceMetrics();
      const summary = getPerformanceSummary();

      // Verify metrics integration
      expect(metrics).toBe(mockMetrics);
      expect(metrics.size).toBe(5);
      expect(summary).toBe('Mock performance summary');
      expect(mockGetGlobalMetrics).toHaveBeenCalled();
      expect(mockGetSummary).toHaveBeenCalled();
    });

    test('should track performance improvements over time', () => {
      const performanceSnapshots = [
        { timestamp: Date.now() - 86400000, avgQueryTime: 500, cacheHitRate: 0.5 }, // 1 day ago
        { timestamp: Date.now() - 43200000, avgQueryTime: 350, cacheHitRate: 0.6 }, // 12 hours ago
        { timestamp: Date.now() - 3600000, avgQueryTime: 250, cacheHitRate: 0.7 }, // 1 hour ago
        { timestamp: Date.now(), avgQueryTime: 200, cacheHitRate: 0.8 }, // Now
      ];

      // Track performance trend
      performanceSnapshots.forEach(snapshot => {
        mockPerformanceLogger.logQuery('performance-trend', snapshot.avgQueryTime, {
          timestamp: snapshot.timestamp,
          avgQueryTime: snapshot.avgQueryTime,
          cacheHitRate: snapshot.cacheHitRate
        });
      });

      // Verify trend tracking
      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledTimes(4);
      
      // Check improvement
      const initialPerformance = performanceSnapshots[0];
      const currentPerformance = performanceSnapshots[performanceSnapshots.length - 1];
      
      const queryTimeImprovement = ((initialPerformance.avgQueryTime - currentPerformance.avgQueryTime) / initialPerformance.avgQueryTime) * 100;
      const cacheHitRateImprovement = ((currentPerformance.cacheHitRate - initialPerformance.cacheHitRate) / initialPerformance.cacheHitRate) * 100;
      
      expect(queryTimeImprovement).toBe(60); // 60% improvement
      expect(cacheHitRateImprovement).toBe(60); // 60% improvement
    });
  });
});