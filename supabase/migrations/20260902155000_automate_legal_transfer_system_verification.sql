BEGIN;

ALTER TABLE public.legal_transfer_employee_reviews
  DROP CONSTRAINT legal_transfer_employee_reviews_status_check;

ALTER TABLE public.legal_transfer_employee_reviews
  ADD CONSTRAINT legal_transfer_employee_reviews_status_check
  CHECK (status IN (
    'awaiting_assignment', 'pending', 'in_progress', 'corrections_required',
    'employee_approved', 'deferred', 'employee_rejected',
    'manager_overridden', 'system_verified', 'cancelled'
  ));

CREATE OR REPLACE FUNCTION public.auto_verify_legal_transfer_review_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_actor_id uuid DEFAULT NULL
)
RETURNS public.legal_transfer_employee_reviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := COALESCE(auth.uid(), p_actor_id);
  v_contract public.contracts%ROWTYPE;
  v_customer public.customers%ROWTYPE;
  v_readiness public.contract_operations_log%ROWTYPE;
  v_review public.legal_transfer_employee_reviews%ROWTYPE;
  v_invoice_updated_at timestamptz;
  v_has_violations boolean;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;
  IF auth.uid() IS NOT NULL
     AND p_actor_id IS NOT NULL
     AND p_actor_id IS DISTINCT FROM auth.uid()
  THEN
    RAISE EXCEPTION 'Actor identity mismatch' USING ERRCODE = '42501';
  END IF;
  IF NOT public.can_prepare_contract_for_legal_v1(p_company_id, p_contract_id) THEN
    RAISE EXCEPTION 'You are not authorized to transfer this contract'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_contract
  FROM public.contracts contract
  WHERE contract.company_id = p_company_id
    AND contract.id = p_contract_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract was not found' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_customer
  FROM public.customers customer
  WHERE customer.company_id = p_company_id
    AND customer.id = v_contract.customer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract customer was not found' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_readiness
  FROM public.contract_operations_log operation
  WHERE operation.company_id = p_company_id
    AND operation.contract_id = p_contract_id
    AND operation.operation_type = 'legal_transfer_readiness_completed'
    AND COALESCE((operation.operation_details ->> 'ready')::boolean, false)
  ORDER BY operation.performed_at DESC
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Complete the legal transfer readiness wizard before conversion'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT COALESCE((v_readiness.operation_details ->> 'financial_reviewed')::boolean, false)
     OR NOT COALESCE((v_readiness.operation_details ->> 'signed_contract_ready')::boolean, false)
     OR NOT COALESCE((v_readiness.operation_details ->> 'violations_reviewed')::boolean, false)
  THEN
    RAISE EXCEPTION 'Automated legal verification found an incomplete readiness review'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT public.check_contract_has_verified_signed_lease_v1(p_company_id, p_contract_id) THEN
    RAISE EXCEPTION 'A verified signed contract is required for legal transfer'
      USING ERRCODE = 'P0001';
  END IF;
  IF NOT public.check_contract_identity_verified_v1(p_company_id, p_contract_id) THEN
    RAISE EXCEPTION 'Customer identity must be verified before legal transfer'
      USING ERRCODE = 'P0001';
  END IF;
  IF v_contract.vehicle_id IS NULL THEN
    RAISE EXCEPTION 'A contract vehicle is required for legal transfer'
      USING ERRCODE = 'P0001';
  END IF;
  IF NULLIF(BTRIM(COALESCE(v_customer.phone, '')), '') IS NULL THEN
    RAISE EXCEPTION 'A customer phone number is required for legal transfer'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.penalties penalty
    WHERE penalty.company_id = p_company_id
      AND penalty.contract_id = p_contract_id
      AND COALESCE(penalty.amount, 0) > 0
      AND LOWER(COALESCE(penalty.payment_status, 'unpaid')) NOT IN (
        'paid', 'cancelled', 'canceled', 'void', 'voided', 'deleted'
      )
  ) INTO v_has_violations;

  IF v_has_violations
     AND NOT COALESCE((v_readiness.operation_details ->> 'violation_proof_ready')::boolean, false)
  THEN
    RAISE EXCEPTION 'Traffic violation proof is required for legal transfer'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT MAX(invoice.updated_at) INTO v_invoice_updated_at
  FROM public.invoices invoice
  WHERE invoice.company_id = p_company_id
    AND invoice.contract_id = p_contract_id;

  UPDATE public.legal_transfer_employee_reviews review
  SET status = 'cancelled',
      employee_notes = CONCAT_WS(
        E'\n',
        review.employee_notes,
        'أغلق النظام الطلب اليدوي لأن التحقق النظامي اكتمل من الأدلة الحالية.'
      ),
      updated_at = now()
  WHERE review.company_id = p_company_id
    AND review.contract_id = p_contract_id
    AND review.status IN (
      'awaiting_assignment', 'pending', 'in_progress',
      'corrections_required', 'deferred'
    );

  SELECT * INTO v_review
  FROM public.legal_transfer_employee_reviews review
  WHERE review.company_id = p_company_id
    AND review.contract_id = p_contract_id
    AND review.status = 'system_verified'
  ORDER BY review.responded_at DESC NULLS LAST, review.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.legal_transfer_employee_reviews review
    SET requested_by = v_actor,
        reviewed_by = NULL,
        overridden_by = NULL,
        status = 'system_verified',
        request_reason = 'تحقق نظامي تلقائي قبل التحويل القانوني',
        employee_decision = NULL,
        employee_notes = 'اكتملت جميع بوابات الجاهزية النظامية دون انتظار اعتماد بشري.',
        override_reason = NULL,
        checklist = JSONB_BUILD_OBJECT(
          'identity_verified', true,
          'financial_verified', true,
          'contact_verified', true,
          'vehicle_verified', true,
          'documents_verified', true,
          'violations_verified', true,
          'verification_source', 'system'
        ),
        corrected_fields = '{}'::jsonb,
        request_snapshot = v_readiness.operation_details,
        approval_snapshot = JSONB_BUILD_OBJECT(
          'verification_source', 'system',
          'readiness_operation_id', v_readiness.id,
          'readiness_performed_at', v_readiness.performed_at,
          'customer_updated_at', v_customer.updated_at,
          'contract_updated_at', v_contract.updated_at,
          'invoice_updated_at', v_invoice_updated_at,
          'verified_at', now()
        ),
        requested_at = now(),
        due_at = now(),
        responded_at = now(),
        updated_at = now()
    WHERE review.id = v_review.id
    RETURNING * INTO v_review;
  ELSE
    INSERT INTO public.legal_transfer_employee_reviews (
      company_id, contract_id, customer_id, assigned_to_profile_id,
      requested_by, reviewed_by, status, request_reason, employee_notes,
      checklist, corrected_fields, request_snapshot, approval_snapshot,
      requested_at, due_at, responded_at
    ) VALUES (
      p_company_id, p_contract_id, v_contract.customer_id, NULL,
      v_actor, NULL, 'system_verified',
      'تحقق نظامي تلقائي قبل التحويل القانوني',
      'اكتملت جميع بوابات الجاهزية النظامية دون انتظار اعتماد بشري.',
      JSONB_BUILD_OBJECT(
        'identity_verified', true,
        'financial_verified', true,
        'contact_verified', true,
        'vehicle_verified', true,
        'documents_verified', true,
        'violations_verified', true,
        'verification_source', 'system'
      ),
      '{}'::jsonb,
      v_readiness.operation_details,
      JSONB_BUILD_OBJECT(
        'verification_source', 'system',
        'readiness_operation_id', v_readiness.id,
        'readiness_performed_at', v_readiness.performed_at,
        'customer_updated_at', v_customer.updated_at,
        'contract_updated_at', v_contract.updated_at,
        'invoice_updated_at', v_invoice_updated_at,
        'verified_at', now()
      ),
      now(), now(), now()
    ) RETURNING * INTO v_review;
  END IF;

  INSERT INTO public.contract_operations_log (
    contract_id, company_id, operation_type, operation_details,
    notes, performed_by
  ) VALUES (
    p_contract_id,
    p_company_id,
    'legal_system_review_verified',
    JSONB_BUILD_OBJECT(
      'review_id', v_review.id,
      'readiness_operation_id', v_readiness.id,
      'status', v_review.status,
      'verification_source', 'system'
    ),
    'اكتمل التحقق النظامي التلقائي قبل التحويل القانوني دون انتظار اعتماد بشري.',
    v_actor
  );

  RETURN v_review;
