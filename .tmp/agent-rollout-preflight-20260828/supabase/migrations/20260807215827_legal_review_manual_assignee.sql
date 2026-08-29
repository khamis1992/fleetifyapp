-- Allow the legal team to pick the reviewing employee manually instead of
-- always defaulting to the contract's assigned profile.

CREATE OR REPLACE FUNCTION public.request_legal_transfer_employee_review_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_reason text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_assignee_profile_id uuid DEFAULT NULL
)
RETURNS public.legal_transfer_employee_reviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := COALESCE(auth.uid(), p_actor_id);
  v_contract public.contracts%ROWTYPE;
  v_assignee uuid;
  v_review public.legal_transfer_employee_reviews%ROWTYPE;
  v_invoice_balance numeric;
BEGIN
  IF v_actor IS NULL OR NOT public.can_manage_legal_transfer_reviews_v1(p_company_id) THEN
    RAISE EXCEPTION 'You are not authorized to request employee legal verification'
      USING ERRCODE = '42501';
  END IF;
  IF auth.uid() IS NOT NULL AND p_actor_id IS NOT NULL AND p_actor_id <> auth.uid() THEN
    RAISE EXCEPTION 'Actor identity mismatch' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_contract
  FROM public.contracts contract
  WHERE contract.id = p_contract_id AND contract.company_id = p_company_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contract was not found' USING ERRCODE = 'P0001'; END IF;

  IF p_assignee_profile_id IS NOT NULL THEN
    SELECT profile.id INTO v_assignee
    FROM public.profiles profile
    WHERE profile.id = p_assignee_profile_id
      AND profile.company_id = p_company_id
      AND COALESCE(profile.is_active, true)
    LIMIT 1;
    IF v_assignee IS NULL THEN
      RAISE EXCEPTION 'Selected employee was not found or is inactive' USING ERRCODE = 'P0001';
    END IF;
  ELSE
    SELECT profile.id INTO v_assignee
    FROM public.profiles profile
    WHERE profile.id = v_contract.assigned_to_profile_id
      AND profile.company_id = p_company_id
      AND COALESCE(profile.is_active, true)
    LIMIT 1;
  END IF;

  SELECT COALESCE(SUM(GREATEST(COALESCE(invoice.balance_due, 0), 0)), 0)
  INTO v_invoice_balance
  FROM public.invoices invoice
  WHERE invoice.company_id = p_company_id
    AND invoice.contract_id = p_contract_id
    AND lower(COALESCE(invoice.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted');

  INSERT INTO public.legal_transfer_employee_reviews (
    company_id, contract_id, customer_id, assigned_to_profile_id,
    requested_by, status, request_reason, request_snapshot
  ) VALUES (
    p_company_id, p_contract_id, v_contract.customer_id, v_assignee,
    v_actor, CASE WHEN v_assignee IS NULL THEN 'awaiting_assignment' ELSE 'pending' END,
    NULLIF(BTRIM(COALESCE(p_reason, '')), ''),
    jsonb_build_object(
      'contract_number', v_contract.contract_number,
      'contract_status', v_contract.status,
      'contract_updated_at', v_contract.updated_at,
      'customer_id', v_contract.customer_id,
      'invoice_balance', v_invoice_balance,
      'contract_balance', COALESCE(v_contract.balance_due, 0),
      'vehicle_returned', COALESCE(v_contract.vehicle_returned, false),
      'captured_at', now()
    )
  )
  ON CONFLICT (contract_id) WHERE status IN (
    'awaiting_assignment', 'pending', 'in_progress', 'corrections_required', 'deferred'
  ) DO UPDATE SET
    assigned_to_profile_id = EXCLUDED.assigned_to_profile_id,
    requested_by = EXCLUDED.requested_by,
    status = EXCLUDED.status,
    request_reason = EXCLUDED.request_reason,
    request_snapshot = EXCLUDED.request_snapshot,
    requested_at = now(),
    due_at = now() + interval '2 days',
    updated_at = now()
  RETURNING * INTO v_review;

  INSERT INTO public.contract_operations_log (
    contract_id, company_id, operation_type, operation_details, notes, performed_by
  ) VALUES (
    p_contract_id, p_company_id, 'legal_employee_review_requested',
    jsonb_build_object('review_id', v_review.id, 'assigned_to_profile_id', v_assignee, 'status', v_review.status),
    'تم إرسال العقد للموظف المسؤول للتدقيق قبل التحويل القانوني', v_actor
  );

  RETURN v_review;
END;
$$;
REVOKE ALL ON FUNCTION public.request_legal_transfer_employee_review_v1(uuid, uuid, text, uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_legal_transfer_employee_review_v1(uuid, uuid, text, uuid, uuid)
  TO authenticated, service_role;
-- Backwards-compatible wrapper for the original 4-argument signature.
CREATE OR REPLACE FUNCTION public.request_legal_transfer_employee_review_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_reason text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS public.legal_transfer_employee_reviews
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.request_legal_transfer_employee_review_v1(
    p_company_id, p_contract_id, p_reason, p_actor_id, NULL::uuid
  );
$$;
REVOKE ALL ON FUNCTION public.request_legal_transfer_employee_review_v1(uuid, uuid, text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_legal_transfer_employee_review_v1(uuid, uuid, text, uuid)
  TO authenticated, service_role;
