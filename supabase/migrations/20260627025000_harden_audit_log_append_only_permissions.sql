-- Harden audit logs as append-only: no UPDATE, DELETE, or TRUNCATE for app roles.

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('app.audit_log_maintenance', true) = 'on' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    IF TG_OP = 'TRUNCATE' THEN
      RETURN NULL;
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Audit logs are immutable. Append a new audit event instead of updating, deleting, or truncating.';
END;
$$;

DROP TRIGGER IF EXISTS prevent_audit_log_truncate_trigger ON public.audit_logs;
CREATE TRIGGER prevent_audit_log_truncate_trigger
BEFORE TRUNCATE ON public.audit_logs
FOR EACH STATEMENT
EXECUTE FUNCTION public.prevent_audit_log_mutation();

REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.audit_logs FROM anon;
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.audit_logs FROM authenticated;

GRANT SELECT, INSERT ON TABLE public.audit_logs TO authenticated;

DROP POLICY IF EXISTS "Super admins full access to audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Company admins full access to company audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can view company audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Company admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit logs are immutable" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit logs cannot be deleted" ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_company_select_only ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_company_insert_only ON public.audit_logs;

CREATE POLICY audit_logs_company_select_only
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    company_id IS NULL
    OR company_id = get_user_company_id()
  );

CREATE POLICY audit_logs_company_insert_only
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IS NULL
    OR company_id = get_user_company_id()
  );

COMMENT ON TABLE public.audit_logs IS 'Append-only tamper-evident audit ledger. UPDATE, DELETE, and TRUNCATE are blocked for application roles.';
