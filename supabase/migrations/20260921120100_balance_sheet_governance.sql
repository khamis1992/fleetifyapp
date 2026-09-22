-- Balance-sheet governance: subtype gating, actionable check payloads, and documented
-- explanations for negative asset balances. Reads only; the ledger engine is untouched.
-- Replaces balance_sheet_private.period and both approve_report functions from
-- 20260917235302 / 20260917235336 with payload-carrying equivalents.
BEGIN;
SET LOCAL lock_timeout = '5s';

-- ---------------------------------------------------------------------------
-- Documented explanations for negative asset balances (per company, account, date).
-- ---------------------------------------------------------------------------
CREATE TABLE public.balance_sheet_negative_explanations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  account_id uuid NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  as_of date NOT NULL,
  explanation text NOT NULL CHECK (length(btrim(explanation)) >= 10 AND length(explanation) <= 2000),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT balance_sheet_negative_explanations_unique UNIQUE (company_id, account_id, as_of),
  CONSTRAINT balance_sheet_negative_explanations_date CHECK (isfinite(as_of) AND as_of >= DATE '1900-01-01')
);
CREATE INDEX balance_sheet_negative_explanations_company
  ON public.balance_sheet_negative_explanations(company_id, as_of DESC, account_id);
ALTER TABLE public.balance_sheet_negative_explanations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.balance_sheet_negative_explanations FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.balance_sheet_negative_explanations TO authenticated, service_role;
CREATE POLICY balance_sheet_negative_explanations_read ON public.balance_sheet_negative_explanations
  FOR SELECT TO authenticated USING (company_id = (SELECT public.get_user_company_id()));
CREATE POLICY balance_sheet_negative_explanations_insert ON public.balance_sheet_negative_explanations
  FOR INSERT TO authenticated WITH CHECK (company_id = (SELECT public.get_user_company_id()));
CREATE POLICY balance_sheet_negative_explanations_update ON public.balance_sheet_negative_explanations
  FOR UPDATE TO authenticated
  USING (company_id = (SELECT public.get_user_company_id()))
  WITH CHECK (company_id = (SELECT public.get_user_company_id()));
CREATE TRIGGER balance_sheet_negative_explanations_updated_at
  BEFORE UPDATE ON public.balance_sheet_negative_explanations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- period(): adds the missing_account_subtype error check and entity payloads
