-- Restore the three exact inspected definitions; no financial rows or privileges change.
-- Fails on drift to avoid overwriting another change after this migration.
BEGIN;
SET LOCAL lock_timeout = '5s';
DO $preflight$
BEGIN
  IF to_regprocedure('public.create_manual_journal_entry_v1(uuid,text,date,text,text,uuid,jsonb,uuid,uuid)') IS NULL OR
     encode(sha256(convert_to(pg_get_functiondef(to_regprocedure('public.create_manual_journal_entry_v1(uuid,text,date,text,text,uuid,jsonb,uuid,uuid)')), 'UTF8')), 'hex')
       IS DISTINCT FROM 'abf3217f27bbde426b0b23649591e0df249d83873dbd30b6e68151c1ea518fa1' THEN
    RAISE EXCEPTION 'Manual journal definition drift: public.create_manual_journal_entry_v1(uuid,text,date,text,text,uuid,jsonb,uuid,uuid)' USING ERRCODE = '55000';
  END IF;
  IF to_regprocedure('public.post_manual_journal_entry_v1(uuid,uuid,uuid)') IS NULL OR
     encode(sha256(convert_to(pg_get_functiondef(to_regprocedure('public.post_manual_journal_entry_v1(uuid,uuid,uuid)')), 'UTF8')), 'hex')
       IS DISTINCT FROM '8886ac7bae76096a3fafa1ee849cbcfae0ffcbf12f88b8fd02fc5ae1a2135813' THEN
    RAISE EXCEPTION 'Manual journal definition drift: public.post_manual_journal_entry_v1(uuid,uuid,uuid)' USING ERRCODE = '55000';
  END IF;
  IF to_regprocedure('public.post_manual_journal_entry_v1(uuid,uuid,uuid,boolean)') IS NULL OR
     encode(sha256(convert_to(pg_get_functiondef(to_regprocedure('public.post_manual_journal_entry_v1(uuid,uuid,uuid,boolean)')), 'UTF8')), 'hex')
       IS DISTINCT FROM '80c18835de01e800eae87f96ae35bc4d953469f608e8bb57d891a2b2bc49d45f' THEN
    RAISE EXCEPTION 'Manual journal definition drift: public.post_manual_journal_entry_v1(uuid,uuid,uuid,boolean)' USING ERRCODE = '55000';
  END IF;
END;
$preflight$;

