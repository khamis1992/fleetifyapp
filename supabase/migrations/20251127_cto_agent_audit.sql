-- ============================================
-- CTO Agent Audit Trail Schema
-- FleetifyApp Quality & Compliance Tracking
-- Created: 2025-11-27
-- ============================================

-- Main audit log table
CREATE TABLE IF NOT EXISTS cto_agent_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Context
  repo TEXT NOT NULL DEFAULT 'fleetifyapp',
  run_id TEXT NOT NULL,
  pr_number INTEGER,
  branch TEXT,
  commit_sha TEXT,
  actor TEXT NOT NULL,
  
  -- Decision
  stage TEXT NOT NULL, -- lint, typecheck, tests, coverage, security, build, deploy_gate
  status TEXT NOT NULL CHECK (status IN ('pass', 'fail', 'waived', 'skipped')),
  severity TEXT CHECK (severity IN ('critical', 'warning', 'info')),
  
  -- Details
  details JSONB NOT NULL DEFAULT '{}',
  metrics JSONB DEFAULT '{}',
  violations JSONB DEFAULT '[]',
  
  -- Waiver info (if applicable)
  waiver_reason TEXT,
  waiver_expires_at TIMESTAMPTZ,
  waiver_approved_by TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_ms INTEGER,
  
  -- Multi-tenant support
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_cto_audit_run_id ON cto_agent_audit(run_id);
CREATE INDEX IF NOT EXISTS idx_cto_audit_stage ON cto_agent_audit(stage);
CREATE INDEX IF NOT EXISTS idx_cto_audit_status ON cto_agent_audit(status);
CREATE INDEX IF NOT EXISTS idx_cto_audit_created_at ON cto_agent_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cto_audit_pr_number ON cto_agent_audit(pr_number);
CREATE INDEX IF NOT EXISTS idx_cto_audit_company_id ON cto_agent_audit(company_id);

-- Deploy gate tracking
CREATE TABLE IF NOT EXISTS cto_deploy_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  run_id TEXT NOT NULL UNIQUE,
  environment TEXT NOT NULL CHECK (environment IN ('development', 'staging', 'production')),
  
  -- Gate status
  gate_status TEXT NOT NULL CHECK (gate_status IN ('pending', 'approved', 'rejected', 'bypassed')),
  
  -- Checks summary
  lint_passed BOOLEAN NOT NULL DEFAULT FALSE,
  typecheck_passed BOOLEAN NOT NULL DEFAULT FALSE,
  tests_passed BOOLEAN NOT NULL DEFAULT FALSE,
  coverage_passed BOOLEAN NOT NULL DEFAULT FALSE,
  security_passed BOOLEAN NOT NULL DEFAULT FALSE,
  build_passed BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Metrics
  coverage_percent DECIMAL(5,2),
  bundle_size_kb INTEGER,
  build_time_seconds INTEGER,
  
  -- Actor
  triggered_by TEXT NOT NULL,
  approved_by TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  deployed_at TIMESTAMPTZ,
  
  -- Notes
  rejection_reason TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_deploy_gates_run_id ON cto_deploy_gates(run_id);
CREATE INDEX IF NOT EXISTS idx_deploy_gates_environment ON cto_deploy_gates(environment);
CREATE INDEX IF NOT EXISTS idx_deploy_gates_status ON cto_deploy_gates(gate_status);

-- Waivers table for temporary exceptions
CREATE TABLE IF NOT EXISTS cto_waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What's being waived
  rule_id TEXT NOT NULL, -- e.g., R001, R004
  rule_name TEXT NOT NULL,
  
  -- Context
  pr_number INTEGER,
  branch TEXT,
  
  -- Waiver details
  reason TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  approved_by TEXT,
  
  -- Validity
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'used')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_in_run_id TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waivers_rule_id ON cto_waivers(rule_id);
CREATE INDEX IF NOT EXISTS idx_waivers_status ON cto_waivers(status);
CREATE INDEX IF NOT EXISTS idx_waivers_expires_at ON cto_waivers(expires_at);

-- Quality metrics aggregation (daily snapshots)
CREATE TABLE IF NOT EXISTS cto_quality_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  metric_date DATE NOT NULL,
  
  -- Code quality
  avg_coverage DECIMAL(5,2),
  total_violations INTEGER DEFAULT 0,
  critical_violations INTEGER DEFAULT 0,
  warning_violations INTEGER DEFAULT 0,
  
  -- Deployment
  total_deploys INTEGER DEFAULT 0,
  successful_deploys INTEGER DEFAULT 0,
  failed_deploys INTEGER DEFAULT 0,
  blocked_deploys INTEGER DEFAULT 0,
  
  -- Build
  avg_build_time_seconds INTEGER,
  avg_bundle_size_kb INTEGER,
  
  -- PR metrics
  total_prs INTEGER DEFAULT 0,
  merged_prs INTEGER DEFAULT 0,
  avg_pr_review_hours DECIMAL(5,2),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(metric_date)
);

