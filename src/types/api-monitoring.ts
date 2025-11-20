/**
 * API Monitoring System Type Definitions
 * Comprehensive monitoring types for FleetifyApp API operations
 */

export interface APIMetrics {
  // Request metrics
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;

  // Error metrics
  errorRate: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsByStatus: Record<number, number>;

  // Performance metrics
  throughput: number; // requests per minute
  dataTransferred: number; // bytes

  // Time-based metrics
  timestamp: Date;
  timeWindow: TimeWindow;
}

export interface APIRequest {
  id: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
  timestamp: Date;
  userId?: string;
  companyId?: string;
  userAgent?: string;
  ipAddress?: string;
  sessionId?: string;
}

export interface APIResponse {
  requestId: string;
  statusCode: number;
  headers: Record<string, string>;
  body?: any;
  timestamp: Date;
  responseTime: number; // milliseconds
  size: number; // bytes

  // Error details
  errorType?: ErrorType;
  errorMessage?: string;
  errorCategory?: ErrorCategory;
  errorSeverity?: ErrorSeverity;
}

export interface APIEndpoint {
  path: string;
  method: string;

  // Metrics for this specific endpoint
  metrics: APIMetrics;

  // Configuration
  rateLimit?: RateLimitConfig;
  alerting?: AlertingConfig;
  monitoring?: MonitoringConfig;

  // Historical data
  hourlyMetrics: APIMetrics[];
  dailyMetrics: APIMetrics[];

  // Performance data
  slowQueries: SlowQuery[];
  errorPatterns: ErrorPattern[];

  metadata: {
    description?: string;
    owner?: string;
    lastUpdated: Date;
    version: string;
  };
}

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;

  // Intelligent rate limiting
  adaptiveThresholds?: boolean;
  userBasedLimits?: Record<string, number>; // Limits per user type
  timeBasedLimits?: Record<string, number>; // Different limits for different times

  // Abuse detection
  burstDetection?: boolean;
  suspiciousActivityThreshold?: number;
  autoBlockDuration?: number;
}

export interface AlertingConfig {
  enabled: boolean;

  // Performance alerts
  responseTimeThresholds: {
    warning: number; // ms
    critical: number; // ms
  };
  errorRateThresholds: {
    warning: number; // percentage
    critical: number; // percentage
  };

  // Volume alerts
  requestVolumeThresholds: {
    warning: number; // requests per minute
    critical: number; // requests per minute
  };

  // Custom alerts
  customRules: AlertRule[];

  // Notification settings
  notifications: NotificationConfig;

  // Quiet hours
  quietHours?: {
    start: string; // HH:MM
    end: string; // HH:MM
    timezone: string;
  };
}

export interface MonitoringConfig {
  enabled: boolean;

  // Data collection settings
  collectRequestBody: boolean;
  collectResponseBody: boolean;
  collectHeaders: boolean;
  collectUserAgent: boolean;
  collectIPAddress: boolean;

  // Sampling settings
  samplingRate: number; // 0.0 to 1.0
  sampleErrorRequests: boolean; // Always sample error requests

  // Retention settings
  retentionPeriod: number; // days
  aggregationLevel: 'raw' | 'minute' | 'hour' | 'day';

  // Performance settings
  asyncCollection: boolean;
  batchSize: number;
  flushInterval: number; // milliseconds
}

export interface SlowQuery {
  id: string;
  endpoint: string;
  method: string;
  responseTime: number;
  timestamp: Date;
  userId?: string;
  query?: string; // SQL query if applicable
  stackTrace?: string;
  frequency: number; // How often this query occurs
}

export interface ErrorPattern {
  type: ErrorType;
  category: ErrorCategory;
  pattern: string; // Error pattern or regex
  frequency: number;
  firstSeen: Date;
  lastSeen: Date;
  affectedEndpoints: string[];
  suggestedFix?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: string; // Expression language
  severity: AlertSeverity;
  enabled: boolean;

  // Notification settings
  notificationChannels: NotificationChannel[];
  cooldownPeriod: number; // minutes
  escalationRules?: EscalationRule[];

  // Metadata
  createdBy: string;
  createdAt: Date;
  lastTriggered?: Date;
}

export interface NotificationConfig {
  channels: NotificationChannel[];
  templates: NotificationTemplate[];

  // Rate limiting for notifications
  maxNotificationsPerHour: number;
  maxNotificationsPerDay: number;

  // Grouping
  groupSimilarAlerts: boolean;
  groupingWindow: number; // minutes
}

export interface NotificationChannel {
  id: string;
  type: NotificationType;
  enabled: boolean;
  config: Record<string, any>;

  // Channel-specific settings
  priority: number; // 1-10, higher = more important
  retryAttempts: number;
  retryDelay: number; // seconds
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  subject: string;
  body: string;
  variables: string[]; // Available template variables

  // Localization
  translations: Record<string, {
    subject: string;
    body: string;
  }>;
}

