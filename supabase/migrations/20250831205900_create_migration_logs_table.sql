-- =====================================================================================
-- SECURITY AUDIT AND MONITORING SYSTEM
-- =====================================================================================
-- This migration creates comprehensive security audit logging and monitoring
-- File: 20250831205900_create_migration_logs_table.sql
-- Date: 2025-08-31
-- Purpose: Security monitoring and audit trail establishment

-- =============================================================================
-- MIGRATION LOGS TABLE
-- =============================================================================

-- Create migration tracking table
CREATE TABLE IF NOT EXISTS migration_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  migration_name TEXT NOT NULL UNIQUE,
  migration_type TEXT NOT NULL CHECK (migration_type IN ('security_optimization', 'performance_optimization', 'feature_enhancement', 'bug_fix')),
  description TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed', 'rolled_back')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  execution_time_seconds INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN completed_at IS NOT NULL AND started_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (completed_at - started_at))::INTEGER
      ELSE NULL 
    END
  ) STORED
);

-- Index for migration logs
CREATE INDEX IF NOT EXISTS idx_migration_logs_name_status 
ON migration_logs(migration_name, status);

CREATE INDEX IF NOT EXISTS idx_migration_logs_type_date 
ON migration_logs(migration_type, started_at);

-- =============================================================================
-- SECURITY AUDIT LOGS TABLE
-- =============================================================================

-- Create comprehensive security audit logging table
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'auth_failure', 
    'unauthorized_access', 
    'rate_limit_exceeded', 
    'invalid_input',
    'function_error',
    'api_error',
    'suspicious_activity',
    'data_access',
    'admin_action',
    'login_success',
    'logout',
    'password_change',
    'role_change'
  )),
  user_id UUID REFERENCES auth.users(id),
  company_id UUID REFERENCES companies(id),
  ip_address INET,
  user_agent TEXT,
  function_name TEXT,
  endpoint TEXT,
  request_method TEXT,
  request_headers JSONB,
  request_body JSONB,
  response_status INTEGER,
  details JSONB,
  success BOOLEAN NOT NULL DEFAULT false,
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for security audit logs
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_event_type_date 
ON security_audit_logs(event_type, created_at);

CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_company 
ON security_audit_logs(user_id, company_id, created_at);

CREATE INDEX IF NOT EXISTS idx_security_audit_logs_ip_date 
ON security_audit_logs(ip_address, created_at);

CREATE INDEX IF NOT EXISTS idx_security_audit_logs_risk_level 
ON security_audit_logs(risk_level, created_at)
WHERE risk_level IN ('high', 'critical');

-- =============================================================================
-- FUNCTION PERFORMANCE LOGS TABLE
-- =============================================================================

-- Create function performance tracking table
CREATE TABLE IF NOT EXISTS function_performance_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name TEXT NOT NULL,
  execution_time_ms DECIMAL NOT NULL,
  memory_usage_mb DECIMAL,
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  user_id UUID REFERENCES auth.users(id),
  company_id UUID REFERENCES companies(id),
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  query_count INTEGER DEFAULT 0,
  cache_hit_rate DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for function performance logs
CREATE INDEX IF NOT EXISTS idx_function_performance_logs_name_date 
ON function_performance_logs(function_name, created_at);

CREATE INDEX IF NOT EXISTS idx_function_performance_logs_execution_time 
ON function_performance_logs(execution_time_ms DESC, created_at)
WHERE execution_time_ms > 1000; -- Track slow functions

-- =============================================================================
-- QUERY PERFORMANCE MONITORING
-- =============================================================================

-- Enhanced query performance logs table
CREATE TABLE IF NOT EXISTS query_performance_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  execution_time_ms DECIMAL NOT NULL,
  rows_examined BIGINT,
  rows_returned BIGINT,
  index_used TEXT,
  query_plan JSONB,
  user_id UUID REFERENCES auth.users(id),
  company_id UUID REFERENCES companies(id),
  function_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for query performance logs
CREATE INDEX IF NOT EXISTS idx_query_performance_logs_type_date 
ON query_performance_logs(query_type, created_at);

CREATE INDEX IF NOT EXISTS idx_query_performance_logs_slow_queries 
ON query_performance_logs(execution_time_ms DESC, created_at)
WHERE execution_time_ms > 500;

-- =============================================================================
-- SECURITY MONITORING VIEWS
-- =============================================================================

