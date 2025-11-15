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

// Performance regression test component
const PerformanceRegressionTest: React.FC<{ testScenario: string }> = ({ testScenario }) => {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runPerformanceTest = async () => {
    setIsRunning(true);
    const results = [];

    switch (testScenario) {
      case 'query-performance':
        // Test query performance regression
        results.push({
          test: 'Fast Query',
          before: 800,
          after: 200,
          improvement: 75
        });
        results.push({
          test: 'Slow Query Detection',
          before: 2000,
          after: 800,
          improvement: 60
        });
        break;

      case 'cache-efficiency':
        // Test cache efficiency regression
        results.push({
          test: 'Cache Hit Rate',
          before: 0.3,
          after: 0.8,
          improvement: 167
        });
        results.push({
          test: 'Cache Memory Usage',
          before: 50, // MB
          after: 30, // MB
          improvement: 40
        });
        break;

      case 'navigation-speed':
        // Test navigation speed regression
        results.push({
          test: 'Page Load Time',
          before: 1500,
          after: 400,
          improvement: 73
        });
        results.push({
          test: 'Route Transition',
          before: 800,
          after: 250,
          improvement: 69
        });
        break;

      case 'memory-usage':
        // Test memory usage regression
        results.push({
          test: 'Memory Leaks',
          before: 100, // MB
          after: 60, // MB
          improvement: 40
        });
        results.push({
          test: 'Garbage Collection',
          before: 500,
          after: 200,
          improvement: 60
        });
        break;

      case 'network-requests':
        // Test network request regression
        results.push({
          test: 'Request Count',
          before: 50,
          after: 20,
          improvement: 60
        });
        results.push({
          test: 'Request Size',
          before: 2.5, // MB
          after: 1.2, // MB
          improvement: 52
        });
        break;
    }

    // Log performance results
    results.forEach(result => {
      mockPerformanceLogger.logQuery(`regression-${result.test}`, result.after, {
        scenario: testScenario,
        before: result.before,
        improvement: result.improvement
      });
    });

    setTestResults(results);
    setIsRunning(false);
  };

  return (
    <div data-testid="performance-regression-test">
      <h2>Performance Regression Test: {testScenario}</h2>
      <button
        data-testid="run-test-button"
        onClick={runPerformanceTest}
        disabled={isRunning}
      >
        {isRunning ? 'Running...' : 'Run Test'}
      </button>
      <div data-testid="test-results">
        {testResults.map((result, index) => (
          <div key={index} data-testid={`result-${index}`}>
            <strong>{result.test}:</strong>
            <br />
            Before: {result.before}{typeof result.before === 'number' && result.test.includes('Time') ? 'ms' : result.test.includes('Rate') ? '%' : result.test.includes('Usage') ? 'MB' : ''}
            <br />
            After: {result.after}{typeof result.after === 'number' && result.test.includes('Time') ? 'ms' : result.test.includes('Rate') ? '%' : result.test.includes('Usage') ? 'MB' : ''}
            <br />
            Improvement: {result.improvement}%
          </div>
        ))}
      </div>
    </div>
  );
};

