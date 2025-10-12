-- =====================================================
-- Audit Logs Table for Security and Compliance
-- Created: 2025-09-01
-- Description: Comprehensive audit trail for all sensitive operations
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- AUDIT LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  entity_type VARCHAR(100),
  entity_id UUID,
  action VARCHAR(200) NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_success ON audit_logs(success) WHERE success = FALSE;

-- Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Company admins can view their company's audit logs
CREATE POLICY "Company admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Policy: System can insert audit logs (no direct user inserts in UI)
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- Policy: No updates or deletes (immutable audit trail)
CREATE POLICY "Audit logs are immutable"
  ON audit_logs FOR UPDATE
  USING (false);

CREATE POLICY "Audit logs cannot be deleted"
  ON audit_logs FOR DELETE
  USING (false);

-- =====================================================
-- FUNCTION: Auto-capture IP address
-- =====================================================
CREATE OR REPLACE FUNCTION set_audit_log_ip()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to get IP from request headers (set by Supabase Edge Functions)
  IF NEW.ip_address IS NULL THEN
    NEW.ip_address := inet(current_setting('request.headers', true)::json->>'x-forwarded-for');
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- If unable to get IP, continue without it
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_audit_log_ip
  BEFORE INSERT ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION set_audit_log_ip();

-- =====================================================
-- FUNCTION: Query audit logs with filters
-- =====================================================
CREATE OR REPLACE FUNCTION get_audit_logs(
  p_company_id UUID,
  p_start_date TIMESTAMP DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMP DEFAULT NOW(),
  p_event_type VARCHAR DEFAULT NULL,
  p_severity VARCHAR DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
) RETURNS TABLE (
  id UUID,
  event_type VARCHAR,
  severity VARCHAR,
  user_id UUID,
  user_email VARCHAR,
  action VARCHAR,
  entity_type VARCHAR,
  entity_id UUID,
  details JSONB,
  success BOOLEAN,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.event_type,
    al.severity,
    al.user_id,
    au.email as user_email,
    al.action,
    al.entity_type,
    al.entity_id,
    al.details,
    al.success,
    al.created_at
  FROM audit_logs al
  LEFT JOIN auth.users au ON al.user_id = au.id
  WHERE al.company_id = p_company_id
    AND al.created_at BETWEEN p_start_date AND p_end_date
    AND (p_event_type IS NULL OR al.event_type = p_event_type)
    AND (p_severity IS NULL OR al.severity = p_severity)
    AND (p_user_id IS NULL OR al.user_id = p_user_id)
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Get audit summary
-- =====================================================
CREATE OR REPLACE FUNCTION get_audit_summary(
  p_company_id UUID,
  p_days INTEGER DEFAULT 30
) RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_events', COUNT(*),
    'failed_operations', COUNT(*) FILTER (WHERE success = FALSE),
    'critical_events', COUNT(*) FILTER (WHERE severity = 'critical'),
    'events_by_type', (
      SELECT json_object_agg(event_type, count)
      FROM (
        SELECT event_type, COUNT(*) as count
        FROM audit_logs
        WHERE company_id = p_company_id
          AND created_at >= NOW() - (p_days || ' days')::INTERVAL
        GROUP BY event_type
      ) types
    ),
    'events_by_severity', (
      SELECT json_object_agg(severity, count)
      FROM (
        SELECT severity, COUNT(*) as count
        FROM audit_logs
        WHERE company_id = p_company_id
          AND created_at >= NOW() - (p_days || ' days')::INTERVAL
        GROUP BY severity
      ) severities
    )
  ) INTO v_result
  FROM audit_logs
  WHERE company_id = p_company_id
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all sensitive operations in the system';
COMMENT ON COLUMN audit_logs.event_type IS 'Type of event (user_login, payment_created, etc.)';
COMMENT ON COLUMN audit_logs.severity IS 'Severity level: low, medium, high, critical';
COMMENT ON COLUMN audit_logs.details IS 'Additional contextual information in JSON format';
COMMENT ON COLUMN audit_logs.success IS 'Whether the operation succeeded';

COMMENT ON FUNCTION get_audit_logs IS 'Retrieve audit logs with optional filters';
COMMENT ON FUNCTION get_audit_summary IS 'Get aggregated audit statistics for a company';
