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
  v_entity_type TEXT;
  v_action TEXT;
  v_company_id UUID;
  v_entity_id UUID;
  v_details JSONB;
  v_severity TEXT := 'low';
BEGIN
  v_entity_type := TG_TABLE_NAME;
  IF TG_OP = 'INSERT' THEN
    v_action := v_entity_type || '_created';
    v_company_id := NEW.company_id;
    v_entity_id := NEW.id;
    v_details := jsonb_build_object('new_values', to_jsonb(NEW));
    IF TG_TABLE_NAME = 'payments' THEN v_severity := 'medium'; END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := v_entity_type || '_updated';
    v_company_id := NEW.company_id;
    v_entity_id := NEW.id;
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
    v_action := v_entity_type || '_deleted';
    v_company_id := OLD.company_id;
    v_entity_id := OLD.id;
    v_details := jsonb_build_object('old_values', to_jsonb(OLD));
    v_severity := 'critical';
  END IF;

  INSERT INTO public.audit_logs (event_type, severity, company_id, entity_type, entity_id, action, details, success, user_id)
  VALUES (v_action, v_severity, v_company_id, v_entity_type, v_entity_id, v_action, v_details, true,
    COALESCE(NEW.created_by, OLD.created_by, auth.uid())
  );
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
""")

print('Fixed financial_audit_trigger_fn - changed ->> to -> for JSONB comparison')

cur.close()
conn.close()
print('DONE')
