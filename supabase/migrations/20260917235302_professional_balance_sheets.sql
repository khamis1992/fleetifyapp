-- Server-calculated statements of financial position, with independent internal approval.
-- Schema verified read-only against information_schema on 2026-09-18.
-- No ledger, vehicle, chart-of-accounts or historical report data is changed here.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE SCHEMA IF NOT EXISTS balance_sheet_private;
REVOKE ALL ON SCHEMA balance_sheet_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA balance_sheet_private TO authenticated;

CREATE FUNCTION balance_sheet_private.has_access(p_company uuid, p_action text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
  IF auth.uid() IS NULL OR p_company IS NULL
    OR public.get_user_company_id() IS DISTINCT FROM p_company
    OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid()
      AND p.company_id = p_company AND COALESCE(p.is_active, true))
    -- Respect explicit system-access revocation even when a finance/admin role remains.
    -- Employee existence/personnel is_active are not required by the canonical finance
    -- helper: legacy administrators can have no employee or an inactive personnel row.
    OR EXISTS (SELECT 1 FROM public.employees e WHERE e.user_id = auth.uid() AND e.company_id = p_company
      AND (e.has_system_access = false OR (NULLIF(btrim(e.account_status),'') IS NOT NULL
        AND lower(btrim(e.account_status)) <> 'active')))
    OR p_action IS NULL OR p_action NOT IN ('view', 'save', 'approve') THEN
    RETURN false;
  END IF;
  IF NOT public.is_finance_action_authorized(auth.uid(), p_company,
    ARRAY['finance.reports.view'], ARRAY['super_admin', 'admin', 'company_admin', 'accountant', 'manager']) THEN
    RETURN false;
  END IF;
  RETURN p_action = 'view' OR public.is_finance_action_authorized(auth.uid(), p_company,
    ARRAY['finance.reports.' || p_action], CASE WHEN p_action='save'
      THEN ARRAY['super_admin', 'admin', 'company_admin', 'accountant', 'manager']
      ELSE ARRAY['super_admin', 'admin', 'company_admin', 'accountant'] END);
END;
$fn$;
REVOKE ALL ON FUNCTION balance_sheet_private.has_access(uuid, text) FROM PUBLIC, anon, authenticated;
-- Safe capability predicate: accepts no actor override; also used by SELECT RLS.
GRANT EXECUTE ON FUNCTION balance_sheet_private.has_access(uuid, text) TO authenticated;

CREATE TABLE public.professional_balance_sheet_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  as_of_date date NOT NULL,
  comparison_date date,
  payload jsonb NOT NULL,
  source_fingerprint text NOT NULL CHECK (source_fingerprint ~ '^[0-9a-f]{64}$'),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'voided')),
  created_by uuid NOT NULL,
  created_by_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid,
  approved_by_name text,
  approved_at timestamptz,
  notes text,
  review_notes text,
  confirmations jsonb,
  voided_by uuid,
  voided_at timestamptz,
  void_reason text,
  CONSTRAINT professional_balance_sheet_dates CHECK (
    isfinite(as_of_date) AND as_of_date >= DATE '0001-01-01'
    AND (comparison_date IS NULL OR (isfinite(comparison_date)
      AND comparison_date >= DATE '0001-01-01' AND comparison_date < as_of_date))),
  CONSTRAINT professional_balance_sheet_approval CHECK (
    status <> 'approved' OR (approved_by IS NOT NULL AND approved_by <> created_by
      AND approved_at IS NOT NULL AND approved_by_name IS NOT NULL
      AND review_notes IS NOT NULL AND confirmations IS NOT NULL AND length(btrim(review_notes)) >= 20
      AND confirmations @> '{"assets":true,"liabilities":true,"equity":true,"reconciliation":true,"completeness":true}'::jsonb)),
  CONSTRAINT professional_balance_sheet_void CHECK (
    status <> 'voided' OR (voided_by IS NOT NULL AND voided_at IS NOT NULL AND void_reason IS NOT NULL AND length(btrim(void_reason)) >= 10))
);
CREATE INDEX professional_balance_sheet_reports_company_date
  ON public.professional_balance_sheet_reports(company_id, created_at DESC, id);
ALTER TABLE public.professional_balance_sheet_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.professional_balance_sheet_reports FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.professional_balance_sheet_reports TO authenticated;
CREATE POLICY professional_balance_sheet_reports_read ON public.professional_balance_sheet_reports
  FOR SELECT TO authenticated USING (balance_sheet_private.has_access(company_id, 'view'));

