CREATE OR REPLACE FUNCTION public.complete_legal_transfer_readiness_with_scope_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_payload jsonb,
  p_claim_scope text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_scope text := COALESCE(NULLIF(BTRIM(p_claim_scope), ''), 'full_outstanding');
  v_payload jsonb := COALESCE(p_payload, '{}'::jsonb);
  v_violation_total numeric := 0;
  v_violation_count integer := 0;
  v_proof_ready boolean := false;
BEGIN
  IF v_scope NOT IN ('full_outstanding', 'traffic_violations_only') THEN
    RAISE EXCEPTION 'Unsupported legal claim scope' USING ERRCODE = '22023';
  END IF;

  IF NOT public.can_prepare_contract_for_legal_v1(p_company_id, p_contract_id) THEN
    RAISE EXCEPTION 'You are not authorized to complete legal readiness for this contract'
      USING ERRCODE = '42501';
  END IF;

  IF v_scope = 'traffic_violations_only' THEN
    SELECT COUNT(*), COALESCE(SUM(COALESCE(penalty.amount, 0)), 0)
    INTO v_violation_count, v_violation_total
    FROM public.penalties penalty
    WHERE penalty.company_id = p_company_id
      AND penalty.contract_id = p_contract_id
      AND LOWER(COALESCE(penalty.payment_status, '')) <> 'paid'
      AND LOWER(COALESCE(penalty.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'reversed', 'deleted'
      );

    IF v_violation_total <= 0 THEN
      RAISE EXCEPTION 'No unpaid traffic violations are available for this claim'
        USING ERRCODE = 'P0001';
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM public.contract_documents document
      WHERE document.company_id = p_company_id
        AND document.contract_id = p_contract_id
        AND document.document_type = 'violations_proof'
        AND NULLIF(BTRIM(document.file_path), '') IS NOT NULL
    ) INTO v_proof_ready;

    IF NOT v_proof_ready THEN
      RAISE EXCEPTION 'MOI or Metrash traffic violation proof is required'
        USING ERRCODE = 'P0001';
    END IF;

    v_payload := v_payload || jsonb_build_object(
      'claim_scope', v_scope,
      'claim_amount', ROUND(v_violation_total, 2),
      'violation_count', v_violation_count,
      'violation_proof_ready', true,
      'included_invoice_balance', 0,
      'included_invoice_ids', '[]'::jsonb,
      'claim_components', jsonb_build_object(
        'rent', 0,
        'contractual_compensation', 0,
        'damages', 0,
        'retention', 0,
        'security_deposit_deduction', 0,
        'traffic_violations', ROUND(v_violation_total, 2)
      )
    );
  ELSE
    v_payload := v_payload || jsonb_build_object('claim_scope', v_scope);
  END IF;

  RETURN public.complete_legal_transfer_readiness_v1(
    p_company_id,
    p_contract_id,
    v_payload,
    p_actor_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_legal_transfer_readiness_with_scope_v1(
  uuid, uuid, jsonb, text, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_legal_transfer_readiness_with_scope_v1(
  uuid, uuid, jsonb, text, uuid
) TO authenticated, service_role;