END;
$function$;

REVOKE ALL ON FUNCTION public.auto_verify_legal_transfer_review_v1(uuid, uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auto_verify_legal_transfer_review_v1(uuid, uuid, uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.auto_verify_legal_transfer_review_v1(uuid, uuid, uuid) IS
  'Fail-closed automated verification for legal conversion. Records system_verified only after current readiness, signed identity-matched lease, contact, vehicle and violation-evidence gates pass.';

CREATE OR REPLACE FUNCTION public.convert_contract_to_legal_v1_pre_pdf_request_agent(
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
SET search_path = ''
AS $function$
DECLARE
  v_review public.legal_transfer_employee_reviews%ROWTYPE;
  v_existing_case boolean;
  v_customer_updated_at timestamptz;
  v_contract_updated_at timestamptz;
  v_invoice_updated_at timestamptz;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.legal_cases legal_case
    WHERE legal_case.company_id = p_company_id
      AND legal_case.contract_id = p_contract_id
      AND LOWER(COALESCE(legal_case.case_status, '')) IN (
        'open', 'active', 'pending', 'on_hold', 'under_review'
      )
  ) INTO v_existing_case;

  IF NOT v_existing_case THEN
    SELECT * INTO v_review
    FROM public.auto_verify_legal_transfer_review_v1(
      p_company_id,
      p_contract_id,
      p_actor_id
    );

    SELECT customer.updated_at INTO v_customer_updated_at
    FROM public.customers customer
    WHERE customer.company_id = p_company_id
      AND customer.id = v_review.customer_id;

    SELECT contract.updated_at INTO v_contract_updated_at
    FROM public.contracts contract
    WHERE contract.company_id = p_company_id
      AND contract.id = p_contract_id;

    SELECT MAX(invoice.updated_at) INTO v_invoice_updated_at
    FROM public.invoices invoice
    WHERE invoice.company_id = p_company_id
      AND invoice.contract_id = p_contract_id;

    IF v_customer_updated_at > v_review.responded_at
       OR v_contract_updated_at > v_review.responded_at
       OR COALESCE(v_invoice_updated_at, '-infinity'::timestamptz) > v_review.responded_at
    THEN
      UPDATE public.legal_transfer_employee_reviews review
      SET status = 'corrections_required',
          employee_notes = CONCAT_WS(
            E'\n',
            review.employee_notes,
            'تغيرت البيانات بعد التحقق النظامي ويلزم إعادة تشغيل التحقق.'
          ),
          updated_at = now()
      WHERE review.id = v_review.id;

      RAISE EXCEPTION 'Data changed after system verification; retry conversion'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN public.convert_contract_to_legal_v1_pre_employee_review(
    p_company_id,
    p_contract_id,
    p_notes,
    p_priority,
    p_case_type,
    p_vehicle_returned,
    p_actor_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.convert_contract_to_legal_v1_pre_pdf_request_agent(
  uuid, uuid, text, text, text, boolean, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_contract_to_legal_v1_pre_pdf_request_agent(
  uuid, uuid, text, text, text, boolean, uuid
) TO authenticated, service_role;

COMMENT ON TABLE public.legal_transfer_employee_reviews IS
  'Audit ledger for manual and system legal-transfer verification. system_verified is produced only by fail-closed database checks and requires no human approval.';

COMMIT;
