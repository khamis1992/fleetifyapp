-- Create monitoring tables for advanced monitoring system
-- Migration: 20251-20_create_monitoring_tables.sql

-- Enable RLS for all monitoring tables
ALTER TABLE IF EXISTS monitoring_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS performance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS monitoring_alerts ENABLE ROW LEVEL SECURITY;

-- Create monitoring_metrics table for system metrics
CREATE TABLE IF NOT EXISTS monitoring_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  tags JSONB DEFAULT '{}',
  context JSONB DEFAULT '{}',
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create error_logs table for enhanced error tracking
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_id TEXT UNIQUE NOT NULL, -- Fingerprint for deduplication
  error_name TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  error_type TEXT NOT NULL CHECK (error_type IN ('javascript', 'network', 'promise', 'react', 'database', 'api', 'business')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  url TEXT,
  user_agent TEXT,
  component TEXT,
  action TEXT,
  additional_data JSONB DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  occurrences INTEGER DEFAULT 1,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create performance_logs table for performance data
CREATE TABLE IF NOT EXISTS performance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation TEXT NOT NULL,
  duration NUMERIC NOT NULL, -- in milliseconds
  operation_type TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  trace_id TEXT,
  span_id TEXT,
  parent_span_id TEXT,
  tags JSONB DEFAULT '{}',
  context JSONB DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create alert_rules table for alert configurations
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL UNIQUE,
  condition JSONB NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  enabled BOOLEAN DEFAULT TRUE,
  notification_channels JSONB DEFAULT '[]',
  cooldown INTEGER NOT NULL DEFAULT 300000, -- milliseconds (5 minutes default)
  threshold NUMERIC,
  window NUMERIC, -- milliseconds
  created_by UUID REFERENCES auth.users(id),
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create monitoring_alerts table for alert history
CREATE TABLE IF NOT EXISTS monitoring_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id TEXT UNIQUE NOT NULL,
  rule_id UUID REFERENCES alert_rules(id) ON DELETE CASCADE,
  error_id TEXT REFERENCES error_logs(error_id),
  metric_id UUID REFERENCES monitoring_metrics(id),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  message TEXT NOT NULL,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  notifications JSONB DEFAULT '[]',
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create business_metrics table for business intelligence
CREATE TABLE IF NOT EXISTS business_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('fleet', 'financial', 'user', 'operational')),
  dimensions JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  tags JSONB DEFAULT '{}',
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create system_health table for health checks
CREATE TABLE IF NOT EXISTS system_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
  response_time NUMERIC, -- in milliseconds
  last_check TIMESTAMPTZ DEFAULT NOW(),
  details JSONB DEFAULT '{}',
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create database_performance table for database monitoring
CREATE TABLE IF NOT EXISTS database_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT NOT NULL,
  query_text TEXT NOT NULL,
  duration NUMERIC NOT NULL, -- in milliseconds
  row_count INTEGER,
  index_used TEXT,
  locks_acquired INTEGER DEFAULT 0,
  memory_used INTEGER, -- in bytes
  execution_plan JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_timestamp ON monitoring_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_name_timestamp ON monitoring_metrics(metric_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_company ON monitoring_metrics(company_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity, last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved, last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_component ON error_logs(component, last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_company ON error_logs(company_id, last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_id ON error_logs(error_id);

CREATE INDEX IF NOT EXISTS idx_performance_logs_timestamp ON performance_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_logs_operation ON performance_logs(operation, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_logs_duration ON performance_logs(duration DESC);
CREATE INDEX IF NOT EXISTS idx_performance_logs_company ON performance_logs(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON alert_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_alert_rules_company ON alert_rules(company_id);

CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_timestamp ON monitoring_alerts(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_severity ON monitoring_alerts(severity, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_resolved ON monitoring_alerts(resolved, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_company ON monitoring_alerts(company_id, triggered_at DESC);

CREATE INDEX IF NOT EXISTS idx_business_metrics_timestamp ON business_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_business_metrics_category ON business_metrics(category, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_business_metrics_company ON business_metrics(company_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_system_health_service ON system_health(service_name, last_check DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_status ON system_health(status, last_check DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_company ON system_health(company_id, last_check DESC);

CREATE INDEX IF NOT EXISTS idx_database_performance_timestamp ON database_performance(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_database_performance_duration ON database_performance(duration DESC);
CREATE INDEX IF NOT EXISTS idx_database_performance_query_hash ON database_performance(query_hash, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_database_performance_company ON database_performance(company_id, timestamp DESC);

-- Create RLS policies

-- Monitoring metrics policies
CREATE POLICY "Users can view their company's monitoring metrics" ON monitoring_metrics
  FOR SELECT USING (company_id = auth.company_id());

CREATE POLICY "Service accounts can insert monitoring metrics" ON monitoring_metrics
  FOR INSERT WITH CHECK (company_id = auth.company_id());

-- Error logs policies
CREATE POLICY "Users can view their company's error logs" ON error_logs
  FOR SELECT USING (company_id = auth.company_id());

CREATE POLICY "Service accounts can insert error logs" ON error_logs
  FOR INSERT WITH CHECK (company_id = auth.company_id());

CREATE POLICY "Admin users can update error logs" ON error_logs
  FOR UPDATE USING (
    company_id = auth.company_id() AND
    EXISTS (
      SELECT 1 FROM user_permissions
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Performance logs policies
CREATE POLICY "Users can view their company's performance logs" ON performance_logs
  FOR SELECT USING (company_id = auth.company_id());

CREATE POLICY "Service accounts can insert performance logs" ON performance_logs
  FOR INSERT WITH CHECK (company_id = auth.company_id());

-- Alert rules policies
CREATE POLICY "Users can view their company's alert rules" ON alert_rules
  FOR SELECT USING (company_id = auth.company_id());

CREATE POLICY "Admin users can manage alert rules" ON alert_rules
  FOR ALL USING (
    company_id = auth.company_id() AND
    EXISTS (
      SELECT 1 FROM user_permissions
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Monitoring alerts policies
CREATE POLICY "Users can view their company's monitoring alerts" ON monitoring_alerts
  FOR SELECT USING (company_id = auth.company_id());

CREATE POLICY "Service accounts can insert monitoring alerts" ON monitoring_alerts
  FOR INSERT WITH CHECK (company_id = auth.company_id());

CREATE POLICY "Admin users can update monitoring alerts" ON monitoring_alerts
  FOR UPDATE USING (
    company_id = auth.company_id() AND
    EXISTS (
      SELECT 1 FROM user_permissions
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Business metrics policies
CREATE POLICY "Users can view their company's business metrics" ON business_metrics
  FOR SELECT USING (company_id = auth.company_id());

CREATE POLICY "Service accounts can insert business metrics" ON business_metrics
  FOR INSERT WITH CHECK (company_id = auth.company_id());

-- System health policies
CREATE POLICY "Users can view their company's system health" ON system_health
  FOR SELECT USING (company_id = auth.company_id());

CREATE POLICY "Service accounts can insert system health" ON system_health
  FOR INSERT WITH CHECK (company_id = auth.company_id());

-- Database performance policies
CREATE POLICY "Users can view their company's database performance" ON database_performance
  FOR SELECT USING (company_id = auth.company_id());

CREATE POLICY "Service accounts can insert database performance" ON database_performance
  FOR INSERT WITH CHECK (company_id = auth.company_id());

-- Create stored procedures for metrics aggregation
CREATE OR REPLACE FUNCTION aggregate_metrics_by_hour(
  p_company_id UUID,
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  hour TIMESTAMPTZ,
  metric_name TEXT,
  avg_value NUMERIC,
  min_value NUMERIC,
  max_value NUMERIC,
  count_records BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    date_trunc('hour', timestamp) as hour,
    metric_name,
    AVG(metric_value) as avg_value,
    MIN(metric_value) as min_value,
    MAX(metric_value) as max_value,
    COUNT(*) as count_records
  FROM monitoring_metrics
  WHERE company_id = p_company_id
    AND timestamp >= NOW() - INTERVAL '1 hour' * p_hours
  GROUP BY date_trunc('hour', timestamp), metric_name
  ORDER BY hour DESC, metric_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create stored procedure for error trends
CREATE OR REPLACE FUNCTION get_error_trends(
  p_company_id UUID,
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  hour TIMESTAMPTZ,
  total_errors BIGINT,
  critical_errors BIGINT,
  high_errors BIGINT,
  medium_errors BIGINT,
  low_errors BIGINT,
  resolved_errors BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    date_trunc('hour', last_seen) as hour,
    COUNT(*) as total_errors,
    COUNT(*) FILTER (WHERE severity = 'critical') as critical_errors,
    COUNT(*) FILTER (WHERE severity = 'high') as high_errors,
    COUNT(*) FILTER (WHERE severity = 'medium') as medium_errors,
    COUNT(*) FILTER (WHERE severity = 'low') as low_errors,
    COUNT(*) FILTER (WHERE resolved = true) as resolved_errors
  FROM error_logs
  WHERE company_id = p_company_id
    AND last_seen >= NOW() - INTERVAL '1 hour' * p_hours
  GROUP BY date_trunc('hour', last_seen)
  ORDER BY hour DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create stored procedure for database performance analysis
CREATE OR REPLACE FUNCTION get_slow_queries(
  p_company_id UUID,
  p_min_duration INTEGER DEFAULT 1000,
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  query_hash TEXT,
  avg_duration NUMERIC,
  max_duration NUMERIC,
  execution_count BIGINT,
  avg_rows NUMERIC,
  query_sample TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    query_hash,
    AVG(duration) as avg_duration,
    MAX(duration) as max_duration,
    COUNT(*) as execution_count,
    AVG(row_count) as avg_rows,
    SUBSTRING(query_text, 1, 200) as query_sample
  FROM database_performance
  WHERE company_id = p_company_id
    AND duration >= p_min_duration
    AND timestamp >= NOW() - INTERVAL '1 hour' * p_hours
  GROUP BY query_hash
  ORDER BY avg_duration DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create automated cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_monitoring_data()
RETURNS void AS $$
BEGIN
  -- Delete monitoring metrics older than 30 days
  DELETE FROM monitoring_metrics
  WHERE timestamp < NOW() - INTERVAL '30 days';

  -- Delete resolved error logs older than 90 days
  DELETE FROM error_logs
  WHERE resolved = true
    AND resolved_at < NOW() - INTERVAL '90 days';

  -- Delete performance logs older than 7 days
  DELETE FROM performance_logs
  WHERE created_at < NOW() - INTERVAL '7 days';

  -- Delete monitoring alerts older than 30 days
  DELETE FROM monitoring_alerts
  WHERE created_at < NOW() - INTERVAL '30 days';

  -- Delete system health records older than 7 days
  DELETE FROM system_health
  WHERE last_check < NOW() - INTERVAL '7 days';

  -- Delete business metrics older than 90 days
  DELETE FROM business_metrics
  WHERE timestamp < NOW() - INTERVAL '90 days';

  -- Delete database performance records older than 7 days
  DELETE FROM database_performance
  WHERE timestamp < NOW() - INTERVAL '7 days';

  RAISE NOTICE 'Monitoring data cleanup completed';
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT, INSERT ON monitoring_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE ON error_logs TO authenticated;
GRANT SELECT, INSERT ON performance_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON alert_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE ON monitoring_alerts TO authenticated;
GRANT SELECT, INSERT ON business_metrics TO authenticated;
GRANT SELECT, INSERT ON system_health TO authenticated;
GRANT SELECT, INSERT ON database_performance TO authenticated;

GRANT EXECUTE ON FUNCTION aggregate_metrics_by_hour TO authenticated;
GRANT EXECUTE ON FUNCTION get_error_trends TO authenticated;
GRANT EXECUTE ON FUNCTION get_slow_queries TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_monitoring_data TO authenticated;

-- Create initial alert rules for common scenarios
INSERT INTO alert_rules (rule_name, condition, severity, enabled, notification_channels, threshold, window)
VALUES
  ('Critical Error Alert', 'severity = "critical"', 'critical', true, '["email", "slack"]', 1, 300000),
  ('High Error Rate', 'error_rate > 0.05', 'error', true, '["email"]', 5, 300000),
  ('API Response Time', 'avg_response_time > 5000', 'warning', true, '["email"]', 5000, 300000),
  ('Memory Usage High', 'memory_usage > 85', 'warning', true, '["slack"]', 85, 300000),
  ('Database Slow Query', 'query_duration > 2000', 'warning', true, '["email"]', 2000, 300000)
ON CONFLICT (rule_name) DO NOTHING;