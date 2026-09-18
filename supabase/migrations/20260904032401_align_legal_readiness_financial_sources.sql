-- Pending adapter for the existing readiness screen. No financial DML.
-- Requires the canonical settlement, recorded-rent and dual-source traffic readers.
BEGIN;

DO $baseline$
BEGIN
  IF (SELECT md5(prosrc) FROM pg_proc WHERE oid='public.get_legal_transfer_readiness_v2(uuid,uuid)'::regprocedure)
    <> '96f660a8b730ac550f12eb184dd297ff' THEN
    RAISE EXCEPTION 'Readiness v2 changed since audit; rebase before applying';
  END IF;
  EXECUTE replace(pg_get_functiondef('public.get_legal_transfer_readiness_v2(uuid,uuid)'::regprocedure),
    'public.get_legal_transfer_readiness_v2(', 'legal_claim_internal.legacy_readiness_v2(');
END;
$baseline$;

CREATE FUNCTION legal_claim_internal.read_readiness_finances_v1(
  p_company_id uuid,p_contract_id uuid,p_as_of_date date
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=''
AS $financial$
DECLARE
  v_rent jsonb;
  v_traffic jsonb;
  v_invoices jsonb;
  v_violations jsonb;
  v_traffic_total numeric;
BEGIN
  v_rent:=public.canonical_legal_recorded_obligations_v1(p_company_id,p_contract_id,p_as_of_date);
  v_traffic:=legal_claim_internal.read_traffic_obligations_v5(p_company_id,p_contract_id,p_as_of_date);

  -- Only genuinely outstanding rent before the same legal cutoff used by the
  -- claim calculator is selectable. Review details remain explicit below.
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id',r.invoice_id,'invoice_number',r.invoice_number,'invoice_date',i.invoice_date,
    'due_date',r.billing_month,'total_amount',r.invoiced_amount,'paid_amount',r.paid_amount,
    'balance_due',r.outstanding_amount,'payment_status',CASE WHEN r.paid_amount>0 THEN 'partial' ELSE 'unpaid' END,
    'status',i.status,'journal_entry_id',i.journal_entry_id,
    'can_edit_amount',i.journal_entry_id IS NULL AND r.paid_amount=0
      AND NOT EXISTS(SELECT 1 FROM public.payments p WHERE p.invoice_id=i.id)
      AND NOT EXISTS(SELECT 1 FROM public.payment_allocations a WHERE a.target_id=i.id AND a.allocation_type='invoice')
      AND NOT EXISTS(SELECT 1 FROM public.invoice_items item WHERE item.invoice_id=i.id)
  ) ORDER BY r.billing_month,r.invoice_id),'[]'::jsonb) INTO v_invoices
  FROM jsonb_to_recordset(v_rent->'rows') r(invoice_id uuid,invoice_number text,billing_month date,
    invoiced_amount numeric,paid_amount numeric,outstanding_amount numeric,disposition text)
  JOIN public.invoices i ON i.id=r.invoice_id AND i.company_id=p_company_id AND i.contract_id=p_contract_id
  WHERE r.disposition='included';

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id',coalesce(r.penalty_id,r.invoice_id),'source_type',r.source_type,'source_ids',r.source_ids,
    'violation_number',r.violation_number,'violation_date',r.penalty_date,
    'violation_type','مخالفة مرورية','description',NULL,
    'liability_amount',CASE WHEN r.disposition='review' THEN NULL
      WHEN r.disposition='included' THEN r.outstanding_amount ELSE 0 END,
    'status',r.disposition,'responsibility_party',r.responsibility_party,
    'review_reasons',r.review_reasons
  ) ORDER BY r.penalty_date,r.source_type,r.penalty_id,r.invoice_id),'[]'::jsonb),
    CASE WHEN NOT (v_traffic->>'requires_review')::boolean
      THEN coalesce(sum(r.outstanding_amount) FILTER(WHERE r.disposition='included'),0) END
  INTO v_violations,v_traffic_total
  FROM jsonb_to_recordset(v_traffic->'rows') r(penalty_id uuid,invoice_id uuid,penalty_date date,
    source_type text,source_ids jsonb,violation_number text,responsibility_party text,
    disposition text,outstanding_amount numeric,review_reasons jsonb);

  RETURN jsonb_build_object(
    'invoices',v_invoices,'violations',v_violations,
    'invoices_source','canonical_recorded_rows_v5','violations_source','canonical_traffic_rows_v5',
    'violation_proof_ready',(v_traffic->>'proof_ready')::boolean,
    'financial_context',jsonb_build_object(
      'version','canonical_legal_readiness_v1','company_id',p_company_id,'contract_id',p_contract_id,
      'as_of_date',p_as_of_date,'rent_requires_review',(v_rent->>'requires_review')::boolean,
      'traffic_requires_review',(v_traffic->>'requires_review')::boolean,
      'rent_total',v_rent->'recorded_rent_total','traffic_total',v_traffic_total,
      'traffic_claim_total',v_traffic->'claim_amount',
      'traffic_proof_required',(v_traffic->>'violation_count')::integer>0,
      'rent_review_reasons',v_rent->'review_reasons',
      'traffic_review_reasons',coalesce((SELECT jsonb_agg(DISTINCT reason ORDER BY reason)
        FROM jsonb_array_elements(v_traffic->'rows') r CROSS JOIN LATERAL
          jsonb_array_elements_text(r->'review_reasons') reason),'[]'::jsonb)
    )
  );
END;
$financial$;

-- Explicit authorization boundary for the full receipt graph. Keep the raw
-- reader private; the exposed facade remains invoker, and document automation
-- still runs through the established (volatile) v1 only after authorization.
CREATE FUNCTION legal_claim_internal.get_readiness_v3(p_company_id uuid,p_contract_id uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $readiness$
DECLARE v_financial jsonb; v_documents jsonb;
BEGIN
  IF coalesce(auth.jwt()->>'role','')<>'service_role' AND (
    auth.uid() IS NULL OR public.get_user_company_id() IS DISTINCT FROM p_company_id
    OR NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.user_id=auth.uid()
      AND p.company_id=p_company_id AND p.is_active IS TRUE)
  ) THEN
    RAISE EXCEPTION 'Not authorized to prepare this company contract' USING ERRCODE='42501';
  END IF;
  IF public.can_prepare_contract_for_legal_v1(p_company_id,p_contract_id) IS NOT TRUE THEN
    RAISE EXCEPTION 'Not authorized to prepare this contract' USING ERRCODE='42501';
  END IF;
  v_financial:=legal_claim_internal.read_readiness_finances_v1(
    p_company_id,p_contract_id,(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date);
  v_documents:=public.get_legal_transfer_readiness_v1(p_company_id,p_contract_id);
  RETURN v_documents || v_financial;
END;
$readiness$;

REVOKE ALL ON FUNCTION legal_claim_internal.legacy_readiness_v2(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION legal_claim_internal.read_readiness_finances_v1(uuid,uuid,date) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION legal_claim_internal.get_readiness_v3(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION legal_claim_internal.get_readiness_v3(uuid,uuid) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.get_legal_transfer_readiness_v2(p_company_id uuid,p_contract_id uuid)
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path=''
AS $facade$ SELECT legal_claim_internal.get_readiness_v3(p_company_id,p_contract_id); $facade$;
REVOKE ALL ON FUNCTION public.get_legal_transfer_readiness_v2(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_legal_transfer_readiness_v2(uuid,uuid) TO authenticated,service_role;
COMMIT;