CREATE TABLE balance_sheet_private.report_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.professional_balance_sheet_reports(id),
  company_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('created', 'approved', 'voided')),
  actor_id uuid NOT NULL,
  reason text,
  source_fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE balance_sheet_private.report_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON balance_sheet_private.report_events FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION balance_sheet_private.protect_report()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $fn$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Saved balance sheets cannot be deleted; void with a reason instead';
  END IF;
  IF OLD.status = 'draft' AND NEW.status = 'approved'
    AND (to_jsonb(NEW) - ARRAY['status','approved_by','approved_by_name','approved_at','review_notes','confirmations'])
      IS NOT DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','approved_by','approved_by_name','approved_at','review_notes','confirmations']) THEN
    RETURN NEW;
  END IF;
  IF OLD.status IN ('draft', 'approved') AND NEW.status = 'voided'
    AND (to_jsonb(NEW) - ARRAY['status','voided_by','voided_at','void_reason'])
      IS NOT DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','voided_by','voided_at','void_reason']) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Saved balance sheet content is immutable; create a new version';
END;
$fn$;
CREATE TRIGGER professional_balance_sheet_reports_immutable
  BEFORE UPDATE OR DELETE ON public.professional_balance_sheet_reports
  FOR EACH ROW EXECUTE FUNCTION balance_sheet_private.protect_report();

CREATE FUNCTION balance_sheet_private.protect_event()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $fn$
BEGIN
  RAISE EXCEPTION 'Balance sheet audit events are immutable';
END;
$fn$;
CREATE TRIGGER professional_balance_sheet_events_immutable
  BEFORE UPDATE OR DELETE ON balance_sheet_private.report_events
  FOR EACH ROW EXECUTE FUNCTION balance_sheet_private.protect_event();