-- (account ids/codes, draft journal ids/numbers) to the checks array.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION balance_sheet_private.period(p_company uuid, p_as_of date)
RETURNS jsonb LANGUAGE sql STABLE SET search_path = '' SET timezone = 'UTC' AS $fn$
WITH entries AS MATERIALIZED (
  SELECT e.id, e.entry_number, e.entry_date, e.status, e.total_debit, e.total_credit,
    e.posted_at, e.reversed_at, e.reversal_entry_id, e.reference_type, e.reference_id,
    r.id AS reversal_id, r.company_id AS reversal_company_id, r.entry_date AS reversal_date,
    r.status AS reversal_status, r.total_debit AS reversal_debit, r.total_credit AS reversal_credit
  FROM public.journal_entries e
  LEFT JOIN public.journal_entries r ON r.id = e.reversal_entry_id AND r.company_id = e.company_id
  WHERE e.company_id = p_company AND e.entry_date <= p_as_of
), source_lines AS MATERIALIZED (
  SELECT l.id, l.journal_entry_id, l.account_id, l.line_number, l.debit_amount, l.credit_amount,
    l.line_description, e.status,
    balance_sheet_private.finite_amount(l.debit_amount) AS debit,
    balance_sheet_private.finite_amount(l.credit_amount) AS credit,
    a.id AS owned_account_id
  FROM public.journal_entry_lines l JOIN entries e ON e.id = l.journal_entry_id
  LEFT JOIN public.chart_of_accounts a ON a.id = l.account_id AND a.company_id = p_company
), entry_totals AS (
  SELECT e.id, e.total_debit, e.total_credit, count(l.id) AS n,
    COALESCE(sum(l.debit),0) AS debit, COALESCE(sum(l.credit),0) AS credit
  FROM entries e LEFT JOIN source_lines l ON l.journal_entry_id = e.id
  WHERE e.status = 'posted' GROUP BY e.id,e.total_debit,e.total_credit
), account_seed AS (
  SELECT a.id, a.account_code AS code, a.account_name AS name, a.account_name_ar AS name_ar,
    balance_sheet_private.account_type(a.account_type) AS type, a.account_type AS raw_type,
    a.account_subtype AS subtype, a.balance_type, a.account_level AS level,
    COALESCE(a.is_header,false) AS is_header, COALESCE(a.is_active,true) AS is_active,
    a.parent_account_id, a.parent_account_code
  FROM public.chart_of_accounts a WHERE a.company_id = p_company
  UNION ALL
  SELECT DISTINCT COALESCE(l.account_id,'00000000-0000-0000-0000-000000000000'::uuid),
    'UNRESOLVED', 'Unresolved ledger account', 'حساب قيد غير صالح', 'unknown', NULL, NULL, NULL,
    NULL::integer, false, false, NULL::uuid, NULL::text
  FROM source_lines l WHERE l.owned_account_id IS NULL AND l.status = 'posted'
), accounts AS MATERIALIZED (
  SELECT a.*, balance_sheet_private.classification(a.type,a.subtype) AS classification,
    COALESCE(sum(l.debit),0) AS debit, COALESCE(sum(l.credit),0) AS credit,
    CASE WHEN a.type IN ('liability','equity','revenue') THEN
      COALESCE(sum(l.credit-l.debit),0) ELSE COALESCE(sum(l.debit-l.credit),0) END AS balance,
    count(l.id) AS movements
  FROM account_seed a LEFT JOIN source_lines l
    ON COALESCE(l.account_id,'00000000-0000-0000-0000-000000000000'::uuid) = a.id AND l.status = 'posted'
  GROUP BY a.id,a.code,a.name,a.name_ar,a.type,a.raw_type,a.subtype,a.balance_type,a.level,
    a.is_header,a.is_active,a.parent_account_id,a.parent_account_code
), totals AS (
  SELECT COALESCE(sum(balance) FILTER (WHERE type='asset'),0) AS assets,
    COALESCE(sum(balance) FILTER (WHERE type='liability'),0) AS liabilities,
    COALESCE(sum(balance) FILTER (WHERE type='equity'),0) AS equity_accounts,
    COALESCE(sum(balance) FILTER (WHERE type='revenue'),0) AS revenue,
    COALESCE(sum(balance) FILTER (WHERE type='expense'),0) AS expenses
  FROM accounts
), diagnostics AS (
  SELECT 'malformed_journal_lines' AS code, 'error' AS severity, count(*) AS n, NULL::jsonb AS detail FROM source_lines
    WHERE status='posted' AND (debit_amount::text IN ('NaN','Infinity','-Infinity')
      OR credit_amount::text IN ('NaN','Infinity','-Infinity') OR debit<0 OR credit<0
      OR (debit>0 AND credit>0) OR (debit=0 AND credit=0))
  UNION ALL SELECT 'insufficient_journal_lines','error',count(*),NULL::jsonb FROM entry_totals WHERE n<2
  UNION ALL SELECT 'unbalanced_journals','error',count(*),NULL::jsonb FROM entry_totals WHERE debit<>credit
  UNION ALL SELECT 'journal_header_mismatch','error',count(*),NULL::jsonb FROM entry_totals
    WHERE total_debit IS NULL OR total_credit IS NULL
      OR total_debit::text IN ('NaN','Infinity','-Infinity') OR total_credit::text IN ('NaN','Infinity','-Infinity')
      OR total_debit<>debit OR total_credit<>credit
  UNION ALL SELECT 'invalid_ledger_accounts','error',count(*),NULL::jsonb FROM source_lines WHERE status='posted' AND owned_account_id IS NULL
  UNION ALL SELECT 'unknown_account_types','error',count(*),NULL::jsonb FROM accounts WHERE type='unknown' AND movements>0
  UNION ALL SELECT 'unclassified_accounts','error',count(*),
    COALESCE(jsonb_agg(jsonb_build_object('id',a.id,'code',a.code) ORDER BY a.code),'[]'::jsonb)
    FROM accounts a
    WHERE a.type IN ('asset','liability') AND a.classification='unclassified' AND a.balance<>0
  UNION ALL SELECT 'missing_account_subtype','error',count(*),
    COALESCE(jsonb_agg(jsonb_build_object('id',a.id,'code',a.code) ORDER BY a.code),'[]'::jsonb)
    FROM accounts a
    WHERE a.type IN ('asset','liability') AND a.balance<>0
      AND NULLIF(btrim(COALESCE(a.subtype,'')),'') IS NULL
  UNION ALL SELECT 'balance_sheet_imbalance','error',count(*),NULL::jsonb FROM totals
    WHERE assets-liabilities-equity_accounts-revenue+expenses<>0
  UNION ALL SELECT 'legacy_posting_accounts','warning',count(*),NULL::jsonb FROM accounts
    WHERE movements>0 AND (is_header OR level IS NULL OR level<3)
  UNION ALL SELECT 'negative_asset_balances','warning',count(*),
    COALESCE(jsonb_agg(jsonb_build_object('id',a.id,'code',a.code,'balance',a.balance) ORDER BY a.code),'[]'::jsonb)
    FROM accounts a
    WHERE a.type='asset' AND a.balance<0 AND COALESCE(lower(btrim(a.subtype)),'') NOT IN
      ('contra_current_asset','contra_non_current_asset','accumulated_depreciation','accumulated_amortization','allowance_for_doubtful_accounts')
  UNION ALL SELECT 'draft_entries','warning',count(*),
    COALESCE((SELECT jsonb_agg(jsonb_build_object('id',d.id,'number',d.entry_number) ORDER BY d.entry_date,d.id)
      FROM (SELECT id, entry_number, entry_date FROM entries WHERE status IN ('draft','under_review','approved')
        ORDER BY entry_date, id LIMIT 100) d),'[]'::jsonb)
    FROM entries WHERE status IN ('draft','under_review','approved')
  UNION ALL SELECT 'reversals_after_date','warning',count(*),NULL::jsonb FROM entries
    WHERE status IN ('posted','reversed') AND (reversal_date>p_as_of OR reversed_at::date>p_as_of)
  UNION ALL SELECT 'legacy_reversed_entries','error',count(*),NULL::jsonb FROM entries WHERE status='reversed'
  UNION ALL SELECT 'invalid_reversal_link','error',count(*),NULL::jsonb FROM entries WHERE reversal_entry_id IS NOT NULL AND reversal_id IS NULL
  UNION ALL SELECT 'no_posted_entries','error',CASE WHEN EXISTS(SELECT 1 FROM entries WHERE status='posted') THEN 0 ELSE 1 END,NULL::jsonb
  UNION ALL SELECT 'no_expense_movements','warning',CASE WHEN EXISTS(SELECT 1 FROM accounts WHERE type='expense' AND movements>0) THEN 0 ELSE 1 END,NULL::jsonb
  UNION ALL SELECT 'no_equity_movements','warning',CASE WHEN EXISTS(SELECT 1 FROM accounts WHERE type='equity' AND movements>0) THEN 0 ELSE 1 END,NULL::jsonb
  UNION ALL SELECT 'no_fixed_asset_movements','warning',CASE WHEN EXISTS(SELECT 1 FROM accounts
    WHERE type='asset' AND movements>0 AND lower(btrim(subtype)) IN
      ('fixed_asset','fixed_assets','property_plant_equipment','accumulated_depreciation','contra_non_current_asset')) THEN 0 ELSE 1 END,NULL::jsonb
)
SELECT jsonb_build_object(
  'accounts',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'code',code,'name',name,'nameAr',name_ar,
    'type',type,'subtype',subtype,'classification',classification,'level',level,'isHeader',is_header,
    'isActive',is_active,'debit',debit,'credit',credit,'balance',balance) ORDER BY code,id) FROM accounts),'[]'::jsonb),
  'totals',(SELECT jsonb_build_object('assets',assets,'liabilities',liabilities,'equityAccounts',equity_accounts,
    'revenue',revenue,'expenses',expenses,'unclosedResult',revenue-expenses,'equity',equity_accounts+revenue-expenses,
    'liabilitiesAndEquity',liabilities+equity_accounts+revenue-expenses,
    'imbalance',assets-liabilities-equity_accounts-revenue+expenses,
    'postedEntries',(SELECT count(*) FROM entries WHERE status='posted'),
    'postedLines',(SELECT count(*) FROM source_lines WHERE status='posted'),
    'draftEntries',(SELECT count(*) FROM entries WHERE status IN ('draft','under_review','approved'))) FROM totals),
  'checks',COALESCE((SELECT jsonb_agg(jsonb_build_object('code',code,'severity',severity,'count',n,'asOfDate',p_as_of,'detail',detail) ORDER BY code)
    FROM diagnostics WHERE n>0),'[]'::jsonb),
  'source',jsonb_build_object(
    'accounts',COALESCE((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.id) FROM account_seed a),'[]'::jsonb),
    'entries',COALESCE((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.id) FROM entries e),'[]'::jsonb),
    'lines',COALESCE((SELECT jsonb_agg(to_jsonb(l) ORDER BY l.id) FROM source_lines l),'[]'::jsonb))
);
$fn$;

