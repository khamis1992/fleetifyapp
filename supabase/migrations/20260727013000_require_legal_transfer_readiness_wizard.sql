-- Require every new legal conversion to pass the shared readiness wizard.
-- Employees receive narrowly scoped finance/document permissions only for
-- contracts currently assigned to their profile.

CREATE OR REPLACE FUNCTION public.can_prepare_contract_for_legal_v1(
  p_company_id uuid,
  p_contract_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(auth.role(), '') = 'service_role'
    OR (
      auth.uid() IS NOT NULL
      AND public.get_user_company_id() = p_company_id
      AND (
        EXISTS (
          SELECT 1
          FROM public.user_roles role
          WHERE role.user_id = auth.uid()
            AND role.role::text IN (
              'super_admin', 'admin', 'company_admin', 'manager',
              'accountant', 'sales_agent', 'legal'
            )
        )
        OR EXISTS (
          SELECT 1
          FROM public.contracts contract
          JOIN public.profiles profile
            ON profile.id = contract.assigned_to_profile_id
           AND profile.company_id = contract.company_id
          WHERE contract.id = p_contract_id
            AND contract.company_id = p_company_id
            AND profile.user_id = auth.uid()
        )
      )
    );
$$;

REVOKE ALL ON FUNCTION public.can_prepare_contract_for_legal_v1(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_prepare_contract_for_legal_v1(uuid, uuid)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_legal_transfer_readiness_v1(
  p_company_id uuid,
  p_contract_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract public.contracts%ROWTYPE;
  v_invoices jsonb;
  v_payments jsonb;
  v_violations jsonb;
  v_signed_contract_ready boolean;
  v_violation_proof_ready boolean;
  v_latest_review jsonb;
BEGIN
  IF NOT public.can_prepare_contract_for_legal_v1(p_company_id, p_contract_id) THEN
    RAISE EXCEPTION 'You are not authorized to prepare this contract for legal transfer'
      USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_contract
  FROM public.contracts contract
  WHERE contract.id = p_contract_id
    AND contract.company_id = p_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract was not found' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', invoice.id,
        'invoice_number', invoice.invoice_number,
        'invoice_date', invoice.invoice_date,
        'due_date', invoice.due_date,
        'total_amount', invoice.total_amount,
        'paid_amount', invoice.paid_amount,
        'balance_due', invoice.balance_due,
        'payment_status', invoice.payment_status,
        'status', invoice.status,
        'journal_entry_id', invoice.journal_entry_id,
        'can_edit_amount',
          invoice.journal_entry_id IS NULL
          AND COALESCE(invoice.paid_amount, 0) <= 0.01
          AND lower(COALESCE(invoice.status, '')) NOT IN (
            'cancelled', 'canceled', 'void', 'voided', 'deleted', 'paid'
          )
          AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
            'cancelled', 'canceled', 'void', 'voided', 'paid', 'partial'
          )
          AND NOT EXISTS (
            SELECT 1
            FROM public.payments payment
            WHERE payment.invoice_id = invoice.id
          )
          AND NOT EXISTS (
            SELECT 1
            FROM public.payment_allocations allocation
            WHERE allocation.allocation_type = 'invoice'
              AND allocation.target_id = invoice.id
          )
          AND NOT EXISTS (
            SELECT 1
            FROM public.invoice_items item
            WHERE item.invoice_id = invoice.id
          )
      )
      ORDER BY invoice.invoice_date, invoice.created_at
    ),
    '[]'::jsonb
  )
  INTO v_invoices
  FROM public.invoices invoice
  WHERE invoice.company_id = p_company_id
    AND invoice.contract_id = p_contract_id
    AND lower(COALESCE(invoice.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted'
    );

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', payment.id,
        'payment_number', payment.payment_number,
        'payment_date', payment.payment_date,
        'amount', payment.amount,
        'payment_status', payment.payment_status,
        'payment_method', payment.payment_method,
        'reference_number', payment.reference_number,
        'invoice_id', payment.invoice_id,
        'journal_entry_id', payment.journal_entry_id
      )
      ORDER BY payment.payment_date, payment.created_at
    ),
    '[]'::jsonb
  )
  INTO v_payments
  FROM public.payments payment
  WHERE payment.company_id = p_company_id
    AND (
      payment.contract_id = p_contract_id
      OR payment.invoice_id IN (
        SELECT invoice.id
        FROM public.invoices invoice
        WHERE invoice.company_id = p_company_id
          AND invoice.contract_id = p_contract_id
      )
    );

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', violation.id,
        'violation_number', violation.violation_number,
        'violation_date', violation.violation_date,
        'violation_type', violation.violation_type,
        'description', violation.violation_description,
        'fine_amount', violation.fine_amount,
        'total_amount', violation.total_amount,
        'liability_amount', violation.liability_amount,
        'status', violation.status,
        'responsibility_party', violation.responsibility_party
      )
      ORDER BY violation.violation_date, violation.created_at
    ),
    '[]'::jsonb
  )
  INTO v_violations
  FROM public.traffic_violations violation
  WHERE violation.company_id = p_company_id
    AND violation.contract_id = p_contract_id
    AND lower(COALESCE(violation.status, '')) NOT IN ('cancelled', 'canceled', 'deleted');

  SELECT EXISTS (
    SELECT 1
    FROM public.contract_documents document
    WHERE document.company_id = p_company_id
      AND document.contract_id = p_contract_id
      AND document.document_type IN ('signed_contract', 'signed_contract_image')
      AND document.file_path IS NOT NULL
  )
  INTO v_signed_contract_ready;

  SELECT EXISTS (
    SELECT 1
    FROM public.contract_documents document
    WHERE document.company_id = p_company_id
      AND document.contract_id = p_contract_id
      AND document.document_type = 'violations_proof'
      AND document.file_path IS NOT NULL
  )
  INTO v_violation_proof_ready;

  SELECT operation.operation_details
  INTO v_latest_review
  FROM public.contract_operations_log operation
  WHERE operation.company_id = p_company_id
    AND operation.contract_id = p_contract_id
    AND operation.operation_type IN (
      'legal_transfer_readiness_completed',
      'legal_transfer_readiness_saved'
    )
  ORDER BY operation.performed_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'contract', jsonb_build_object(
      'id', v_contract.id,
      'contract_number', v_contract.contract_number,
      'status', v_contract.status,
      'balance_due', v_contract.balance_due,
      'late_fine_amount', v_contract.late_fine_amount,
      'vehicle_returned', v_contract.vehicle_returned
    ),
    'invoices', v_invoices,
    'payments', v_payments,
    'violations', v_violations,
    'signed_contract_ready', v_signed_contract_ready,
    'violation_proof_ready', v_violation_proof_ready,
    'latest_review', COALESCE(v_latest_review, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_legal_transfer_readiness_v1(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_legal_transfer_readiness_v1(uuid, uuid)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.legal_transfer_update_invoice_amount_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_invoice_id uuid,
  p_new_total numeric,
  p_reason text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice public.invoices%ROWTYPE;
  v_actor uuid;
  v_before jsonb;
  v_after jsonb;
  v_subtotal numeric;
BEGIN
  IF NOT public.can_prepare_contract_for_legal_v1(p_company_id, p_contract_id) THEN
    RAISE EXCEPTION 'You are not authorized to edit this contract during legal preparation'
      USING ERRCODE = '42501';
  END IF;

  v_actor := COALESCE(auth.uid(), p_actor_id);
  IF v_actor IS NULL
     OR COALESCE(p_new_total, 0) <= 0
     OR NULLIF(BTRIM(COALESCE(p_reason, '')), '') IS NULL
  THEN
    RAISE EXCEPTION 'A positive amount and correction reason are required'
      USING ERRCODE = 'P0001';
  END IF;

  IF auth.uid() IS NOT NULL
     AND p_actor_id IS NOT NULL
     AND p_actor_id IS DISTINCT FROM auth.uid()
  THEN
    RAISE EXCEPTION 'Actor identity mismatch' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_invoice
  FROM public.invoices invoice
  WHERE invoice.id = p_invoice_id
    AND invoice.company_id = p_company_id
    AND invoice.contract_id = p_contract_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice was not found on this contract' USING ERRCODE = 'P0001';
  END IF;

  IF v_invoice.journal_entry_id IS NOT NULL
     OR COALESCE(v_invoice.paid_amount, 0) > 0.01
     OR EXISTS (
       SELECT 1 FROM public.payments payment
       WHERE payment.invoice_id = v_invoice.id
     )
     OR EXISTS (
       SELECT 1 FROM public.payment_allocations allocation
       WHERE allocation.allocation_type = 'invoice'
         AND allocation.target_id = v_invoice.id
     )
     OR EXISTS (
       SELECT 1 FROM public.journal_entries entry
       WHERE entry.reference_type = 'invoice'
         AND entry.reference_id = v_invoice.id
     )
     OR EXISTS (
       SELECT 1 FROM public.invoice_items item
       WHERE item.invoice_id = v_invoice.id
     )
  THEN
    RAISE EXCEPTION 'This invoice has financial history. Cancel/reverse the linked transaction before changing its amount.'
      USING ERRCODE = 'P0001';
  END IF;

  IF lower(COALESCE(v_invoice.status, '')) IN (
       'cancelled', 'canceled', 'void', 'voided', 'deleted', 'paid'
     )
     OR lower(COALESCE(v_invoice.payment_status, '')) IN (
       'cancelled', 'canceled', 'void', 'voided', 'paid', 'partial'
     )
  THEN
    RAISE EXCEPTION 'Only unpaid draft or pending invoices can be edited'
      USING ERRCODE = 'P0001';
  END IF;

  v_subtotal :=
    p_new_total
    + COALESCE(v_invoice.discount_amount, 0)
    - COALESCE(v_invoice.tax_amount, 0);
  IF v_subtotal < 0 THEN
    RAISE EXCEPTION 'The new amount is incompatible with tax and discount'
      USING ERRCODE = 'P0001';
  END IF;

  v_before := jsonb_build_object(
    'total_amount', v_invoice.total_amount,
    'subtotal', v_invoice.subtotal,
    'balance_due', v_invoice.balance_due,
    'status', v_invoice.status,
    'payment_status', v_invoice.payment_status
  );

  UPDATE public.invoices invoice
  SET
    total_amount = round(p_new_total::numeric, 2),
    subtotal = round(v_subtotal::numeric, 2),
    balance_due = round(p_new_total::numeric, 2),
    paid_amount = 0,
    payment_status = 'unpaid',
    status = CASE
      WHEN lower(COALESCE(v_invoice.status, '')) = 'draft' THEN 'draft'
      WHEN v_invoice.due_date IS NOT NULL AND v_invoice.due_date < CURRENT_DATE THEN 'overdue'
      ELSE 'pending'
    END,
    updated_at = now()
  WHERE invoice.id = v_invoice.id;

  SELECT jsonb_build_object(
    'total_amount', invoice.total_amount,
    'subtotal', invoice.subtotal,
    'balance_due', invoice.balance_due,
    'status', invoice.status,
    'payment_status', invoice.payment_status
  )
  INTO v_after
  FROM public.invoices invoice
  WHERE invoice.id = v_invoice.id;

  INSERT INTO public.finance_operation_audit (
    company_id,
    operation_type,
    entity_type,
    entity_id,
    before_state,
    after_state,
    reason,
    source,
    actor_id
  )
  VALUES (
    p_company_id,
    'legal_transfer_invoice_amount_corrected',
    'invoice',
    v_invoice.id,
    v_before,
    v_after,
    BTRIM(p_reason),
    'legal_transfer_readiness_wizard',
    v_actor
  );

  INSERT INTO public.contract_operations_log (
    contract_id,
    company_id,
    operation_type,
    operation_details,
    old_values,
    new_values,
    notes,
    performed_by
  )
  VALUES (
    p_contract_id,
    p_company_id,
    'legal_transfer_financial_correction',
    jsonb_build_object('invoice_id', v_invoice.id, 'reason', BTRIM(p_reason)),
    v_before,
    v_after,
    'تصحيح مبلغ فاتورة أثناء تجهيز التحويل القانوني',
    v_actor
  );

  RETURN jsonb_build_object(
    'invoice_id', v_invoice.id,
    'before', v_before,
    'after', v_after
  );
END;
$$;

REVOKE ALL ON FUNCTION public.legal_transfer_update_invoice_amount_v1(
  uuid, uuid, uuid, numeric, text, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.legal_transfer_update_invoice_amount_v1(
  uuid, uuid, uuid, numeric, text, uuid
) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.complete_legal_transfer_readiness_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_payload jsonb,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_signed_ready boolean;
  v_violation_count integer;
  v_proof_ready boolean;
  v_claim_amount numeric;
BEGIN
  IF NOT public.can_prepare_contract_for_legal_v1(p_company_id, p_contract_id) THEN
    RAISE EXCEPTION 'You are not authorized to complete legal readiness for this contract'
      USING ERRCODE = '42501';
  END IF;

  v_actor := COALESCE(auth.uid(), p_actor_id);
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;

  IF auth.uid() IS NOT NULL
     AND p_actor_id IS NOT NULL
     AND p_actor_id IS DISTINCT FROM auth.uid()
  THEN
    RAISE EXCEPTION 'Actor identity mismatch' USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.contract_documents document
    WHERE document.company_id = p_company_id
      AND document.contract_id = p_contract_id
      AND document.document_type IN ('signed_contract', 'signed_contract_image')
      AND document.file_path IS NOT NULL
  )
  INTO v_signed_ready;

  SELECT COUNT(*)
  INTO v_violation_count
  FROM public.traffic_violations violation
  WHERE violation.company_id = p_company_id
    AND violation.contract_id = p_contract_id
    AND lower(COALESCE(violation.status, '')) NOT IN ('cancelled', 'canceled', 'deleted');

  SELECT EXISTS (
    SELECT 1
    FROM public.contract_documents document
    WHERE document.company_id = p_company_id
      AND document.contract_id = p_contract_id
      AND document.document_type = 'violations_proof'
      AND document.file_path IS NOT NULL
  )
  INTO v_proof_ready;

  v_claim_amount := NULLIF(p_payload ->> 'claim_amount', '')::numeric;

  IF COALESCE((p_payload ->> 'financial_reviewed')::boolean, false) = false THEN
    RAISE EXCEPTION 'Financial review must be completed' USING ERRCODE = 'P0001';
  END IF;
  IF v_claim_amount IS NULL OR v_claim_amount < 0 THEN
    RAISE EXCEPTION 'A valid legal claim amount is required' USING ERRCODE = 'P0001';
  END IF;
  IF NOT v_signed_ready THEN
    RAISE EXCEPTION 'A signed contract copy is required' USING ERRCODE = 'P0001';
  END IF;
  IF COALESCE((p_payload ->> 'violations_reviewed')::boolean, false) = false THEN
    RAISE EXCEPTION 'Traffic violations must be reviewed' USING ERRCODE = 'P0001';
  END IF;
  IF v_violation_count > 0 AND NOT v_proof_ready THEN
    RAISE EXCEPTION 'MOI or Metrash traffic violation proof is required'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.contract_operations_log (
    contract_id,
    company_id,
    operation_type,
    operation_details,
    notes,
    performed_by
  )
  VALUES (
    p_contract_id,
    p_company_id,
    'legal_transfer_readiness_completed',
    p_payload || jsonb_build_object(
      'ready', true,
      'signed_contract_ready', v_signed_ready,
      'violation_count', v_violation_count,
      'violation_proof_ready', CASE WHEN v_violation_count = 0 THEN true ELSE v_proof_ready END,
      'completed_at', now()
    ),
    'اكتملت مراجعة جاهزية العقد للتحويل إلى الشؤون القانونية',
    v_actor
  );

  RETURN jsonb_build_object(
    'ready', true,
    'claim_amount', v_claim_amount,
    'violation_count', v_violation_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_legal_transfer_readiness_v1(
  uuid, uuid, jsonb, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_legal_transfer_readiness_v1(
  uuid, uuid, jsonb, uuid
) TO authenticated, service_role;

-- Extend the assigned-employee upload policy to the required MOI/Metrash proof.
DROP POLICY IF EXISTS "Assigned employees can upload signed contract scans"
ON public.contract_documents;

CREATE POLICY "Assigned employees can upload legal readiness documents"
ON public.contract_documents
FOR INSERT
TO authenticated
WITH CHECK (
  document_type IN (
    'signed_contract',
    'signed_contract_image',
    'violations_proof'
  )
  AND company_id = public.get_user_company(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.contracts contract
    JOIN public.profiles profile
      ON profile.id = contract.assigned_to_profile_id
     AND profile.company_id = contract.company_id
    WHERE contract.id = contract_documents.contract_id
      AND contract.company_id = contract_documents.company_id
      AND profile.user_id = auth.uid()
  )
);

-- Preserve the current conversion implementation, then place the readiness
-- gate in front of it. Existing open cases remain idempotent.
ALTER FUNCTION public.convert_contract_to_legal_v1(
  uuid, uuid, text, text, text, boolean, uuid
) RENAME TO convert_contract_to_legal_v1_pre_readiness;

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
  v_review jsonb;
  v_result jsonb;
  v_case_id uuid;
  v_claim_amount numeric;
  v_existing_case boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.legal_cases legal_case
    WHERE legal_case.company_id = p_company_id
      AND legal_case.contract_id = p_contract_id
      AND lower(COALESCE(legal_case.case_status, '')) IN (
        'open', 'active', 'pending', 'on_hold', 'under_review'
      )
  )
  INTO v_existing_case;

  IF NOT v_existing_case THEN
    IF NOT public.can_prepare_contract_for_legal_v1(p_company_id, p_contract_id) THEN
      RAISE EXCEPTION 'You are not authorized to transfer this contract'
        USING ERRCODE = '42501';
    END IF;

    SELECT operation.operation_details
    INTO v_review
    FROM public.contract_operations_log operation
    WHERE operation.company_id = p_company_id
      AND operation.contract_id = p_contract_id
      AND operation.operation_type = 'legal_transfer_readiness_completed'
      AND COALESCE((operation.operation_details ->> 'ready')::boolean, false)
    ORDER BY operation.performed_at DESC
    LIMIT 1;

    IF v_review IS NULL THEN
      RAISE EXCEPTION 'Complete the legal transfer readiness wizard before conversion'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  v_result := public.convert_contract_to_legal_v1_pre_readiness(
    p_company_id,
    p_contract_id,
    p_notes,
    p_priority,
    p_case_type,
    p_vehicle_returned,
    p_actor_id
  );

  IF NOT v_existing_case THEN
    v_claim_amount := NULLIF(v_review ->> 'claim_amount', '')::numeric;
    v_case_id := NULLIF(v_result -> 'legal_case' ->> 'id', '')::uuid;

    IF v_case_id IS NOT NULL AND v_claim_amount IS NOT NULL THEN
      UPDATE public.legal_cases legal_case
      SET
        case_value = v_claim_amount,
        notes = concat_ws(
          E'\n',
          legal_case.notes,
          'قيمة المطالبة المعتمدة من معالج الجاهزية: ' || v_claim_amount,
          NULLIF(v_review ->> 'financial_notes', '')
        ),
        updated_at = now()
      WHERE legal_case.id = v_case_id
        AND legal_case.company_id = p_company_id;

      UPDATE public.contract_operations_log operation
      SET operation_details =
        COALESCE(operation.operation_details, '{}'::jsonb)
        || jsonb_build_object(
          'total_case_value', v_claim_amount,
          'readiness_review', v_review
        )
      WHERE operation.company_id = p_company_id
        AND operation.contract_id = p_contract_id
        AND operation.operation_type = 'convert_to_legal'
        AND operation.operation_details ->> 'legal_case_id' = v_case_id::text;

      v_result := jsonb_set(
        jsonb_set(v_result, '{legal_case,case_value}', to_jsonb(v_claim_amount), true),
        '{total_case_value}',
        to_jsonb(v_claim_amount),
        true
      );
    END IF;
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.convert_contract_to_legal_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_notes text,
  p_priority text,
  p_case_type text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.convert_contract_to_legal_v1(
    p_company_id,
    p_contract_id,
    p_notes,
    p_priority,
    p_case_type,
    false,
    p_actor_id
  );
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