CREATE FUNCTION balance_sheet_private.account_type(p_type text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $fn$
  SELECT CASE lower(btrim(COALESCE(p_type, '')))
    WHEN 'assets' THEN 'asset' WHEN 'asset' THEN 'asset'
    WHEN 'liabilities' THEN 'liability' WHEN 'liability' THEN 'liability'
    WHEN 'equity' THEN 'equity' WHEN 'revenue' THEN 'revenue' WHEN 'income' THEN 'revenue'
    WHEN 'expenses' THEN 'expense' WHEN 'expense' THEN 'expense' ELSE 'unknown' END;
$fn$;
CREATE FUNCTION balance_sheet_private.classification(p_type text, p_subtype text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $fn$
  SELECT CASE
    WHEN p_type = 'equity' THEN 'equity'
    WHEN p_type IN ('revenue', 'expense') THEN 'result'
    WHEN p_type = 'asset' AND lower(btrim(p_subtype)) IN
      ('current_asset','current_assets','cash','cash_and_cash_equivalents','bank','accounts_receivable',
       'receivables','inventory','prepayments','prepaid_expenses','contra_current_asset','allowance_for_doubtful_accounts') THEN 'current'
    WHEN p_type = 'asset' AND lower(btrim(p_subtype)) IN
      ('non_current_asset','non_current_assets','noncurrent_asset','noncurrent_assets','fixed_asset','fixed_assets',
       'property_plant_equipment','intangible_asset','intangible_assets','long_term_investments',
       'accumulated_depreciation','accumulated_amortization','contra_non_current_asset') THEN 'non_current'
    WHEN p_type = 'liability' AND lower(btrim(p_subtype)) IN
      ('current_liability','current_liabilities','accounts_payable','accrued_expenses','short_term_loans',
       'tax_payable','customer_deposits') THEN 'current'
    WHEN p_type = 'liability' AND lower(btrim(p_subtype)) IN
      ('non_current_liability','non_current_liabilities','noncurrent_liability','noncurrent_liabilities',
       'long_term_liability','long_term_liabilities','long_term_loans','long_term_debt') THEN 'non_current'
    ELSE 'unclassified' END;
$fn$;
CREATE FUNCTION balance_sheet_private.finite_amount(p_amount numeric)
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path = '' AS $fn$
  SELECT CASE WHEN p_amount::text IN ('NaN','Infinity','-Infinity') THEN 0 ELSE COALESCE(p_amount,0) END;
$fn$;

-- A STABLE calculator gives every read in a single invocation the same MVCC snapshot.
-- Include all posted lines, including inactive and legacy header accounts, without REST pagination.
CREATE FUNCTION balance_sheet_private.period(p_company uuid, p_as_of date)
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
  SELECT 'malformed_journal_lines' AS code, 'error' AS severity, count(*) AS n FROM source_lines
    WHERE status='posted' AND (debit_amount::text IN ('NaN','Infinity','-Infinity')
      OR credit_amount::text IN ('NaN','Infinity','-Infinity') OR debit<0 OR credit<0
      OR (debit>0 AND credit>0) OR (debit=0 AND credit=0))
  UNION ALL SELECT 'insufficient_journal_lines','error',count(*) FROM entry_totals WHERE n<2
  UNION ALL SELECT 'unbalanced_journals','error',count(*) FROM entry_totals WHERE debit<>credit
  UNION ALL SELECT 'journal_header_mismatch','error',count(*) FROM entry_totals
    WHERE total_debit IS NULL OR total_credit IS NULL
      OR total_debit::text IN ('NaN','Infinity','-Infinity') OR total_credit::text IN ('NaN','Infinity','-Infinity')
      OR total_debit<>debit OR total_credit<>credit
  UNION ALL SELECT 'invalid_ledger_accounts','error',count(*) FROM source_lines WHERE status='posted' AND owned_account_id IS NULL
  UNION ALL SELECT 'unknown_account_types','error',count(*) FROM accounts WHERE type='unknown' AND movements>0
  UNION ALL SELECT 'unclassified_accounts','error',count(*) FROM accounts
    WHERE type IN ('asset','liability') AND classification='unclassified' AND balance<>0
  UNION ALL SELECT 'balance_sheet_imbalance','error',count(*) FROM totals
    WHERE assets-liabilities-equity_accounts-revenue+expenses<>0
  UNION ALL SELECT 'legacy_posting_accounts','warning',count(*) FROM accounts
    WHERE movements>0 AND (is_header OR level IS NULL OR level<3)
  UNION ALL SELECT 'negative_asset_balances','warning',count(*) FROM accounts
    WHERE type='asset' AND balance<0 AND COALESCE(lower(btrim(subtype)),'') NOT IN
      ('contra_current_asset','contra_non_current_asset','accumulated_depreciation','accumulated_amortization','allowance_for_doubtful_accounts')
  UNION ALL SELECT 'draft_entries','warning',count(*) FROM entries WHERE status IN ('draft','under_review','approved')
  UNION ALL SELECT 'reversals_after_date','warning',count(*) FROM entries
    WHERE status IN ('posted','reversed') AND (reversal_date>p_as_of OR reversed_at::date>p_as_of)
  UNION ALL SELECT 'legacy_reversed_entries','error',count(*) FROM entries WHERE status='reversed'
  UNION ALL SELECT 'invalid_reversal_link','error',count(*) FROM entries WHERE reversal_entry_id IS NOT NULL AND reversal_id IS NULL
  UNION ALL SELECT 'no_posted_entries','error',CASE WHEN EXISTS(SELECT 1 FROM entries WHERE status='posted') THEN 0 ELSE 1 END
  UNION ALL SELECT 'no_expense_movements','warning',CASE WHEN EXISTS(SELECT 1 FROM accounts WHERE type='expense' AND movements>0) THEN 0 ELSE 1 END
  UNION ALL SELECT 'no_equity_movements','warning',CASE WHEN EXISTS(SELECT 1 FROM accounts WHERE type='equity' AND movements>0) THEN 0 ELSE 1 END
  UNION ALL SELECT 'no_fixed_asset_movements','warning',CASE WHEN EXISTS(SELECT 1 FROM accounts
    WHERE type='asset' AND movements>0 AND lower(btrim(subtype)) IN
      ('fixed_asset','fixed_assets','property_plant_equipment','accumulated_depreciation','contra_non_current_asset')) THEN 0 ELSE 1 END
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
  'checks',COALESCE((SELECT jsonb_agg(jsonb_build_object('code',code,'severity',severity,'count',n,'asOfDate',p_as_of) ORDER BY code)
    FROM diagnostics WHERE n>0),'[]'::jsonb),
  'source',jsonb_build_object(
    'accounts',COALESCE((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.id) FROM account_seed a),'[]'::jsonb),
    'entries',COALESCE((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.id) FROM entries e),'[]'::jsonb),
    'lines',COALESCE((SELECT jsonb_agg(to_jsonb(l) ORDER BY l.id) FROM source_lines l),'[]'::jsonb))
);
$fn$;

