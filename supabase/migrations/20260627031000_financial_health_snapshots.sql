-- Daily financial health snapshots for CI/CD and operational monitoring.

CREATE TABLE IF NOT EXISTS public.financial_health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT NOT NULL DEFAULT 'finance_ci'
    CHECK (source IN ('finance_ci', 'scheduled_check', 'manual_check')),
  status TEXT NOT NULL
    CHECK (status IN ('healthy', 'warning', 'critical', 'unknown')),
  checked_companies INTEGER NOT NULL DEFAULT 0 CHECK (checked_companies >= 0),
  critical_issues INTEGER NOT NULL DEFAULT 0 CHECK (critical_issues >= 0),
  warnings INTEGER NOT NULL DEFAULT 0 CHECK (warnings >= 0),
  reconciliation_issues INTEGER NOT NULL DEFAULT 0 CHECK (reconciliation_issues >= 0),
  integrity_report_path TEXT,
  controls_report_path TEXT,
  reconciliation_report_path TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT financial_health_snapshot_unique_daily_source UNIQUE (snapshot_date, source)
);

CREATE INDEX IF NOT EXISTS idx_financial_health_snapshots_status_date
  ON public.financial_health_snapshots(status, snapshot_date DESC);

ALTER TABLE public.financial_health_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS financial_health_snapshots_read ON public.financial_health_snapshots;
CREATE POLICY financial_health_snapshots_read
  ON public.financial_health_snapshots
  FOR SELECT
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.publish_financial_health_snapshot(
  p_source TEXT,
  p_status TEXT,
  p_checked_companies INTEGER,
  p_critical_issues INTEGER,
  p_warnings INTEGER,
  p_reconciliation_issues INTEGER,
  p_integrity_report_path TEXT DEFAULT NULL,
  p_controls_report_path TEXT DEFAULT NULL,
  p_reconciliation_report_path TEXT DEFAULT NULL,
  p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_snapshot_id UUID;
  v_source TEXT := COALESCE(NULLIF(trim(p_source), ''), 'finance_ci');
  v_status TEXT := COALESCE(NULLIF(trim(p_status), ''), 'unknown');
BEGIN
  IF v_source NOT IN ('finance_ci', 'scheduled_check', 'manual_check') THEN
    RAISE EXCEPTION 'Unsupported financial health snapshot source'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_status NOT IN ('healthy', 'warning', 'critical', 'unknown') THEN
    RAISE EXCEPTION 'Unsupported financial health snapshot status'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.financial_health_snapshots (
    snapshot_date,
    source,
    status,
    checked_companies,
    critical_issues,
    warnings,
    reconciliation_issues,
    integrity_report_path,
    controls_report_path,
    reconciliation_report_path,
    payload,
    created_by
  )
  VALUES (
    CURRENT_DATE,
    v_source,
    v_status,
    GREATEST(COALESCE(p_checked_companies, 0), 0),
    GREATEST(COALESCE(p_critical_issues, 0), 0),
    GREATEST(COALESCE(p_warnings, 0), 0),
    GREATEST(COALESCE(p_reconciliation_issues, 0), 0),
    p_integrity_report_path,
    p_controls_report_path,
    p_reconciliation_report_path,
    COALESCE(p_payload, '{}'::jsonb),
    auth.uid()
  )
  ON CONFLICT (snapshot_date, source)
  DO UPDATE SET
    status = EXCLUDED.status,
    checked_companies = EXCLUDED.checked_companies,
    critical_issues = EXCLUDED.critical_issues,
    warnings = EXCLUDED.warnings,
    reconciliation_issues = EXCLUDED.reconciliation_issues,
    integrity_report_path = EXCLUDED.integrity_report_path,
    controls_report_path = EXCLUDED.controls_report_path,
    reconciliation_report_path = EXCLUDED.reconciliation_report_path,
    payload = EXCLUDED.payload,
    created_at = now()
  RETURNING id INTO v_snapshot_id;

  RETURN v_snapshot_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.publish_financial_health_snapshot(TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, TEXT, TEXT, TEXT, JSONB) TO authenticated;
