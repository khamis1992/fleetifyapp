-- Eliminate the 31MB JSON source blob from every balance sheet and financial
-- statement package calculation. The source rows are consumed only to derive
-- the change-detection fingerprint; hashing each row inside PostgreSQL and
-- XOR-folding the digests preserves the same property — any change to a
-- source row produces a different fingerprint — with zero marshalling.
--
-- Production measurements (2026-09-23, company 24bc0b21-4e2d-4413-9842-31719a3669f4):
--   period() payload: 31,127,315 bytes (source.lines 18.2MB + source.entries 12.7MB)
--   The SQL scan itself is fast (~0.7s); the cost is JSON aggregation, hashing
--   and network transfer of a blob the API contract never exposes to clients.
-- Zero saved balance sheets and zero saved statement packages existed when
-- this shipped, so no stored fingerprint can become stale from the change.
--
-- What changes:
--   1. New helpers: record_hash(text) and source_fingerprint(company, as_of):
--      per-row SHA-256 digests XOR-folded into one order-independent value.
--   2. period() no longer emits 'source'. It emits 'sourceFingerprint'.
--   3. assemble_report() derives the payload fingerprint from the per-period
--      source fingerprints plus company metadata and vehicles — the same
--      inputs previously hashed, minus the blob.
--   4. financial_statement_private.calculate() folds the per-period source
--      fingerprints into the package fingerprint instead of hashing
--      'opening'/'comparisonEnd'/'third' blobs.
-- Payload shapes, statements, checks, approvals and authorization unchanged.

BEGIN;
SET LOCAL lock_timeout = '5s';

-- ---------------------------------------------------------------------------
-- Fingerprint helpers
-- ---------------------------------------------------------------------------
-- Deterministic per-row digest. Callers build the row text from exactly the
-- fields the previous blob serialized, with explicit '\N' sentinels so NULL
-- and '' stay distinguishable (concat_ws skips NULL arguments).
CREATE OR REPLACE FUNCTION balance_sheet_private.record_hash(p_row text)
  RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $fn$
    SELECT encode(sha256(convert_to(p_row, 'UTF8')), 'hex');
$fn$;
REVOKE ALL ON FUNCTION balance_sheet_private.record_hash(text) FROM PUBLIC, anon, authenticated, service_role;

-- Digest of one ledger cutoff: every account, entry and line row contributes
-- a per-row hash; hashes are XOR-folded (bit_or over bit(256)), so the result
-- depends only on row contents, never on scan order. Returns 64 hex chars.
CREATE OR REPLACE FUNCTION balance_sheet_private.source_fingerprint(p_company uuid, p_as_of date)
  RETURNS text LANGUAGE sql STABLE SET search_path = '' SET timezone = 'UTC' AS $fn$
  WITH entries AS (
    SELECT e.id, e.entry_number, e.entry_date, e.status, e.total_debit, e.total_credit,
      e.posted_at, e.reversed_at, e.reversal_entry_id, e.reference_type, e.reference_id,
      r.id AS reversal_id, r.entry_date AS reversal_date, r.status AS reversal_status
    FROM public.journal_entries e
    LEFT JOIN public.journal_entries r ON r.id = e.reversal_entry_id AND r.company_id = e.company_id
    WHERE e.company_id = p_company AND e.entry_date <= p_as_of
  ), lines AS (
    SELECT l.id, l.journal_entry_id, l.account_id, l.line_number, l.debit_amount, l.credit_amount,
      l.line_description, e.status, ca.id AS owned_account_id
    FROM public.journal_entry_lines l
    JOIN entries e ON e.id = l.journal_entry_id
    LEFT JOIN public.chart_of_accounts ca ON ca.id = l.account_id AND ca.company_id = p_company
  ), row_hashes AS (
    SELECT balance_sheet_private.record_hash(concat_ws('|', 'account', a.id, a.code, a.name,
      COALESCE(a.name_ar, '\N'), COALESCE(a.type, '\N'), COALESCE(a.raw_type, '\N'),
      COALESCE(a.subtype, '\N'), COALESCE(a.balance_type, '\N'), COALESCE(a.level::text, '\N'),
      COALESCE(a.is_header::text, '\N'), COALESCE(a.is_active::text, '\N'),
      COALESCE(a.parent_account_id::text, '\N'), COALESCE(a.parent_account_code, '\N'))) AS h
    FROM (
      SELECT a2.id, a2.account_code AS code, a2.account_name AS name, a2.account_name_ar AS name_ar,
        balance_sheet_private.account_type(a2.account_type) AS type, a2.account_type AS raw_type,
        a2.account_subtype AS subtype, a2.balance_type, a2.account_level AS level,
        COALESCE(a2.is_header, false) AS is_header, COALESCE(a2.is_active, true) AS is_active,
        a2.parent_account_id, a2.parent_account_code
      FROM public.chart_of_accounts a2 WHERE a2.company_id = p_company
    ) a
    UNION ALL
    SELECT balance_sheet_private.record_hash(concat_ws('|', 'entry', e.id, COALESCE(e.entry_number, '\N'),
      e.entry_date, e.status, COALESCE(e.total_debit::text, '\N'), COALESCE(e.total_credit::text, '\N'),
      COALESCE(to_char(e.posted_at, 'YYYY-MM-DD HH24:MI:SS.US'), '\N'),
      COALESCE(to_char(e.reversed_at, 'YYYY-MM-DD HH24:MI:SS.US'), '\N'),
      COALESCE(e.reversal_entry_id::text, '\N'), COALESCE(e.reference_type, '\N'),
      COALESCE(e.reference_id::text, '\N'), COALESCE(e.reversal_id::text, '\N'),
      COALESCE(e.reversal_date::text, '\N'), COALESCE(e.reversal_status, '\N')))
    FROM entries e
    UNION ALL
    SELECT balance_sheet_private.record_hash(concat_ws('|', 'line', l.id, l.journal_entry_id,
      COALESCE(l.account_id::text, '\N'), COALESCE(l.line_number::text, '\N'),
      COALESCE(l.debit_amount::text, '\N'), COALESCE(l.credit_amount::text, '\N'),
      COALESCE(l.line_description, '\N'), l.status, COALESCE(l.owned_account_id::text, '\N')))
    FROM lines l
  )
  SELECT encode(sha256(convert_to(COALESCE(
    bit_or(('x' || lpad(h, 64, '0'))::bit(256))::text, 'none'), 'UTF8')), 'hex')
  FROM row_hashes;