-- View for security alerts (high-risk events)
CREATE OR REPLACE VIEW security_alerts AS
SELECT 
  event_type,
  COUNT(*) as event_count,
  ip_address,
  user_id,
  company_id,
  MAX(created_at) as last_occurrence,
  MIN(created_at) as first_occurrence,
  CASE 
    WHEN COUNT(*) > 50 THEN 'critical'
    WHEN COUNT(*) > 20 THEN 'high'
    WHEN COUNT(*) > 10 THEN 'medium'
    ELSE 'low'
  END as threat_level
FROM security_audit_logs 
WHERE created_at >= NOW() - INTERVAL '1 hour'
AND event_type IN ('auth_failure', 'unauthorized_access', 'rate_limit_exceeded')
GROUP BY event_type, ip_address, user_id, company_id
HAVING COUNT(*) > 5
ORDER BY event_count DESC;

-- View for failed authentication attempts
CREATE OR REPLACE VIEW failed_auth_summary AS
SELECT 
  ip_address,
  COUNT(*) as failure_count,
  COUNT(DISTINCT user_id) as unique_users_targeted,
  MAX(created_at) as last_attempt,
  array_agg(DISTINCT user_agent) as user_agents
FROM security_audit_logs 
WHERE event_type = 'auth_failure'
AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY ip_address
HAVING COUNT(*) > 3
ORDER BY failure_count DESC;

