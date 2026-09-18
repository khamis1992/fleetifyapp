-- Read-only claim settlement. No invoice, receipt, allocation or case DML.
-- Preserve the reviewed live classification rules and keep public facades invoker.
BEGIN;
CREATE SCHEMA legal_memo_calc_private;
REVOKE ALL ON SCHEMA legal_memo_calc_private FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA legal_memo_calc_private TO authenticated,service_role;

CREATE FUNCTION legal_memo_calc_private.authorize_company(p_company_id uuid)
RETURNS void LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $auth$
BEGIN
  IF p_company_id IS NULL THEN RAISE EXCEPTION 'Company is required' USING ERRCODE='22023'; END IF;
  IF coalesce(auth.jwt()->>'role','')='service_role' THEN RETURN; END IF;
  IF auth.uid() IS NULL OR public.get_user_company_id() IS DISTINCT FROM p_company_id
    OR NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.user_id=auth.uid()
      AND p.company_id=p_company_id AND p.is_active IS TRUE) THEN
    RAISE EXCEPTION 'Not authorized to read this company claim' USING ERRCODE='42501';
  END IF;
END;
$auth$;

CREATE FUNCTION legal_memo_calc_private.invoice_paid(p_company_id uuid,p_invoice_id uuid)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $paid$
DECLARE v_total numeric; v_customer uuid; v_contract uuid; v_paid numeric; v_invalid boolean;
BEGIN
  SELECT i.total_amount,c.customer_id,i.contract_id INTO v_total,v_customer,v_contract
  FROM public.invoices i JOIN public.contracts c ON c.id=i.contract_id AND c.company_id=i.company_id
  WHERE i.company_id=p_company_id AND i.id=p_invoice_id;
  IF NOT FOUND OR v_total IS NULL OR v_total<0 OR v_total::text IN ('NaN','Infinity','-Infinity') THEN
    RAISE EXCEPTION 'Invoice requires reconciliation' USING ERRCODE='22023';
  END IF;
  WITH sources AS (
    SELECT a.amount,
      a.company_id IS DISTINCT FROM p_company_id OR p.company_id IS DISTINCT FROM p_company_id
      OR p.customer_id IS DISTINCT FROM v_customer OR p.transaction_type IS NULL
      OR a.amount IS NULL OR a.amount<=0 OR a.amount::text IN ('NaN','Infinity','-Infinity')
      OR p.amount IS NULL OR p.amount<=0 OR p.amount::text IN ('NaN','Infinity','-Infinity')
      OR EXISTS(SELECT 1 FROM public.payment_allocations x WHERE x.payment_id=p.id AND x.is_active
        AND (x.company_id IS DISTINCT FROM p_company_id OR x.amount IS NULL OR x.amount<=0))
      OR (SELECT coalesce(sum(x.amount),0) FROM public.payment_allocations x WHERE x.payment_id=p.id AND x.is_active)>p.amount
      AS invalid
    FROM public.payment_allocations a JOIN public.payments p ON p.id=a.payment_id
    WHERE a.target_id=p_invoice_id AND a.allocation_type='invoice' AND a.is_active
      AND lower(coalesce(p.payment_status,'')) IN ('completed','paid','success','succeeded')
      AND lower(coalesce(p.transaction_type::text,'receipt'))='receipt'
    UNION ALL
    SELECT p.amount,p.company_id IS DISTINCT FROM p_company_id OR p.customer_id IS DISTINCT FROM v_customer
      OR (p.contract_id IS NOT NULL AND p.contract_id IS DISTINCT FROM v_contract)
      OR p.transaction_type IS NULL OR p.amount IS NULL OR p.amount<=0
      OR p.amount::text IN ('NaN','Infinity','-Infinity')
    FROM public.payments p WHERE p.invoice_id=p_invoice_id
      AND lower(coalesce(p.payment_status,'')) IN ('completed','paid','success','succeeded')
      AND lower(coalesce(p.transaction_type::text,'receipt'))='receipt'
      AND NOT EXISTS(SELECT 1 FROM public.payment_allocations a WHERE a.payment_id=p.id AND a.is_active)
  ) SELECT coalesce(sum(amount),0),coalesce(bool_or(invalid),false) INTO v_paid,v_invalid FROM sources;
  IF v_invalid OR v_paid>v_total OR v_paid<>round(v_paid,2) OR EXISTS(
    SELECT 1 FROM public.payment_allocations a LEFT JOIN public.payments p ON p.id=a.payment_id
    WHERE a.target_id=p_invoice_id AND a.allocation_type='invoice' AND a.is_active AND p.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Invoice receipts require reconciliation' USING ERRCODE='22023';
  END IF;
  RETURN v_paid;
END;
$paid$;

CREATE FUNCTION legal_memo_calc_private.read_traffic(
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
      p.customer_id,p.penalty_number::text,p.penalty_date,p.amount,p.status::text,p.customer_payment_status,p.violation_type::text,p.location::text,
      lower(btrim(coalesce(p.responsibility_party,''))) AS party,'penalties'::text AS source_type,
      lower(btrim(coalesce(p.status,''))) IN ('cancelled','canceled','void','voided','reversed','deleted','inactive')
        OR lower(btrim(coalesce(p.responsibility_party,'')))='cancelled' AS source_cancelled,
      nullif(lower(btrim(p.penalty_number)),'') AS reference
    FROM public.penalties p WHERE p.company_id=p_company_id
    UNION ALL
    SELECT t.id,t.contract_id,t.vehicle_id,t.responsible_customer_id,NULL::uuid,
      t.violation_number,t.violation_date,t.fine_amount,t.status,NULL::text,t.violation_type,t.location,
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
    SELECT i.id AS invoice_id,i.invoice_number,i.penalty_id,coalesce(i.invoice_month,i.due_date) AS invoice_month,
      i.total_amount AS invoiced_amount,legal_memo_calc_private.invoice_paid(p_company_id,i.id) AS paid_amount,
      i.total_amount-legal_memo_calc_private.invoice_paid(p_company_id,i.id) AS outstanding_amount,false AS invalid
    FROM public.invoices i WHERE i.company_id=p_company_id AND i.contract_id=p_contract_id
      AND (i.penalty_id IS NOT NULL OR upper(btrim(coalesce(i.invoice_number,''))) LIKE 'TV-%')
      AND lower(btrim(coalesce(i.status,''))) NOT IN ('cancelled','canceled','void','voided','reversed','deleted','inactive')
      AND lower(btrim(coalesce(i.payment_status,''))) NOT IN ('cancelled','canceled','void','voided','reversed','deleted','inactive')
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
    SELECT p.id AS penalty_id,t.invoice_id,p.penalty_date,p.penalty_number,p.violation_type,p.location,p.amount,p.source_type,p.source_ids,p.source_conflict,p.duplicate_reference,
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
      e.penalty_number AS violation_number,e.violation_type,e.location,e.party AS responsibility_party,
      CASE WHEN e.disposition='review' THEN e.review_reasons ELSE ARRAY[]::text[] END AS review_reasons,
      CASE WHEN e.disposition<>'review' THEN e.outstanding_amount END AS outstanding_amount
    FROM classified e
    UNION ALL
    SELECT NULL::uuid,i.invoice_id,i.invoice_month,'review','invoice',ARRAY[]::uuid[],
      i.invoice_number,NULL::text,NULL::text,NULL::text,ARRAY['unmatched_traffic_invoice'],NULL::numeric
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
DECLARE v_name text; v_oid regprocedure; v_original text; v_updated text; v_alias text; v_pattern text; v_start integer; v_end integer;
BEGIN
  FOREACH v_name IN ARRAY ARRAY['calculate_legal_claim_breakdown_v3','calculate_legal_claim_statement_v4'] LOOP
    v_oid:=CASE WHEN v_name='calculate_legal_claim_breakdown_v3'
      THEN 'public.calculate_legal_claim_breakdown_v3(uuid,uuid,date)'::regprocedure
      ELSE 'public.calculate_legal_claim_statement_v4(uuid,uuid,date,text,uuid[])'::regprocedure END;
    IF (SELECT md5(prosrc) FROM pg_proc WHERE oid=v_oid) IS DISTINCT FROM
      (CASE WHEN v_name='calculate_legal_claim_breakdown_v3' THEN '5c5211093c5cd8d6fae58618cde44462'
      ELSE '5ca5b12767113a97b0e841198b878357' END) THEN
      RAISE EXCEPTION 'Claim engine changed since review: %',v_name;
    END IF;
    v_original:=pg_get_functiondef(v_oid);
    -- Backup is private and non-executable by API roles. Rollback restores this exact body.
    EXECUTE replace(v_original,'public.'||v_name||'(', 'legal_memo_calc_private.before_'||v_name||'(');
    v_updated:=replace(v_original,'public.'||v_name||'(', 'legal_memo_calc_private.'||v_name||'(');
    v_alias:=CASE WHEN v_name='calculate_legal_claim_breakdown_v3' THEN 'i' ELSE 'invoice' END;
    v_pattern:='COALESCE\('||v_alias||'\.balance_due,\s*'||v_alias||'\.total_amount - COALESCE\('||v_alias||'\.paid_amount, 0\)\)';
    v_updated:=regexp_replace(v_updated,v_pattern,
      '('||v_alias||'.total_amount - legal_memo_calc_private.invoice_paid(p_company_id,'||v_alias||'.id))','g');
    IF v_updated=replace(v_original,'public.'||v_name||'(', 'legal_memo_calc_private.'||v_name||'(')
      OR strpos(v_updated,v_alias||'.balance_due')>0 THEN RAISE EXCEPTION 'Incomplete settlement patch'; END IF;
    IF v_name='calculate_legal_claim_breakdown_v3' THEN
      v_updated:=replace(v_updated,'      s.due_date,',
        '      s.id, s.installment_number, s.amount AS gross_amount, coalesce(s.paid_amount,0) AS counted_payments, s.due_date,');
      v_updated:=replace(v_updated,'  SELECT JSONB_BUILD_OBJECT(',
        $new$  SELECT JSONB_BUILD_OBJECT(
    'included_schedules', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'installment_number', installment_number, 'due_date', due_date,
      'total_amount', gross_amount, 'paid_amount', counted_payments, 'amount', amount
    ) ORDER BY due_date,id),'[]'::jsonb) FROM due_schedules WHERE amount>0),$new$);
      v_updated:=replace(v_updated,$old$    'retention_start_date', ($old$,
        $new$    'retention_end_date', (SELECT least(p_as_of_date,coalesce(vehicle_returned_at,p_as_of_date)) FROM legal_period),
    'retention_daily_rate', (SELECT retention_daily_rate FROM legal_period),
    'contractual_compensation_units', (SELECT CASE contractual_compensation_method
      WHEN 'fixed' THEN 1 WHEN 'daily' THEN (SELECT coalesce(sum(greatest(p_as_of_date-due_date,0)),0) FROM claim_rows)
      WHEN 'monthly' THEN (SELECT count(distinct date_trunc('month',due_date::timestamp)) FROM claim_rows)
      WHEN 'per_invoice' THEN (SELECT count(*) FROM claim_rows) ELSE 0 END FROM profile),
    'retention_start_date', ($new$);
      IF strpos(v_updated,'''included_schedules''')=0 THEN RAISE EXCEPTION 'Missing schedule metadata'; END IF;
    END IF;
    IF v_name='calculate_legal_claim_statement_v4' THEN
      v_updated:=replace(v_updated,'  v_scope text :=', '  v_traffic jsonb; v_breakdown jsonb;
  v_scope text :=');
      v_updated:=replace(v_updated,'  RETURN (', $guard$
  v_breakdown:=public.calculate_legal_claim_breakdown_v3(p_company_id,p_contract_id,v_effective_date);
  IF v_scope<>'traffic_violations_only' AND jsonb_array_length(coalesce(v_breakdown->'included_schedules','[]'::jsonb))>0 THEN
    RAISE EXCEPTION 'تعذر اعتماد الأجرة: توجد أقساط غير مرتبطة بفواتير؛ راجع استحقاقها وقرار إلغاء العقد وطابقها قبل إعداد المطالبة'
      USING ERRCODE='P0001',DETAIL=(v_breakdown->'included_schedules')::text,HINT='LEGAL_SCHEDULE_RECONCILIATION_REQUIRED';
  END IF;
  v_traffic:=legal_memo_calc_private.read_traffic(p_company_id,p_contract_id,v_effective_date);
  IF (v_traffic->>'requires_review')::boolean THEN
    RAISE EXCEPTION 'تعذر اعتماد مطالبة المخالفات: تحتاج المسؤولية أو دفعات العميل إلى مطابقة'
      USING ERRCODE='P0001',DETAIL=v_traffic::text,HINT='LEGAL_TRAFFIC_RECONCILIATION_REQUIRED';
  END IF;
  RETURN ($guard$);
      v_updated:=replace(v_updated,$base$public.calculate_legal_claim_breakdown_v3(
        p_company_id,
        p_contract_id,
        v_effective_date
      )$base$,'v_breakdown');
      v_start:=strpos(v_updated,'    evidence AS ('); v_end:=strpos(v_updated,'    case_context AS (');
      IF v_start=0 OR v_end<=v_start THEN RAISE EXCEPTION 'Missing traffic boundaries'; END IF;
      v_updated:=substr(v_updated,1,v_start-1)||$ctes$
    evidence AS (SELECT (v_traffic->>'proof_ready')::boolean AS violations_proof_ready),
    penalty_totals AS (SELECT (v_traffic->>'violation_count')::integer AS violation_count,
      (v_traffic->>'claim_amount')::numeric AS amount),
$ctes$||substr(v_updated,v_end);

      v_updated:=replace(v_updated,'        invoice.invoice_number,',
        '        invoice.invoice_number, invoice.total_amount AS gross_amount,
        legal_memo_calc_private.invoice_paid(p_company_id,invoice.id) AS counted_payments,
        coalesce(invoice.invoice_month,invoice.due_date) AS billing_month,');
      v_updated:=replace(v_updated,$old$            'due_date', due_date,$old$,
        $new$            'due_date', due_date, 'invoice_month', billing_month,
            'total_amount', gross_amount, 'paid_amount', counted_payments,$new$);
      v_updated:=replace(v_updated,$old$      'version', 'v4',$old$,
        $new$      'version', 'v4', 'settlement_source', 'completed_receipt_allocations_v1',
      'extension_start_date', final.value->'extension_start_date', 'traffic_settlement', v_traffic,
      'calculation_details', jsonb_build_object('retention_start_date', final.value->'retention_start_date',
        'retention_end_date',final.value->'retention_end_date','retention_daily_rate',final.value->'retention_daily_rate',
        'contractual_compensation_units',final.value->'contractual_compensation_units'),
      'included_schedules', CASE WHEN v_scope='traffic_violations_only' THEN '[]'::jsonb ELSE final.value->'included_schedules' END,$new$);
      IF strpos(v_updated,'''paid_amount'', counted_payments')=0
        OR strpos(v_updated,'''settlement_source''')=0 THEN RAISE EXCEPTION 'Missing disclosed settlement metadata'; END IF;
    END IF;
    EXECUTE v_updated;
  END LOOP;
END;
$install$;

CREATE FUNCTION legal_memo_calc_private.read_breakdown(p_company_id uuid,p_contract_id uuid,p_as_of_date date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $gateway$
BEGIN
  PERFORM legal_memo_calc_private.authorize_company(p_company_id);
  RETURN legal_memo_calc_private.calculate_legal_claim_breakdown_v3(p_company_id,p_contract_id,p_as_of_date);
END;
$gateway$;
CREATE FUNCTION legal_memo_calc_private.read_statement(p_company_id uuid,p_contract_id uuid,p_as_of_date date,p_claim_scope text,p_excluded_invoice_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $gateway$
BEGIN
  PERFORM legal_memo_calc_private.authorize_company(p_company_id);
  RETURN legal_memo_calc_private.calculate_legal_claim_statement_v4(p_company_id,p_contract_id,p_as_of_date,p_claim_scope,p_excluded_invoice_ids);
END;
$gateway$;
DO $amount_backup$
DECLARE v_oid regprocedure := 'public.calculate_legal_claim_amount_v1(uuid,uuid,date)'::regprocedure;
BEGIN
  IF (SELECT md5(prosrc) FROM pg_proc WHERE oid=v_oid)<>'a47895ed19eebe02f19fec8b0a8d1ecd' THEN
    RAISE EXCEPTION 'Amount reader changed since review';
  END IF;
  EXECUTE replace(pg_get_functiondef(v_oid),'public.calculate_legal_claim_amount_v1(',
    'legal_memo_calc_private.before_calculate_legal_claim_amount_v1(');
END;
$amount_backup$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA legal_memo_calc_private FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION legal_memo_calc_private.read_breakdown(uuid,uuid,date),
  legal_memo_calc_private.read_statement(uuid,uuid,date,text,uuid[]) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.calculate_legal_claim_breakdown_v3(p_company_id uuid,p_contract_id uuid,
  p_as_of_date date DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date))
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $facade$
  SELECT legal_memo_calc_private.read_breakdown(p_company_id,p_contract_id,p_as_of_date);
$facade$;
CREATE OR REPLACE FUNCTION public.calculate_legal_claim_statement_v4(p_company_id uuid,p_contract_id uuid,
  p_as_of_date date DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date),
  p_claim_scope text DEFAULT 'full_outstanding',p_excluded_invoice_ids uuid[] DEFAULT ARRAY[]::uuid[])
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $facade$
  SELECT legal_memo_calc_private.read_statement(p_company_id,p_contract_id,p_as_of_date,p_claim_scope,p_excluded_invoice_ids);
$facade$;
CREATE OR REPLACE FUNCTION public.calculate_legal_claim_amount_v1(p_company_id uuid,p_contract_id uuid,
  p_as_of_date date DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date))
RETURNS numeric LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $amount$
  SELECT (public.calculate_legal_claim_statement_v4(p_company_id,p_contract_id,p_as_of_date,'',ARRAY[]::uuid[])->>'total')::numeric;
$amount$;
COMMIT;
