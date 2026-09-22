-- Documented self-review acknowledgment for sole-admin operations.
-- The strict segregation-of-duties rules stay the DEFAULT: posting a journal you
-- created and approving a report you generated still fail unless the caller
-- explicitly passes p_self_review_acknowledged = true, which stamps an audit marker.
-- The original strict-signature overloads remain untouched for existing callers.
BEGIN;
SET LOCAL lock_timeout = '5s';

-- The documented self-review path must be representable in stored rows: relax the
-- approved_by <> created_by table checks (the RPCs remain the gate; the strict
-- rule still applies unless the acknowledgment flag was explicitly passed).
ALTER TABLE public.professional_balance_sheet_reports
  DROP CONSTRAINT IF EXISTS professional_balance_sheet_approval;
ALTER TABLE public.professional_balance_sheet_reports
  ADD CONSTRAINT professional_balance_sheet_approval CHECK (
    status <> 'approved' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL
      AND approved_by_name IS NOT NULL AND review_notes IS NOT NULL
      AND length(btrim(review_notes)) >= 20 AND confirmations IS NOT NULL
      AND confirmations @> '{"assets":true,"liabilities":true,"equity":true,"reconciliation":true,"completeness":true}'::jsonb));

DO $$
DECLARE v_constraint text;
BEGIN
  SELECT conname INTO v_constraint FROM pg_constraint
  WHERE conrelid = 'public.professional_financial_statement_packages'::regclass
    AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%approved_by <> created_by%';
  IF v_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.professional_financial_statement_packages DROP CONSTRAINT %I', v_constraint);
  END IF;
  ALTER TABLE public.professional_financial_statement_packages
    ADD CONSTRAINT professional_financial_statement_packages_approval CHECK (
      status <> 'approved' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL
        AND approved_by_name IS NOT NULL AND review_notes IS NOT NULL
        AND length(btrim(review_notes)) >= 20 AND confirmations IS NOT NULL
        AND confirmations @> '{"classifications":true,"policies":true,"reconciliations":true,"disclosures":true,"periodCutoff":true}'::jsonb));
END $$;

-- ---------------------------------------------------------------------------
-- Journal posting: creator may post their own draft only with an explicit
-- acknowledgment, recorded on workflow_notes.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_manual_journal_entry_v1(
  p_company_id uuid,
  p_entry_id uuid,
  p_actor_id uuid DEFAULT NULL,
  p_self_review_acknowledged boolean DEFAULT false
)
RETURNS public.journal_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.post_manual_journal_entry_v1(uuid, uuid, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_manual_journal_entry_v1(uuid, uuid, uuid, boolean) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Balance-sheet approval: generator may approve their own draft only with an
-- explicit acknowledgment; the audit event records the self-review marker.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION balance_sheet_private.approve_report(
  p_report uuid, p_notes text, p_confirmations jsonb, p_self_review_acknowledged boolean DEFAULT false
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET lock_timeout = '5s' AS $fn$
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
    WHERE c->>'code'='negative_asset_balances' AND COALESCE(c->'count',0)::numeric>0 LIMIT 1;
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
$fn$;

-- ---------------------------------------------------------------------------
-- Financial-statement package approval: same acknowledgment rule.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION financial_statement_private.approve_report(
  p_id uuid, p_notes text, p_confirmations jsonb, p_self_review_acknowledged boolean DEFAULT false
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET lock_timeout='5s' AS $f$
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
   WHERE c->>'code'='negative_asset_balances' AND COALESCE(c->'count',0)::numeric>0 LIMIT 1;
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
$f$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA balance_sheet_private, financial_statement_private FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION balance_sheet_private.has_access(uuid,text),
  balance_sheet_private.get_report(uuid,date,date),balance_sheet_private.save_report(uuid,date,date,text),
  balance_sheet_private.approve_report(uuid,text,jsonb),balance_sheet_private.approve_report(uuid,text,jsonb,boolean),
  balance_sheet_private.list_reports(uuid),balance_sheet_private.void_report(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION financial_statement_private.get_report(uuid,jsonb),financial_statement_private.save_report(uuid,jsonb),
  financial_statement_private.approve_report(uuid,text,jsonb),financial_statement_private.approve_report(uuid,text,jsonb,boolean),
  financial_statement_private.list_reports(uuid),financial_statement_private.void_report(uuid,text) TO authenticated;

-- Public facades for the acknowledged approval paths.
CREATE OR REPLACE FUNCTION public.approve_professional_balance_sheet_v1(
  p_report_id uuid, p_review_notes text, p_confirmations jsonb, p_self_review_acknowledged boolean DEFAULT false
)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $fn$
  SELECT balance_sheet_private.approve_report(p_report_id, p_review_notes, p_confirmations, p_self_review_acknowledged);
$fn$;
CREATE OR REPLACE FUNCTION public.approve_financial_statement_package_v1(
  p_report_id uuid, p_review_notes text, p_confirmations jsonb, p_self_review_acknowledged boolean DEFAULT false
)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $f$
  SELECT financial_statement_private.approve_report(p_report_id, p_review_notes, p_confirmations, p_self_review_acknowledged);
$f$;
REVOKE ALL ON FUNCTION public.approve_professional_balance_sheet_v1(uuid,text,jsonb,boolean),
  public.approve_financial_statement_package_v1(uuid,text,jsonb,boolean) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_professional_balance_sheet_v1(uuid,text,jsonb,boolean),
  public.approve_financial_statement_package_v1(uuid,text,jsonb,boolean) TO authenticated;

NOTIFY pgrst,'reload schema';
COMMIT;
