-- Fix COALESCE type mismatch between jsonb and integer in approve_report functions
BEGIN;

CREATE OR REPLACE FUNCTION balance_sheet_private.approve_report(p_report uuid, p_notes text, p_confirmations jsonb, p_self_review_acknowledged boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
 SET lock_timeout TO '5s'
AS $function$
DECLARE v_report public.professional_balance_sheet_reports%ROWTYPE; v_current jsonb;
  v_negative jsonb; v_item jsonb; v_missing text := ''; v_self_review boolean := false;
BEGIN
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'Balance sheet approval requires read committed isolation' USING ERRCODE='25001';
  END IF;
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_report FROM public.professional_balance_sheet_reports
    WHERE id=p_report AND company_id=public.get_user_company_id() FOR UPDATE;
  IF NOT FOUND OR NOT balance_sheet_private.has_access(v_report.company_id,'approve') THEN
    RAISE EXCEPTION 'Not authorized to approve this balance sheet' USING ERRCODE='42501';
  END IF;
  IF v_report.created_by=auth.uid() THEN
    IF COALESCE(p_self_review_acknowledged, false) IS NOT TRUE THEN
      RAISE EXCEPTION 'Generator cannot approve their own balance sheet' USING ERRCODE='42501';
    END IF;
    v_self_review := true;
  END IF;
  IF v_report.status<>'draft' THEN RAISE EXCEPTION 'Only draft balance sheets can be approved' USING ERRCODE='22023'; END IF;
  IF p_notes IS NULL OR length(btrim(p_notes))<20 OR length(p_notes)>10000 THEN
    RAISE EXCEPTION 'Review notes of 20 to 10000 characters are required' USING ERRCODE='22023';
  END IF;
  IF p_confirmations IS NULL OR NOT (p_confirmations @> '{"assets":true,"liabilities":true,"equity":true,"reconciliation":true,"completeness":true}'::jsonb) THEN
    RAISE EXCEPTION 'All five accountant confirmations are required' USING ERRCODE='22023';
  END IF;
  LOCK TABLE public.companies,public.chart_of_accounts,public.journal_entries,public.journal_entry_lines,public.vehicles IN SHARE MODE;
  v_current:=balance_sheet_private.calculate(v_report.company_id,v_report.as_of_date,v_report.comparison_date);
  IF v_current->>'fingerprint' IS DISTINCT FROM v_report.source_fingerprint THEN
    RAISE EXCEPTION 'Balance sheet source changed; save and review a new version' USING ERRCODE='40001';
  END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(v_current->'checks') c WHERE c->>'severity'='error') THEN
    RAISE EXCEPTION 'Balance sheet has blocking accounting errors' USING ERRCODE='22023';
  END IF;
  SELECT c->'detail' INTO v_negative FROM jsonb_array_elements(v_current->'checks') c
    WHERE c->>'code'='negative_asset_balances' AND COALESCE((c->>'count')::numeric,0)>0 LIMIT 1;
  IF v_negative IS NOT NULL THEN
    FOR v_item IN SELECT value FROM jsonb_array_elements(v_negative) LOOP
      IF NOT EXISTS(SELECT 1 FROM public.balance_sheet_negative_explanations x
        WHERE x.company_id=v_report.company_id AND x.account_id=(v_item->>'id')::uuid
          AND x.as_of=v_report.as_of_date) THEN
        v_missing:=v_missing||COALESCE(v_item->>'code','?')||' ';
      END IF;
    END LOOP;
    IF btrim(v_missing)<>'' THEN
      RAISE EXCEPTION 'Negative asset balances require a documented explanation before approval; unexplained accounts: %', btrim(v_missing)
        USING ERRCODE='22023';
    END IF;
  END IF;
  UPDATE public.professional_balance_sheet_reports SET status='approved',approved_by=auth.uid(),
    approved_by_name=balance_sheet_private.actor_name(v_report.company_id),approved_at=clock_timestamp(),
    review_notes=btrim(p_notes),confirmations=p_confirmations WHERE id=p_report RETURNING * INTO v_report;
  INSERT INTO balance_sheet_private.report_events(report_id,company_id,action,actor_id,reason,source_fingerprint)
    VALUES(v_report.id,v_report.company_id,'approved',auth.uid(),
      CASE WHEN v_self_review THEN '[self-review] ' ELSE '' END||btrim(p_notes),v_report.source_fingerprint);
  RETURN to_jsonb(v_report);
END;
$function$;

