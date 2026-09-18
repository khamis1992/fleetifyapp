BEGIN;
DO $patch$
DECLARE d text; old_guard text; new_guard text;
BEGIN
 IF (SELECT md5(prosrc) FROM pg_proc WHERE oid='legal_memo_calc_private.read_traffic(uuid,uuid,date)'::regprocedure)<>'4633e40025117d74604e624d1f96cd53' THEN RAISE EXCEPTION 'Traffic retirement reader has changed'; END IF;
 d:=pg_get_functiondef('legal_memo_calc_private.read_traffic(uuid,uuid,date)'::regprocedure);
 EXECUTE replace(d,'legal_memo_calc_private.read_traffic(', 'legal_memo_calc_private.before_bounded_retirement_read_traffic(');
 IF position('), payment_totals AS (' in d)=0 THEN RAISE EXCEPTION 'Traffic payment anchor missing'; END IF;
 d:=replace(d,'), payment_totals AS (',$cte$), historical_matches AS MATERIALIZED (
    -- Finish identity matching before invoking receipt/reversal checks. Otherwise
    -- a correlated OR plan can evaluate the helper for unrelated invoice rows.
    SELECT p.id AS penalty_source_id,raw.id AS invoice_id,p.amount
    FROM penalties p JOIN public.invoices raw ON raw.penalty_id=ANY(p.source_ids)
    UNION
    SELECT p.id,raw.id,p.amount FROM penalties p
    CROSS JOIN LATERAL unnest(p.source_ids) alias_id
    JOIN public.invoices raw ON raw.penalty_id IS NULL AND lower(btrim(raw.invoice_number))='tv-'||alias_id::text
  ), historical_reviews AS MATERIALIZED (
    SELECT h.penalty_source_id,bool_or(NOT legal_memo_calc_private.is_reviewed_traffic_invoice_retirement(
      p_company_id,p_contract_id,h.invoice_id,h.amount)) AS requires_review
    FROM historical_matches h GROUP BY h.penalty_source_id
  ), payment_totals AS ($cte$);
 old_guard:=$old$EXISTS (SELECT 1 FROM public.invoices raw
          WHERE (raw.penalty_id=ANY(p.source_ids) OR (raw.penalty_id IS NULL AND EXISTS (
            SELECT 1 FROM unnest(p.source_ids) alias_id WHERE lower(btrim(raw.invoice_number))='tv-'||alias_id::text)))
            AND NOT legal_memo_calc_private.is_reviewed_traffic_invoice_retirement(p_company_id,p_contract_id,raw.id,p.amount))$old$;
 new_guard:=$new$EXISTS (SELECT 1 FROM historical_reviews h WHERE h.penalty_source_id=p.id AND h.requires_review)$new$;
 IF position(old_guard in d)=0 THEN RAISE EXCEPTION 'Traffic historical guard missing'; END IF;
 EXECUTE replace(d,old_guard,new_guard);
END;
$patch$;
REVOKE ALL ON FUNCTION legal_memo_calc_private.before_bounded_retirement_read_traffic(uuid,uuid,date) FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
