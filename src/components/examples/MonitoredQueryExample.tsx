import React from 'react';
import { useDashboardQuery, useUserDataQuery, useFinanceQuery, useFleetQuery, useCustomerQuery } from '@/hooks/useMonitoredQuery';

/**
 * Example component demonstrating the use of performance-monitored queries
 * Shows how to replace existing useQuery calls with usePerformanceMonitor variants
 */
export const MonitoredQueryExample: React.FC = () => {
  // Example: Dashboard data query with performance monitoring
  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    error: dashboardError,
    performanceMetrics: dashboardMetrics
  } = useDashboardQuery(
    ['dashboard', 'summary'],
    async () => {
      // Simulate dashboard data fetch
      const response = await fetch('/api/dashboard/summary');
      return response.json();
    },
    {
      staleTime: 2 * 60 * 1000, // 2 minutes for dashboard data
      refetchOnWindowFocus: false,
      performanceOptions: {
        slowQueryThreshold: 800, // Custom threshold for dashboard
        enableDetailedLogging: true,
        trackCacheMetrics: true
      }
    }
  );

  // Example: User data query with performance monitoring
  const {
    data: userData,
    isLoading: isUserLoading,
    error: userError,
    performanceMetrics: userMetrics
  } = useUserDataQuery(
    ['user', 'profile'],
    async () => {
      const response = await fetch('/api/user/profile');
      return response.json();
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes for user data
      performanceOptions: {
        slowQueryThreshold: 600, // Faster threshold for user data
        enableDetailedLogging: true,
        trackCacheMetrics: true
      }
    }
  );

  // Example: Financial data query with performance monitoring
  const {
    data: financeData,
    isLoading: isFinanceLoading,
    error: financeError,
    performanceMetrics: financeMetrics
  } = useFinanceQuery(
    ['finance', 'transactions'],
    async () => {
      const response = await fetch('/api/finance/transactions');
      return response.json();
    },
    {
      staleTime: 10 * 60 * 1000, // 10 minutes for financial data
      performanceOptions: {
        slowQueryThreshold: 1200, // Slower threshold for complex financial queries
        enableDetailedLogging: true,
        trackCacheMetrics: true
      }
    }
  );

  // Example: Fleet data query with performance monitoring
  const {
    data: fleetData,
    isLoading: isFleetLoading,
    error: fleetError,
    performanceMetrics: fleetMetrics
  } = useFleetQuery(
    ['fleet', 'vehicles'],
    async () => {
      const response = await fetch('/api/fleet/vehicles');
      return response.json();
    },
    {
      staleTime: 3 * 60 * 1000, // 3 minutes for fleet data
      performanceOptions: {
        slowQueryThreshold: 1500, // Slower threshold for large fleet datasets
        enableDetailedLogging: true,
        trackCacheMetrics: true
      }
    }
  );

  // Example: Customer data query with performance monitoring
  const {
    data: customerData,
    isLoading: isCustomerLoading,
    error: customerError,
    performanceMetrics: customerMetrics
  } = useCustomerQuery(
    ['customers', 'list'],
    async () => {
      const response = await fetch('/api/customers');
      return response.json();
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes for customer data
      performanceOptions: {
        slowQueryThreshold: 1000, // Standard threshold for customer queries
        enableDetailedLogging: true,
        trackCacheMetrics: true
      }
    }
  );

  const renderPerformanceMetrics = (metrics: any, label: string) => {
    if (!metrics) return null;
    
    return (
      <div className="performance-metrics p-2 bg-slate-100 rounded text-xs">
        <div className="font-semibold">{label} Performance:</div>
        <div>Executions: {metrics.executionCount}</div>
        <div>Avg Time: {metrics.averageTime?.toFixed(0)}ms</div>
        <div>Cache Rate: {(metrics.cacheHitRate * 100)?.toFixed(1)}%</div>
        <div className={metrics.isSlowQuery ? 'text-red-600' : 'text-green-600'}>
          Status: {metrics.isSlowQuery ? '🐌 SLOW' : '✅ OK'}
        </div>
        <button 
          onClick={metrics.clearMetrics}
          className="ml-2 px-2 py-1 bg-blue-500 text-white rounded text-xs"
        >
          Clear
        </button>
      </div>
    );
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold mb-4">Performance-Monitored Queries Example</h2>
      
      {/* Dashboard Query */}
      <div className="border rounded p-4">
        <h3 className="font-semibold mb-2">Dashboard Query</h3>
        {isDashboardLoading && <div>Loading dashboard...</div>}
        {dashboardError && <div className="text-red-600">Error: {dashboardError.message}</div>}
        {dashboardData && <div>Dashboard loaded with {dashboardData.summary?.totalItems} items</div>}
        {renderPerformanceMetrics(dashboardMetrics, 'Dashboard')}
      </div>

      {/* User Query */}
      <div className="border rounded p-4">
        <h3 className="font-semibold mb-2">User Profile Query</h3>
        {isUserLoading && <div>Loading user profile...</div>}
        {userError && <div className="text-red-600">Error: {userError.message}</div>}
        {userData && <div>User: {userData.name} ({userData.email})</div>}
        {renderPerformanceMetrics(userMetrics, 'User')}
      </div>

      {/* Finance Query */}
      <div className="border rounded p-4">
        <h3 className="font-semibold mb-2">Finance Query</h3>
        {isFinanceLoading && <div>Loading financial data...</div>}
        {financeError && <div className="text-red-600">Error: {financeError.message}</div>}
        {financeData && <div>Transactions: {financeData.transactions?.length || 0}</div>}
        {renderPerformanceMetrics(financeMetrics, 'Finance')}
      </div>

      {/* Fleet Query */}
      <div className="border rounded p-4">
        <h3 className="font-semibold mb-2">Fleet Query</h3>
        {isFleetLoading && <div>Loading fleet data...</div>}
        {fleetError && <div className="text-red-600">Error: {fleetError.message}</div>}
        {fleetData && <div>Vehicles: {fleetData.vehicles?.length || 0}</div>}
        {renderPerformanceMetrics(fleetMetrics, 'Fleet')}
      </div>

      {/* Customer Query */}
      <div className="border rounded p-4">
        <h3 className="font-semibold mb-2">Customer Query</h3>
        {isCustomerLoading && <div>Loading customers...</div>}
        {customerError && <div className="text-red-600">Error: {customerError.message}</div>}
        {customerData && <div>Customers: {customerData.customers?.length || 0}</div>}
        {renderPerformanceMetrics(customerMetrics, 'Customer')}
      </div>

      {/* Performance Summary */}
      <div className="mt-6 p-4 bg-slate-50 rounded">
        <h3 className="font-semibold mb-2">Performance Summary</h3>
        <div className="text-sm text-slate-600">
          <p>• All queries are now monitored for performance</p>
          <p>• Cache hit rates are tracked to validate optimization effectiveness</p>
          <p>• Slow queries are automatically identified and logged</p>
          <p>• Performance metrics can be cleared individually</p>
        </div>
      </div>
    </div>
  );
};

export default MonitoredQueryExample;