CREATE OR REPLACE FUNCTION public.create_manual_journal_entry_v1(p_company_id uuid, p_entry_number text, p_entry_date date, p_description text, p_reference_type text, p_reference_id uuid, p_lines jsonb, p_idempotency_key uuid, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS journal_entries
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_id uuid;
  v_entry public.journal_entries%ROWTYPE;
  v_line record;
  v_debit numeric := 0;
  v_credit numeric := 0;
  v_number text;
  v_account_id uuid;
  v_cost_center_id uuid;
  v_asset_id uuid;
  v_employee_id uuid;
BEGIN
  v_actor_id := CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE p_actor_id END;
  IF v_actor_id IS NULL OR (auth.uid() IS NULL AND COALESCE(auth.role(), '') <> 'service_role') THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;
  IF auth.uid() IS NOT NULL AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
    RAISE EXCEPTION 'Company access denied' USING ERRCODE = '42501';
  END IF;
  IF p_entry_date IS NULL OR p_idempotency_key IS NULL
     OR NULLIF(BTRIM(COALESCE(p_description, '')), '') IS NULL
     OR jsonb_typeof(COALESCE(p_lines, 'null'::jsonb)) <> 'array'
     OR jsonb_array_length(p_lines) < 2
  THEN
    RAISE EXCEPTION 'Date, description, idempotency key, and at least two journal lines are required'
      USING ERRCODE = 'P0001';
  END IF;
  IF public.system_agent_date_in_closed_period(p_company_id, p_entry_date) THEN
    RAISE EXCEPTION 'Journal creation is blocked by a closed accounting period' USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    p_company_id::text || ':manual-journal:' || p_idempotency_key::text, 0
  ));
  SELECT entry.* INTO v_entry FROM public.journal_entries entry
  WHERE entry.company_id = p_company_id AND entry.manual_idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN v_entry;
  END IF;

  FOR v_line IN
    SELECT item.value, item.ordinality
    FROM jsonb_array_elements(p_lines) WITH ORDINALITY item(value, ordinality)
    ORDER BY item.ordinality
  LOOP
    v_account_id := NULLIF(v_line.value ->> 'account_id', '')::uuid;
    v_cost_center_id := NULLIF(v_line.value ->> 'cost_center_id', '')::uuid;
    v_asset_id := NULLIF(v_line.value ->> 'asset_id', '')::uuid;
    v_employee_id := NULLIF(v_line.value ->> 'employee_id', '')::uuid;
    IF v_account_id IS NULL
       OR COALESCE((v_line.value ->> 'debit_amount')::numeric, 0) < 0
       OR COALESCE((v_line.value ->> 'credit_amount')::numeric, 0) < 0
       OR (COALESCE((v_line.value ->> 'debit_amount')::numeric, 0) > 0)
          = (COALESCE((v_line.value ->> 'credit_amount')::numeric, 0) > 0)
    THEN
      RAISE EXCEPTION 'Every journal line requires one postable account and exactly one positive side'
        USING ERRCODE = 'P0001';
    END IF;
    PERFORM 1 FROM public.chart_of_accounts account
    WHERE account.id = v_account_id AND account.company_id = p_company_id
      AND account.is_active = true AND COALESCE(account.is_header, false) = false
      AND COALESCE(account.account_level, 0) >= 3;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Journal line account is not active and postable for the current company'
        USING ERRCODE = 'P0001';
    END IF;
    IF v_cost_center_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.cost_centers center WHERE center.id = v_cost_center_id AND center.company_id = p_company_id
    ) THEN RAISE EXCEPTION 'Journal cost center is outside the current company' USING ERRCODE = 'P0001'; END IF;
    IF v_asset_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.fixed_assets asset WHERE asset.id = v_asset_id AND asset.company_id = p_company_id
    ) THEN RAISE EXCEPTION 'Journal asset is outside the current company' USING ERRCODE = 'P0001'; END IF;
    IF v_employee_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.employees employee WHERE employee.id = v_employee_id AND employee.company_id = p_company_id
    ) THEN RAISE EXCEPTION 'Journal employee is outside the current company' USING ERRCODE = 'P0001'; END IF;
    v_debit := v_debit + COALESCE((v_line.value ->> 'debit_amount')::numeric, 0);
    v_credit := v_credit + COALESCE((v_line.value ->> 'credit_amount')::numeric, 0);
  END LOOP;
  IF v_debit <= 0 OR abs(v_debit - v_credit) > 0.01 THEN
    RAISE EXCEPTION 'Manual journal must be balanced and greater than zero' USING ERRCODE = 'P0001';
  END IF;

  v_number := COALESCE(NULLIF(BTRIM(COALESCE(p_entry_number, '')), ''),
    'MJ-' || to_char(p_entry_date, 'YYYYMMDD') || '-' || left(p_idempotency_key::text, 8));
  INSERT INTO public.journal_entries (
    company_id, entry_number, entry_date, description, reference_type, reference_id,
    total_debit, total_credit, status, created_by, manual_idempotency_key
  ) VALUES (
    p_company_id, v_number, p_entry_date, BTRIM(p_description),
    NULLIF(BTRIM(COALESCE(p_reference_type, '')), ''), p_reference_id,
    v_debit, v_credit, 'draft', v_actor_id, p_idempotency_key
  ) RETURNING * INTO v_entry;

  INSERT INTO public.journal_entry_lines (
    journal_entry_id, account_id, cost_center_id, asset_id, employee_id,
    line_description, debit_amount, credit_amount, line_number
  )
  SELECT v_entry.id,
    NULLIF(item.value ->> 'account_id', '')::uuid,
    NULLIF(item.value ->> 'cost_center_id', '')::uuid,
    NULLIF(item.value ->> 'asset_id', '')::uuid,
    NULLIF(item.value ->> 'employee_id', '')::uuid,
    NULLIF(BTRIM(COALESCE(item.value ->> 'line_description', '')), ''),
    COALESCE((item.value ->> 'debit_amount')::numeric, 0),
    COALESCE((item.value ->> 'credit_amount')::numeric, 0),
    item.ordinality::integer
  FROM jsonb_array_elements(p_lines) WITH ORDINALITY item(value, ordinality)
  ORDER BY item.ordinality;
  RETURN v_entry;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.post_manual_journal_entry_v1(p_company_id uuid, p_entry_id uuid, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS journal_entries
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_id uuid;
  v_entry public.journal_entries%ROWTYPE;
  v_debit numeric;
  v_credit numeric;
  v_count integer;
BEGIN
  v_actor_id := CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE p_actor_id END;
  IF v_actor_id IS NULL OR (auth.uid() IS NULL AND COALESCE(auth.role(), '') <> 'service_role') THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;
  IF auth.uid() IS NOT NULL AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
    RAISE EXCEPTION 'Company access denied' USING ERRCODE = '42501';
  END IF;
  SELECT entry.* INTO v_entry FROM public.journal_entries entry
  WHERE entry.id = p_entry_id AND entry.company_id = p_company_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Journal entry was not found' USING ERRCODE = 'P0001'; END IF;
  IF lower(v_entry.status) = 'posted' THEN RETURN v_entry; END IF;
  IF lower(v_entry.status) NOT IN ('draft', 'approved') THEN
    RAISE EXCEPTION 'Only a draft or approved journal can be posted' USING ERRCODE = 'P0001';
  END IF;
  IF v_entry.created_by IS NOT NULL AND v_entry.created_by = v_actor_id
     AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Journal creator cannot post the same journal' USING ERRCODE = '42501';
  END IF;
  IF public.system_agent_date_in_closed_period(p_company_id, v_entry.entry_date) THEN
    RAISE EXCEPTION 'Journal posting is blocked by a closed accounting period' USING ERRCODE = 'P0001';
  END IF;
  SELECT count(*), COALESCE(sum(line.debit_amount), 0), COALESCE(sum(line.credit_amount), 0)
  INTO v_count, v_debit, v_credit FROM public.journal_entry_lines line
  WHERE line.journal_entry_id = v_entry.id;
  IF v_count < 2 OR v_debit <= 0 OR abs(v_debit - v_credit) > 0.01
     OR abs(v_entry.total_debit - v_debit) > 0.01 OR abs(v_entry.total_credit - v_credit) > 0.01 THEN
    RAISE EXCEPTION 'Journal lines are missing, unbalanced, or inconsistent with the header' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.journal_entries SET status = 'posted', posted_by = v_actor_id, posted_at = now(), updated_at = now()
  WHERE id = v_entry.id RETURNING * INTO v_entry;
  RETURN v_entry;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.post_manual_journal_entry_v1(p_company_id uuid, p_entry_id uuid, p_actor_id uuid DEFAULT NULL::uuid, p_self_review_acknowledged boolean DEFAULT false)
 RETURNS journal_entries
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_id uuid;
  v_entry public.journal_entries%ROWTYPE;
  v_debit numeric;
  v_credit numeric;
  v_count integer;
  v_marker text;
BEGIN
  v_actor_id := CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE p_actor_id END;
  IF v_actor_id IS NULL OR (auth.uid() IS NULL AND COALESCE(auth.role(), '') <> 'service_role') THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;
  IF auth.uid() IS NOT NULL AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
    RAISE EXCEPTION 'Company access denied' USING ERRCODE = '42501';
  END IF;
  SELECT entry.* INTO v_entry FROM public.journal_entries entry
  WHERE entry.id = p_entry_id AND entry.company_id = p_company_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Journal entry was not found' USING ERRCODE = 'P0001'; END IF;
  IF lower(v_entry.status) = 'posted' THEN RETURN v_entry; END IF;
  IF lower(v_entry.status) NOT IN ('draft', 'approved') THEN
    RAISE EXCEPTION 'Only a draft or approved journal can be posted' USING ERRCODE = 'P0001';
  END IF;
  IF v_entry.created_by IS NOT NULL AND v_entry.created_by = v_actor_id
     AND COALESCE(auth.role(), '') <> 'service_role' THEN
    IF COALESCE(p_self_review_acknowledged, false) IS NOT TRUE THEN
      RAISE EXCEPTION 'Journal creator cannot post the same journal' USING ERRCODE = '42501';
    END IF;
    v_marker := 'SELF_REVIEW_ACKNOWLEDGED by ' || v_actor_id::text || ' at ' || to_char(now(), 'YYYY-MM-DD HH24:MI');
  END IF;
  IF public.system_agent_date_in_closed_period(p_company_id, v_entry.entry_date) THEN
    RAISE EXCEPTION 'Journal posting is blocked by a closed accounting period' USING ERRCODE = 'P0001';
  END IF;
  SELECT count(*), COALESCE(sum(line.debit_amount), 0), COALESCE(sum(line.credit_amount), 0)
  INTO v_count, v_debit, v_credit FROM public.journal_entry_lines line
  WHERE line.journal_entry_id = v_entry.id;
  IF v_count < 2 OR v_debit <= 0 OR abs(v_debit - v_credit) > 0.01
     OR abs(v_entry.total_debit - v_debit) > 0.01 OR abs(v_entry.total_credit - v_credit) > 0.01 THEN
    RAISE EXCEPTION 'Journal lines are missing, unbalanced, or inconsistent with the header' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.journal_entries SET status = 'posted', posted_by = v_actor_id, posted_at = now(), updated_at = now(),
    workflow_notes = CASE WHEN v_marker IS NULL THEN workflow_notes
      WHEN COALESCE(btrim(workflow_notes), '') = '' THEN v_marker
      ELSE workflow_notes || E'\n' || v_marker END
  WHERE id = v_entry.id RETURNING * INTO v_entry;
  RETURN v_entry;
END;
$function$
;

COMMIT;
