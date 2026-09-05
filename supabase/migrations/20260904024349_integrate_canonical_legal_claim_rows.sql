-- Pending rent/penalty integration. NOT a whole legal-engine release certificate:
-- readiness/display alignment, renewal/proration/full-schema/concurrency gates remain open.
-- No case-specific DML, claim snapshot refresh or financial writes.
BEGIN;

-- This schema is intentionally not a PostgREST-exposed API schema. Only the
-- authorized gateway is executable by API roles. Raw readers remain revoked.
CREATE SCHEMA legal_claim_internal;
REVOKE ALL ON SCHEMA legal_claim_internal FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA legal_claim_internal TO authenticated,service_role;

-- traffic_violation_payments are COMPANY disbursements, not customer receipts.
-- Reuse customer receipt settlement; never subtract government payments here.
CREATE FUNCTION legal_claim_internal.read_traffic_obligations_v5(
  p_company_id uuid,p_contract_id uuid,p_as_of_date date
)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $traffic$
  WITH contract_row AS (
    SELECT c.id,c.customer_id,c.start_date FROM public.contracts c
    WHERE c.company_id=p_company_id AND c.id=p_contract_id
  ), raw_sources AS MATERIALIZED (
    -- Company-wide identity candidates are deliberate: conflicting assignments
    -- to another contract must not disappear merely because this call is scoped
    -- to one contract. No matching on plate, name or amount alone.
    SELECT p.id,p.contract_id,p.vehicle_id,coalesce(p.responsible_customer_id,p.customer_id) AS responsible_customer_id,
      p.customer_id,p.penalty_number::text,p.penalty_date,p.amount,p.status::text,p.customer_payment_status,
      lower(btrim(coalesce(p.responsibility_party,''))) AS party,'penalties'::text AS source_type,
      lower(btrim(coalesce(p.status,''))) IN ('cancelled','canceled','void','voided','reversed','deleted','inactive')
        OR lower(btrim(coalesce(p.responsibility_party,'')))='cancelled' AS source_cancelled,
      nullif(lower(btrim(p.penalty_number)),'') AS reference
    FROM public.penalties p WHERE p.company_id=p_company_id
    UNION ALL
    SELECT t.id,t.contract_id,t.vehicle_id,t.responsible_customer_id,NULL::uuid,
      t.violation_number,t.violation_date,t.fine_amount,t.status,NULL::text,
      lower(btrim(coalesce(t.responsibility_party,''))),'traffic_violations',
      lower(btrim(coalesce(t.status,''))) IN ('cancelled','canceled','void','voided','reversed','deleted','inactive')
        OR lower(btrim(coalesce(t.responsibility_party,'')))='cancelled',
      nullif(lower(btrim(t.violation_number)),'')
    FROM public.traffic_violations t WHERE t.company_id=p_company_id
  ), identity_pairs AS MATERIALIZED (
    -- Separate equality joins permit hash joins; a company-wide OR join would
    -- compare every penalty to every imported traffic row on each calculation.
    SELECT p.id AS penalty_id,t.id AS traffic_id
    FROM raw_sources p JOIN raw_sources t ON t.source_type='traffic_violations' AND p.id=t.id
    WHERE p.source_type='penalties'
    UNION
    SELECT p.id,t.id
    FROM raw_sources p JOIN raw_sources t ON t.source_type='traffic_violations' AND p.reference=t.reference
    WHERE p.source_type='penalties' AND p.reference IS NOT NULL
  ), candidate_pairs AS MATERIALIZED (
    SELECT p.id AS penalty_id,t.id AS traffic_id,
      count(*) OVER(PARTITION BY p.id) AS penalty_matches,
      count(*) OVER(PARTITION BY t.id) AS traffic_matches,
      p.reference IS NOT DISTINCT FROM t.reference
        AND p.contract_id IS NOT DISTINCT FROM t.contract_id
        AND p.responsible_customer_id IS NOT DISTINCT FROM t.responsible_customer_id
        AND p.vehicle_id IS NOT DISTINCT FROM t.vehicle_id
        AND p.penalty_date IS NOT DISTINCT FROM t.penalty_date
        AND p.amount IS NOT DISTINCT FROM t.amount
        AND p.party IS NOT DISTINCT FROM t.party
        AND p.source_cancelled IS NOT DISTINCT FROM t.source_cancelled AS facts_match
    FROM identity_pairs pair
    JOIN raw_sources p ON p.source_type='penalties' AND p.id=pair.penalty_id
    JOIN raw_sources t ON t.source_type='traffic_violations' AND t.id=pair.traffic_id
  ), verified_pairs AS MATERIALIZED (
    SELECT * FROM candidate_pairs WHERE penalty_matches=1 AND traffic_matches=1 AND facts_match
  ), duplicate_references AS MATERIALIZED (
    -- Same-source duplicates cannot be treated as verified mirrors. Include
    -- other-contract and excluded copies before contract scoping: otherwise a
    -- company/cancelled copy can hide an unresolved customer-liability conflict.
    -- Copies that all exclude customer liability do not manufacture new debt.
    SELECT source_type,reference
    FROM raw_sources WHERE reference IS NOT NULL
    GROUP BY source_type,reference
    HAVING count(*)>1 AND bool_or(NOT source_cancelled AND party NOT IN ('company','cancelled'))
  ), penalties AS MATERIALIZED (
    SELECT r.*,CASE WHEN v.traffic_id IS NULL OR v.traffic_id=r.id THEN ARRAY[r.id] ELSE ARRAY[r.id,v.traffic_id] END AS source_ids,
      duplicate.reference IS NOT NULL AS duplicate_reference,
      EXISTS (SELECT 1 FROM candidate_pairs cp
        WHERE ((r.source_type='penalties' AND cp.penalty_id=r.id)
          OR (r.source_type='traffic_violations' AND cp.traffic_id=r.id))
          AND (NOT cp.facts_match OR cp.penalty_matches<>1 OR cp.traffic_matches<>1)) AS source_conflict
    FROM raw_sources r LEFT JOIN verified_pairs v ON r.source_type='penalties' AND v.penalty_id=r.id
    LEFT JOIN duplicate_references duplicate ON duplicate.source_type=r.source_type AND duplicate.reference=r.reference
    WHERE r.contract_id=p_contract_id
      AND NOT (r.source_type='traffic_violations' AND EXISTS (SELECT 1 FROM verified_pairs pair WHERE pair.traffic_id=r.id))
  ), invoices AS MATERIALIZED (
    SELECT i.* FROM public.canonical_contract_invoice_settlement_v1(p_company_id) i
    WHERE i.contract_id=p_contract_id AND i.is_traffic
  ), matches AS MATERIALIZED (
    SELECT p.id,i.invoice_id,i.invoiced_amount,i.paid_amount,i.outstanding_amount,i.invalid
    FROM penalties p JOIN invoices i ON i.penalty_id=ANY(p.source_ids)
      OR (i.penalty_id IS NULL AND EXISTS (SELECT 1 FROM unnest(p.source_ids) alias_id
        WHERE lower(btrim(i.invoice_number))='tv-'||alias_id::text))
  ), payment_totals AS (
    SELECT m.id,count(*) AS invoice_count,min(m.invoice_id::text)::uuid AS invoice_id,
      sum(m.invoiced_amount) AS invoiced_amount,sum(m.paid_amount) AS paid_amount,
      sum(m.outstanding_amount) AS outstanding_amount,bool_or(m.invalid) AS invalid
    FROM matches m GROUP BY m.id
  ), evaluated AS (
    SELECT p.id AS penalty_id,t.invoice_id,p.penalty_date,p.penalty_number,p.amount,p.source_type,p.source_ids,p.source_conflict,p.duplicate_reference,
      CASE WHEN t.id IS NOT NULL THEN t.outstanding_amount ELSE p.amount END AS outstanding_amount,
      p.party,
      lower(btrim(coalesce(p.status,''))) IN ('cancelled','canceled','void','voided','reversed','deleted','inactive')
        OR p.party='cancelled' AS cancelled,
      array_remove(ARRAY[
        CASE WHEN p.source_conflict THEN 'cross_source_violation_conflict' END,
        CASE WHEN p.party NOT IN ('customer','company','cancelled') THEN 'unknown_penalty_responsibility' END,
        CASE WHEN coalesce(p.responsible_customer_id,p.customer_id) IS DISTINCT FROM c.customer_id
          THEN 'penalty_customer_mismatch' END,
        CASE WHEN p.amount IS NULL OR p.amount<=0 OR p.amount::text IN ('NaN','Infinity','-Infinity')
          OR p.amount<>round(p.amount,2) THEN 'invalid_penalty_amount' END,
        CASE WHEN p.penalty_date IS NULL OR NOT isfinite(p.penalty_date) OR p.penalty_date<c.start_date
          THEN 'invalid_penalty_date' END,
        CASE WHEN t.invoice_count>1 THEN 'duplicate_penalty_invoices' END,
        CASE WHEN t.invoiced_amount IS DISTINCT FROM p.amount AND t.id IS NOT NULL THEN 'penalty_invoice_amount_mismatch' END,
        CASE WHEN t.invalid THEN 'invalid_traffic_invoice_or_payment' END,
        CASE WHEN t.id IS NOT NULL AND (t.paid_amount::text IN ('NaN','Infinity','-Infinity')
          OR t.paid_amount<>round(t.paid_amount,2)) THEN 'invalid_traffic_payment_amount' END,
        CASE WHEN t.id IS NULL AND EXISTS (SELECT 1 FROM public.invoices raw
          WHERE raw.penalty_id=ANY(p.source_ids) OR (raw.penalty_id IS NULL AND EXISTS (
            SELECT 1 FROM unnest(p.source_ids) alias_id WHERE lower(btrim(raw.invoice_number))='tv-'||alias_id::text)))
          THEN 'missing_or_mislinked_active_traffic_invoice' END,
        -- Standalone penalties are supported: invoice generation was explicitly
        -- retired. But a paid/partial cache without customer receipt evidence
        -- cannot prove a settlement amount and must not become zero debt.
        -- traffic_violations has no customer-paid cache: its status/payment_date
        -- are authority disbursement state. Only linked customer receipts reduce
        -- its recorded obligation; never reinterpret a government 'paid' as cash
        -- collected from the customer.
        CASE WHEN t.id IS NULL AND p.source_type='penalties'
          AND lower(btrim(coalesce(p.customer_payment_status,'')))<>'unpaid'
          THEN 'missing_customer_receipt_evidence' END,
        CASE WHEN p.duplicate_reference THEN 'duplicate_penalty_reference' END
      ],NULL) AS review_reasons
    FROM penalties p CROSS JOIN contract_row c LEFT JOIN payment_totals t ON t.id=p.id
  ), classified AS (
    SELECT e.*,CASE WHEN e.source_conflict OR e.duplicate_reference THEN 'review'
      WHEN e.cancelled THEN 'cancelled'
      WHEN e.party='company' THEN 'company_responsibility'
      WHEN cardinality(e.review_reasons)>0 THEN 'review'
      WHEN e.penalty_date>p_as_of_date THEN 'future'
      WHEN e.outstanding_amount=0 THEN 'settled'
      ELSE 'included' END AS disposition
    FROM evaluated e
  ), audit_rows AS (
    SELECT e.penalty_id,e.invoice_id,e.penalty_date,e.disposition,e.source_type,e.source_ids,
      e.penalty_number AS violation_number,e.party AS responsibility_party,
      CASE WHEN e.disposition='review' THEN e.review_reasons ELSE ARRAY[]::text[] END AS review_reasons,
      CASE WHEN e.disposition<>'review' THEN e.outstanding_amount END AS outstanding_amount
    FROM classified e
    UNION ALL
    SELECT NULL::uuid,i.invoice_id,i.invoice_month,'review','invoice',ARRAY[]::uuid[],
      i.invoice_number,NULL::text,ARRAY['unmatched_traffic_invoice'],NULL::numeric
    FROM invoices i WHERE NOT EXISTS (SELECT 1 FROM matches m WHERE m.invoice_id=i.invoice_id)
  ), evidence AS (
    SELECT EXISTS (SELECT 1 FROM public.contract_documents d WHERE d.company_id=p_company_id
      AND d.contract_id=p_contract_id AND d.document_type='violations_proof'
      AND nullif(btrim(d.file_path),'') IS NOT NULL) AS ready
  )
  SELECT jsonb_build_object('requires_review',coalesce(bool_or(r.disposition='review'),false),
    'proof_ready',(SELECT ready FROM evidence),
    'claim_amount',CASE WHEN NOT coalesce(bool_or(r.disposition='review'),false)
      THEN CASE WHEN (SELECT ready FROM evidence) THEN coalesce(sum(r.outstanding_amount) FILTER(WHERE r.disposition='included'),0)
        ELSE 0 END END,
    'violation_count',count(*) FILTER(WHERE r.disposition='included'),
    'rows',coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.penalty_date,r.penalty_id,r.invoice_id),'[]'::jsonb))
  FROM audit_rows r;
