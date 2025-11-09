import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { performanceLogger, PerformanceLog } from '@/lib/performanceLogger';
import { getGlobalPerformanceMetrics, getPerformanceSummary, clearAllPerformanceMetrics, QueryPerformanceMetrics } from '@/hooks/usePerformanceMonitor';

interface PerformanceMonitorProps {
  className?: string;
  showDetailedLogs?: boolean;
  maxLogEntries?: number;
}

interface CacheStatistics {
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  totalOperations: number;
}

interface SlowOperation {
  id: string;
  type: PerformanceLog['type'];
  operation: string;
  duration: number;
  timestamp: number;
  level: PerformanceLog['level'];
}

/**
 * PerformanceMonitor component - Real-time performance monitoring dashboard
 * 
 * Features:
 * - Real-time performance metrics display
 * - Visual indicators for slow queries and navigation
 * - Cache statistics with hit/miss rates
 * - Log clearing and metrics reset functionality
 * - Integration with existing performance monitoring system
 */
export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  className = '',
  showDetailedLogs = true,
  maxLogEntries = 50
}) => {
  const [metrics, setMetrics] = useState(getGlobalPerformanceMetrics());
  const [logs, setLogs] = useState(performanceLogger.exportLogs());
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'query' | 'navigation' | 'cache' | 'render' | 'network'>('all');
  const [refreshInterval, setRefreshInterval] = useState(2000);

  // Update metrics and logs
  const updateData = useCallback(() => {
    setMetrics(getGlobalPerformanceMetrics());
    setLogs(performanceLogger.exportLogs().slice(-maxLogEntries));
  }, [maxLogEntries]);

  // Real-time updates
  useEffect(() => {
    if (!isRealTimeEnabled) return;

    const interval = setInterval(updateData, refreshInterval);
    return () => clearInterval(interval);
  }, [isRealTimeEnabled, refreshInterval, updateData]);

  // Initial data load
  useEffect(() => {
    updateData();
  }, [updateData]);

  // Calculate cache statistics
  const cacheStats = useMemo(() => {
    const metricsArray = Array.from(metrics.values());
    const totalHits = metricsArray.reduce((sum, m) => sum + m.cacheHits, 0);
    const totalMisses = metricsArray.reduce((sum, m) => sum + m.cacheMisses, 0);
    const totalOperations = totalHits + totalMisses;
    const hitRate = totalOperations > 0 ? totalHits / totalOperations : 0;

    return {
      hitRate,
      totalHits,
      totalMisses,
      totalOperations
    };
  }, [metrics]);

  // Get slow operations for visual indicators
  const slowOperations = useMemo(() => {
    const filteredLogs = logs.filter(log => {
      if (selectedFilter !== 'all') {
        return log.type === selectedFilter;
      }
      return true;
    });

    return filteredLogs
      .filter(log => {
        // Define slow thresholds based on operation type
        switch (log.type) {
          case 'query':
            return log.duration > 1000; // > 1s for queries
          case 'navigation':
            return log.duration > 500; // > 500ms for navigation
          case 'render':
            return log.duration > 100; // > 100ms for renders
          case 'cache':
            return log.duration > 50; // > 50ms for cache operations
          case 'network':
            return log.duration > 2000; // > 2s for network
          default:
            return false;
        }
      })
      .map(log => ({
        id: `${log.timestamp}-${log.operation}`,
        type: log.type,
        operation: log.operation,
        duration: log.duration,
        timestamp: log.timestamp,
        level: log.level
      }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10); // Show top 10 slow operations
  }, [logs, selectedFilter]);

  // Clear all performance data
  const handleClearAll = useCallback(() => {
    clearAllPerformanceMetrics();
    performanceLogger.clear();
    updateData();
  }, [updateData]);

  // Clear logs only
  const handleClearLogs = useCallback(() => {
    performanceLogger.clear();
    updateData();
  }, [updateData]);

  // Get performance level color
  const getPerformanceColor = useCallback((level) => {
    switch (level) {
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'warn':
        return 'text-yellow-600 bg-yellow-50';
      case 'info':
      default:
        return 'text-green-600 bg-green-50';
    }
  }, []);

  // Get operation type icon
  const getOperationIcon = useCallback((type) => {
    switch (type) {
      case 'query':
        return '🔍';
      case 'navigation':
        return '🧭';
      case 'cache':
        return '💾';
      case 'render':
        return '🎨';
      case 'network':
        return '🌐';
      default:
        return '📊';
    }
  }, []);

  // Format duration with appropriate unit
  const formatDuration = useCallback((duration) => {
    if (duration < 1000) {
      return `${duration}ms`;
    }
    return `${(duration / 1000).toFixed(2)}s`;
  }, []);

  const metricsArray = Array.from(metrics.values());
  const totalQueries = metricsArray.reduce((sum, m) => sum + m.executionCount, 0);
  const slowQueriesCount = metricsArray.filter(m => m.isSlowQuery).length;
  const avgExecutionTime = metricsArray.length > 0 
    ? metricsArray.reduce((sum, m) => sum + m.averageTime, 0) / metricsArray.length 
    : 0;

  return (
    <div className={`performance-monitor ${className}`}>
      {/* Header with Controls */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Performance Monitor</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsRealTimeEnabled(!isRealTimeEnabled)}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                isRealTimeEnabled 
                  ? 'bg-green-500 text-white hover:bg-green-600' 
                  : 'bg-gray-500 text-white hover:bg-gray-600'
              }`}
            >
              {isRealTimeEnabled ? '🟢 Live' : '⏸️ Paused'}
            </button>
            <button
              onClick={updateData}
              className="px-3 py-2 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              🔄 Refresh
            </button>
            <button
              onClick={handleClearLogs}
              className="px-3 py-2 bg-yellow-500 text-white rounded text-sm font-medium hover:bg-yellow-600 transition-colors"
            >
              🗑️ Clear Logs
            </button>
            <button
              onClick={handleClearAll}
              className="px-3 py-2 bg-red-500 text-white rounded text-sm font-medium hover:bg-red-600 transition-colors"
            >
              🗑️ Reset All
            </button>
          </div>
        </div>

        {/* Refresh Interval Control */}
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>Refresh Interval:</span>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="border rounded px-2 py-1"
            disabled={!isRealTimeEnabled}
          >
            <option value={1000}>1s</option>
            <option value={2000}>2s</option>
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
          </select>
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-800">{totalQueries}</div>
              <div className="text-sm text-gray-600">Total Queries</div>
            </div>
            <div className="text-3xl">🔍</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-800">{slowQueriesCount}</div>
              <div className="text-sm text-gray-600">Slow Queries</div>
            </div>
            <div className="text-3xl">🐌</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-800">{formatDuration(avgExecutionTime)}</div>
              <div className="text-sm text-gray-600">Avg Execution</div>
            </div>
            <div className="text-3xl">⚡</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-800">{(cacheStats.hitRate * 100).toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Cache Hit Rate</div>
            </div>
            <div className="text-3xl">💾</div>
          </div>
        </div>
      </div>

      {/* Cache Statistics */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Cache Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-green-600">{cacheStats.totalHits.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Cache Hits</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-red-600">{cacheStats.totalMisses.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Cache Misses</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">{cacheStats.totalOperations.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Total Operations</div>
          </div>
          <div className="text-center">
            <div className={`text-xl font-bold ${
              cacheStats.hitRate >= 0.8 ? 'text-green-600' : 
              cacheStats.hitRate >= 0.5 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {cacheStats.hitRate >= 0.8 ? 'Excellent' : 
               cacheStats.hitRate >= 0.5 ? 'Good' : 'Poor'}
            </div>
            <div className="text-sm text-gray-600">Performance</div>
          </div>
        </div>
      </div>

      {/* Slow Operations Visual Indicators */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-800">Slow Operations</h3>
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="border rounded px-3 py-1 text-sm"
          >
            <option value="all">All Types</option>
            <option value="query">Queries</option>
            <option value="navigation">Navigation</option>
            <option value="cache">Cache</option>
            <option value="render">Render</option>
            <option value="network">Network</option>
          </select>
        </div>

        {slowOperations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">✅</div>
            <div>No slow operations detected</div>
          </div>
        ) : (
          <div className="space-y-2">
            {slowOperations.map((operation) => (
              <div
                key={operation.id}
                className={`flex items-center justify-between p-3 rounded-lg border-l-4 ${getPerformanceColor(operation.level)}`}
                style={{ borderLeftWidth: '4px' }}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getOperationIcon(operation.type)}</span>
                  <div>
                    <div className="font-medium text-gray-800">{operation.operation}</div>
                    <div className="text-sm text-gray-600">
                      {operation.type.charAt(0).toUpperCase() + operation.type.slice(1)} • {new Date(operation.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-800">{formatDuration(operation.duration)}</div>
                  <div className={`text-xs px-2 py-1 rounded ${
                    operation.level === 'error' ? 'bg-red-100 text-red-700' :
                    operation.level === 'warn' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {operation.level.toUpperCase()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detailed Logs */}
      {showDetailedLogs && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Recent Logs</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Time</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Type</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Operation</th>
                  <th className="px-4 py-2 text-center font-medium text-gray-700">Duration</th>
                  <th className="px-4 py-2 text-center font-medium text-gray-700">Level</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(-20).map((log, index) => (
                  <tr key={`${log.timestamp}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2 text-xs text-gray-600">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center space-x-1">
                        <span>{getOperationIcon(log.type)}</span>
                        <span>{log.type}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{log.operation}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`font-medium ${
                        log.duration > 1000 ? 'text-red-600' :
                        log.duration > 500 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {formatDuration(log.duration)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`text-xs px-2 py-1 rounded ${getPerformanceColor(log.level)}`}>
                        {log.level.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Performance Summary */}
      <div className="bg-gray-100 rounded-lg p-4 mt-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Performance Summary</h3>
        <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
          {getPerformanceSummary()}
        </pre>
      </div>
    </div>
  );
};

export default PerformanceMonitor;