CREATE OR REPLACE FUNCTION financial_statement_private.approve_report(p_id uuid, p_notes text, p_confirmations jsonb, p_self_review_acknowledged boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
 SET lock_timeout TO '5s'
AS $function$
DECLARE v_row public.professional_financial_statement_packages%ROWTYPE;v_current jsonb;
  v_as_of date;v_negative jsonb;v_item jsonb;v_missing text := ''; v_self_review boolean := false;
BEGIN
 IF current_setting('transaction_isolation')<>'read committed' THEN
   RAISE EXCEPTION 'Financial statement approval requires read committed isolation' USING ERRCODE='25001';
 END IF;
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_row FROM public.professional_financial_statement_packages WHERE id=p_id AND company_id=public.get_user_company_id() FOR UPDATE;
 IF NOT FOUND OR NOT balance_sheet_private.has_access(v_row.company_id,'approve') THEN RAISE EXCEPTION 'Not authorized to approve financial statements' USING ERRCODE='42501'; END IF;
 IF v_row.created_by=auth.uid() THEN
   IF COALESCE(p_self_review_acknowledged, false) IS NOT TRUE THEN
     RAISE EXCEPTION 'Generator cannot approve their own financial statements' USING ERRCODE='42501';
   END IF;
   v_self_review := true;
 END IF;
 IF v_row.status<>'draft' THEN RAISE EXCEPTION 'Only draft financial statements can be approved' USING ERRCODE='22023'; END IF;
 IF p_notes IS NULL OR length(btrim(p_notes))<20 OR length(p_notes)>10000 THEN RAISE EXCEPTION 'Review notes of 20 to 10000 characters are required' USING ERRCODE='22023'; END IF;
 IF p_confirmations IS NULL OR NOT(p_confirmations @> '{"classifications":true,"policies":true,"reconciliations":true,"disclosures":true,"periodCutoff":true}') THEN
   RAISE EXCEPTION 'All five financial statement confirmations are required' USING ERRCODE='22023';
 END IF;
 LOCK TABLE public.companies,public.chart_of_accounts,public.journal_entries,public.journal_entry_lines,public.vehicles IN SHARE MODE;
 v_current:=financial_statement_private.calculate(v_row.company_id,v_row.payload->'configuration');
 IF v_current->>'fingerprint' IS DISTINCT FROM v_row.source_fingerprint THEN RAISE EXCEPTION 'Financial statement source changed; save and review a new version' USING ERRCODE='40001'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(v_current->'findings') f WHERE f->>'severity'='error') THEN
   RAISE EXCEPTION 'Financial statements have blocking review findings' USING ERRCODE='22023';
 END IF;
 v_as_of:=(v_row.payload->'configuration'->>'periodEnd')::date;
 SELECT c->'detail' INTO v_negative FROM jsonb_array_elements(v_current->'position'->'checks') c
   WHERE c->>'code'='negative_asset_balances' AND COALESCE((c->>'count')::numeric,0)>0 LIMIT 1;
 IF v_negative IS NOT NULL THEN
   FOR v_item IN SELECT value FROM jsonb_array_elements(v_negative) LOOP
     IF NOT EXISTS(SELECT 1 FROM public.balance_sheet_negative_explanations x
       WHERE x.company_id=v_row.company_id AND x.account_id=(v_item->>'id')::uuid AND x.as_of=v_as_of) THEN
       v_missing:=v_missing||COALESCE(v_item->>'code','?')||' ';
     END IF;
   END LOOP;
   IF btrim(v_missing)<>'' THEN
     RAISE EXCEPTION 'Negative asset balances require a documented explanation before approval; unexplained accounts: %', btrim(v_missing)
       USING ERRCODE='22023';
   END IF;
 END IF;
 UPDATE public.professional_financial_statement_packages SET status='approved',approved_by=auth.uid(),approved_by_name=balance_sheet_private.actor_name(v_row.company_id),
   approved_at=clock_timestamp(),review_notes=btrim(p_notes),confirmations=p_confirmations WHERE id=p_id RETURNING * INTO v_row;
 INSERT INTO financial_statement_private.report_events(report_id,company_id,action,actor_id,reason,source_fingerprint)
 VALUES(v_row.id,v_row.company_id,'approved',auth.uid(),
   CASE WHEN v_self_review THEN '[self-review] ' ELSE '' END||btrim(p_notes),v_row.source_fingerprint);
 RETURN to_jsonb(v_row);
END;
$function$;

COMMIT;