$traffic$;

DO $install$
DECLARE
  v3_oid regprocedure := 'public.calculate_legal_claim_breakdown_v3(uuid,uuid,date)'::regprocedure;
  v4_oid regprocedure := 'public.calculate_legal_claim_statement_v4(uuid,uuid,date,text,uuid[])'::regprocedure;
  v_body text;
  v_statement text;
  v_start integer;
  v_end integer;
BEGIN
  IF (SELECT md5(prosrc) FROM pg_proc WHERE oid=v3_oid)<>'4a27cf9dcd1bfd202ffb80834de3f1a9'
    OR (SELECT md5(prosrc) FROM pg_proc WHERE oid=v4_oid)<>'36b78342a4ecc47adcdc6f9c5825f641' THEN
    RAISE EXCEPTION 'Legal engine changed since source audit; review and rebase this migration';
  END IF;

  -- Exact original definitions retained for a schema-only rollback.
  EXECUTE replace(pg_get_functiondef(v3_oid),'public.calculate_legal_claim_breakdown_v3(',
    'legal_claim_internal.legacy_breakdown_v3(');
  EXECUTE replace(pg_get_functiondef(v4_oid),'public.calculate_legal_claim_statement_v4(',
    'legal_claim_internal.legacy_statement_v4(');

  SELECT prosrc INTO v_body FROM pg_proc WHERE oid=v3_oid;
  v_start:=strpos(v_body,'  due_invoice_components AS (');
  v_end:=strpos(v_body,'  legal_period AS (');
  IF v_start=0 OR v_end<=v_start THEN RAISE EXCEPTION 'Missing audited v3 row boundaries'; END IF;
  v_body:=substr(v_body,1,v_start-1)||$rows$
  canonical_rows AS MATERIALIZED (
    SELECT * FROM jsonb_to_recordset(p_recorded->'rows') AS r(
      invoice_id uuid,billing_month date,outstanding_amount numeric,disposition text)
  ),
  claim_rows AS (
    SELECT billing_month AS due_date,outstanding_amount AS amount
    FROM canonical_rows WHERE disposition='included' AND outstanding_amount>0
  ),
  covered_months AS (
    SELECT DISTINCT billing_month AS month_start
    FROM canonical_rows WHERE disposition<>'review' AND billing_month IS NOT NULL
  ),
  excluded_invoice_components AS (
    SELECT coalesce(sum(i.outstanding_amount) FILTER(WHERE i.is_traffic),0) AS penalty_invoice_due_amount,
      coalesce(sum(i.outstanding_amount) FILTER(WHERE NOT i.is_traffic
        AND (i.unclassified_service OR i.invoice_type NOT IN ('sales','service'))),0) AS non_rent_invoice_due_amount
    FROM public.canonical_contract_invoice_settlement_v1(p_company_id) i
    WHERE i.contract_id=p_contract_id AND i.invoice_month<=p_as_of_date
  ),
