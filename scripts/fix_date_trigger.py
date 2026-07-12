#!/usr/bin/env python3
import psycopg2

conn = psycopg2.connect('postgresql://postgres.qwhunliohlkkahbspfiu:Khamees1992#@aws-0-eu-north-1.pooler.supabase.com:6543/postgres')
conn.autocommit = True
cur = conn.cursor()

cur.execute("""
CREATE OR REPLACE FUNCTION public.validate_invoice_date_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_contract_start_date date;
BEGIN
  IF NEW.contract_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT start_date INTO v_contract_start_date
  FROM public.contracts
  WHERE id = NEW.contract_id;

  IF v_contract_start_date IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.contract_id IS NOT DISTINCT FROM OLD.contract_id
      AND NEW.invoice_date IS NOT DISTINCT FROM OLD.invoice_date
      AND NEW.due_date IS NOT DISTINCT FROM OLD.due_date THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Only block if invoice_date month is BEFORE contract start month (allow same month)
  IF NEW.invoice_date IS NOT NULL AND DATE_TRUNC('month', NEW.invoice_date) < DATE_TRUNC('month', v_contract_start_date) THEN
    RAISE EXCEPTION 'Invoice date (%) cannot be before contract start date (%)',
      NEW.invoice_date, v_contract_start_date;
  END IF;

  IF NEW.due_date IS NOT NULL AND DATE_TRUNC('month', NEW.due_date) < DATE_TRUNC('month', v_contract_start_date) THEN
    RAISE EXCEPTION 'Invoice due date (%) cannot be before contract start date (%)',
      NEW.due_date, v_contract_start_date;
  END IF;

  RETURN NEW;
END;
$$;
""")

print('Fixed validate_invoice_date_before_insert - compares at month level')

cur.close()
conn.close()
print('DONE')