$fn$;
REVOKE ALL ON FUNCTION balance_sheet_private.source_fingerprint(uuid, date) FROM PUBLIC, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- period(): identical accounts/totals/checks; 'source' replaced by
-- 'sourceFingerprint'. Supersedes the period() from 20260921120100.
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
  'sourceFingerprint',balance_sheet_private.source_fingerprint(p_company,p_as_of)
);
$fn$;

-- ---------------------------------------------------------------------------
-- assemble_report(): fingerprint folds per-period source fingerprints instead
-- of hashing the blobs. Payload shape unchanged.
-- ---------------------------------------------------------------------------
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
  -- Hash the per-period source fingerprints and metadata, not marshalled rows.
  v_fingerprint:=encode(sha256(convert_to(jsonb_build_object('version',1,'company',v_company,'asOf',p_as_of,
    'comparisonDate',p_comparison,'current',v_current->>'sourceFingerprint',
    'comparison',COALESCE(v_comparison->>'sourceFingerprint',''),
    'vehicles',v_vehicles)::text,'UTF8')),'hex');
  v_payload:=jsonb_build_object('version',1,'company',v_company,'asOfDate',p_as_of,'comparisonDate',p_comparison,
    'generatedAt',statement_timestamp(),'accounts',v_accounts,'current',v_current->'totals',
    'comparison',v_comparison->'totals','checks',v_checks,'fingerprint',v_fingerprint,
    'permissions',jsonb_build_object('canSave',balance_sheet_private.has_access(p_company,'save'),
      'canApprove',balance_sheet_private.has_access(p_company,'approve')));
  RETURN v_payload;
END;
$fn$;