$rows$||substr(v_body,v_end);
  -- Keep event dates consistent in extension/retention and recorded-rent rows.
  v_body:=replace(v_body,'lc.judgment_final_at::DATE',
    '(lc.judgment_final_at AT TIME ZONE ''Asia/Qatar'')::DATE');
  v_body:=replace(v_body,$find$lc.workflow_stage IN ('judgment_issued', 'closed')$find$,
    $replace$lc.workflow_stage IN ('judgment_issued', 'appeal', 'enforcement', 'collection', 'closed')$replace$);
  v_body:=replace(v_body,$find$LOWER(COALESCE(lc.case_status, '')) <> 'cancelled'$find$,
    $replace$lower(btrim(coalesce(lc.case_status,''))) NOT IN ('cancelled','canceled','void','voided','reversed','deleted','inactive')$replace$);
  v_start:=strpos(v_body,'      LEAST(');
  v_end:=strpos(v_body,') AS rent_cutoff_date,');
  IF v_start=0 OR v_end<=v_start THEN RAISE EXCEPTION 'Missing audited v3 cutoff boundaries'; END IF;
  v_body:=substr(v_body,1,v_start-1)||'      (p_recorded->>''rent_cutoff_date'')::date AS rent_cutoff_date,'
    ||substr(v_body,v_end+length(') AS rent_cutoff_date,'));
  v_start:=strpos(v_body,'      CASE WHEN EXISTS (');
  v_end:=strpos(v_body,') ELSE 0 END AS violations_amount,');
  IF v_start=0 OR v_end<=v_start THEN RAISE EXCEPTION 'Missing audited v3 traffic boundaries'; END IF;
  v_body:=substr(v_body,1,v_start-1)||'      (p_traffic->>''claim_amount'')::numeric AS violations_amount,'
    ||substr(v_body,v_end+length(') ELSE 0 END AS violations_amount,'));
  EXECUTE 'CREATE FUNCTION legal_claim_internal.calculate_breakdown_rows_v5(p_company_id uuid,p_contract_id uuid,p_as_of_date date,p_recorded jsonb,p_traffic jsonb)
    RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS '||quote_literal(v_body);

  SELECT prosrc INTO v_statement FROM pg_proc WHERE oid=v4_oid;
  v_statement:=replace(v_statement,'  v_effective_date date;',
    '  v_effective_date date; v_recorded jsonb; v_traffic jsonb;');
  v_statement:=replace(v_statement,E'BEGIN\n',E'BEGIN\n'||$authorization$
  -- Authorization boundary, not an RLS-error workaround. The public facades
  -- remain SECURITY INVOKER. This private gateway alone can inspect the full
  -- receipt graph (including corrupt cross-company links) for the authorized
  -- tenant. No raw helper EXECUTE or table grants are added for API roles.
  IF coalesce(auth.jwt()->>'role','')<>'service_role' AND (
    auth.uid() IS NULL OR public.get_user_company_id() IS DISTINCT FROM p_company_id
    OR NOT EXISTS (SELECT 1 FROM public.profiles p
      WHERE p.user_id=auth.uid() AND p.company_id=p_company_id AND p.is_active IS NOT FALSE)
  ) THEN
    RAISE EXCEPTION 'Not authorized to calculate this company legal claim' USING ERRCODE='42501';
  END IF;
$authorization$);
  v_start:=strpos(v_statement,'  RETURN (');
  IF v_start=0 THEN RAISE EXCEPTION 'Missing audited v4 return'; END IF;
  v_statement:=substr(v_statement,1,v_start-1)||$validate$
  v_recorded:=public.canonical_legal_recorded_obligations_v1(
    p_company_id,p_contract_id,p_as_of_date,p_excluded_invoice_ids);
  IF v_scope<>'traffic_violations_only' AND (v_recorded->>'requires_review')::boolean THEN
    RAISE EXCEPTION 'تعذر اعتماد المطالبة: توجد فواتير أو أقساط تحتاج مطابقة'
      USING ERRCODE='P0001',DETAIL=v_recorded::text,HINT='LEGAL_CLAIM_RECONCILIATION_REQUIRED';
  END IF;
  v_traffic:=legal_claim_internal.read_traffic_obligations_v5(p_company_id,p_contract_id,p_as_of_date);
  IF (v_traffic->>'requires_review')::boolean THEN
    RAISE EXCEPTION 'تعذر اعتماد مطالبة المخالفات: تحتاج المسؤولية أو دفعات العميل إلى مطابقة'
      USING ERRCODE='P0001',DETAIL=v_traffic::text,HINT='LEGAL_TRAFFIC_RECONCILIATION_REQUIRED';
  END IF;
