#!/usr/bin/env python3
import psycopg2
from db_connection import get_database_url

conn = psycopg2.connect(get_database_url())
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
  v_action TEXT;
  v_company_id UUID;
  v_resource_id UUID;
  v_resource_type TEXT;
  v_details JSONB;
  v_severity TEXT := 'low';
  v_status TEXT := 'success';
BEGIN
  v_resource_type := TG_TABLE_NAME;

  IF TG_OP = 'INSERT' THEN
    v_action := v_resource_type || '_created';
    v_company_id := NEW.company_id;
    v_resource_id := NEW.id;
    v_details := jsonb_build_object('new_values', to_jsonb(NEW));
    IF TG_TABLE_NAME = 'payments' THEN v_severity := 'medium'; END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := v_resource_type || '_updated';
    v_company_id := NEW.company_id;
    v_resource_id := NEW.id;
    v_details := jsonb_build_object(
      'old_values', to_jsonb(OLD),
      'new_values', to_jsonb(NEW),
      'changed_fields', (
        SELECT jsonb_object_agg(key, value)
        FROM jsonb_each(to_jsonb(NEW)) AS n
        WHERE n.value IS DISTINCT FROM (to_jsonb(OLD) -> n.key)
      )
    );
    IF TG_TABLE_NAME = 'payments' AND OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
      v_severity := 'high';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := v_resource_type || '_deleted';
    v_company_id := OLD.company_id;
    v_resource_id := OLD.id;
    v_details := jsonb_build_object('old_values', to_jsonb(OLD));
    v_severity := 'critical';
  END IF;

  INSERT INTO public.audit_logs (
    action, severity, company_id, resource_type, resource_id,
    old_values, new_values, metadata, status, user_id
  )
  VALUES (
    v_action, v_severity, v_company_id, v_resource_type, v_resource_id,
    CASE WHEN v_details ? 'old_values' THEN v_details->'old_values' ELSE NULL END,
    CASE WHEN v_details ? 'new_values' THEN v_details->'new_values' ELSE NULL END,
    CASE WHEN v_details ? 'changed_fields' THEN v_details->'changed_fields' ELSE NULL END,
    v_status,
    COALESCE(NEW.created_by, OLD.created_by, auth.uid())
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
""")

print('Fixed financial_audit_trigger_fn - corrected column names')
print('  event_type -> action')
print('  entity_type -> resource_type')
print('  entity_id -> resource_id')
print('  details -> old_values/new_values/metadata')
print('  success -> status')

cur.close()
conn.close()
print('DONE')
