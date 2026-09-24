-- Rollback of 20260923140000_balance_sheet_source_fingerprint.sql
-- Restores the blob-emitting period()/assemble_report()/calculate() versions
-- from 20260921120100 and 20260918014423 respectively, and drops the
-- fingerprint helpers.
BEGIN;
SET LOCAL lock_timeout = '5s';

DROP FUNCTION IF EXISTS balance_sheet_private.source_fingerprint(uuid, date);
DROP FUNCTION IF EXISTS balance_sheet_private.record_hash(text);

-- period(): restore 'source' blob emission (version from 20260921120100).
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

-- assemble_report(): restore blob-hashing fingerprint (version from 20260918014423).
CREATE OR REPLACE FUNCTION balance_sheet_private.assemble_report(p_company uuid,p_as_of date,p_comparison date,p_current jsonb,p_comparison_source jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = '' SET timezone = 'UTC' AS $fn$
DECLARE v_current jsonb:=p_current; v_comparison jsonb:=p_comparison_source; v_company jsonb; v_accounts jsonb;
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

  v_checks:=(v_current->'checks') || COALESCE(v_comparison->'checks','[]'::jsonb);
  IF COALESCE(NULLIF(btrim(v_company->>'name'),''),NULLIF(btrim(v_company->>'nameAr'),'')) IS NULL
    OR NULLIF(btrim(v_company->>'commercialRegister'),'') IS NULL THEN
    v_checks:=v_checks||jsonb_build_array(jsonb_build_object('code','missing_company_identity','severity','error','count',1,'asOfDate',p_as_of));
  END IF;
  IF COALESCE(v_company->>'currency','') !~ '^[A-Z]{3}$' THEN
    v_checks:=v_checks||jsonb_build_array(jsonb_build_object('code','missing_company_currency','severity','error','count',1,'asOfDate',p_as_of));
  END IF;
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

NOTIFY pgrst,'reload schema';
COMMIT;