$validate$||substr(v_statement,v_start);
  v_statement:=replace(v_statement,$oldbase$public.calculate_legal_claim_breakdown_v3(
        p_company_id,
        p_contract_id,
        v_effective_date
      )$oldbase$,$newbase$legal_claim_internal.calculate_breakdown_rows_v5(
        p_company_id,p_contract_id,p_as_of_date,v_recorded,v_traffic
      )$newbase$);
  v_start:=strpos(v_statement,'    valid_rental_invoices AS (');
  v_end:=strpos(v_statement,'    invoice_audit AS (');
  IF v_start=0 OR v_end<=v_start THEN RAISE EXCEPTION 'Missing audited v4 invoice boundaries'; END IF;
  v_statement:=substr(v_statement,1,v_start-1)||$invoices$
    valid_rental_invoices AS (
      SELECT r.invoice_id AS id,r.invoice_number,r.billing_month AS due_date,r.outstanding_amount AS amount
      FROM jsonb_to_recordset(v_recorded->'rows') AS r(
        invoice_id uuid,invoice_number text,billing_month date,outstanding_amount numeric,disposition text)
      WHERE r.disposition IN ('included','excluded') AND r.outstanding_amount>0
    ),
$invoices$||substr(v_statement,v_end);
  v_start:=strpos(v_statement,'    future_rent AS (');
  v_end:=strpos(v_statement,'    evidence AS (');
  IF v_start=0 OR v_end<=v_start THEN RAISE EXCEPTION 'Missing audited v4 future boundaries'; END IF;
  v_statement:=substr(v_statement,1,v_start-1)||$future$
    future_rent AS (
      SELECT coalesce(sum(r.outstanding_amount),0) AS amount
      FROM jsonb_to_recordset(v_recorded->'rows') AS r(outstanding_amount numeric,disposition text)
      WHERE r.disposition='after_cutoff'
    ),
