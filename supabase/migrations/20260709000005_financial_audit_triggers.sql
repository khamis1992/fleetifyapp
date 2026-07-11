-- Phase 3: Audit Log Triggers on Financial Tables
-- Auto-logs INSERT/UPDATE/DELETE on invoices, payments, journal_entries into audit_logs.

CREATE OR REPLACE FUNCTION public.financial_audit_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_company_id uuid;
  v_resource_id uuid;
  v_resource_type text;
  v_details jsonb;
  v_severity text := 'low';
  v_status text := 'success';
  v_old_row jsonb := NULL;
  v_new_row jsonb := NULL;
  v_user_id uuid := auth.uid();
BEGIN
  v_resource_type := TG_TABLE_NAME;

  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_old_row := to_jsonb(OLD);
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_new_row := to_jsonb(NEW);
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := v_resource_type || '_created';
    v_company_id := NEW.company_id;
    v_resource_id := NEW.id;
    v_details := jsonb_build_object('new_values', v_new_row);
    IF TG_TABLE_NAME = 'payments' THEN
      v_severity := 'medium';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := v_resource_type || '_updated';
    v_company_id := NEW.company_id;
    v_resource_id := NEW.id;
    v_details := jsonb_build_object(
      'old_values', v_old_row,
      'new_values', v_new_row,
      'changed_fields', (
        SELECT jsonb_object_agg(key, value)
        FROM jsonb_each(v_new_row) AS n
        WHERE n.value IS DISTINCT FROM (v_old_row -> n.key)
      )
    );

    IF TG_TABLE_NAME = 'payments'
       AND (v_old_row ->> 'payment_status') IS DISTINCT FROM (v_new_row ->> 'payment_status')
    THEN
      v_severity := 'high';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := v_resource_type || '_deleted';
    v_company_id := OLD.company_id;
    v_resource_id := OLD.id;
    v_details := jsonb_build_object('old_values', v_old_row);
    v_severity := 'critical';
  END IF;

  v_user_id := COALESCE(
    NULLIF(v_new_row ->> 'created_by', '')::uuid,
    NULLIF(v_old_row ->> 'created_by', '')::uuid,
    auth.uid()
  );

  INSERT INTO public.audit_logs (
    action,
    severity,
    company_id,
    resource_type,
    resource_id,
    old_values,
    new_values,
    metadata,
    status,
    user_id
  )
  VALUES (
    v_action,
    v_severity,
    v_company_id,
    v_resource_type,
    v_resource_id,
    CASE WHEN v_details ? 'old_values' THEN v_details -> 'old_values' ELSE NULL END,
    CASE WHEN v_details ? 'new_values' THEN v_details -> 'new_values' ELSE NULL END,
    CASE WHEN v_details ? 'changed_fields' THEN v_details -> 'changed_fields' ELSE NULL END,
    v_status,
    v_user_id
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.financial_audit_trigger_fn() IS
'Audits financial table changes without assuming every attached table has payment_status.';

-- Attach triggers to financial tables
DROP TRIGGER IF EXISTS trg_audit_invoices ON public.invoices;
CREATE TRIGGER trg_audit_invoices
  AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.financial_audit_trigger_fn();

DROP TRIGGER IF EXISTS trg_audit_payments ON public.payments;
CREATE TRIGGER trg_audit_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.financial_audit_trigger_fn();

DROP TRIGGER IF EXISTS trg_audit_journal_entries ON public.journal_entries;
CREATE TRIGGER trg_audit_journal_entries
  AFTER INSERT OR UPDATE OR DELETE ON public.journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.financial_audit_trigger_fn();
