ALTER TABLE public.legal_cases
  ADD COLUMN IF NOT EXISTS claim_scope text NOT NULL DEFAULT 'full_outstanding';

ALTER TABLE public.legal_cases
  DROP CONSTRAINT IF EXISTS legal_cases_claim_scope_check;

ALTER TABLE public.legal_cases
  ADD CONSTRAINT legal_cases_claim_scope_check
  CHECK (claim_scope IN ('full_outstanding', 'traffic_violations_only'));

COMMENT ON COLUMN public.legal_cases.claim_scope IS
  'Controls the monetary and narrative scope of the case. traffic_violations_only excludes rent, contractual compensation, damages, retention, and deposit adjustments.';

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

CREATE OR REPLACE FUNCTION public.calculate_legal_claim_amount_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_as_of_date date DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar'))::date
)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = 'pg_catalog', 'public'
AS $$
  WITH selected_scope AS (
    SELECT legal_case.claim_scope
    FROM public.legal_cases legal_case
    WHERE legal_case.company_id = p_company_id
      AND legal_case.contract_id = p_contract_id
      AND LOWER(COALESCE(legal_case.case_status, '')) <> 'cancelled'
    ORDER BY legal_case.created_at DESC
    LIMIT 1
  ),
  violation_proof AS (
    SELECT EXISTS (
      SELECT 1
      FROM public.contract_documents document
      WHERE document.company_id = p_company_id
        AND document.contract_id = p_contract_id
        AND document.document_type = 'violations_proof'
        AND NULLIF(BTRIM(document.file_path), '') IS NOT NULL
    ) AS ready
  ),
  violation_total AS (
    SELECT COALESCE(SUM(COALESCE(penalty.amount, 0)), 0) AS amount
    FROM public.penalties penalty
    WHERE penalty.company_id = p_company_id
      AND penalty.contract_id = p_contract_id
      AND LOWER(COALESCE(penalty.payment_status, '')) <> 'paid'
      AND LOWER(COALESCE(penalty.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'reversed', 'deleted'
      )
  )
  SELECT ROUND(
    CASE
      WHEN COALESCE((SELECT claim_scope FROM selected_scope), 'full_outstanding')
        = 'traffic_violations_only'
      THEN CASE
        WHEN (SELECT ready FROM violation_proof)
          THEN GREATEST((SELECT amount FROM violation_total), 0)
        ELSE 0
      END
      ELSE COALESCE(
        (public.calculate_legal_claim_breakdown_v3(
          p_company_id,
          p_contract_id,
          p_as_of_date
        ) ->> 'total')::numeric,
        0
      )
    END,
    2
  );
$$;

CREATE OR REPLACE FUNCTION public.convert_contract_to_legal_with_scope_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_notes text,
  p_priority text,
  p_case_type text,
  p_vehicle_returned boolean,
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
  v_review_scope text;
  v_result jsonb;
  v_case_id uuid;
  v_claim_value numeric;
BEGIN
  IF v_scope NOT IN ('full_outstanding', 'traffic_violations_only') THEN
    RAISE EXCEPTION 'Unsupported legal claim scope' USING ERRCODE = '22023';
  END IF;

  IF NOT public.can_prepare_contract_for_legal_v1(p_company_id, p_contract_id) THEN
    RAISE EXCEPTION 'You are not authorized to transfer this contract'
      USING ERRCODE = '42501';
  END IF;

  SELECT operation.operation_details ->> 'claim_scope'
  INTO v_review_scope
  FROM public.contract_operations_log operation
  WHERE operation.company_id = p_company_id
    AND operation.contract_id = p_contract_id
    AND operation.operation_type = 'legal_transfer_readiness_completed'
    AND COALESCE((operation.operation_details ->> 'ready')::boolean, false)
  ORDER BY operation.performed_at DESC
  LIMIT 1;

  IF v_review_scope IS NULL OR v_review_scope IS DISTINCT FROM v_scope THEN
    RAISE EXCEPTION 'Legal claim scope does not match the latest readiness review'
      USING ERRCODE = 'P0001';
  END IF;

  v_result := public.convert_contract_to_legal_v1(
    p_company_id,
    p_contract_id,
    p_notes,
    p_priority,
    p_case_type,
    p_vehicle_returned,
    p_actor_id
  );

  IF COALESCE((v_result ->> 'blocked')::boolean, false) THEN
    RETURN v_result;
  END IF;

  v_case_id := NULLIF(v_result -> 'legal_case' ->> 'id', '')::uuid;
  IF v_case_id IS NULL THEN
    RAISE EXCEPTION 'Legal conversion did not return a case id'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.legal_cases legal_case
  SET
    claim_scope = v_scope,
    case_title = CASE
      WHEN v_scope = 'traffic_violations_only'
        THEN 'مطالبة مخالفات مرورية - عقد ' || COALESCE((
          SELECT contract.contract_number
          FROM public.contracts contract
          WHERE contract.id = p_contract_id AND contract.company_id = p_company_id
        ), p_contract_id::text)
      ELSE legal_case.case_title
    END,
    case_title_ar = CASE
      WHEN v_scope = 'traffic_violations_only'
        THEN 'مطالبة مخالفات مرورية - عقد ' || COALESCE((
          SELECT contract.contract_number
          FROM public.contracts contract
          WHERE contract.id = p_contract_id AND contract.company_id = p_company_id
        ), p_contract_id::text)
      ELSE legal_case.case_title_ar
    END,
    tags = CASE
      WHEN v_scope = 'traffic_violations_only'
        AND NOT (COALESCE(legal_case.tags, '[]'::jsonb) @> '["مطالبة_مخالفات_فقط"]'::jsonb)
      THEN COALESCE(legal_case.tags, '[]'::jsonb) || '["مطالبة_مخالفات_فقط"]'::jsonb
      ELSE legal_case.tags
    END,
    updated_at = now()
  WHERE legal_case.id = v_case_id
    AND legal_case.company_id = p_company_id;

  IF v_scope = 'traffic_violations_only' THEN
    v_claim_value := public.calculate_legal_claim_amount_v1(
      p_company_id,
      p_contract_id,
      ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar'))::date
    );

    UPDATE public.legal_cases legal_case
    SET
      case_value = v_claim_value,
      description = concat_ws(
        E'\n',
        'مطالبة قانونية تقتصر على المخالفات المرورية المرتبطة بالعقد.',
        'إجمالي المخالفات غير المسددة المثبتة: ' || v_claim_value || ' ر.ق',
        'لا تشمل المطالبة رصيد الإيجار أو غرامات التأخير أو أي تعويضات أخرى.'
      ),
      notes = concat_ws(
        E'\n',
        legal_case.notes,
        'نطاق المطالبة المعتمد: مخالفات مرورية فقط.'
      ),
      updated_at = now()
    WHERE legal_case.id = v_case_id
      AND legal_case.company_id = p_company_id;
  ELSE
    v_claim_value := COALESCE((v_result ->> 'total_case_value')::numeric, 0);
  END IF;

  UPDATE public.contract_operations_log operation
  SET operation_details = COALESCE(operation.operation_details, '{}'::jsonb)
    || jsonb_build_object(
      'claim_scope', v_scope,
      'total_case_value', v_claim_value,
      'excluded_rent_and_late_fines', v_scope = 'traffic_violations_only'
    )
  WHERE operation.company_id = p_company_id
    AND operation.contract_id = p_contract_id
    AND operation.operation_type = 'convert_to_legal'
    AND operation.operation_details ->> 'legal_case_id' = v_case_id::text;

  RETURN jsonb_set(
    jsonb_set(v_result, '{legal_case,case_value}', to_jsonb(v_claim_value), true),
    '{total_case_value}',
    to_jsonb(v_claim_value),
    true
  ) || jsonb_build_object('claim_scope', v_scope);
END;
$$;

REVOKE ALL ON FUNCTION public.convert_contract_to_legal_with_scope_v1(
  uuid, uuid, text, text, text, boolean, text, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_contract_to_legal_with_scope_v1(
  uuid, uuid, text, text, text, boolean, text, uuid
) TO authenticated, service_role;