-- View for performance monitoring
CREATE OR REPLACE VIEW function_performance_summary AS
SELECT 
  function_name,
  COUNT(*) as total_calls,
  AVG(execution_time_ms) as avg_execution_time,
  MAX(execution_time_ms) as max_execution_time,
  MIN(execution_time_ms) as min_execution_time,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms) as p95_execution_time,
  COUNT(CASE WHEN success = false THEN 1 END) as error_count,
  ROUND((COUNT(CASE WHEN success = true THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL * 100), 2) as success_rate,
  AVG(query_count) as avg_queries_per_call
FROM function_performance_logs 
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY function_name
ORDER BY avg_execution_time DESC;

-- =============================================================================
-- AUTOMATED SECURITY MONITORING FUNCTIONS
-- =============================================================================

-- Function to check for security threats
CREATE OR REPLACE FUNCTION detect_security_threats()
RETURNS TABLE (
  threat_type TEXT,
  threat_level TEXT,
  description TEXT,
  affected_count BIGINT,
  recommendation TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check for brute force attacks
  RETURN QUERY
  SELECT 
    'brute_force_attack'::TEXT,
    'high'::TEXT,
    format('IP %s attempted %s failed logins in the last hour', ip_address, failure_count),
    failure_count,
    'Block IP address and investigate user accounts'::TEXT
  FROM failed_auth_summary
  WHERE failure_count > 10;
  
  -- Check for suspicious user activity
  RETURN QUERY
  SELECT 
    'suspicious_user_activity'::TEXT,
    threat_level,
    format('User activity shows %s events in the last hour', event_count),
    event_count,
    'Review user permissions and activity logs'::TEXT
  FROM security_alerts
  WHERE threat_level IN ('high', 'critical');
  
  -- Check for performance anomalies
  RETURN QUERY
  SELECT 
    'performance_anomaly'::TEXT,
    'medium'::TEXT,
    format('Function %s has avg execution time of %s ms', function_name, avg_execution_time),
    total_calls,
    'Investigate function performance and optimize queries'::TEXT
  FROM function_performance_summary
  WHERE avg_execution_time > 2000;
END;
$$;

-- Function to create security incident report
CREATE OR REPLACE FUNCTION create_security_incident_report(
  incident_type TEXT,
  severity TEXT,
  description TEXT,
  affected_user_id UUID DEFAULT NULL,
  affected_company_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  incident_id UUID;
BEGIN
  -- Create incident record in security audit logs
  INSERT INTO security_audit_logs (
    event_type,
    user_id,
    company_id,
    details,
    risk_level,
    success
  ) VALUES (
    'security_incident',
    affected_user_id,
    affected_company_id,
    jsonb_build_object(
      'incident_type', incident_type,
      'severity', severity,
      'description', description,
      'created_by', auth.uid(),
      'investigation_status', 'open'
    ),
    severity,
    false
  ) RETURNING id INTO incident_id;
  
  RETURN incident_id;
END;
$$;

-- =============================================================================
-- PERFORMANCE OPTIMIZATION MONITORING
-- =============================================================================

-- Function to log query performance
CREATE OR REPLACE FUNCTION log_query_performance(
  p_query_type TEXT,
  p_table_name TEXT,
  p_execution_time_ms DECIMAL,
  p_rows_examined BIGINT DEFAULT NULL,
  p_rows_returned BIGINT DEFAULT NULL,
  p_index_used TEXT DEFAULT NULL,
  p_function_name TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO query_performance_logs (
    query_type,
    table_name,
    execution_time_ms,
    rows_examined,
    rows_returned,
    index_used,
    user_id,
    company_id,
    function_name
  ) VALUES (
    p_query_type,
    p_table_name,
    p_execution_time_ms,
    p_rows_examined,
    p_rows_returned,
    p_index_used,
    auth.uid(),
    (SELECT company_id FROM profiles WHERE user_id = auth.uid()),
    p_function_name
  );
END;
$$;

-- Function to get performance metrics
CREATE OR REPLACE FUNCTION get_performance_metrics(hours_back INTEGER DEFAULT 24)
RETURNS TABLE (
  metric_type TEXT,
  metric_value DECIMAL,
  metric_unit TEXT,
  status TEXT,
  recommendation TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  avg_query_time DECIMAL;
  slow_query_count BIGINT;
  error_rate DECIMAL;
BEGIN
  -- Calculate average query time
  SELECT AVG(execution_time_ms) INTO avg_query_time
  FROM query_performance_logs 
  WHERE created_at >= NOW() - (hours_back || ' hours')::INTERVAL;
  
  -- Count slow queries
  SELECT COUNT(*) INTO slow_query_count
  FROM query_performance_logs 
  WHERE created_at >= NOW() - (hours_back || ' hours')::INTERVAL
  AND execution_time_ms > 1000;
  
  -- Calculate error rate
  SELECT 
    COALESCE(
      COUNT(CASE WHEN success = false THEN 1 END)::DECIMAL / 
      NULLIF(COUNT(*)::DECIMAL, 0) * 100, 
      0
    ) INTO error_rate
  FROM function_performance_logs 
  WHERE created_at >= NOW() - (hours_back || ' hours')::INTERVAL;
  
  -- Return metrics
  RETURN QUERY VALUES
    ('avg_query_time', COALESCE(avg_query_time, 0), 'milliseconds', 
     CASE WHEN avg_query_time < 100 THEN 'excellent' 
          WHEN avg_query_time < 500 THEN 'good' 
          ELSE 'needs_optimization' END,
     'Consider adding indexes for queries > 500ms'),
    ('slow_query_count', slow_query_count, 'count',
     CASE WHEN slow_query_count < 10 THEN 'good' ELSE 'needs_attention' END,
     'Investigate and optimize slow queries'),
    ('error_rate', error_rate, 'percentage',
     CASE WHEN error_rate < 1 THEN 'excellent'
          WHEN error_rate < 5 THEN 'acceptable'
          ELSE 'critical' END,
     'Investigate and fix error sources');
END;
$$;

-- =============================================================================
-- DATA RETENTION POLICY
-- =============================================================================

-- Function for automated log cleanup
CREATE OR REPLACE FUNCTION cleanup_audit_logs()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete security audit logs older than 90 days (except critical events)
  DELETE FROM security_audit_logs 
  WHERE created_at < NOW() - INTERVAL '90 days'
  AND risk_level NOT IN ('high', 'critical');
  
  -- Delete performance logs older than 30 days
  DELETE FROM function_performance_logs 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Delete query performance logs older than 14 days
  DELETE FROM query_performance_logs 
  WHERE created_at < NOW() - INTERVAL '14 days';
  
  -- Log cleanup activity
  INSERT INTO security_audit_logs (
    event_type,
    details,
    success
  ) VALUES (
    'admin_action',
    jsonb_build_object(
      'action', 'log_cleanup',
      'performed_by', 'system',
      'timestamp', NOW()
    ),
    true
  );
END;
$$;

-- =============================================================================
-- INITIAL DATA AND VALIDATION
-- =============================================================================

-- Insert initial migration log entry
INSERT INTO migration_logs (
  migration_name, 
  migration_type, 
  description, 
  started_at,
  completed_at,
  status,
  notes
) VALUES (
  '20250831205900_create_migration_logs_table',
  'security_optimization',
  'Created comprehensive security audit and monitoring system',
  NOW(),
  NOW(),
  'completed',
  'Successfully created all monitoring tables, views, and functions for security audit and performance tracking'
) ON CONFLICT (migration_name) DO NOTHING;