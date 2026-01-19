-- API Monitoring Database Schema
-- Migration: 2025-01-20-api-monitoring-schema.sql
-- Purpose: Create tables for comprehensive API monitoring

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- API Metrics table for aggregated performance data
CREATE TABLE IF NOT EXISTS api_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint_path VARCHAR(500) NOT NULL,
    method VARCHAR(10) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    time_window VARCHAR(10) NOT NULL CHECK (time_window IN ('1m', '5m', '15m', '30m', '1h', '6h', '12h', '24h')),

    -- Request metrics
    total_requests INTEGER NOT NULL DEFAULT 0,
    successful_requests INTEGER NOT NULL DEFAULT 0,
    failed_requests INTEGER NOT NULL DEFAULT 0,

    -- Response time metrics (in milliseconds)
    average_response_time DECIMAL(10,2),
    p95_response_time DECIMAL(10,2),
    p99_response_time DECIMAL(10,2),
    min_response_time DECIMAL(10,2),
    max_response_time DECIMAL(10,2),

    -- Error metrics
    error_rate DECIMAL(5,4) CHECK (error_rate >= 0 AND error_rate <= 1),

    -- Performance metrics
    throughput DECIMAL(10,2), -- requests per minute
    data_transferred BIGINT DEFAULT 0, -- bytes

    -- Error breakdown (JSON)
    errors_by_category JSONB DEFAULT '{}',
    errors_by_status JSONB DEFAULT '{}',

    -- Metadata
    company_id UUID REFERENCES companies(id),
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Requests detailed log table
CREATE TABLE IF NOT EXISTS api_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id VARCHAR(100) UNIQUE NOT NULL,

    -- Request details
    method VARCHAR(10) NOT NULL,
    url VARCHAR(1000) NOT NULL,
    headers JSONB DEFAULT '{}',
    query_params JSONB DEFAULT '{}',
    body JSONB,
    user_agent TEXT,
    ip_address INET,

    -- Authentication context
    user_id UUID REFERENCES auth.users(id),
    company_id UUID REFERENCES companies(id),
    session_id VARCHAR(255),
    role VARCHAR(50),

    -- Timing
    request_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Responses detailed log table
CREATE TABLE IF NOT EXISTS api_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES api_requests(request_id) ON DELETE CASCADE,

    -- Response details
    status_code INTEGER NOT NULL,
    headers JSONB DEFAULT '{}',
    body JSONB,
    response_time INTEGER NOT NULL, -- milliseconds
    response_size BIGINT DEFAULT 0, -- bytes

    -- Error details
    error_type VARCHAR(50),
    error_message TEXT,
    error_category VARCHAR(50),
    error_severity VARCHAR(20) CHECK (error_severity IN ('low', 'medium', 'high', 'critical')),
    stack_trace TEXT,

    -- Timing
    response_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Alerts table for tracking system alerts
CREATE TABLE IF NOT EXISTS api_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id VARCHAR(100) NOT NULL,

    -- Alert details
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}',

    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'suppressed')),

    -- Timing
    triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,

    -- User actions
    acknowledged_by UUID REFERENCES auth.users(id),
    resolved_by UUID REFERENCES auth.users(id),
    notes TEXT,

    -- Context
    endpoint_path VARCHAR(500),
    method VARCHAR(10),
    company_id UUID REFERENCES companies(id),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rate Limiting table for tracking rate limit violations
CREATE TABLE IF NOT EXISTS api_rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Rate limit details
    identifier VARCHAR(255) NOT NULL, -- IP address, user ID, or API key
    identifier_type VARCHAR(50) NOT NULL CHECK (identifier_type IN ('ip', 'user_id', 'api_key', 'session')),

    -- Request context
    endpoint_path VARCHAR(500),
    method VARCHAR(10),
    company_id UUID REFERENCES companies(id),

    -- Rate limit info
    limit_type VARCHAR(50) NOT NULL, -- 'requests_per_minute', 'requests_per_hour', etc.
    limit_value INTEGER NOT NULL,
    current_count INTEGER NOT NULL,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    window_end TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Violation tracking
    is_violation BOOLEAN NOT NULL DEFAULT FALSE,
    blocked_until TIMESTAMP WITH TIME ZONE,
    violation_count INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Performance Reports table