export interface EscalationRule {
  condition: string;
  action: EscalationAction;
  delay: number; // minutes
}

export interface APIHealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  score: number; // 0-100

  // Component health
  endpoints: Record<string, ComponentHealth>;
  database: ComponentHealth;
  externalServices: Record<string, ComponentHealth>;

  // Metrics
  uptime: number; // percentage
  avgResponseTime: number;
  errorRate: number;

  // Active issues
  activeAlerts: number;
  criticalAlerts: number;

  timestamp: Date;
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  errorRate?: number;
  lastCheck: Date;
  uptime?: number;

  // Additional context
  message?: string;
  details?: Record<string, any>;
}

export interface PerformanceReport {
  id: string;
  generatedAt: Date;
  timeRange: {
    start: Date;
    end: Date;
  };

  // Executive summary
  summary: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    uptime: number;
    score: number;
  };

  // Detailed metrics
  endpointBreakdown: EndpointReport[];
  errorAnalysis: ErrorAnalysis;
  performanceTrends: PerformanceTrend[];

  // Recommendations
  recommendations: OptimizationRecommendation[];

  // Comparative analysis
  compareToPrevious?: {
    period: string;
    changePercentage: Record<string, number>;
  };
}

export interface EndpointReport {
  endpoint: string;
  method: string;

  // Metrics
  requests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  throughput: number;

  // Ranking
  rank: {
    byRequests: number;
    byResponseTime: number;
    byErrors: number;
  };

  // Issues
  slowQueries: SlowQuery[];
  errorPatterns: ErrorPattern[];
}

export interface ErrorAnalysis {
  totalErrors: number;
  errorRate: number;

  // Breakdown by category
  byCategory: Record<ErrorCategory, {
    count: number;
    percentage: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }>;

  // Breakdown by status code
  byStatus: Record<number, number>;

  // Top errors
  topErrors: Array<{
    message: string;
    count: number;
    percentage: number;
    trend: string;
  }>;
}

export interface PerformanceTrend {
  metric: string;
  timeframe: string;
  data: Array<{
    timestamp: Date;
    value: number;
  }>;

  // Trend analysis
  trend: 'increasing' | 'decreasing' | 'stable';
  changeRate: number; // percentage
  significance: 'high' | 'medium' | 'low';
}

export interface OptimizationRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category: 'performance' | 'security' | 'reliability' | 'cost';

  title: string;
  description: string;

  // Impact assessment
  impact: {
    performance: number; // percentage improvement
    reliability: number; // percentage improvement
    cost: number; // cost savings percentage
  };

  // Implementation details
  effort: 'low' | 'medium' | 'high';
  estimatedTime: string; // implementation time
  complexity: number; // 1-10

  // Specific recommendations
  endpoints: string[];
  codeChanges?: CodeChange[];
  configurationChanges?: ConfigChange[];

  // Evidence
  evidence: {
    metric: string;
    currentValue: number;
    targetValue: number;
    confidence: number; // 0-100
  }[];

  // Metadata
  generatedAt: Date;
  validUntil: Date;
}

export interface CodeChange {
  file: string;
  line?: number;
  change: string;
  reason: string;
}

export interface ConfigChange {
  file: string;
  key: string;
  currentValue: any;
  recommendedValue: any;
  reason: string;
}

// Enums and union types
export type ErrorCategory =
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'not_found'
  | 'server_error'
  | 'timeout'
  | 'rate_limit'
  | 'external_service'
  | 'database'
  | 'network'
  | 'unknown';

export type ErrorType =
  | 'HTTP_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'DATABASE_ERROR'
  | 'EXTERNAL_SERVICE_ERROR'
  | 'UNKNOWN_ERROR';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export type TimeWindow = '1m' | '5m' | '15m' | '30m' | '1h' | '6h' | '12h' | '24h';

export type NotificationType =
  | 'email'
  | 'slack'
  | 'webhook'
  | 'sms'
  | 'push'
  | 'in_app';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export type EscalationAction =
  | 'notify_manager'
  | 'notify_oncall'
  | 'create_incident'
  | 'trigger_rollback'
  | 'enable_maintenance_mode';

// Database table types
export interface APIMetricsRow {
  id: string;
  endpoint_path: string;
  method: string;
  timestamp: Date;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  average_response_time: number;
  p95_response_time: number;
  p99_response_time: number;
  error_rate: number;
  throughput: number;
  data_transferred: number;
  time_window: string;
  company_id?: string;
  created_at: Date;
}

export interface APIAlertRow {
  id: string;
  rule_id: string;
  severity: string;
  message: string;
  details: Record<string, any>;
  status: 'active' | 'acknowledged' | 'resolved';
  triggered_at: Date;
  acknowledged_at?: Date;
  resolved_at?: Date;
  acknowledged_by?: string;
  company_id?: string;
  created_at: Date;
  updated_at: Date;
}