CREATE INDEX IF NOT EXISTS idx_quality_metrics_date ON cto_quality_metrics(metric_date DESC);

-- ============================================
-- Views for easy querying
-- ============================================

-- Recent failed checks
CREATE OR REPLACE VIEW v_recent_failures AS
SELECT 
  id,
  run_id,
  pr_number,
  stage,
  actor,
  details,
  violations,
  created_at
FROM cto_agent_audit
WHERE status = 'fail'
ORDER BY created_at DESC
LIMIT 50;

-- Pending waivers
CREATE OR REPLACE VIEW v_pending_waivers AS
SELECT 
  id,
  rule_id,
  rule_name,
  reason,
  requested_by,
  expires_at,
  created_at
FROM cto_waivers
WHERE status = 'pending'
ORDER BY created_at DESC;

-- Deploy readiness check
CREATE OR REPLACE VIEW v_deploy_readiness AS
SELECT 
  run_id,
  environment,
  gate_status,
  lint_passed AND typecheck_passed AND tests_passed AND coverage_passed AND security_passed AND build_passed AS all_checks_passed,
  coverage_percent,
  bundle_size_kb,
  triggered_by,
  created_at
FROM cto_deploy_gates
ORDER BY created_at DESC
LIMIT 20;

-- ============================================
-- Functions
-- ============================================

-- Function to check if deploy is allowed
CREATE OR REPLACE FUNCTION check_deploy_allowed(p_run_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_gate_status TEXT;
  v_all_passed BOOLEAN;
BEGIN
  SELECT 
    gate_status,
    lint_passed AND typecheck_passed AND tests_passed AND coverage_passed AND security_passed AND build_passed
  INTO v_gate_status, v_all_passed
  FROM cto_deploy_gates
  WHERE run_id = p_run_id;
  
  IF NOT FOUND THEN
    RETURN FALSE; -- No gate record = not allowed
  END IF;
  
  RETURN v_gate_status = 'approved' AND v_all_passed;
END;
$$;

-- Function to log audit entry
CREATE OR REPLACE FUNCTION log_cto_audit(
  p_run_id TEXT,
  p_stage TEXT,
  p_status TEXT,
  p_actor TEXT,
  p_details JSONB DEFAULT '{}',
  p_severity TEXT DEFAULT 'info',
  p_pr_number INTEGER DEFAULT NULL,
  p_branch TEXT DEFAULT NULL,
  p_commit_sha TEXT DEFAULT NULL,
  p_duration_ms INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO cto_agent_audit (
    run_id, stage, status, actor, details, severity, 
    pr_number, branch, commit_sha, duration_ms
  )
  VALUES (
    p_run_id, p_stage, p_status, p_actor, p_details, p_severity,
    p_pr_number, p_branch, p_commit_sha, p_duration_ms
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Function to expire old waivers
CREATE OR REPLACE FUNCTION expire_old_waivers()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE cto_waivers
  SET status = 'expired', updated_at = NOW()
  WHERE status IN ('pending', 'approved')
    AND expires_at < NOW();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================
-- RLS Policies (if multi-tenant)
-- ============================================

-- Enable RLS on audit table
ALTER TABLE cto_agent_audit ENABLE ROW LEVEL SECURITY;

-- Policy for service role (full access)
CREATE POLICY "Service role full access to cto_agent_audit"
  ON cto_agent_audit
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy for authenticated users (read own company's data)
CREATE POLICY "Users can view their company's audit logs"
  ON cto_agent_audit
  FOR SELECT
  TO authenticated
  USING (
    company_id IS NULL 
    OR company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- Scheduled cleanup (optional - run via pg_cron)
-- ============================================

-- Delete audit logs older than 90 days
-- SELECT cron.schedule('cleanup-cto-audit', '0 3 * * 0', $$
--   DELETE FROM cto_agent_audit WHERE created_at < NOW() - INTERVAL '90 days';
-- $$);

-- ============================================
-- Sample data for testing
-- ============================================

-- INSERT INTO cto_agent_audit (run_id, stage, status, actor, details, severity)
-- VALUES 
--   ('test-run-001', 'lint', 'pass', 'developer@test.com', '{"files": 45, "errors": 0}', 'info'),
--   ('test-run-001', 'tests', 'pass', 'developer@test.com', '{"total": 120, "passed": 120}', 'info'),
--   ('test-run-001', 'coverage', 'pass', 'developer@test.com', '{"percentage": 78.5}', 'info');

COMMENT ON TABLE cto_agent_audit IS 'Tracks all CTO Agent decisions and checks for quality compliance';
COMMENT ON TABLE cto_deploy_gates IS 'Tracks deploy gate status for each CI run';
COMMENT ON TABLE cto_waivers IS 'Temporary exceptions to quality rules';
COMMENT ON TABLE cto_quality_metrics IS 'Daily aggregated quality metrics';

