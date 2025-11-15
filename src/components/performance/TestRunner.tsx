import React, { useState, useCallback, useMemo } from 'react';
import { performanceValidator, SystemHealthReport } from '@/utils/performanceValidation';
import PerformanceTestSuite from './PerformanceTestSuite';

/**
 * Test Runner Component
 * 
 * Orchestrates all performance monitoring tests and provides:
 * - Individual test execution
 * - Batch test execution
 * - Real-time system health monitoring
 * - Diagnostic logging and reporting
 * - Integration with all test components
 */
export const TestRunner: React.FC = () => {
  const [healthReport, setHealthReport] = useState<SystemHealthReport | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);

  // Auto-refresh health monitoring
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (healthReport) {
        const updatedReport = performanceValidator.runFullValidation();
        setHealthReport(updatedReport);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Run comprehensive validation
  const runComprehensiveValidation = useCallback(async () => {
    setIsRunningTests(true);
    
    try {
      const report = performanceValidator.runFullValidation();
      setHealthReport(report);
      
      console.log('🧪 Comprehensive validation completed');
      console.log(`Overall Status: ${report.overall.toUpperCase()}`);
      console.log(`Success Rate: ${((report.components.performanceLogger.status === 'pass' ? 1 : 0) + 
                    (report.components.performanceMonitor.status === 'pass' ? 1 : 0) + 
                    (report.components.queryClient.status === 'pass' ? 1 : 0) + 
                    (report.components.cacheOptimization.status === 'pass' ? 1 : 0) + 
                    (report.components.dashboard.status === 'pass' ? 1 : 0)}/6 * 100}%`);
      
    } catch (error) {
      console.error('❌ Validation failed:', error);
    } finally {
      setIsRunningTests(false);
    }
  }, []);

  // Quick validation (logger only)
  const runQuickValidation = useCallback(async () => {
    setIsRunningTests(true);
    
    try {
      const loggerResult = performanceValidator.validatePerformanceLogger();
      
      setHealthReport({
        overall: loggerResult.status === 'pass' ? 'healthy' : 'critical',
        components: {
          performanceLogger: loggerResult,
          performanceMonitor: { status: 'warning', message: 'Not tested' },
          queryClient: { status: 'warning', message: 'Not tested' },
          cacheOptimization: { status: 'warning', message: 'Not tested' },
          dashboard: { status: 'warning', message: 'Not tested' }
        },
        summary: `Quick validation completed - Logger: ${loggerResult.status.toUpperCase()}`,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('❌ Quick validation failed:', error);
    } finally {
      setIsRunningTests(false);
    }
  }, []);

  // Generate diagnostic report
  const generateDiagnosticReport = useCallback(() => {
    if (!healthReport) return;
    
    const timestamp = new Date().toISOString();
    const report = `
🔍 Performance System Diagnostic Report
Generated: ${timestamp}
=====================================

SYSTEM HEALTH STATUS
-----------------
Overall: ${healthReport.overall.toUpperCase()}
${healthReport.overall === 'healthy' ? '✅ All systems operational' : 
  healthReport.overall === 'warning' ? '⚠️ Minor issues detected' : 
  '❌ Critical issues require attention'}

COMPONENT STATUS BREAKDOWN
------------------------
Performance Logger: ${healthReport.components.performanceLogger.status.toUpperCase()}
- ${healthReport.components.performanceLogger.message}

Performance Monitor Hook: ${healthReport.components.performanceMonitor.status.toUpperCase()}
- ${healthReport.components.performanceMonitor.message}

QueryClient Integration: ${healthReport.components.queryClient.status.toUpperCase()}
- ${healthReport.components.queryClient.message}

Cache Optimization: ${healthReport.components.cacheOptimization.status.toUpperCase()}
- ${healthReport.components.cacheOptimization.message}

Dashboard: ${healthReport.components.dashboard.status.toUpperCase()}
- ${healthReport.components.dashboard.message}

PERFORMANCE METRICS SUMMARY
------------------------
${healthReport.summary}

RECOMMENDATIONS
------------------------
${healthReport.summary.includes('System is healthy') ? 
  '🎯 Continue normal performance monitoring and optimization' :
  healthReport.summary.includes('CRITICAL ISSUES') ?
    '🚨 Address critical issues immediately before proceeding with production' :
    '🔧 Address warnings and optimize configuration for better performance'}

NEXT ACTIONS
------------------------
1. ${healthReport.overall === 'healthy' ? 'Continue' : 'Fix'} identified issues
2. Run individual component tests for detailed debugging
3. Monitor performance metrics in production environment
4. Schedule regular performance validation checks
5. Optimize slow queries and cache misses
=====================================
    `;
    
    // Download report
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-diagnostic-${timestamp.split('T')[0]}.txt`;
    a.click();
    
    console.log('📄 Diagnostic report generated and downloaded');
  }, [healthReport]);

  // Get status color for overall health
  const getOverallHealthColor = useCallback((overall: SystemHealthReport['overall']) => {
    switch (overall) {
      case 'healthy':
        return 'text-green-600 bg-green-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'critical':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  }, []);

  // Get component status color
  const getComponentStatusColor = useCallback((status: string) => {
    switch (status.toLowerCase()) {
      case 'pass':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'fail':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Performance Test Runner</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={runComprehensiveValidation}
              disabled={isRunningTests}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isRunningTests ? '🔄 Running...' : '🚀 Run Full Validation'}
            </button>
            <button
              onClick={runQuickValidation}
              disabled={isRunningTests}
              className="px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isRunningTests ? '🔄 Running...' : '⚡ Quick Validation'}
            </button>
            <button
              onClick={() => setHealthReport(null)}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
            >
              🗑️ Clear Report
            </button>
          </div>
        </div>

        {/* Auto-refresh Controls */}
        <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Auto-refresh:</span>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                autoRefresh 
                  ? 'bg-green-500 text-white hover:bg-green-600' 
                  : 'bg-gray-500 text-white hover:bg-gray-600'
              }`}
            >
              {autoRefresh ? '🟢 ON' : '⏸️ OFF'}
            </button>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              disabled={!autoRefresh}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value={1000}>1s</option>
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
            </select>
            <span className="text-sm text-gray-600 ml-4">
              Last check: {healthReport ? new Date(healthReport.timestamp).toLocaleTimeString() : 'Never'}
            </span>
          </div>
        </div>

        {/* System Health Status */}
        {healthReport && (
          <div className="mb-6">
            <div className={`p-4 rounded-lg border-l-4 ${getOverallHealthColor(healthReport.overall)}`}
              style={{ borderLeftWidth: '4px' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl font-bold">
                    {healthReport.overall === 'healthy' ? '✅' : 
                     healthReport.overall === 'warning' ? '⚠️' : '❌'}
                  </span>
                  <span className="text-xl font-bold text-gray-800">
                    System Status: {healthReport.overall.toUpperCase()}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  Last updated: {new Date(healthReport.timestamp).toLocaleString()}
                </div>
              </div>

              {/* Component Status Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div className="bg-white p-3 rounded border">
                  <h3 className="font-semibold text-gray-800 mb-2">Performance Logger</h3>
                  <div className={`text-lg font-medium ${getComponentStatusColor(healthReport.components.performanceLogger.status)}`}>
                    {healthReport.components.performanceLogger.status.toUpperCase()}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {healthReport.components.performanceLogger.message}
                  </div>
                </div>

                <div className="bg-white p-3 rounded border">
                  <h3 className="font-semibold text-gray-800 mb-2">Performance Monitor Hook</h3>
                  <div className={`text-lg font-medium ${getComponentStatusColor(healthReport.components.performanceMonitor.status)}`}>
                    {healthReport.components.performanceMonitor.status.toUpperCase()}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {healthReport.components.performanceMonitor.message}
                  </div>
                </div>

                <div className="bg-white p-3 rounded border">
                  <h3 className="font-semibold text-gray-800 mb-2">QueryClient Integration</h3>
                  <div className={`text-lg font-medium ${getComponentStatusColor(healthReport.components.queryClient.status)}`}>
                    {healthReport.components.queryClient.status.toUpperCase()}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {healthReport.components.queryClient.message}
                  </div>
                </div>

                <div className="bg-white p-3 rounded border">
                  <h3 className="font-semibold text-gray-800 mb-2">Cache Optimization</h3>
                  <div className={`text-lg font-medium ${getComponentStatusColor(healthReport.components.cacheOptimization.status)}`}>
                    {healthReport.components.cacheOptimization.status.toUpperCase()}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {healthReport.components.cacheOptimization.message}
                  </div>
                </div>

                <div className="bg-white p-3 rounded border">
                  <h3 className="font-semibold text-gray-800 mb-2">Dashboard</h3>
                  <div className={`text-lg font-medium ${getComponentStatusColor(healthReport.components.dashboard.status)}`}>
                    {healthReport.components.dashboard.status.toUpperCase()}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {healthReport.components.dashboard.message}
                  </div>
                </div>
              </div>

              {/* Performance Summary */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Performance Summary</h3>
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-white p-4 rounded border">
                  {healthReport.summary}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mt-6">
          <button
            onClick={generateDiagnosticReport}
            disabled={!healthReport}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            📄 Generate Diagnostic Report
          </button>
          <button
            onClick={() => window.open('/performance', '_blank')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            🧪 Open Test Suite
          </button>
          <button
            onClick={() => window.open('/performance-monitor', '_blank')}
            className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
          >
            📊 Open Dashboard
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-2">Usage Instructions</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Full Validation:</strong> Tests all performance monitoring components comprehensively</p>
            <p><strong>Quick Validation:</strong> Tests performance logger functionality only (faster)</p>
            <p><strong>Diagnostic Report:</strong> Generates detailed system health report for analysis</p>
            <p><strong>Test Suite:</strong> Individual test scenarios for detailed debugging</p>
            <p><strong>Dashboard:</strong> Real-time performance metrics visualization</p>
            <p><strong>Auto-refresh:</strong> Continuous health monitoring when enabled</p>
            <div className="mt-4 p-3 bg-white rounded border">
              <h4 className="font-semibold mb-2">React Query Cache Configuration</h4>
              <div className="text-sm space-y-1">
                <p>• <strong>Stale Time:</strong> 5 minutes (configured for optimal freshness)</p>
                <p>• <strong>GC Time:</strong> 10 minutes (balances memory usage)</p>
                <p>• <strong>Cache Hit Rate:</strong> Automatically tracked and visualized</p>
                <p>• <strong>Refetching:</strong> Minimized to reduce unnecessary network requests</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestRunner;