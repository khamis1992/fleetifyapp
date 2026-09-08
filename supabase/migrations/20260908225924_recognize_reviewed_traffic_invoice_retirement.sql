-- Read-only recognition of the evidenced 2026-08-30 billing retirement.
-- This is not a waiver and does not recreate invoices or modify obligations.
BEGIN;
CREATE FUNCTION legal_memo_calc_private.is_reviewed_traffic_invoice_retirement(
 p_company uuid,p_contract uuid,p_invoice uuid,p_amount numeric
) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $helper$
DECLARE v_matches boolean;
BEGIN
 SELECT EXISTS (
  SELECT 1 FROM public.invoices i
  JOIN public.contracts c ON c.id=i.contract_id AND c.company_id=i.company_id
  JOIN public.journal_entries j ON j.id=i.journal_entry_id AND j.company_id=i.company_id
  JOIN public.journal_entries r ON r.id=j.reversal_entry_id AND r.company_id=i.company_id
  WHERE i.id=p_invoice AND i.company_id=p_company AND i.contract_id=p_contract
    AND i.customer_id=c.customer_id AND i.total_amount=p_amount AND p_amount>0
    AND i.status='cancelled' AND coalesce(i.paid_amount,0)=0
    AND j.reference_type='invoice' AND j.reference_id=i.id AND j.status='posted'
    AND r.reference_type='journal_reversal' AND r.reference_id=j.id AND r.status='posted'
    AND r.reversal_entry_id IS NULL
    AND position('إلغاء فاتورة مخالفة مرورية بقرار معتمد 2026-08-30: المخالفات تُدار من قسمها الخاص ولا تُنشأ لها فواتير في نظام الفواتير.' in i.notes)>0
    AND position('إلغاء فاتورة مخالفة مرورية بقرار معتمد 2026-08-30: المخالفات تُدار من قسمها الخاص ولا تُنشأ لها فواتير في نظام الفواتير.' in r.description)>0
    AND NOT EXISTS (SELECT 1 FROM public.payment_allocations a WHERE a.target_id=i.id AND a.allocation_type='invoice' AND a.is_active)
 ) INTO v_matches;
 IF NOT v_matches THEN RETURN false; END IF;
 -- Even a zero paid cache cannot erase an existing completed customer receipt.
 RETURN legal_memo_calc_private.invoice_paid(p_company,p_invoice)=0;
END;
$helper$;
REVOKE ALL ON FUNCTION legal_memo_calc_private.is_reviewed_traffic_invoice_retirement(uuid,uuid,uuid,numeric) FROM PUBLIC,anon,authenticated,service_role;
DO $patch$
DECLARE v_definition text; v_old text; v_new text;
BEGIN
 IF (SELECT md5(prosrc) FROM pg_proc WHERE oid='legal_memo_calc_private.read_traffic(uuid,uuid,date)'::regprocedure)<>'1cdaadd2268cbf67f19eba1a9e633710' THEN
  RAISE EXCEPTION 'Reviewed traffic reader has changed';
 END IF;
 v_definition:=pg_get_functiondef('legal_memo_calc_private.read_traffic(uuid,uuid,date)'::regprocedure);
 EXECUTE replace(v_definition,'legal_memo_calc_private.read_traffic(', 'legal_memo_calc_private.before_retirement_read_traffic(');
 v_old:=$old$WHERE raw.penalty_id=ANY(p.source_ids) OR (raw.penalty_id IS NULL AND EXISTS (
            SELECT 1 FROM unnest(p.source_ids) alias_id WHERE lower(btrim(raw.invoice_number))='tv-'||alias_id::text)))$old$;
 v_new:=$new$WHERE (raw.penalty_id=ANY(p.source_ids) OR (raw.penalty_id IS NULL AND EXISTS (
            SELECT 1 FROM unnest(p.source_ids) alias_id WHERE lower(btrim(raw.invoice_number))='tv-'||alias_id::text)))
            AND NOT legal_memo_calc_private.is_reviewed_traffic_invoice_retirement(p_company_id,p_contract_id,raw.id,p.amount))$new$;
 IF position(v_old in v_definition)=0 THEN RAISE EXCEPTION 'Traffic retirement guard anchor missing'; END IF;
 EXECUTE replace(v_definition,v_old,v_new);
END;
$patch$;
REVOKE ALL ON FUNCTION legal_memo_calc_private.before_retirement_read_traffic(uuid,uuid,date) FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
