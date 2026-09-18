-- A returned vehicle ends the future rental obligation. Legal collection must
-- therefore use the remaining balance of retained invoices, not the original
-- contract value. Traffic penalties stay visible for a separate transfer
-- request and are not part of the monetary rental claim.

ALTER FUNCTION public.convert_contract_to_legal_v1(
  uuid, uuid, text, text, text, boolean, uuid
) RENAME TO convert_contract_to_legal_v1_pre_invoice_claim;
CREATE OR REPLACE FUNCTION public.convert_contract_to_legal_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_notes text,
  p_priority text,
  p_case_type text,
  p_vehicle_returned boolean,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_case_id uuid;
  v_existing_case_id uuid;
  v_contract_balance numeric := 0;
  v_invoice_balance numeric := 0;
  v_invoice_count integer := 0;
  v_late_fines numeric := 0;
  v_penalties numeric := 0;
  v_principal numeric := 0;
  v_claim_value numeric := 0;
BEGIN
  SELECT legal_case.id
  INTO v_existing_case_id
  FROM public.legal_cases legal_case
  WHERE legal_case.company_id = p_company_id
    AND legal_case.contract_id = p_contract_id
    AND lower(COALESCE(legal_case.case_status, '')) IN (
      'open', 'active', 'pending', 'on_hold', 'under_review'
    )
  ORDER BY legal_case.created_at
  LIMIT 1;

  SELECT
    COALESCE(contract.balance_due, 0),
    COALESCE(contract.late_fine_amount, 0)
  INTO v_contract_balance, v_late_fines
  FROM public.contracts contract
  WHERE contract.id = p_contract_id
    AND contract.company_id = p_company_id;

  SELECT
    count(*)::integer,
    COALESCE(
      sum(
        GREATEST(
          COALESCE(
            invoice.balance_due,
            COALESCE(invoice.total_amount, 0) - COALESCE(invoice.paid_amount, 0)
          ),
          0
        )
      ),
      0
    )
  INTO v_invoice_count, v_invoice_balance
  FROM public.invoices invoice
  WHERE invoice.company_id = p_company_id
    AND invoice.contract_id = p_contract_id
    AND lower(COALESCE(invoice.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'reversed'
    );

  SELECT COALESCE(sum(penalty.amount), 0)
  INTO v_penalties
  FROM public.penalties penalty
  WHERE penalty.company_id = p_company_id
    AND penalty.contract_id = p_contract_id
    AND lower(COALESCE(penalty.payment_status, '')) <> 'paid'
    AND lower(COALESCE(penalty.status, '')) <> 'cancelled';

  v_principal := CASE
    WHEN COALESCE(p_vehicle_returned, false) AND v_invoice_count > 0
      THEN v_invoice_balance
    ELSE v_contract_balance
  END;
  v_claim_value := GREATEST(v_principal, 0) + GREATEST(v_late_fines, 0);

  v_result := public.convert_contract_to_legal_v1_pre_invoice_claim(
    p_company_id,
    p_contract_id,
    p_notes,
    p_priority,
    p_case_type,
    p_vehicle_returned,
    p_actor_id
  );

  -- Preserve an already-open case exactly as it was. The conversion dialog
  -- normally blocks this path, and the RPC remains idempotent.
  IF v_existing_case_id IS NOT NULL THEN
    RETURN v_result;
  END IF;

  v_case_id := NULLIF(v_result -> 'legal_case' ->> 'id', '')::uuid;
  IF v_case_id IS NULL THEN
    RAISE EXCEPTION 'Legal conversion did not return a case id'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.legal_cases legal_case
  SET
    case_value = v_claim_value,
    description = concat_ws(
      E'\n',
      'قضية تحصيل مستحقات للعقد رقم ' ||
        COALESCE((v_result -> 'legal_case' ->> 'contract_number'), p_contract_id::text),
      'أصل المطالبة: ' || v_principal,
      'غرامات التأخير: ' || v_late_fines,
      'إجمالي المطالبة المالية: ' || v_claim_value,
      CASE
        WHEN v_penalties > 0
          THEN 'مخالفات مرورية بطلب تحويل منفصل: ' || v_penalties
        ELSE NULL
      END
    ),
    updated_at = now()
  WHERE legal_case.id = v_case_id
    AND legal_case.company_id = p_company_id;

  UPDATE public.contract_operations_log operation
  SET operation_details =
    COALESCE(operation.operation_details, '{}'::jsonb)
    || jsonb_build_object(
      'total_case_value', v_claim_value,
      'claim_principal', v_principal,
      'invoice_balance', v_invoice_balance,
      'traffic_penalties_transfer_amount', v_penalties,
      'claim_source', CASE
        WHEN COALESCE(p_vehicle_returned, false) AND v_invoice_count > 0
          THEN 'active_invoices'
        ELSE 'contract_balance'
      END
    )
  WHERE operation.company_id = p_company_id
    AND operation.contract_id = p_contract_id
    AND operation.operation_type = 'convert_to_legal'
    AND operation.operation_details ->> 'legal_case_id' = v_case_id::text;

  RETURN jsonb_set(
    jsonb_set(
      v_result,
      '{legal_case,case_value}',
      to_jsonb(v_claim_value),
      true
    ),
    '{total_case_value}',
    to_jsonb(v_claim_value),
    true
  ) || jsonb_build_object(
    'claim_principal', v_principal,
    'invoice_balance', v_invoice_balance,
    'traffic_penalties_transfer_amount', v_penalties,
    'claim_source', CASE
      WHEN COALESCE(p_vehicle_returned, false) AND v_invoice_count > 0
        THEN 'active_invoices'
      ELSE 'contract_balance'
    END
  );
END;
$$;
-- Rebind the compatibility overload to the corrected seven-argument function.
CREATE OR REPLACE FUNCTION public.convert_contract_to_legal_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_notes text,
  p_priority text,
  p_case_type text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.convert_contract_to_legal_v1(
    p_company_id,
    p_contract_id,
    p_notes,
    p_priority,
    p_case_type,
    false,
    p_actor_id
  );
END;
$$;
REVOKE ALL ON FUNCTION public.convert_contract_to_legal_v1(
  uuid, uuid, text, text, text, boolean, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_contract_to_legal_v1(
  uuid, uuid, text, text, text, boolean, uuid
) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.convert_contract_to_legal_v1(
  uuid, uuid, text, text, text, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_contract_to_legal_v1(
  uuid, uuid, text, text, text, uuid
) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.convert_contract_to_legal_v1_pre_invoice_claim(
  uuid, uuid, text, text, text, boolean, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.convert_contract_to_legal_v1_pre_invoice_claim(
  uuid, uuid, text, text, text, boolean, uuid
) TO service_role;
COMMENT ON FUNCTION public.convert_contract_to_legal_v1(
  uuid, uuid, text, text, text, boolean, uuid
) IS
'Creates a legal case using retained invoice balances after vehicle return; traffic penalties remain a separate transfer request.';
