#!/usr/bin/env python3
import psycopg2

conn = psycopg2.connect('postgresql://postgres.qwhunliohlkkahbspfiu:Khamees1992#@aws-0-eu-north-1.pooler.supabase.com:6543/postgres')
conn.autocommit = True
cur = conn.cursor()

cur.execute("""
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
""")

print('Fixed financial_audit_trigger_fn - uses JSONB instead of direct column references')

cur.close()
conn.close()
print('DONE')
