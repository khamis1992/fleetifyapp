import React, { useState, useEffect } from 'react';
import { getGlobalPerformanceMetrics, getPerformanceSummary, clearAllPerformanceMetrics } from '@/hooks/usePerformanceMonitor';

interface PerformanceDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Performance Dashboard component for visualizing query performance metrics
 * Provides real-time monitoring of cache effectiveness and query performance
 */
export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ isOpen, onClose }) => {
  const [metrics, setMetrics] = useState(getGlobalPerformanceMetrics());
  const [summary, setSummary] = useState(getPerformanceSummary());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh metrics every 2 seconds
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setMetrics(getGlobalPerformanceMetrics());
      setSummary(getPerformanceSummary());
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen, autoRefresh]);

  // Manual refresh
  const handleRefresh = () => {
    setMetrics(getGlobalPerformanceMetrics());
    setSummary(getPerformanceSummary());
  };

  // Clear all metrics
  const handleClearAll = () => {
    clearAllPerformanceMetrics();
    setMetrics(getGlobalPerformanceMetrics());
    setSummary(getPerformanceSummary());
  };

  if (!isOpen) return null;

  const metricsArray = Array.from(metrics.values());

  // Calculate additional statistics
  const totalQueries = metricsArray.reduce((sum, m) => sum + m.executionCount, 0);
  const totalCacheHits = metricsArray.reduce((sum, m) => sum + m.cacheHits, 0);
  const totalCacheMisses = metricsArray.reduce((sum, m) => sum + m.cacheMisses, 0);
  const overallCacheHitRate = totalCacheHits + totalCacheMisses > 0 
    ? totalCacheHits / (totalCacheHits + totalCacheMisses) 
    : 0;

  const slowQueries = metricsArray.filter(m => m.isSlowQuery);
  const avgExecutionTime = metricsArray.length > 0 
    ? metricsArray.reduce((sum, m) => sum + m.averageTime, 0) / metricsArray.length 
    : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">Performance Monitor</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              Refresh
            </button>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1 rounded text-sm ${
                autoRefresh 
                  ? 'bg-green-500 text-white hover:bg-green-600' 
                  : 'bg-gray-500 text-white hover:bg-gray-600'
              }`}
            >
              Auto: {autoRefresh ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={handleClearAll}
              className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            >
              Clear All
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{totalQueries}</div>
              <div className="text-sm text-gray-600">Total Queries</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {(overallCacheHitRate * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Cache Hit Rate</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{slowQueries.length}</div>
              <div className="text-sm text-gray-600">Slow Queries</div>
            </div>
          </div>

          {/* Average Performance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-lg font-semibold text-gray-700">
                {avgExecutionTime.toFixed(0)}ms
              </div>
              <div className="text-sm text-gray-600">Average Execution Time</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-lg font-semibold text-purple-700">
                {metricsArray.length}
              </div>
              <div className="text-sm text-gray-600">Active Queries</div>
            </div>
          </div>

          {/* Summary Text */}
          <div className="bg-gray-100 p-4 rounded-lg mb-6">
            <h3 className="font-semibold mb-2">Performance Summary</h3>
            <pre className="text-xs text-gray-700 whitespace-pre-wrap">
              {summary}
            </pre>
          </div>

          {/* Detailed Metrics Table */}
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b">
              <h3 className="font-semibold">Query Details</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Query Key</th>
                    <th className="px-4 py-2 text-center font-medium text-gray-700">Executions</th>
                    <th className="px-4 py-2 text-center font-medium text-gray-700">Avg Time</th>
                    <th className="px-4 py-2 text-center font-medium text-gray-700">Min/Max</th>
                    <th className="px-4 py-2 text-center font-medium text-gray-700">Cache Rate</th>
                    <th className="px-4 py-2 text-center font-medium text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {metricsArray.map((metric, index) => (
                    <tr key={metric.queryKey.join('.')} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 font-mono text-xs">
                        {metric.queryKey.join('.')}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {metric.executionCount}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {metric.averageTime.toFixed(0)}ms
                      </td>
                      <td className="px-4 py-2 text-center">
                        {metric.minTime.toFixed(0)}ms / {metric.maxTime.toFixed(0)}ms
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`font-semibold ${
                          metric.cacheHitRate >= 0.8 ? 'text-green-600' : 
                          metric.cacheHitRate >= 0.5 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {(metric.cacheHitRate * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`font-semibold ${
                          metric.isSlowQuery ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {metric.isSlowQuery ? '🐌 SLOW' : '✅ OK'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="text-xs text-gray-600">
            <div>• Auto-refresh: {autoRefresh ? 'Enabled (2s interval)' : 'Disabled'}</div>
            <div>• Cache hit rate >= 80%: Good | 50-79%: Fair | < 50%: Poor</div>
            <div>• Slow query thresholds vary by query type</div>
            <div>• Last updated: {new Date().toLocaleTimeString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;