CREATE TABLE IF NOT EXISTS api_performance_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Report details
    report_name VARCHAR(255) NOT NULL,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly', 'custom')),

    -- Time range
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Report data
    summary JSONB NOT NULL,
    endpoint_breakdown JSONB DEFAULT '{}',
    error_analysis JSONB DEFAULT '{}',
    performance_trends JSONB DEFAULT '{}',
    recommendations JSONB DEFAULT '{}',

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed')),

    -- Context
    company_id UUID REFERENCES companies(id),
    generated_by UUID REFERENCES auth.users(id),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Slow Queries table for tracking performance issues
CREATE TABLE IF NOT EXISTS api_slow_queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Query details
    endpoint_path VARCHAR(500) NOT NULL,
    method VARCHAR(10) NOT NULL,
    query_type VARCHAR(50), -- 'database_query', 'external_api', 'internal_processing'

    -- Performance metrics
    response_time INTEGER NOT NULL, -- milliseconds
    threshold_ms INTEGER NOT NULL, -- What was considered slow
    frequency INTEGER DEFAULT 1, -- How many times this occurred

    -- Query details
    query_text TEXT,
    parameters JSONB DEFAULT '{}',
    stack_trace TEXT,

    -- Context
    user_id UUID REFERENCES auth.users(id),
    company_id UUID REFERENCES companies(id),
    first_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'investigating', 'resolved', 'false_positive')),

    -- Resolution details
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id),
    resolution_notes TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Usage Patterns table for business analytics
CREATE TABLE IF NOT EXISTS api_usage_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Pattern details
    pattern_type VARCHAR(50) NOT NULL CHECK (pattern_type IN ('hourly', 'daily', 'weekly', 'monthly', 'user_behavior', 'endpoint_usage')),

    -- Time period
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Pattern data
    pattern_data JSONB NOT NULL,
    metrics JSONB DEFAULT '{}',

    -- Context
    company_id UUID REFERENCES companies(id),
    user_id UUID REFERENCES auth.users(id),
    endpoint_path VARCHAR(500),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance

-- api_metrics indexes
CREATE INDEX IF NOT EXISTS idx_api_metrics_endpoint_time ON api_metrics(endpoint_path, method, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_metrics_time_window ON api_metrics(time_window, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_metrics_company_id ON api_metrics(company_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_metrics_created_at ON api_metrics(created_at DESC);

-- api_requests indexes
CREATE INDEX IF NOT EXISTS idx_api_requests_request_id ON api_requests(request_id);
CREATE INDEX IF NOT EXISTS idx_api_requests_endpoint_user ON api_requests(method, url, user_id, request_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_requests_timestamp ON api_requests(request_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_requests_company_id ON api_requests(company_id, request_timestamp DESC);

-- api_responses indexes
CREATE INDEX IF NOT EXISTS idx_api_responses_request_id ON api_responses(request_id);
CREATE INDEX IF NOT EXISTS idx_api_responses_status_time ON api_responses(status_code, response_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_responses_response_time ON api_responses(response_time DESC);
CREATE INDEX IF NOT EXISTS idx_api_responses_error_type ON api_responses(error_type, response_timestamp DESC);

-- api_alerts indexes
CREATE INDEX IF NOT EXISTS idx_api_alerts_status ON api_alerts(status, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_alerts_severity ON api_alerts(severity, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_alerts_company ON api_alerts(company_id, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_alerts_endpoint ON api_alerts(endpoint_path, method, triggered_at DESC);

-- api_rate_limits indexes
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON api_rate_limits(identifier, identifier_type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON api_rate_limits(window_start, window_end);
CREATE INDEX IF NOT EXISTS idx_rate_limits_violation ON api_rate_limits(is_violation, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limits_company ON api_rate_limits(company_id, created_at DESC);

-- api_performance_reports indexes
CREATE INDEX IF NOT EXISTS idx_reports_company_type ON api_performance_reports(company_id, report_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status ON api_performance_reports(status, created_at DESC);

-- api_slow_queries indexes
CREATE INDEX IF NOT EXISTS idx_slow_queries_endpoint ON api_slow_queries(endpoint_path, method, response_time DESC);
CREATE INDEX IF NOT EXISTS idx_slow_queries_status ON api_slow_queries(status, last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_slow_queries_company ON api_slow_queries(company_id, created_at DESC);

-- api_usage_patterns indexes
CREATE INDEX IF NOT EXISTS idx_usage_patterns_type_time ON api_usage_patterns(pattern_type, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_usage_patterns_company ON api_usage_patterns(company_id, pattern_type, period_start DESC);

-- Create RLS policies for security

-- Enable RLS on all tables
ALTER TABLE api_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_performance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_slow_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_patterns ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can see their own data and company data
CREATE POLICY "Users can view own company monitoring data" ON api_metrics
    FOR SELECT USING (
        company_id IS NULL OR
        company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can view own requests" ON api_requests
    FOR SELECT USING (
        user_id = auth.uid() OR
        company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can view responses for their requests" ON api_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM api_requests ar
            WHERE ar.request_id = api_responses.request_id
            AND (ar.user_id = auth.uid() OR ar.company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid()))
        )
    );

-- Service role can insert monitoring data (for background processes)
CREATE POLICY "Service role can insert metrics" ON api_metrics
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can insert requests" ON api_requests
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can insert responses" ON api_responses
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Admin users can manage alerts and reports
CREATE POLICY "Admin users can manage alerts" ON api_alerts
    FOR ALL USING (
        company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admin users can manage reports" ON api_performance_reports
    FOR ALL USING (
        company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- Create partitions for large tables (if needed)
-- This helps with performance for high-volume monitoring data

-- Partition api_requests by date (monthly partitions)
-- Note: This is optional and should be implemented based on actual data volume

-- Create function for automatic data cleanup
CREATE OR REPLACE FUNCTION cleanup_old_monitoring_data()
RETURNS void AS $$
DECLARE
    retention_days INTEGER := 30; -- Default retention period
BEGIN
    -- Get retention period from settings or use default
    SELECT COALESCE(setting_value::INTEGER, 30)
    INTO retention_days
    FROM app_settings
    WHERE setting_key = 'api_monitoring_retention_days';

    -- Delete old request/response logs
    DELETE FROM api_requests
    WHERE request_timestamp < NOW() - INTERVAL '1 day' * retention_days;

    DELETE FROM api_responses
    WHERE response_timestamp < NOW() - INTERVAL '1 day' * retention_days;

    -- Delete old rate limit records
    DELETE FROM api_rate_limits
    WHERE window_end < NOW() - INTERVAL '7 days';

    -- Archive old metrics (keep aggregated data longer)
    DELETE FROM api_metrics
    WHERE timestamp < NOW() - INTERVAL '90 days'
    AND time_window IN ('1m', '5m', '15m', '30m');

    RAISE NOTICE 'Cleaned up monitoring data older than % days', retention_days;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at columns
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to tables with updated_at columns
CREATE TRIGGER set_api_metrics_timestamp
    BEFORE UPDATE ON api_metrics
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_api_alerts_timestamp
    BEFORE UPDATE ON api_alerts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_api_rate_limits_timestamp
    BEFORE UPDATE ON api_rate_limits
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_api_performance_reports_timestamp
    BEFORE UPDATE ON api_performance_reports
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_api_slow_queries_timestamp
    BEFORE UPDATE ON api_slow_queries
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_api_usage_patterns_timestamp
    BEFORE UPDATE ON api_usage_patterns
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- Grant necessary permissions
GRANT SELECT, INSERT ON api_metrics TO service_role;
GRANT SELECT, INSERT ON api_requests TO service_role;
GRANT SELECT, INSERT ON api_responses TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON api_alerts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON api_rate_limits TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON api_performance_reports TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON api_slow_queries TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON api_usage_patterns TO service_role;

-- Create view for real-time API health status
CREATE OR REPLACE VIEW api_health_status AS
SELECT
    m.endpoint_path,
    m.method,
    m.time_window,
    m.total_requests,
    m.average_response_time,
    m.error_rate,
    CASE
        WHEN m.error_rate > 0.1 OR m.average_response_time > 5000 THEN 'unhealthy'
        WHEN m.error_rate > 0.05 OR m.average_response_time > 2000 THEN 'degraded'
        ELSE 'healthy'
    END as status,
    m.timestamp as last_updated,
    m.company_id
FROM api_metrics m
INNER JOIN (
    SELECT
        endpoint_path,
        method,
        company_id,
        MAX(timestamp) as max_timestamp
    FROM api_metrics
    WHERE timestamp >= NOW() - INTERVAL '1 hour'
    GROUP BY endpoint_path, method, company_id
) latest ON m.endpoint_path = latest.endpoint_path
    AND m.method = latest.method
    AND m.company_id = latest.company_id
    AND m.timestamp = latest.max_timestamp;

-- Create view for top slow queries
CREATE OR REPLACE VIEW top_slow_queries AS
SELECT
    endpoint_path,
    method,
    AVG(response_time) as avg_response_time,
    MAX(response_time) as max_response_time,
    COUNT(*) as occurrence_count,
    MAX(last_seen) as last_occurrence,
    company_id
FROM api_slow_queries
WHERE status = 'active'
GROUP BY endpoint_path, method, company_id
ORDER BY avg_response_time DESC
LIMIT 50;

-- Create view for error trends
CREATE OR REPLACE VIEW error_trends AS
SELECT
    DATE_TRUNC('hour', ar.request_timestamp) as hour,
    COUNT(*) as total_requests,
    COUNT(CASE WHEN ars.status_code >= 400 THEN 1 END) as error_requests,
    ROUND(
        COUNT(CASE WHEN ars.status_code >= 400 THEN 1 END)::DECIMAL /
        NULLIF(COUNT(*), 0) * 100, 2
    ) as error_rate_percentage,
    ar.company_id
FROM api_requests ar
LEFT JOIN api_responses ars ON ar.request_id = ars.request_id
WHERE ar.request_timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', ar.request_timestamp), ar.company_id
ORDER BY hour DESC;

-- Add comments for documentation
COMMENT ON TABLE api_metrics IS 'Aggregated API performance metrics by time window';
COMMENT ON TABLE api_requests IS 'Detailed log of all API requests';
COMMENT ON TABLE api_responses IS 'Detailed log of all API responses';
COMMENT ON TABLE api_alerts IS 'System alerts triggered by monitoring rules';
COMMENT ON TABLE api_rate_limits IS 'Rate limiting tracking and violations';
COMMENT ON TABLE api_performance_reports IS 'Generated performance reports';
COMMENT ON TABLE api_slow_queries IS 'Slow query tracking and analysis';
COMMENT ON TABLE api_usage_patterns IS 'API usage pattern analytics';

-- Create settings table for monitoring configuration
CREATE TABLE IF NOT EXISTS api_monitoring_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id),
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(20) NOT NULL CHECK (setting_type IN ('boolean', 'integer', 'string', 'json')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, setting_key)
);

-- Insert default settings
INSERT INTO api_monitoring_settings (setting_key, setting_value, setting_type, description) VALUES
('enabled', 'true', 'boolean', 'Enable API monitoring'),
('retention_days', '30', 'integer', 'Number of days to retain monitoring data'),
('slow_query_threshold', '1000', 'integer', 'Response time threshold for slow queries in milliseconds'),
('error_rate_threshold', '0.05', 'string', 'Error rate threshold for alerts (decimal)'),
('collect_request_body', 'false', 'boolean', 'Collect request body data'),
('collect_response_body', 'false', 'boolean', 'Collect response body data'),
('rate_limit_enabled', 'true', 'boolean', 'Enable rate limiting'),
('alerts_enabled', 'true', 'boolean', 'Enable monitoring alerts')
ON CONFLICT (setting_key) DO NOTHING;

-- Apply RLS to settings table
ALTER TABLE api_monitoring_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company monitoring settings" ON api_monitoring_settings
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admin users can manage monitoring settings" ON api_monitoring_settings
    FOR ALL USING (
        company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON api_monitoring_settings TO service_role;

COMMIT;