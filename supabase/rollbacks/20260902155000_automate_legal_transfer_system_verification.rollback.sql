BEGIN;

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
SET search_path = public
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
      AND lower(COALESCE(legal_case.case_status, '')) IN (
        'open', 'active', 'pending', 'on_hold', 'under_review'
      )
  ) INTO v_existing_case;

  IF NOT v_existing_case THEN
    SELECT * INTO v_review
    FROM public.legal_transfer_employee_reviews review
    WHERE review.company_id = p_company_id
      AND review.contract_id = p_contract_id
      AND review.status IN ('employee_approved', 'manager_overridden')
    ORDER BY review.responded_at DESC NULLS LAST
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Employee verification is required before legal conversion'
        USING ERRCODE = 'P0001';
    END IF;

    IF v_review.status = 'employee_approved' THEN
      SELECT customer.updated_at INTO v_customer_updated_at
      FROM public.customers customer WHERE customer.id = v_review.customer_id;
      SELECT contract.updated_at INTO v_contract_updated_at
      FROM public.contracts contract WHERE contract.id = p_contract_id;
      SELECT MAX(invoice.updated_at) INTO v_invoice_updated_at
      FROM public.invoices invoice
      WHERE invoice.company_id = p_company_id
        AND invoice.contract_id = p_contract_id;

      IF v_customer_updated_at > v_review.responded_at
         OR v_contract_updated_at > v_review.responded_at
         OR COALESCE(v_invoice_updated_at, '-infinity'::timestamptz) > v_review.responded_at
      THEN
        UPDATE public.legal_transfer_employee_reviews
        SET status = 'corrections_required',
            employee_notes = CONCAT_WS(
              E'\n', employee_notes,
              'تغيرت البيانات بعد الاعتماد ويلزم إعادة التدقيق.'
            ),
            updated_at = now()
        WHERE id = v_review.id;
        RAISE EXCEPTION 'Data changed after employee approval; request verification again'
          USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END IF;

  RETURN public.convert_contract_to_legal_v1_pre_employee_review(
    p_company_id, p_contract_id, p_notes, p_priority, p_case_type,
    p_vehicle_returned, p_actor_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.convert_contract_to_legal_v1_pre_pdf_request_agent(
  uuid, uuid, text, text, text, boolean, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_contract_to_legal_v1_pre_pdf_request_agent(
  uuid, uuid, text, text, text, boolean, uuid
) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.auto_verify_legal_transfer_review_v1(uuid, uuid, uuid);

UPDATE public.legal_transfer_employee_reviews
SET status = 'cancelled',
    employee_notes = CONCAT_WS(
      E'\n', employee_notes,
      'ألغي التحقق النظامي بسبب التراجع عن مسار الاعتماد الآلي.'
    ),
    updated_at = now()
WHERE status = 'system_verified';

ALTER TABLE public.legal_transfer_employee_reviews
  DROP CONSTRAINT legal_transfer_employee_reviews_status_check;

ALTER TABLE public.legal_transfer_employee_reviews
  ADD CONSTRAINT legal_transfer_employee_reviews_status_check
  CHECK (status IN (
    'awaiting_assignment', 'pending', 'in_progress', 'corrections_required',
    'employee_approved', 'deferred', 'employee_rejected',
    'manager_overridden', 'cancelled'
  ));

COMMENT ON TABLE public.legal_transfer_employee_reviews IS
  'Structured employee verification requests required before a contract can be converted to legal action.';

COMMIT;