$future$||substr(v_statement,v_end);
  v_start:=strpos(v_statement,'    evidence AS (');
  v_end:=strpos(v_statement,'    case_context AS (');
  IF v_start=0 OR v_end<=v_start THEN RAISE EXCEPTION 'Missing audited v4 traffic boundaries'; END IF;
  v_statement:=substr(v_statement,1,v_start-1)||$traffic_ctes$
    evidence AS (SELECT (v_traffic->>'proof_ready')::boolean AS violations_proof_ready),
    penalty_totals AS (SELECT (v_traffic->>'violation_count')::integer AS violation_count,
      (v_traffic->>'claim_amount')::numeric AS amount),
$traffic_ctes$||substr(v_statement,v_end);
  v_statement:=replace(v_statement,'            - invoice_audit.manually_excluded_amount','');
  v_statement:=replace(v_statement,$find$      'version', 'v4',$find$,
    $replace$      '_breakdown', final.value, 'version', 'v4', 'calculation_source', 'canonical_recorded_rows_v5',$replace$);
  -- Guard patch drift: no old cache-based rent selection or duplicate subtraction.
  IF strpos(v_statement,'invoice.balance_due')>0 OR strpos(v_statement,'public.calculate_legal_claim_breakdown_v3(')>0
    OR strpos(v_statement,'- invoice_audit.manually_excluded_amount')>0 THEN
    RAISE EXCEPTION 'Incomplete replacement of v4 rental calculation';
  END IF;
  EXECUTE 'CREATE FUNCTION legal_claim_internal.calculate_statement_rows_v5(
    p_company_id uuid,p_contract_id uuid,p_as_of_date date,p_claim_scope text,p_excluded_invoice_ids uuid[])
    RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS '||quote_literal(v_statement);