-- ---------------------------------------------------------------------------
-- balance_sheet_private.approve_report: negative asset balances now require a
-- documented explanation at the reporting date before approval.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION balance_sheet_private.approve_report(p_report uuid,p_notes text,p_confirmations jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET lock_timeout = '5s' AS $fn$
DECLARE v_report public.professional_balance_sheet_reports%ROWTYPE; v_current jsonb;
  v_negative jsonb; v_item jsonb; v_missing text := '';
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
  IF v_report.created_by=auth.uid() THEN RAISE EXCEPTION 'Generator cannot approve their own balance sheet' USING ERRCODE='42501'; END IF;
  IF v_report.status<>'draft' THEN RAISE EXCEPTION 'Only draft balance sheets can be approved' USING ERRCODE='22023'; END IF;
  IF p_notes IS NULL OR length(btrim(p_notes))<20 OR length(p_notes)>10000 THEN
    RAISE EXCEPTION 'Review notes of 20 to 10000 characters are required' USING ERRCODE='22023';
  END IF;
  IF p_confirmations IS NULL OR NOT (p_confirmations @> '{"assets":true,"liabilities":true,"equity":true,"reconciliation":true,"completeness":true}'::jsonb) THEN
    RAISE EXCEPTION 'All five accountant confirmations are required' USING ERRCODE='22023';
  END IF;
  -- Prevent ledger/metadata writers from racing the approval source check and transition.
  -- The locks last only for this command; a new later ledger change never rewrites saved history.
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
    VALUES(v_report.id,v_report.company_id,'approved',auth.uid(),btrim(p_notes),v_report.source_fingerprint);
  RETURN to_jsonb(v_report);
END;
$fn$;

-- ---------------------------------------------------------------------------
-- financial_statement_private.approve_report: same documented-explanation rule,
-- evaluated at the configured position date.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION financial_statement_private.approve_report(p_id uuid,p_notes text,p_confirmations jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET lock_timeout='5s' AS $f$
DECLARE v_row public.professional_financial_statement_packages%ROWTYPE;v_current jsonb;
  v_as_of date;v_negative jsonb;v_item jsonb;v_missing text := '';
BEGIN
 IF current_setting('transaction_isolation')<>'read committed' THEN
   RAISE EXCEPTION 'Financial statement approval requires read committed isolation' USING ERRCODE='25001';
 END IF;
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_row FROM public.professional_financial_statement_packages WHERE id=p_id AND company_id=public.get_user_company_id() FOR UPDATE;
 IF NOT FOUND OR NOT balance_sheet_private.has_access(v_row.company_id,'approve') THEN RAISE EXCEPTION 'Not authorized to approve financial statements' USING ERRCODE='42501'; END IF;
 IF v_row.created_by=auth.uid() THEN RAISE EXCEPTION 'Generator cannot approve their own financial statements' USING ERRCODE='42501'; END IF;
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
 VALUES(v_row.id,v_row.company_id,'approved',auth.uid(),btrim(p_notes),v_row.source_fingerprint);
 RETURN to_jsonb(v_row);
END;
$f$;

NOTIFY pgrst,'reload schema';
COMMIT;
