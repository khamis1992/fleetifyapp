/**
 * API Monitoring System - Main Export Index
 * Central export point for the FleetifyApp API monitoring system
 */

// Core monitoring framework
export { apiMonitor, APIMonitor } from './monitor';

// Middleware and integration
export {
  createMonitoringMiddleware,
  createSupabaseMonitoringMiddleware,
  createFetchMonitor,
  setupBrowserMonitoring,
  createRateLimitMiddleware,
} from './middleware';

// Analytics and insights
export { apiAnalytics, APIMonitoringAnalytics } from './analytics';

// Integration layer
export {
  initializeAPIMonitoring,
  initializeMonitoring,
  registerFleetifyEndpoints,
  useMonitoredSupabase,
  monitoredSupabase,
  monitorAPICall,
  getMonitoringConfigFromEnv,
  shouldEnableMonitoring,
  setupDevelopmentMonitoring,
  setupProductionMonitoring,
} from './integration';

// Types
export type {
  APIRequest,
  APIResponse,
  APIMetrics,
  APIEndpoint,
  APIHealthStatus,
  PerformanceReport,
  OptimizationRecommendation,
  TimeWindow,
  ErrorCategory,
  ErrorType,
  ErrorSeverity,
  MonitoringConfig,
  RateLimitConfig,
  AlertingConfig,
  NotificationConfig,
  SlowQuery,
  ErrorPattern,
  AlertRule,
  ComponentHealth,
  EndpointReport,
  ErrorAnalysis,
  PerformanceTrend,
  CodeChange,
  ConfigChange,
  APIMetricsRow,
  APIAlertRow,
} from '@/types/api-monitoring';

// Re-export React hooks
export {
  useAPIHealth,
  useAPIMetrics,
  usePerformanceTrends,
  useAnomalyDetection,
  usePerformanceReport,
  useUsagePatterns,
  usePerformancePrediction,
  useEndpointRegistration,
  useRealTimeMonitoring,
  useMonitoringConfig,
  useRateLimitMonitoring,
  useAlerts,
  useOptimizationRecommendations,
  useMonitoringDashboard,
} from '@/hooks/useAPIMonitoring';

// Re-export React components
export { APIHealthDashboard } from '@/components/monitoring/APIHealthDashboard';
export { PerformanceMonitor } from '@/components/monitoring/PerformanceMonitor';

// Default export for easy importing
export default {
  // Core
  apiMonitor,
  initializeMonitoring,

  // Utilities
  monitorAPICall,
  shouldEnableMonitoring,

  // React hooks
  useAPIHealth,
  useAPIMetrics,
  usePerformanceMonitor: usePerformanceTrends,
};