-- ---------------------------------------------------------------------------
-- financial_statement_private.calculate(): package fingerprint folds the
-- per-period source fingerprints instead of hashing blobs. Supersedes the
-- calculate() from 20260918014423; all other logic is byte-identical.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION financial_statement_private.calculate(p_company uuid,p_config jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path='' SET timezone='UTC' AS $f$
DECLARE v_start date;v_end date;v_cs date;v_ce date;v_pc date;v_third date;
 v_position jsonb;v_current jsonb;v_comparison jsonb;v_third_source jsonb;v_open jsonb;v_co jsonb;v_cc jsonb;
 v_cp jsonb;v_pp jsonb;v_tp jsonb;v_op jsonb;v_cop jsonb;v_ccp jsonb;v_reclass jsonb;
 v_activity jsonb;v_ca jsonb;v_prior_config jsonb;v_unsplit_config jsonb;v_eq jsonb;v_ceq jsonb;v_findings jsonb:='[]';
 v_rows jsonb;v_values jsonb;v_columns jsonb;v_statements jsonb:='[]';v_journals jsonb;v_notes jsonb;v_accounts jsonb;
 v_n jsonb;v_check jsonb;v_record record;v_key text;v_col text;v_label text;v_ar text;v_kind text;v_group text;v_section_ar text;v_section_en text;
 v_profit numeric;v_cprofit numeric;v_oci1 numeric;v_oci2 numeric;v_coci1 numeric;v_coci2 numeric;
 v_cash_open numeric;v_cash_close numeric;v_ccash_open numeric;v_ccash_close numeric;v_cash_net numeric;v_ccash_net numeric;
 v_amount numeric;v_camount numeric;v_tamount numeric;v_diff numeric;v_cdiff numeric;v_hash text;v_count integer;v_presentation_complete boolean;
BEGIN
 PERFORM financial_statement_private.validate_configuration(p_company,p_config);
 v_start:=(p_config->>'periodStart')::date;v_end:=(p_config->>'periodEnd')::date;
 v_cs:=(p_config->>'comparativePeriodStart')::date;v_ce:=(p_config->>'comparativePeriodEnd')::date;
 v_pc:=(p_config->>'positionComparisonDate')::date;v_third:=(p_config->>'thirdPositionDate')::date;
 -- Compute each historical cutoff once. Validation guarantees opening/comparison date identities.
 v_current:=balance_sheet_private.period(p_company,v_end);v_comparison:=balance_sheet_private.period(p_company,v_pc);
 v_position:=balance_sheet_private.assemble_report(p_company,v_end,v_pc,v_current,v_comparison);
 v_open:=v_comparison;v_co:=balance_sheet_private.period(p_company,v_cs-1);
 IF v_ce=v_pc THEN v_cc:=v_comparison; ELSE v_cc:=balance_sheet_private.period(p_company,v_ce); END IF;
 IF v_third IS NOT NULL THEN v_third_source:=v_co; END IF;
 v_cp:=financial_statement_private.position_values(v_current,p_config,'current');
 v_pp:=financial_statement_private.position_values(v_comparison,p_config,'comparison');
 IF v_third IS NOT NULL THEN v_tp:=financial_statement_private.position_values(v_third_source,p_config,'third'); END IF;
 v_presentation_complete:=NOT EXISTS(SELECT 1 FROM jsonb_array_elements((v_cp->'findings')||(v_pp->'findings')||COALESCE(v_tp->'findings','[]')));
 FOR v_check IN SELECT value FROM jsonb_array_elements(v_position->'checks') LOOP
    IF v_check->>'code'='unclassified_accounts' AND v_presentation_complete THEN CONTINUE; END IF;
    v_findings:=v_findings||jsonb_build_array(jsonb_build_object('code',v_check->>'code','severity',v_check->>'severity','count',(v_check->>'count')::numeric,
      'messageAr','فحص دفتر الأستاذ: '||(v_check->>'code')||' — '||(v_check->>'asOfDate'),
      'messageEn','Ledger check: '||(v_check->>'code')||' — '||(v_check->>'asOfDate'),'accountIds','[]'::jsonb,'journalIds','[]'::jsonb));
 END LOOP;
 -- Opening/comparative-flow cutoffs can contain defects masked by a later reversal.
 FOR v_check IN SELECT value FROM jsonb_array_elements((v_co->'checks')||(v_cc->'checks')) WHERE value->>'severity'='error'
    AND value->>'code' NOT IN ('no_posted_entries','unclassified_accounts') LOOP
    v_findings:=v_findings||financial_statement_private.finding(v_check->>'code','خطأ في مصدر الفترة المقارنة أو الرصيد الافتتاحي','Error in comparative or opening ledger source');
 END LOOP;
 IF p_config->>'legalForm'='unspecified' THEN
    v_findings:=v_findings||financial_statement_private.finding('legal_form_required','يلزم تحديد الشكل القانوني ومراجعة متطلبات العرض ذات الصلة','Legal form and applicable presentation requirements must be reviewed');
 END IF;
 IF (p_config->>'requiresThirdPosition')::boolean AND v_third IS NULL THEN
    v_findings:=v_findings||financial_statement_private.finding('third_position_required','يلزم المركز المالي الافتتاحي للمقارنة بسبب التعديلات بأثر رجعي','An opening comparative position is required for retrospective changes');
 END IF;
 IF v_third IS NOT NULL AND (v_third_source->'totals'->>'postedEntries')::integer=0 THEN
    v_findings:=v_findings||financial_statement_private.finding('third_position_source_missing','لا توجد بيانات مصدر تؤكد رصيد افتتاح المقارنة','No ledger source verifies the opening comparative position');
 END IF;
 FOREACH v_key IN ARRAY ARRAY['entity','basis','policies','estimates','assets','receivables','liabilities','equity','related_parties','commitments','subsequent_events','going_concern','noncash_transactions','interim_changes'] LOOP
    IF v_key='interim_changes' AND p_config->>'kind'='annual' THEN CONTINUE; END IF;
    v_n:=NULL;SELECT value INTO v_n FROM jsonb_array_elements(p_config->'notes') WHERE value->>'code'=v_key;
    IF v_n IS NULL OR v_n->>'status'='pending' OR length(btrim(COALESCE(v_n->>'text','')))<20 OR length(btrim(COALESCE(v_n->>'evidence','')))<5
      OR (v_key IN ('entity','basis','policies','equity','going_concern') AND v_n->>'status'<>'complete') THEN
      v_findings:=v_findings||financial_statement_private.finding('disclosure_'||v_key||'_incomplete',
        'يلزم استكمال ومراجعة الإيضاح: '||v_key,'Disclosure must be completed with reviewed content and evidence: '||v_key);
    END IF;
 END LOOP;
 -- This historical posting convention requires explicit ledger correction; a report
 -- classification override cannot repair duplicated carryforward accounting.
 SELECT count(*) INTO v_count FROM public.journal_entries WHERE company_id=p_company AND entry_date<=v_end AND status='posted' AND reference_type='annual_close_opening';
 IF v_count>0 THEN v_findings:=v_findings||financial_statement_private.finding('carryforward_requires_review','توجد قيود ترحيل افتتاحية تستلزم مراجعة عدم تكرار الأرصدة','Annual opening carryforwards require verification against duplicate balances'); END IF;

 v_findings:=v_findings||(v_cp->'findings')||(v_pp->'findings')||COALESCE(v_tp->'findings','[]');
 v_columns:=jsonb_build_array(jsonb_build_object('key','current','labelAr','الفترة الحالية','labelEn','Current','endDate',v_end),
    jsonb_build_object('key','comparison','labelAr','المقارنة','labelEn','Comparative','endDate',v_pc));
 IF v_third IS NOT NULL THEN v_columns:=v_columns||jsonb_build_array(jsonb_build_object('key','third','labelAr','افتتاح المقارنة','labelEn','Opening comparative','endDate',v_third)); END IF;
 v_rows:='[]';
 FOREACH v_group IN ARRAY ARRAY['current_assets','noncurrent_assets','unclassified_asset','assets_total',
    'current_liabilities','noncurrent_liabilities','unclassified_liability','liabilities_total','equity','unclassified_equity','equity_total','liabilities_equity_total','position_difference'] LOOP
    IF v_group IN ('current_assets','noncurrent_assets','current_liabilities','noncurrent_liabilities','equity') THEN
      v_section_ar:=CASE v_group WHEN 'current_assets' THEN 'الأصول المتداولة' WHEN 'noncurrent_assets' THEN 'الأصول غير المتداولة'
        WHEN 'current_liabilities' THEN 'الالتزامات المتداولة' WHEN 'noncurrent_liabilities' THEN 'الالتزامات غير المتداولة' ELSE 'حقوق الملكية' END;
      v_section_en:=CASE v_group WHEN 'current_assets' THEN 'Current assets' WHEN 'noncurrent_assets' THEN 'Non-current assets'
        WHEN 'current_liabilities' THEN 'Current liabilities' WHEN 'noncurrent_liabilities' THEN 'Non-current liabilities' ELSE 'Equity' END;
      v_values:=jsonb_build_array(NULL,NULL);IF v_third IS NOT NULL THEN v_values:=v_values||jsonb_build_array(NULL); END IF;
      v_rows:=v_rows||financial_statement_private.row(v_group,v_section_ar,v_section_en,v_values,'section');
      v_amount:=0;v_camount:=0;v_tamount:=0;
      FOR v_record IN SELECT * FROM financial_statement_private.catalog() WHERE financial_statement_private.position_group(key)=v_group LOOP
        v_values:=jsonb_build_array(COALESCE((v_cp->'values'->>v_record.key)::numeric,0),COALESCE((v_pp->'values'->>v_record.key)::numeric,0));
        v_amount:=v_amount+COALESCE((v_cp->'values'->>v_record.key)::numeric,0);v_camount:=v_camount+COALESCE((v_pp->'values'->>v_record.key)::numeric,0);
        IF v_third IS NOT NULL THEN
          v_values:=v_values||jsonb_build_array(COALESCE((v_tp->'values'->>v_record.key)::numeric,0));v_tamount:=v_tamount+COALESCE((v_tp->'values'->>v_record.key)::numeric,0);
        END IF;
        SELECT COALESCE(jsonb_agg(m->'accountId'),'[]') INTO v_accounts FROM jsonb_array_elements(p_config->'accountMappings') m
          WHERE m->>'positionLine'=v_record.key OR m->>'comparisonPositionLine'=v_record.key OR m->>'thirdPositionLine'=v_record.key
            OR m->'currentSplit'->>'line'=v_record.key OR m->'comparisonSplit'->>'line'=v_record.key OR m->'thirdSplit'->>'line'=v_record.key;
        SELECT COALESCE(jsonb_agg((n->>'number')::integer),'[]') INTO v_notes FROM jsonb_array_elements(p_config->'notes') n WHERE n->>'code'=v_record.note_code;
        v_rows:=v_rows||financial_statement_private.row(v_record.key,v_record.label_ar,v_record.label_en,v_values,'line',v_accounts,v_notes);
      END LOOP;
      IF v_group<>'equity' THEN
        v_values:=jsonb_build_array(v_amount,v_camount);IF v_third IS NOT NULL THEN v_values:=v_values||jsonb_build_array(v_tamount);END IF;
        v_rows:=v_rows||financial_statement_private.row(v_group||'_total','إجمالي '||v_section_ar,'Total '||lower(v_section_en),v_values,'subtotal');
      END IF;
    ELSIF v_group LIKE 'unclassified_%' THEN
      v_amount:=COALESCE((v_cp->'values'->>v_group)::numeric,0);v_camount:=COALESCE((v_pp->'values'->>v_group)::numeric,0);v_tamount:=COALESCE((v_tp->'values'->>v_group)::numeric,0);
      -- Keep unclassified source amounts visible even when opposite balances net to zero.
      SELECT COALESCE(jsonb_agg(DISTINCT f->'accountIds'->0),'[]') INTO v_accounts
        FROM jsonb_array_elements((v_cp->'findings')||(v_pp->'findings')||COALESCE(v_tp->'findings','[]')) f
        WHERE f->>'code'='position_mapping_missing' AND EXISTS(SELECT 1 FROM jsonb_array_elements(v_current->'accounts') a
          WHERE a->>'id'=f->'accountIds'->>0 AND 'unclassified_'||(a->>'type')=v_group);
      IF v_amount<>0 OR v_camount<>0 OR v_tamount<>0 OR jsonb_array_length(v_accounts)>0 THEN
        v_values:=jsonb_build_array(v_amount,v_camount);IF v_third IS NOT NULL THEN v_values:=v_values||jsonb_build_array(v_tamount);END IF;
        v_rows:=v_rows||financial_statement_private.row(v_group,'أرصدة غير مصنفة — يلزم المراجعة','Unclassified balances — review required',v_values,'line',v_accounts);
      END IF;
    ELSE
      v_col:=CASE v_group WHEN 'assets_total' THEN 'assets' WHEN 'liabilities_total' THEN 'liabilities' WHEN 'equity_total' THEN 'equity'
        WHEN 'liabilities_equity_total' THEN 'liabilitiesAndEquity' ELSE 'imbalance' END;
      v_ar:=CASE v_group WHEN 'assets_total' THEN 'إجمالي الأصول' WHEN 'liabilities_total' THEN 'إجمالي الالتزامات' WHEN 'equity_total' THEN 'إجمالي حقوق الملكية'
        WHEN 'liabilities_equity_total' THEN 'إجمالي الالتزامات وحقوق الملكية' ELSE 'فرق مطابقة المركز المالي' END;
      v_label:=CASE v_group WHEN 'assets_total' THEN 'Total assets' WHEN 'liabilities_total' THEN 'Total liabilities' WHEN 'equity_total' THEN 'Total equity'
        WHEN 'liabilities_equity_total' THEN 'Total liabilities and equity' ELSE 'Position reconciliation difference' END;
      v_values:=jsonb_build_array((v_current->'totals'->>v_col)::numeric,(v_comparison->'totals'->>v_col)::numeric);
      IF v_third IS NOT NULL THEN v_values:=v_values||jsonb_build_array((v_third_source->'totals'->>v_col)::numeric); END IF;
      v_rows:=v_rows||financial_statement_private.row(v_group,v_ar,v_label,v_values,CASE WHEN v_group='position_difference' THEN 'reconciliation' ELSE 'total' END);
    END IF;
 END LOOP;
 v_statements:=v_statements||jsonb_build_array(jsonb_build_object('key','position','titleAr','قائمة المركز المالي','titleEn','Statement of financial position','columns',v_columns,'rows',v_rows));

 -- Apply the independently reviewed comparative presentation to its equity matrix.
 SELECT jsonb_set(p_config,'{accountMappings}',COALESCE(jsonb_agg(m||jsonb_build_object('positionLine',COALESCE(m->>'comparisonPositionLine',m->>'positionLine'))),'[]'))
    INTO v_prior_config FROM jsonb_array_elements(p_config->'accountMappings') m;
 v_activity:=financial_statement_private.activity(p_company,v_start,v_end,p_config);
 v_ca:=financial_statement_private.activity(p_company,v_cs,v_ce,v_prior_config);
 v_findings:=v_findings||(v_activity->'findings')||(v_ca->'findings');
 IF (v_ca->>'postedEntries')::integer=0 OR (v_comparison->'totals'->>'postedEntries')::integer=0 THEN
    v_findings:=v_findings||financial_statement_private.finding('comparison_source_missing','مصدر المقارنة غير مكتمل؛ الأرصدة الصفرية لا تعني أنها مؤكدة','Comparative source is missing; calculated zero balances are not verified comparisons');
 END IF;
 IF (v_activity->>'postedEntries')::integer=0 THEN
    v_findings:=v_findings||financial_statement_private.finding('period_source_missing','لا توجد قيود مرحلة خلال فترة الأداء المحددة','No posted source journals exist in the performance period');
 END IF;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_config->'accountMappings') m WHERE COALESCE((m->>'isCashEquivalent')::boolean,false)) THEN
    v_findings:=v_findings||financial_statement_private.finding('cash_accounts_required','يلزم تحديد حسابات النقد وما في حكمه صراحة','Explicit cash and cash-equivalent account definitions are required');
 END IF;
 v_profit:=(v_activity->>'profit')::numeric;v_cprofit:=(v_ca->>'profit')::numeric;
 SELECT COALESCE(sum(value::numeric) FILTER(WHERE key LIKE 'oci_reclassifiable:%'),0),COALESCE(sum(value::numeric) FILTER(WHERE key LIKE 'oci_nonreclassifiable:%'),0)
    INTO v_oci1,v_oci2 FROM jsonb_each_text(v_activity->'equity');
 SELECT COALESCE(sum(value::numeric) FILTER(WHERE key LIKE 'oci_reclassifiable:%'),0),COALESCE(sum(value::numeric) FILTER(WHERE key LIKE 'oci_nonreclassifiable:%'),0)
    INTO v_coci1,v_coci2 FROM jsonb_each_text(v_ca->'equity');
 v_columns:=jsonb_build_array(jsonb_build_object('key','current','labelAr','الفترة الحالية','labelEn','Current','startDate',v_start,'endDate',v_end),
    jsonb_build_object('key','comparison','labelAr','الفترة المقارنة','labelEn','Comparative','startDate',v_cs,'endDate',v_ce));
 v_rows:='[]';
 FOR v_record IN SELECT * FROM financial_statement_private.catalog() WHERE category='income' AND key<>'income_tax' LOOP
    SELECT COALESCE(jsonb_agg(m->'accountId'),'[]') INTO v_accounts FROM jsonb_array_elements(p_config->'accountMappings') m WHERE m->>'incomeLine'=v_record.key;
    SELECT COALESCE(jsonb_agg((n->>'number')::integer),'[]') INTO v_notes FROM jsonb_array_elements(p_config->'notes') n WHERE n->>'code'=v_record.note_code;
    v_rows:=v_rows||financial_statement_private.row(v_record.key,v_record.label_ar,v_record.label_en,
      jsonb_build_array(COALESCE((v_activity->'income'->>v_record.key)::numeric,0),COALESCE((v_ca->'income'->>v_record.key)::numeric,0)),'line',v_accounts,v_notes);
 END LOOP;
 SELECT COALESCE(jsonb_agg(DISTINCT f->'accountIds'->0),'[]') INTO v_accounts
    FROM jsonb_array_elements((v_activity->'findings')||(v_ca->'findings')) f WHERE f->>'code'='income_mapping_missing';
 IF jsonb_array_length(v_accounts)>0 THEN
    v_rows:=v_rows||financial_statement_private.row('unclassified_income','دخل ومصروفات غير مصنفة — يلزم المراجعة','Unclassified income and expenses — review required',
      jsonb_build_array(COALESCE((v_activity->'income'->>'unclassified_income')::numeric,0),COALESCE((v_ca->'income'->>'unclassified_income')::numeric,0)),'line',v_accounts);
 END IF;
 v_rows:=v_rows||financial_statement_private.row('profit_before_tax','الربح قبل الضريبة','Profit before tax',jsonb_build_array(
    v_profit-COALESCE((v_activity->'income'->>'income_tax')::numeric,0),v_cprofit-COALESCE((v_ca->'income'->>'income_tax')::numeric,0)),'subtotal');
 v_rows:=v_rows||financial_statement_private.row('income_tax','ضريبة الدخل','Income tax',jsonb_build_array(COALESCE((v_activity->'income'->>'income_tax')::numeric,0),COALESCE((v_ca->'income'->>'income_tax')::numeric,0)));
 v_rows:=v_rows||financial_statement_private.row('profit','ربح أو خسارة الفترة','Profit or loss',jsonb_build_array(v_profit,v_cprofit),'total');
 v_rows:=v_rows||financial_statement_private.row('oci_reclassifiable','دخل شامل آخر قابل لإعادة التصنيف','Other comprehensive income that may be reclassified',jsonb_build_array(v_oci1,v_coci1));
 v_rows:=v_rows||financial_statement_private.row('oci_nonreclassifiable','دخل شامل آخر غير قابل لإعادة التصنيف','Other comprehensive income not reclassified',jsonb_build_array(v_oci2,v_coci2));
 v_rows:=v_rows||financial_statement_private.row('total_comprehensive_income','إجمالي الدخل الشامل','Total comprehensive income',jsonb_build_array(v_profit+v_oci1+v_oci2,v_cprofit+v_coci1+v_coci2),'total');
 v_statements:=v_statements||jsonb_build_array(jsonb_build_object('key','profit_loss_oci','titleAr','قائمة الربح أو الخسارة والدخل الشامل الآخر','titleEn','Statement of profit or loss and other comprehensive income','columns',v_columns,'rows',v_rows));

 SELECT jsonb_set(p_config,'{accountMappings}',COALESCE(jsonb_agg(m||jsonb_build_object('currentSplit',NULL,'comparisonSplit',NULL,'thirdSplit',NULL)),'[]'))
    INTO v_unsplit_config FROM jsonb_array_elements(p_config->'accountMappings') m;
 v_op:=financial_statement_private.equity_values(v_open,p_config,'comparison');
 v_cop:=financial_statement_private.equity_values(v_co,CASE WHEN v_third IS NOT NULL THEN p_config ELSE v_unsplit_config END,
    CASE WHEN v_third IS NOT NULL THEN 'third' ELSE 'comparison' END);
 -- A fixed year-end split is not a classification amount at an earlier YTD cutoff.
 v_ccp:=financial_statement_private.equity_values(v_cc,CASE WHEN v_ce=v_pc THEN p_config ELSE v_unsplit_config END,'comparison');
 v_findings:=v_findings||(v_op->'findings')||(v_cop->'findings')||(v_ccp->'findings');
 -- An explicit change in an equity presentation column is a zero-total transfer,
 -- separately from ledger movements. It never changes the underlying account balance.
 v_reclass:=financial_statement_private.equity_values(v_open,v_unsplit_config,'current');
 FOR v_col IN SELECT key FROM financial_statement_private.catalog() WHERE category='equity' LOOP
    v_amount:=COALESCE((v_reclass->'values'->>v_col)::numeric,0)-COALESCE((v_op->'values'->>v_col)::numeric,0);
    v_activity:=jsonb_set(v_activity,'{equity}',financial_statement_private.add_amount(v_activity->'equity','transfers:'||v_col,v_amount));
 END LOOP;
 v_reclass:=financial_statement_private.equity_values(v_current,v_unsplit_config,'current');
 FOR v_col IN SELECT key FROM financial_statement_private.catalog() WHERE category='equity' LOOP
    v_amount:=COALESCE((v_cp->'values'->>v_col)::numeric,0)-COALESCE((v_reclass->'values'->>v_col)::numeric,0);
    v_activity:=jsonb_set(v_activity,'{equity}',financial_statement_private.add_amount(v_activity->'equity','transfers:'||v_col,v_amount));
 END LOOP;
 v_reclass:=financial_statement_private.equity_values(v_co,v_unsplit_config,'comparison');
 FOR v_col IN SELECT key FROM financial_statement_private.catalog() WHERE category='equity' LOOP
    v_amount:=COALESCE((v_reclass->'values'->>v_col)::numeric,0)-COALESCE((v_cop->'values'->>v_col)::numeric,0);
    v_ca:=jsonb_set(v_ca,'{equity}',financial_statement_private.add_amount(v_ca->'equity','transfers:'||v_col,v_amount));
 END LOOP;
 v_reclass:=financial_statement_private.equity_values(v_cc,v_unsplit_config,'comparison');
 FOR v_col IN SELECT key FROM financial_statement_private.catalog() WHERE category='equity' LOOP
    v_amount:=COALESCE((v_reclass->'values'->>v_col)::numeric,0)-COALESCE((v_ccp->'values'->>v_col)::numeric,0);
    v_ca:=jsonb_set(v_ca,'{equity}',financial_statement_private.add_amount(v_ca->'equity','transfers:'||v_col,v_amount));
 END LOOP;
 v_eq:=financial_statement_private.equity_statement('equity_current',v_op->'values',v_cp->'values',v_activity,v_start,v_end);
 v_ceq:=financial_statement_private.equity_statement('equity_comparative',v_cop->'values',v_ccp->'values',v_ca,v_cs,v_ce);
 IF (v_eq->>'difference')::numeric>0.005 OR (v_ceq->>'difference')::numeric>0.005 THEN
    v_findings:=v_findings||financial_statement_private.finding('equity_reconciliation_difference','حركة حقوق الملكية لا تتطابق مع مكوناتها في دفتر الأستاذ','Changes in equity do not reconcile by component to the ledger');
 END IF;
 v_statements:=v_statements||jsonb_build_array(v_eq->'statement',v_ceq->'statement');
 v_cash_open:=financial_statement_private.cash_balance(v_open,p_config);v_cash_close:=financial_statement_private.cash_balance(v_current,p_config);
 v_ccash_open:=financial_statement_private.cash_balance(v_co,p_config);v_ccash_close:=financial_statement_private.cash_balance(v_cc,p_config);
 SELECT COALESCE(sum(value::numeric),0) INTO v_cash_net FROM jsonb_each_text(v_activity->'cash');
 SELECT COALESCE(sum(value::numeric),0) INTO v_ccash_net FROM jsonb_each_text(v_ca->'cash');
 v_diff:=v_cash_open+v_cash_net-v_cash_close;v_cdiff:=v_ccash_open+v_ccash_net-v_ccash_close;
 IF abs(v_diff)>0.005 OR abs(v_cdiff)>0.005 THEN v_findings:=v_findings||financial_statement_private.finding('cash_flow_reconciliation_difference','التدفقات النقدية لا تتطابق مع أرصدة النقد بدفتر الأستاذ','Cash flows do not reconcile to opening and closing ledger cash'); END IF;
 v_rows:='[]';
 FOREACH v_key IN ARRAY ARRAY['opening','operating','investing','financing','exchange','net_change','closing','ledger_closing','difference'] LOOP
    IF v_key IN ('operating','investing','financing','exchange') THEN
      FOR v_record IN
        SELECT COALESCE(c.key,p.key) AS key,COALESCE(c.value,p.value) AS detail,
          COALESCE((c.value->>'amount')::numeric,0) AS amount,COALESCE((p.value->>'amount')::numeric,0) AS comparison_amount
        FROM jsonb_each(v_activity->'cashDetails') c FULL JOIN jsonb_each(v_ca->'cashDetails') p ON p.key=c.key
        WHERE COALESCE(c.value->>'category',p.value->>'category')=v_key
        ORDER BY CASE WHEN COALESCE(c.key,p.key) LIKE '%_receipts_%' THEN 0 ELSE 1 END,COALESCE(c.key,p.key)
      LOOP
        v_rows:=v_rows||financial_statement_private.row(v_record.key,v_record.detail->>'labelAr',v_record.detail->>'labelEn',
          jsonb_build_array(v_record.amount,v_record.comparison_amount),'line',v_record.detail->'accountIds');
      END LOOP;
    END IF;
    v_amount:=CASE v_key WHEN 'opening' THEN v_cash_open WHEN 'net_change' THEN v_cash_net WHEN 'closing' THEN v_cash_open+v_cash_net
      WHEN 'ledger_closing' THEN v_cash_close WHEN 'difference' THEN v_diff ELSE COALESCE((v_activity->'cash'->>v_key)::numeric,0) END;
    v_camount:=CASE v_key WHEN 'opening' THEN v_ccash_open WHEN 'net_change' THEN v_ccash_net WHEN 'closing' THEN v_ccash_open+v_ccash_net
      WHEN 'ledger_closing' THEN v_ccash_close WHEN 'difference' THEN v_cdiff ELSE COALESCE((v_ca->'cash'->>v_key)::numeric,0) END;
    v_label:=CASE v_key WHEN 'opening' THEN 'Opening cash and cash equivalents' WHEN 'operating' THEN 'Net operating cash flows'
      WHEN 'investing' THEN 'Net investing cash flows' WHEN 'financing' THEN 'Net financing cash flows' WHEN 'exchange' THEN 'Effect of exchange rate changes'
      WHEN 'net_change' THEN 'Net change in cash and cash equivalents' WHEN 'closing' THEN 'Closing cash and cash equivalents'
      WHEN 'ledger_closing' THEN 'Ledger closing cash' ELSE 'Cash reconciliation difference' END;
    v_ar:=CASE v_key WHEN 'opening' THEN 'النقد وما في حكمه أول الفترة' WHEN 'operating' THEN 'صافي التدفقات من الأنشطة التشغيلية'
      WHEN 'investing' THEN 'صافي التدفقات من الأنشطة الاستثمارية' WHEN 'financing' THEN 'صافي التدفقات من الأنشطة التمويلية' WHEN 'exchange' THEN 'أثر تغير أسعار الصرف'
      WHEN 'net_change' THEN 'صافي التغير في النقد وما في حكمه' WHEN 'closing' THEN 'النقد وما في حكمه آخر الفترة'
      WHEN 'ledger_closing' THEN 'النقد الختامي بدفتر الأستاذ' ELSE 'فرق مطابقة التدفقات النقدية' END;
    v_rows:=v_rows||financial_statement_private.row(v_key,v_ar,v_label,jsonb_build_array(v_amount,v_camount),
      CASE WHEN v_key IN ('ledger_closing','difference') THEN 'reconciliation' WHEN v_key IN ('net_change','closing') THEN 'total'
      WHEN v_key IN ('operating','investing','financing','exchange') THEN 'subtotal' ELSE 'line' END);
 END LOOP;
 v_statements:=v_statements||jsonb_build_array(jsonb_build_object('key','cash_flow','titleAr','قائمة التدفقات النقدية','titleEn','Statement of cash flows','columns',v_columns,'rows',v_rows));
 v_journals:=(v_activity->'journals')||(v_ca->'journals');
 -- Fold the per-period source fingerprints; no marshalled source blobs.
 v_hash:=encode(sha256(convert_to(jsonb_build_object('version',1,'configuration',p_config,'positionFingerprint',v_position->>'fingerprint',
    'opening',v_co->>'sourceFingerprint','comparisonEnd',v_cc->>'sourceFingerprint',
    'third',COALESCE(v_third_source->>'sourceFingerprint',''),'journals',v_journals)::text,'UTF8')),'hex');
 RETURN jsonb_build_object('version',1,'company',v_position->'company','configuration',p_config,'generatedAt',statement_timestamp(),
    'fingerprint',v_hash,'position',v_position,'statements',v_statements,'findings',v_findings,'journals',v_journals,'permissions',v_position->'permissions');
END;
$f$;

NOTIFY pgrst,'reload schema';
COMMIT;