END;
$install$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA legal_claim_internal FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION legal_claim_internal.calculate_statement_rows_v5(uuid,uuid,date,text,uuid[])
  TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.calculate_legal_claim_breakdown_v3(
  p_company_id uuid,p_contract_id uuid,
  p_as_of_date date DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date)
)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $public_v3$
  SELECT legal_claim_internal.calculate_statement_rows_v5(
    p_company_id,p_contract_id,p_as_of_date,'full_outstanding',ARRAY[]::uuid[])->'_breakdown';
$public_v3$;

CREATE OR REPLACE FUNCTION public.calculate_legal_claim_statement_v4(
  p_company_id uuid,p_contract_id uuid,
  p_as_of_date date DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date),
  p_claim_scope text DEFAULT 'full_outstanding',p_excluded_invoice_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $public_v4$
  SELECT legal_claim_internal.calculate_statement_rows_v5(
    p_company_id,p_contract_id,p_as_of_date,p_claim_scope,p_excluded_invoice_ids)-'_breakdown';
$public_v4$;

REVOKE ALL ON FUNCTION public.calculate_legal_claim_breakdown_v3(uuid,uuid,date) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.calculate_legal_claim_statement_v4(uuid,uuid,date,text,uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.calculate_legal_claim_breakdown_v3(uuid,uuid,date) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.calculate_legal_claim_statement_v4(uuid,uuid,date,text,uuid[]) TO authenticated,service_role;
COMMIT;