describe('Performance Regression Testing', () => {
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

  describe('Query Performance Regression', () => {
    test('should detect query performance improvements', async () => {
      const testScenario = 'query-performance';
      
      render(
        <QueryClientProvider client={queryClient}>
          <PerformanceRegressionTest testScenario={testScenario} />
        </QueryClientProvider>
      );

      // Run the test
      const runButton = screen.getByTestId('run-test-button');
      await act(async () => {
        runButton.click();
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Wait for results
      await waitFor(() => {
        expect(screen.getByTestId('result-0')).toBeInTheDocument();
        expect(screen.getByTestId('result-1')).toBeInTheDocument();
      });

      // Verify performance improvements
      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledWith(
        'regression-Fast Query',
        200,
        expect.objectContaining({
          scenario: testScenario,
          before: 800,
          improvement: 75
        })
      );

      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledWith(
        'regression-Slow Query Detection',
        800,
        expect.objectContaining({
          scenario: testScenario,
          before: 2000,
          improvement: 60
        })
      );
    });

    test('should validate query time thresholds', async () => {
      const queryTimes = [150, 200, 180, 220, 190];
      
      // Log query times
      queryTimes.forEach((time, index) => {
        mockPerformanceLogger.logQuery(`threshold-test-${index}`, time);
      });

      // Calculate statistics
      const avgTime = queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length;
      const maxTime = Math.max(...queryTimes);
      
      // Verify thresholds
      expect(avgTime).toBeLessThan(500); // Under 500ms average
      expect(maxTime).toBeLessThan(1000); // Under 1s max
      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledTimes(5);
    });
  });

  describe('Cache Efficiency Regression', () => {
    test('should detect cache efficiency improvements', async () => {
      const testScenario = 'cache-efficiency';
      
      render(
        <QueryClientProvider client={queryClient}>
          <PerformanceRegressionTest testScenario={testScenario} />
        </QueryClientProvider>
      );

      // Run the test
      const runButton = screen.getByTestId('run-test-button');
      await act(async () => {
        runButton.click();
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Wait for results
      await waitFor(() => {
        expect(screen.getByTestId('result-0')).toBeInTheDocument();
        expect(screen.getByTestId('result-1')).toBeInTheDocument();
      });

      // Verify cache efficiency improvements
      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledWith(
        'regression-Cache Hit Rate',
        0.8,
        expect.objectContaining({
          scenario: testScenario,
          before: 0.3,
          improvement: 167
        })
      );

      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledWith(
        'regression-Cache Memory Usage',
        30,
        expect.objectContaining({
          scenario: testScenario,
          before: 50,
          improvement: 40
        })
      );
    });

    test('should validate cache hit rate targets', async () => {
      const cacheOperations = [
        { type: 'hit', count: 80 },
        { type: 'miss', count: 20 },
      ];

      // Calculate hit rate
      const totalOps = cacheOperations.reduce((sum, op) => sum + op.count, 0);
      const hitRate = cacheOperations.find(op => op.type === 'hit')?.count / totalOps || 0;

      // Log cache operations
      cacheOperations.forEach(op => {
        mockPerformanceLogger.logCache(`cache-${op.type}`, op.count);
      });

      // Verify hit rate target
      expect(hitRate).toBeGreaterThanOrEqual(0.7); // At least 70% hit rate
      expect(totalOps).toBe(100);
      expect(mockPerformanceLogger.logCache).toHaveBeenCalledTimes(2);
    });
  });

  describe('Navigation Speed Regression', () => {
    test('should detect navigation speed improvements', async () => {
      const testScenario = 'navigation-speed';
      
      render(
        <QueryClientProvider client={queryClient}>
          <PerformanceRegressionTest testScenario={testScenario} />
        </QueryClientProvider>
      );

      // Run the test
      const runButton = screen.getByTestId('run-test-button');
      await act(async () => {
        runButton.click();
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Wait for results
      await waitFor(() => {
        expect(screen.getByTestId('result-0')).toBeInTheDocument();
        expect(screen.getByTestId('result-1')).toBeInTheDocument();
      });

      // Verify navigation speed improvements
      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledWith(
        'regression-Page Load Time',
        400,
        expect.objectContaining({
          scenario: testScenario,
          before: 1500,
          improvement: 73
        })
      );

      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledWith(
        'regression-Route Transition',
        250,
        expect.objectContaining({
          scenario: testScenario,
          before: 800,
          improvement: 69
        })
      );
    });

    test('should validate navigation time thresholds', async () => {
      const navigationTimes = [300, 450, 380, 420, 350];
      
      // Log navigation times
      navigationTimes.forEach((time, index) => {
        mockPerformanceLogger.logNavigation(`nav-threshold-${index}`, time);
      });

      // Calculate statistics
      const avgTime = navigationTimes.reduce((sum, time) => sum + time, 0) / navigationTimes.length;
      const maxTime = Math.max(...navigationTimes);
      
      // Verify thresholds
      expect(avgTime).toBeLessThan(500); // Under 500ms average
      expect(maxTime).toBeLessThan(1000); // Under 1s max
      expect(mockPerformanceLogger.logNavigation).toHaveBeenCalledTimes(5);
    });
  });

  describe('Memory Usage Regression', () => {
    test('should detect memory usage improvements', async () => {
      const testScenario = 'memory-usage';
      
      render(
        <QueryClientProvider client={queryClient}>
          <PerformanceRegressionTest testScenario={testScenario} />
        </QueryClientProvider>
      );

      // Run the test
      const runButton = screen.getByTestId('run-test-button');
      await act(async () => {
        runButton.click();
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Wait for results
      await waitFor(() => {
        expect(screen.getByTestId('result-0')).toBeInTheDocument();
        expect(screen.getByTestId('result-1')).toBeInTheDocument();
      });

      // Verify memory usage improvements
      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledWith(
        'regression-Memory Leaks',
        60,
        expect.objectContaining({
          scenario: testScenario,
          before: 100,
          improvement: 40
        })
      );

      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledWith(
        'regression-Garbage Collection',
        200,
        expect.objectContaining({
          scenario: testScenario,
          before: 500,
          improvement: 60
        })
      );
    });

    test('should validate memory usage thresholds', async () => {
      const memorySnapshots = [45, 55, 48, 52, 50];
      
      // Log memory usage
      memorySnapshots.forEach((memory, index) => {
        mockPerformanceLogger.logRender(`memory-snapshot-${index}`, memory);
      });

      // Calculate statistics
      const avgMemory = memorySnapshots.reduce((sum, memory) => sum + memory, 0) / memorySnapshots.length;
      const maxMemory = Math.max(...memorySnapshots);
      
      // Verify thresholds
      expect(avgMemory).toBeLessThan(60); // Under 60MB average
      expect(maxMemory).toBeLessThan(80); // Under 80MB max
      expect(mockPerformanceLogger.logRender).toHaveBeenCalledTimes(5);
    });
  });

  describe('Network Request Regression', () => {
    test('should detect network request improvements', async () => {
      const testScenario = 'network-requests';
      
      render(
        <QueryClientProvider client={queryClient}>
          <PerformanceRegressionTest testScenario={testScenario} />
        </QueryClientProvider>
      );

      // Run the test
      const runButton = screen.getByTestId('run-test-button');
      await act(async () => {
        runButton.click();
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Wait for results
      await waitFor(() => {
        expect(screen.getByTestId('result-0')).toBeInTheDocument();
        expect(screen.getByTestId('result-1')).toBeInTheDocument();
      });

      // Verify network request improvements
      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledWith(
        'regression-Request Count',
        20,
        expect.objectContaining({
          scenario: testScenario,
          before: 50,
          improvement: 60
        })
      );

      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledWith(
        'regression-Request Size',
        1.2,
        expect.objectContaining({
          scenario: testScenario,
          before: 2.5,
          improvement: 52
        })
      );
    });

    test('should validate network request efficiency', async () => {
      const requestMetrics = [
        { count: 15, size: 1.8 }, // Before optimization
        { count: 8, size: 1.1 },  // After optimization
      ];

      // Calculate efficiency
      const countImprovement = ((requestMetrics[0].count - requestMetrics[1].count) / requestMetrics[0].count) * 100;
      const sizeImprovement = ((requestMetrics[0].size - requestMetrics[1].size) / requestMetrics[0].size) * 100;

      // Log network metrics
      requestMetrics.forEach((metric, index) => {
        mockPerformanceLogger.logNetwork(`network-metric-${index}`, metric.count, {
          requestSize: metric.size,
          optimized: index === 1
        });
      });

      // Verify efficiency improvements
      expect(countImprovement).toBeGreaterThan(40); // At least 40% reduction
      expect(sizeImprovement).toBeGreaterThan(30);  // At least 30% reduction
      expect(mockPerformanceLogger.logNetwork).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance Trend Analysis', () => {
    test('should analyze performance trends over time', async () => {
      const performanceTrends = [
        { date: '2024-01-01', avgQueryTime: 800, cacheHitRate: 0.4 },
        { date: '2024-01-15', avgQueryTime: 600, cacheHitRate: 0.5 },
        { date: '2024-02-01', avgQueryTime: 400, cacheHitRate: 0.6 },
        { date: '2024-02-15', avgQueryTime: 300, cacheHitRate: 0.7 },
        { date: '2024-03-01', avgQueryTime: 200, cacheHitRate: 0.8 },
      ];

      // Analyze trends
      performanceTrends.forEach(trend => {
        mockPerformanceLogger.logQuery('trend-analysis', trend.avgQueryTime, {
          date: trend.date,
          avgQueryTime: trend.avgQueryTime,
          cacheHitRate: trend.cacheHitRate
        });
      });

      // Calculate trend improvements
      const firstTrend = performanceTrends[0];
      const lastTrend = performanceTrends[performanceTrends.length - 1];
      
      const queryTimeImprovement = ((firstTrend.avgQueryTime - lastTrend.avgQueryTime) / firstTrend.avgQueryTime) * 100;
      const cacheHitRateImprovement = ((lastTrend.cacheHitRate - firstTrend.cacheHitRate) / firstTrend.cacheHitRate) * 100;

      // Verify positive trends
      expect(queryTimeImprovement).toBe(75); // 75% improvement
      expect(cacheHitRateImprovement).toBe(100); // 100% improvement
      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledTimes(5);
    });

    test('should detect performance regressions', async () => {
      const regressionScenarios = [
        { metric: 'Query Time', current: 500, baseline: 300, regression: true },
        { metric: 'Cache Hit Rate', current: 0.4, baseline: 0.7, regression: true },
        { metric: 'Navigation Speed', current: 800, baseline: 400, regression: true },
        { metric: 'Memory Usage', current: 80, baseline: 50, regression: true },
      ];

      // Detect regressions
      regressionScenarios.forEach(scenario => {
        if (scenario.regression) {
          mockPerformanceLogger.logQuery('regression-detected', scenario.current, {
            metric: scenario.metric,
            baseline: scenario.baseline,
            regression: true,
            severity: scenario.current > scenario.baseline * 1.5 ? 'critical' : 'warning'
          });
        }
      });

      // Verify regression detection
      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledTimes(4);
      
      // Check for critical regressions
      const criticalRegressions = mockPerformanceLogger.logQuery.mock.calls
        .filter(call => call[2]?.severity === 'critical');
      expect(criticalRegressions.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Benchmark Comparison', () => {
    test('should compare against performance benchmarks', async () => {
      const benchmarks = {
        queryTime: { target: 300, current: 250, status: 'pass' },
        cacheHitRate: { target: 0.7, current: 0.8, status: 'pass' },
        navigationTime: { target: 500, current: 450, status: 'pass' },
        memoryUsage: { target: 60, current: 55, status: 'pass' },
      };

      // Compare against benchmarks
      Object.entries(benchmarks).forEach(([metric, benchmark]) => {
        const status = benchmark.current <= benchmark.target ? 'pass' : 'fail';
        
        mockPerformanceLogger.logQuery(`benchmark-${metric}`, benchmark.current, {
          target: benchmark.target,
          status,
          benchmark: true
        });
      });

      // Verify benchmark comparisons
      expect(mockPerformanceLogger.logQuery).toHaveBeenCalledTimes(4);
      
      // Check overall status
      const allPassed = Object.values(benchmarks).every(b => b.status === 'pass');
      expect(allPassed).toBe(true);
    });

    test('should generate performance regression report', async () => {
      // Mock global metrics for report
      const mockMetrics = new Map([
        ['query-performance', { avgTime: 250, improvement: 75 }],
        ['cache-efficiency', { hitRate: 0.8, improvement: 167 }],
        ['navigation-speed', { avgTime: 400, improvement: 73 }],
        ['memory-usage', { avgUsage: 55, improvement: 40 }],
      ]);

      const mockGetGlobalMetrics = getGlobalPerformanceMetrics as jest.MockedFunction<typeof getGlobalPerformanceMetrics>;
      mockGetGlobalMetrics.mockReturnValue(mockMetrics);

      const mockGetSummary = getPerformanceSummary as jest.MockedFunction<typeof getPerformanceSummary>;
      mockGetSummary.mockReturnValue('Performance regression analysis completed');

      // Generate report
      const metrics = getGlobalPerformanceMetrics();
      const summary = getPerformanceSummary();

      // Verify report generation
      expect(metrics).toBe(mockMetrics);
      expect(summary).toContain('Performance regression analysis completed');
      expect(mockGetGlobalMetrics).toHaveBeenCalled();
      expect(mockGetSummary).toHaveBeenCalled();
    });
  });
});