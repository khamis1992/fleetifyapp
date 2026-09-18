-- Pending internal reader, not an API endpoint or a replacement for v3/v4 yet.
-- Depends on 20260903222544_canonical_rental_month_summary.
-- Never refreshes balances, generates invoices, or rewrites legal snapshots.
BEGIN;

CREATE FUNCTION public.canonical_legal_recorded_obligations_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_as_of_date date,
  p_excluded_invoice_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $obligations$
DECLARE
  v_start date;
  v_end date;
  v_rent_cutoff date;
  v_result jsonb;
BEGIN
  IF p_company_id IS NULL OR p_contract_id IS NULL OR p_as_of_date IS NULL
     OR NOT isfinite(p_as_of_date)
     OR array_position(p_excluded_invoice_ids, NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'Finite calculation date, company, contract and non-null exclusion IDs are required'
      USING ERRCODE = '22023';
  END IF;
  SELECT c.start_date,c.end_date INTO v_start,v_end
  FROM public.contracts c WHERE c.company_id=p_company_id AND c.id=p_contract_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract not found in the requested company' USING ERRCODE = 'P0002';
  END IF;
  IF v_start IS NULL OR v_end IS NULL OR NOT isfinite(v_start) OR NOT isfinite(v_end) OR v_start>v_end THEN
    RAISE EXCEPTION 'Contract period requires reconciliation' USING ERRCODE = '22023';
  END IF;

  -- Only the rent clock stops on these events. Keep the requested date intact
  -- for separately evidenced retention/compensation in the future consumer.
  SELECT least(p_as_of_date,min(e.event_date)) INTO v_rent_cutoff
  FROM (
    SELECT p.vehicle_returned_at AS event_date
    FROM public.legal_case_litigation_profile p
    WHERE p.company_id=p_company_id AND p.contract_id=p_contract_id
    UNION ALL
    SELECT p.termination_date
    FROM public.legal_case_litigation_profile p
    WHERE p.company_id=p_company_id AND p.contract_id=p_contract_id
      AND lower(btrim(p.termination_date_status))='confirmed'
    UNION ALL
    SELECT (lc.judgment_final_at AT TIME ZONE 'Asia/Qatar')::date
    FROM public.legal_cases lc
    WHERE lc.company_id=p_company_id AND lc.contract_id=p_contract_id
      AND lower(btrim(coalesce(lc.case_status,''))) NOT IN ('cancelled','canceled','void','voided','reversed','deleted','inactive')
    UNION ALL
    SELECT lc.outcome_date
    FROM public.legal_cases lc
    WHERE lc.company_id=p_company_id AND lc.contract_id=p_contract_id
      AND lower(btrim(coalesce(lc.case_status,''))) NOT IN ('cancelled','canceled','void','voided','reversed','deleted','inactive')
      AND lc.workflow_stage IN ('judgment_issued','appeal','enforcement','collection','closed')
  ) e;
  IF NOT isfinite(v_rent_cutoff) OR v_rent_cutoff<v_start THEN
    RAISE EXCEPTION 'Legal rent cutoff precedes the contract or is invalid' USING ERRCODE = '22023';
  END IF;

  WITH schedules AS MATERIALIZED (
    SELECT s.id,s.invoice_id,s.amount,date_trunc('month',s.due_date)::date billing_month
    FROM public.contract_payment_schedules s
    WHERE s.company_id=p_company_id AND s.contract_id=p_contract_id
      AND lower(btrim(coalesce(s.status,''))) NOT IN ('cancelled','canceled','void','voided','reversed','deleted','inactive')
  ), settled AS MATERIALIZED (
    SELECT i.* FROM public.canonical_contract_invoice_settlement_v1(p_company_id) i
    WHERE i.contract_id=p_contract_id
  ), rental AS MATERIALIZED (
    SELECT i.* FROM settled i WHERE NOT i.is_traffic
  ), invoice_rows AS (
    SELECT i.invoice_id AS source_id,'invoice'::text AS source_type,
      i.invoice_id,i.invoice_number,i.invoice_month AS billing_month,
      i.invoiced_amount,i.paid_amount,i.outstanding_amount,
      array_remove(ARRAY[
        CASE WHEN i.invalid THEN 'invalid_invoice_or_payment' END,
        CASE WHEN EXISTS (SELECT 1 FROM unnest(ARRAY[i.invoiced_amount,i.paid_amount,i.outstanding_amount]) n(amount)
          WHERE n.amount IS NULL OR n.amount::text IN ('NaN','Infinity','-Infinity')
            OR n.amount<0 OR n.amount<>round(n.amount,2)) THEN 'invalid_currency_amount' END,
        CASE WHEN i.unclassified_service OR i.invoice_type NOT IN ('sales','service') THEN 'unclassified_rental_invoice' END,
        CASE WHEN i.invoice_month IS NULL OR NOT isfinite(i.invoice_month) THEN 'unknown_invoice_month' END,
        CASE WHEN i.invoice_month<date_trunc('month',v_start)::date
          OR i.invoice_month>date_trunc('month',v_end)::date THEN 'outside_contract_period' END,
        CASE WHEN (SELECT count(*) FROM rental x WHERE x.invoice_month=i.invoice_month)>1
          THEN 'duplicate_rental_month' END,
        CASE WHEN EXISTS (SELECT 1 FROM schedules s WHERE s.invoice_id=i.invoice_id
          AND (s.billing_month IS DISTINCT FROM i.invoice_month OR s.amount IS DISTINCT FROM i.invoiced_amount))
          THEN 'schedule_invoice_mismatch' END,
        CASE WHEN (SELECT count(*) FROM schedules s WHERE s.billing_month=i.invoice_month)>1
          THEN 'duplicate_schedule_month' END,
        CASE WHEN EXISTS (SELECT 1 FROM schedules s WHERE s.billing_month=i.invoice_month
          AND (s.amount IS DISTINCT FROM i.invoiced_amount OR (s.invoice_id IS NOT NULL AND s.invoice_id<>i.invoice_id)))
          THEN 'schedule_invoice_mismatch' END
      ],NULL) AS review_reasons
    FROM rental i
  ), missing_rows AS (
    -- A schedule's paid_amount is a cache, not receipt evidence. Until its
    -- invoice is restored/linked, do not turn that cache into collectible debt.
    SELECT s.id,'schedule'::text,s.invoice_id,NULL::text,s.billing_month,
      s.amount,NULL::numeric,NULL::numeric,
      array_remove(ARRAY[
        'missing_or_unmatched_rental_invoice',
        CASE WHEN s.billing_month IS NULL OR NOT isfinite(s.billing_month) THEN 'unknown_schedule_month' END,
        CASE WHEN s.billing_month<date_trunc('month',v_start)::date
          OR s.billing_month>date_trunc('month',v_end)::date THEN 'outside_contract_period' END,
        CASE WHEN EXISTS (SELECT 1 FROM settled i WHERE i.invoice_id=s.invoice_id AND i.is_traffic)
          THEN 'schedule_linked_to_traffic' END
      ],NULL)
    FROM schedules s
    WHERE NOT EXISTS (SELECT 1 FROM rental i WHERE
      (s.invoice_id=i.invoice_id OR (s.invoice_id IS NULL AND s.billing_month=i.invoice_month)))
  ), all_rows AS (
    SELECT * FROM invoice_rows UNION ALL SELECT * FROM missing_rows
  ), classified AS (
    SELECT r.*,CASE
      WHEN cardinality(r.review_reasons)>0 THEN 'review'
      WHEN r.billing_month>least(v_end,v_rent_cutoff) THEN 'after_cutoff'
      WHEN r.outstanding_amount=0 THEN 'settled'
      WHEN r.invoice_id=ANY(coalesce(p_excluded_invoice_ids,ARRAY[]::uuid[])) THEN 'excluded'
      ELSE 'included' END AS disposition
    FROM all_rows r
  ), amounts AS (
    SELECT r.source_id,r.source_type,r.invoice_id,r.invoice_number,r.billing_month,
      r.disposition,r.review_reasons,
      CASE WHEN r.disposition<>'review' THEN r.invoiced_amount END AS invoiced_amount,
      CASE WHEN r.disposition<>'review' THEN r.paid_amount END AS paid_amount,
      CASE WHEN r.disposition<>'review' THEN r.outstanding_amount END AS outstanding_amount
    FROM classified r
  )
  SELECT jsonb_build_object(
    'company_id',p_company_id,'contract_id',p_contract_id,
    'as_of_date',p_as_of_date,'rent_cutoff_date',v_rent_cutoff,
    'recorded_rent_cutoff_date',least(v_end,v_rent_cutoff),
    'requires_review',count(*)=0 OR coalesce(bool_or(a.disposition='review'),false),
    'review_reasons',CASE WHEN count(*)=0 THEN '["missing_recorded_obligation_evidence"]'::jsonb
      ELSE coalesce((SELECT jsonb_agg(DISTINCT reason ORDER BY reason)
        FROM amounts x CROSS JOIN LATERAL unnest(x.review_reasons) reason),'[]'::jsonb) END,
    'recorded_rent_total',CASE WHEN count(*)>0 AND NOT coalesce(bool_or(a.disposition='review'),false)
      THEN coalesce(sum(a.outstanding_amount) FILTER(WHERE a.disposition='included'),0) END,
    'manual_excluded_total',coalesce(sum(a.outstanding_amount) FILTER(WHERE a.disposition='excluded'),0),
    'rows',coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.billing_month,a.source_type,a.source_id),'[]'::jsonb)
  ) INTO v_result FROM amounts a;
  RETURN v_result;
END;
$obligations$;

REVOKE ALL ON FUNCTION public.canonical_legal_recorded_obligations_v1(uuid,uuid,date,uuid[])
  FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON FUNCTION public.canonical_legal_recorded_obligations_v1(uuid,uuid,date,uuid[]) IS
  'Private read-only recorded rent rows. Consumers must reject requires_review; not the full legal claim or an API gateway.';
COMMIT;