CREATE FUNCTION balance_sheet_private.calculate(p_company uuid,p_as_of date,p_comparison date)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = '' SET timezone = 'UTC' AS $fn$
DECLARE v_current jsonb; v_comparison jsonb; v_company jsonb; v_accounts jsonb;
  v_checks jsonb; v_vehicles jsonb; v_payload jsonb; v_fingerprint text;
BEGIN
  IF p_as_of IS NULL OR NOT isfinite(p_as_of) OR p_as_of < DATE '0001-01-01' OR p_as_of > (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date
    OR (p_comparison IS NOT NULL AND (NOT isfinite(p_comparison) OR p_comparison < DATE '0001-01-01' OR p_comparison >= p_as_of)) THEN
    RAISE EXCEPTION 'Invalid balance sheet date or comparison date' USING ERRCODE='22023';
  END IF;
  SELECT jsonb_build_object('id',c.id,'name',COALESCE(c.name,''),'nameAr',c.name_ar,'commercialRegister',c.commercial_register,
    'currency',COALESCE(upper(btrim(c.currency)),''),'address',COALESCE(NULLIF(btrim(c.address_ar),''),c.address)) INTO v_company
  FROM public.companies c WHERE c.id=p_company;
  IF v_company IS NULL THEN RAISE EXCEPTION 'Company not found' USING ERRCODE='22023'; END IF;
  v_current:=balance_sheet_private.period(p_company,p_as_of);
  IF p_comparison IS NOT NULL THEN v_comparison:=balance_sheet_private.period(p_company,p_comparison); END IF;
  v_checks:=(v_current->'checks') || COALESCE(v_comparison->'checks','[]'::jsonb);
  IF COALESCE(NULLIF(btrim(v_company->>'name'),''),NULLIF(btrim(v_company->>'nameAr'),'')) IS NULL
    OR NULLIF(btrim(v_company->>'commercialRegister'),'') IS NULL THEN
    v_checks:=v_checks||jsonb_build_array(jsonb_build_object('code','missing_company_identity','severity','error','count',1,'asOfDate',p_as_of));
  END IF;
  IF COALESCE(v_company->>'currency','') !~ '^[A-Z]{3}$' THEN
    v_checks:=v_checks||jsonb_build_array(jsonb_build_object('code','missing_company_currency','severity','error','count',1,'asOfDate',p_as_of));
  END IF;
  -- These are explicitly CURRENT operational-data warnings, never historical asset valuations.
  SELECT jsonb_build_object('missingCost',count(*) FILTER (WHERE purchase_cost IS NULL OR purchase_cost<=0
      OR purchase_cost::text IN ('NaN','Infinity','-Infinity')),
    'missingPurchaseDate',count(*) FILTER (WHERE purchase_date IS NULL),
    'activeVehicles',count(*)) INTO v_vehicles FROM public.vehicles
  WHERE company_id=p_company AND COALESCE(is_active,true);
  IF (v_vehicles->>'missingCost')::bigint>0 THEN
    v_checks:=v_checks||jsonb_build_array(jsonb_build_object('code','current_vehicles_missing_cost','severity','warning',
      'count',(v_vehicles->>'missingCost')::bigint,'asOfDate',(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date));
  END IF;
  IF (v_vehicles->>'missingPurchaseDate')::bigint>0 THEN
    v_checks:=v_checks||jsonb_build_array(jsonb_build_object('code','current_vehicles_missing_purchase_date','severity','warning',
      'count',(v_vehicles->>'missingPurchaseDate')::bigint,'asOfDate',(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date));
  END IF;
  SELECT COALESCE(jsonb_agg(c.value||jsonb_build_object('comparisonBalance',
    COALESCE((p.value->>'balance')::numeric,0))
    ORDER BY c.value->>'code',c.value->>'id'),'[]'::jsonb) INTO v_accounts
  FROM jsonb_array_elements(v_current->'accounts') c
  LEFT JOIN jsonb_array_elements(COALESCE(v_comparison->'accounts','[]'::jsonb)) p ON p.value->>'id'=c.value->>'id';
  -- Hash all source rows and metadata, not only net totals; timestamps/capabilities are not evidence.
  v_fingerprint:=encode(sha256(convert_to(jsonb_build_object('version',1,'company',v_company,'asOf',p_as_of,
    'comparisonDate',p_comparison,'current',v_current->'source','comparison',v_comparison->'source',
    'vehicles',v_vehicles)::text,'UTF8')),'hex');
  v_payload:=jsonb_build_object('version',1,'company',v_company,'asOfDate',p_as_of,'comparisonDate',p_comparison,
    'generatedAt',statement_timestamp(),'accounts',v_accounts,'current',v_current->'totals',
    'comparison',v_comparison->'totals','checks',v_checks,'fingerprint',v_fingerprint,
    'permissions',jsonb_build_object('canSave',balance_sheet_private.has_access(p_company,'save'),
      'canApprove',balance_sheet_private.has_access(p_company,'approve')));
  RETURN v_payload;
END;
$fn$;

CREATE FUNCTION balance_sheet_private.actor_name(p_company uuid)
RETURNS text LANGUAGE sql STABLE SET search_path = '' AS $fn$
  SELECT COALESCE(NULLIF(btrim(concat_ws(' ',p.first_name_ar,p.last_name_ar)),''),
    NULLIF(btrim(concat_ws(' ',p.first_name,p.last_name)),''),auth.uid()::text)
  FROM public.profiles p WHERE p.user_id=auth.uid() AND p.company_id=p_company ORDER BY p.id LIMIT 1;
$fn$;

CREATE FUNCTION balance_sheet_private.get_report(p_company uuid,p_as_of date,p_comparison date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
  IF NOT balance_sheet_private.has_access(p_company,'view') THEN
    RAISE EXCEPTION 'Not authorized to view this company balance sheet' USING ERRCODE='42501';
  END IF;
  RETURN balance_sheet_private.calculate(p_company,p_as_of,p_comparison);
END;
$fn$;

CREATE FUNCTION balance_sheet_private.save_report(p_company uuid,p_as_of date,p_comparison date,p_notes text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE v_payload jsonb; v_report public.professional_balance_sheet_reports%ROWTYPE;
BEGIN
  IF NOT balance_sheet_private.has_access(p_company,'save') THEN
    RAISE EXCEPTION 'Not authorized to save this company balance sheet' USING ERRCODE='42501';
  END IF;
  IF length(COALESCE(p_notes,''))>10000 THEN RAISE EXCEPTION 'Report notes are too long' USING ERRCODE='22023'; END IF;
  v_payload:=balance_sheet_private.calculate(p_company,p_as_of,p_comparison);
  INSERT INTO public.professional_balance_sheet_reports(company_id,as_of_date,comparison_date,payload,source_fingerprint,
    created_by,created_by_name,notes)
  VALUES(p_company,p_as_of,p_comparison,v_payload,v_payload->>'fingerprint',auth.uid(),balance_sheet_private.actor_name(p_company),NULLIF(btrim(p_notes),''))
  RETURNING * INTO v_report;
  INSERT INTO balance_sheet_private.report_events(report_id,company_id,action,actor_id,reason,source_fingerprint)
    VALUES(v_report.id,p_company,'created',auth.uid(),v_report.notes,v_report.source_fingerprint);
  RETURN to_jsonb(v_report);
END;
$fn$;

CREATE FUNCTION balance_sheet_private.approve_report(p_report uuid,p_notes text,p_confirmations jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET lock_timeout = '5s' AS $fn$
DECLARE v_report public.professional_balance_sheet_reports%ROWTYPE; v_current jsonb;
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
  UPDATE public.professional_balance_sheet_reports SET status='approved',approved_by=auth.uid(),
    approved_by_name=balance_sheet_private.actor_name(v_report.company_id),approved_at=clock_timestamp(),
    review_notes=btrim(p_notes),confirmations=p_confirmations WHERE id=p_report RETURNING * INTO v_report;
  INSERT INTO balance_sheet_private.report_events(report_id,company_id,action,actor_id,reason,source_fingerprint)
    VALUES(v_report.id,v_report.company_id,'approved',auth.uid(),btrim(p_notes),v_report.source_fingerprint);
  RETURN to_jsonb(v_report);
END;
$fn$;

CREATE FUNCTION balance_sheet_private.list_reports(p_company uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE v_result jsonb;
BEGIN
  IF NOT balance_sheet_private.has_access(p_company,'view') THEN
    RAISE EXCEPTION 'Not authorized to view this company balance sheets' USING ERRCODE='42501';
  END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC,r.id),'[]'::jsonb) INTO v_result
    FROM (SELECT * FROM public.professional_balance_sheet_reports WHERE company_id=p_company
      ORDER BY created_at DESC,id LIMIT 50) r;
  RETURN v_result;
END;
$fn$;

CREATE FUNCTION balance_sheet_private.void_report(p_report uuid,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE v_report public.professional_balance_sheet_reports%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_report FROM public.professional_balance_sheet_reports
    WHERE id=p_report AND company_id=public.get_user_company_id() FOR UPDATE;
  IF NOT FOUND OR NOT balance_sheet_private.has_access(v_report.company_id,'view')
    OR NOT ((v_report.created_by=auth.uid() AND balance_sheet_private.has_access(v_report.company_id,'save'))
      OR balance_sheet_private.has_access(v_report.company_id,'approve')) THEN
    RAISE EXCEPTION 'Not authorized to void this balance sheet' USING ERRCODE='42501';
  END IF;
  IF v_report.status='voided' THEN RAISE EXCEPTION 'Balance sheet is already voided' USING ERRCODE='22023'; END IF;
  IF p_reason IS NULL OR length(btrim(p_reason))<10 OR length(p_reason)>10000 THEN
    RAISE EXCEPTION 'A void reason of 10 to 10000 characters is required' USING ERRCODE='22023';
  END IF;
  UPDATE public.professional_balance_sheet_reports SET status='voided',voided_by=auth.uid(),
    voided_at=clock_timestamp(),void_reason=btrim(p_reason) WHERE id=p_report RETURNING * INTO v_report;
  INSERT INTO balance_sheet_private.report_events(report_id,company_id,action,actor_id,reason,source_fingerprint)
    VALUES(v_report.id,v_report.company_id,'voided',auth.uid(),btrim(p_reason),v_report.source_fingerprint);
  RETURN to_jsonb(v_report);
END;
$fn$;

-- Public PostgREST facades are invoker-only. Private gateways repeat authorization;
-- raw calculators, trigger functions and actor-name helpers remain non-callable.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA balance_sheet_private FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION balance_sheet_private.has_access(uuid,text),
  balance_sheet_private.get_report(uuid,date,date),balance_sheet_private.save_report(uuid,date,date,text),
  balance_sheet_private.approve_report(uuid,text,jsonb),balance_sheet_private.list_reports(uuid),
  balance_sheet_private.void_report(uuid,text) TO authenticated;

CREATE FUNCTION public.get_professional_balance_sheet_v1(p_company_id uuid,p_as_of date,p_comparison_date date DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $fn$
  SELECT balance_sheet_private.get_report(p_company_id,p_as_of,p_comparison_date);
$fn$;
CREATE FUNCTION public.save_professional_balance_sheet_v1(p_company_id uuid,p_as_of date,p_comparison_date date DEFAULT NULL,p_notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $fn$
  SELECT balance_sheet_private.save_report(p_company_id,p_as_of,p_comparison_date,p_notes);
$fn$;
CREATE FUNCTION public.approve_professional_balance_sheet_v1(p_report_id uuid,p_review_notes text,p_confirmations jsonb)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $fn$
  SELECT balance_sheet_private.approve_report(p_report_id,p_review_notes,p_confirmations);
$fn$;
CREATE FUNCTION public.list_professional_balance_sheets_v1(p_company_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $fn$
  SELECT balance_sheet_private.list_reports(p_company_id);
$fn$;
CREATE FUNCTION public.void_professional_balance_sheet_v1(p_report_id uuid,p_reason text)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $fn$
  SELECT balance_sheet_private.void_report(p_report_id,p_reason);
$fn$;
REVOKE ALL ON FUNCTION public.get_professional_balance_sheet_v1(uuid,date,date),
  public.save_professional_balance_sheet_v1(uuid,date,date,text),public.approve_professional_balance_sheet_v1(uuid,text,jsonb),
  public.list_professional_balance_sheets_v1(uuid),public.void_professional_balance_sheet_v1(uuid,text)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_professional_balance_sheet_v1(uuid,date,date),
  public.save_professional_balance_sheet_v1(uuid,date,date,text),public.approve_professional_balance_sheet_v1(uuid,text,jsonb),
  public.list_professional_balance_sheets_v1(uuid),public.void_professional_balance_sheet_v1(uuid,text) TO authenticated;
COMMENT ON TABLE public.professional_balance_sheet_reports IS
  'Immutable server-generated statements of financial position. Approval is internal accountant review, not external audit certification.';
NOTIFY pgrst,'reload schema';
COMMIT;
