CREATE TABLE public.legal_transfer_employee_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  assigned_to_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  requested_by uuid NOT NULL,
  reviewed_by uuid,
  overridden_by uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'awaiting_assignment', 'pending', 'in_progress', 'corrections_required',
    'employee_approved', 'deferred', 'employee_rejected',
    'manager_overridden', 'cancelled'
  )),
  request_reason text,
  employee_decision text,
  employee_notes text,
  override_reason text,
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  corrected_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  approval_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  requested_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz NOT NULL DEFAULT (now() + interval '2 days'),
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX legal_transfer_employee_reviews_company_status_idx
  ON public.legal_transfer_employee_reviews(company_id, status, requested_at DESC);
CREATE INDEX legal_transfer_employee_reviews_assignee_status_idx
  ON public.legal_transfer_employee_reviews(assigned_to_profile_id, status, due_at);
CREATE INDEX legal_transfer_employee_reviews_contract_idx
  ON public.legal_transfer_employee_reviews(contract_id, created_at DESC);
CREATE UNIQUE INDEX legal_transfer_employee_reviews_one_open_contract_idx
  ON public.legal_transfer_employee_reviews(contract_id)
  WHERE status IN ('awaiting_assignment', 'pending', 'in_progress', 'corrections_required', 'deferred');
ALTER TABLE public.legal_transfer_employee_reviews ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.can_manage_legal_transfer_reviews_v1(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND public.get_user_company_id() = p_company_id
    AND EXISTS (
      SELECT 1
      FROM public.user_roles role
      WHERE role.user_id = auth.uid()
        AND role.role::text IN (
          'super_admin', 'admin', 'company_admin', 'manager', 'legal'
        )
    );
$$;
REVOKE ALL ON FUNCTION public.can_manage_legal_transfer_reviews_v1(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_legal_transfer_reviews_v1(uuid) TO authenticated;
CREATE POLICY "Legal team and assigned employee can read transfer reviews"
ON public.legal_transfer_employee_reviews
FOR SELECT
TO authenticated
USING (
  company_id = public.get_user_company_id()
  AND (
    public.can_manage_legal_transfer_reviews_v1(company_id)
    OR EXISTS (
      SELECT 1
      FROM public.profiles profile
      WHERE profile.id = assigned_to_profile_id
        AND profile.company_id = company_id
        AND profile.user_id = auth.uid()
    )
  )
);
REVOKE ALL ON TABLE public.legal_transfer_employee_reviews FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.legal_transfer_employee_reviews TO authenticated;
GRANT ALL ON TABLE public.legal_transfer_employee_reviews TO service_role;
CREATE OR REPLACE FUNCTION public.request_legal_transfer_employee_review_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_reason text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
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

  SELECT profile.id INTO v_assignee
  FROM public.profiles profile
  WHERE profile.id = v_contract.assigned_to_profile_id
    AND profile.company_id = p_company_id
    AND COALESCE(profile.is_active, true)
  LIMIT 1;

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
REVOKE ALL ON FUNCTION public.request_legal_transfer_employee_review_v1(uuid, uuid, text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_legal_transfer_employee_review_v1(uuid, uuid, text, uuid)
  TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.respond_legal_transfer_employee_review_v1(
  p_company_id uuid,
  p_review_id uuid,
  p_decision text,
  p_notes text,
  p_checklist jsonb DEFAULT '{}'::jsonb,
  p_customer_updates jsonb DEFAULT '{}'::jsonb,
  p_contract_updates jsonb DEFAULT '{}'::jsonb,
  p_actor_id uuid DEFAULT NULL
)
RETURNS public.legal_transfer_employee_reviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := COALESCE(auth.uid(), p_actor_id);
  v_profile_id uuid;
  v_review public.legal_transfer_employee_reviews%ROWTYPE;
  v_status text;
  v_customer_updated_at timestamptz;
  v_contract_updated_at timestamptz;
  v_invoice_updated_at timestamptz;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501'; END IF;
  IF auth.uid() IS NOT NULL AND p_actor_id IS NOT NULL AND p_actor_id <> auth.uid() THEN
    RAISE EXCEPTION 'Actor identity mismatch' USING ERRCODE = '42501';
  END IF;

  SELECT profile.id INTO v_profile_id
  FROM public.profiles profile
  WHERE profile.user_id = v_actor AND profile.company_id = p_company_id AND COALESCE(profile.is_active, true)
  LIMIT 1;

  SELECT * INTO v_review
  FROM public.legal_transfer_employee_reviews review
  WHERE review.id = p_review_id AND review.company_id = p_company_id
  FOR UPDATE;
  IF NOT FOUND OR v_profile_id IS NULL OR v_review.assigned_to_profile_id <> v_profile_id THEN
    RAISE EXCEPTION 'This legal verification request is not assigned to you' USING ERRCODE = '42501';
  END IF;
  IF v_review.status NOT IN ('pending', 'in_progress', 'corrections_required', 'deferred') THEN
    RAISE EXCEPTION 'This legal verification request is already closed' USING ERRCODE = 'P0001';
  END IF;
  IF p_decision NOT IN ('employee_approved', 'corrections_required', 'deferred', 'employee_rejected') THEN
    RAISE EXCEPTION 'Unsupported employee decision' USING ERRCODE = 'P0001';
  END IF;
  IF p_decision <> 'employee_approved' AND NULLIF(BTRIM(COALESCE(p_notes, '')), '') IS NULL THEN
    RAISE EXCEPTION 'A reason is required for this decision' USING ERRCODE = 'P0001';
  END IF;
  IF p_decision = 'employee_approved' AND NOT (
    COALESCE((p_checklist ->> 'identity_verified')::boolean, false)
    AND COALESCE((p_checklist ->> 'financial_verified')::boolean, false)
    AND COALESCE((p_checklist ->> 'contact_verified')::boolean, false)
    AND COALESCE((p_checklist ->> 'vehicle_verified')::boolean, false)
    AND COALESCE((p_checklist ->> 'documents_verified')::boolean, false)
  ) THEN
    RAISE EXCEPTION 'Complete every verification item before approval' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.customers customer SET
    first_name_ar = CASE WHEN p_customer_updates ? 'first_name_ar' THEN COALESCE(NULLIF(BTRIM(p_customer_updates ->> 'first_name_ar'), ''), customer.first_name_ar) ELSE customer.first_name_ar END,
    last_name_ar = CASE WHEN p_customer_updates ? 'last_name_ar' THEN COALESCE(NULLIF(BTRIM(p_customer_updates ->> 'last_name_ar'), ''), customer.last_name_ar) ELSE customer.last_name_ar END,
    first_name = CASE WHEN p_customer_updates ? 'first_name_ar' THEN COALESCE(NULLIF(BTRIM(p_customer_updates ->> 'first_name_ar'), ''), customer.first_name) ELSE customer.first_name END,
    last_name = CASE WHEN p_customer_updates ? 'last_name_ar' THEN COALESCE(NULLIF(BTRIM(p_customer_updates ->> 'last_name_ar'), ''), customer.last_name) ELSE customer.last_name END,
    nationality = CASE WHEN p_customer_updates ? 'nationality' THEN COALESCE(NULLIF(BTRIM(p_customer_updates ->> 'nationality'), ''), customer.nationality) ELSE customer.nationality END,
    national_id = CASE WHEN p_customer_updates ? 'national_id' THEN COALESCE(NULLIF(BTRIM(p_customer_updates ->> 'national_id'), ''), customer.national_id) ELSE customer.national_id END,
    national_id_expiry = CASE WHEN p_customer_updates ? 'national_id_expiry' THEN COALESCE(NULLIF(BTRIM(p_customer_updates ->> 'national_id_expiry'), '')::date, customer.national_id_expiry) ELSE customer.national_id_expiry END,
    phone = CASE WHEN p_customer_updates ? 'phone' THEN COALESCE(NULLIF(BTRIM(p_customer_updates ->> 'phone'), ''), customer.phone) ELSE customer.phone END,
    updated_at = now()
  WHERE customer.id = v_review.customer_id AND customer.company_id = p_company_id
  RETURNING customer.updated_at INTO v_customer_updated_at;

  UPDATE public.contracts contract SET
    vehicle_returned = CASE WHEN p_contract_updates ? 'vehicle_returned' THEN (p_contract_updates ->> 'vehicle_returned')::boolean ELSE contract.vehicle_returned END,
    updated_at = CASE WHEN p_contract_updates ? 'vehicle_returned' THEN now() ELSE contract.updated_at END
  WHERE contract.id = v_review.contract_id AND contract.company_id = p_company_id
  RETURNING contract.updated_at INTO v_contract_updated_at;

  SELECT MAX(invoice.updated_at) INTO v_invoice_updated_at
  FROM public.invoices invoice
  WHERE invoice.company_id = p_company_id AND invoice.contract_id = v_review.contract_id;

  v_status := p_decision;
  UPDATE public.legal_transfer_employee_reviews review SET
    status = v_status,
    employee_decision = p_decision,
    employee_notes = NULLIF(BTRIM(COALESCE(p_notes, '')), ''),
    checklist = COALESCE(p_checklist, '{}'::jsonb),
    corrected_fields = jsonb_build_object(
      'customer', COALESCE(p_customer_updates, '{}'::jsonb),
      'contract', COALESCE(p_contract_updates, '{}'::jsonb)
    ),
    approval_snapshot = CASE WHEN p_decision = 'employee_approved' THEN jsonb_build_object(
      'customer_updated_at', v_customer_updated_at,
      'contract_updated_at', v_contract_updated_at,
      'invoice_updated_at', v_invoice_updated_at,
      'approved_at', now()
    ) ELSE '{}'::jsonb END,
    reviewed_by = v_actor,
    responded_at = now(),
    updated_at = now()
  WHERE review.id = p_review_id
  RETURNING * INTO v_review;

  INSERT INTO public.contract_operations_log (
    contract_id, company_id, operation_type, operation_details, notes, performed_by
  ) VALUES (
    v_review.contract_id, p_company_id, 'legal_employee_review_responded',
    jsonb_build_object(
      'review_id', v_review.id, 'decision', p_decision,
      'checklist', p_checklist, 'corrected_fields', v_review.corrected_fields
    ),
    COALESCE(NULLIF(BTRIM(COALESCE(p_notes, '')), ''), 'اكتمل تدقيق الموظف قبل التحويل القانوني'),
    v_actor
  );

  RETURN v_review;
END;
$$;
REVOKE ALL ON FUNCTION public.respond_legal_transfer_employee_review_v1(
  uuid, uuid, text, text, jsonb, jsonb, jsonb, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_legal_transfer_employee_review_v1(
  uuid, uuid, text, text, jsonb, jsonb, jsonb, uuid
) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.override_legal_transfer_employee_review_v1(
  p_company_id uuid,
  p_review_id uuid,
  p_reason text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS public.legal_transfer_employee_reviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := COALESCE(auth.uid(), p_actor_id);
  v_review public.legal_transfer_employee_reviews%ROWTYPE;
BEGIN
  IF v_actor IS NULL OR public.get_user_company_id() <> p_company_id OR NOT EXISTS (
    SELECT 1 FROM public.user_roles role
    WHERE role.user_id = v_actor
      AND role.role::text IN ('super_admin', 'admin', 'company_admin', 'manager')
  ) THEN
    RAISE EXCEPTION 'Only a manager can override employee verification' USING ERRCODE = '42501';
  END IF;
  IF NULLIF(BTRIM(COALESCE(p_reason, '')), '') IS NULL THEN
    RAISE EXCEPTION 'An override reason is required' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.legal_transfer_employee_reviews review SET
    status = 'manager_overridden', overridden_by = v_actor,
    override_reason = BTRIM(p_reason), responded_at = now(), updated_at = now(),
    approval_snapshot = jsonb_build_object('approved_at', now(), 'manager_override', true)
  WHERE review.id = p_review_id AND review.company_id = p_company_id
  RETURNING * INTO v_review;
  IF NOT FOUND THEN RAISE EXCEPTION 'Review request was not found' USING ERRCODE = 'P0001'; END IF;

  INSERT INTO public.contract_operations_log (
    contract_id, company_id, operation_type, operation_details, notes, performed_by
  ) VALUES (
    v_review.contract_id, p_company_id, 'legal_employee_review_overridden',
    jsonb_build_object('review_id', v_review.id, 'reason', BTRIM(p_reason)),
    'تم تجاوز تدقيق الموظف بواسطة المدير: ' || BTRIM(p_reason), v_actor
  );
  RETURN v_review;
END;
$$;
REVOKE ALL ON FUNCTION public.override_legal_transfer_employee_review_v1(uuid, uuid, text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.override_legal_transfer_employee_review_v1(uuid, uuid, text, uuid)
  TO authenticated, service_role;
ALTER FUNCTION public.convert_contract_to_legal_v1(
  uuid, uuid, text, text, text, boolean, uuid
) RENAME TO convert_contract_to_legal_v1_pre_employee_review;
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
      AND lower(COALESCE(legal_case.case_status, '')) IN ('open', 'active', 'pending', 'on_hold', 'under_review')
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
      WHERE invoice.company_id = p_company_id AND invoice.contract_id = p_contract_id;

      IF v_customer_updated_at > v_review.responded_at
        OR v_contract_updated_at > v_review.responded_at
        OR COALESCE(v_invoice_updated_at, '-infinity'::timestamptz) > v_review.responded_at
      THEN
        UPDATE public.legal_transfer_employee_reviews
        SET status = 'corrections_required',
            employee_notes = concat_ws(E'\n', employee_notes, 'تغيرت البيانات بعد الاعتماد ويلزم إعادة التدقيق.'),
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
$$;
REVOKE ALL ON FUNCTION public.convert_contract_to_legal_v1(
  uuid, uuid, text, text, text, boolean, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_contract_to_legal_v1(
  uuid, uuid, text, text, text, boolean, uuid
) TO authenticated, service_role;
COMMENT ON TABLE public.legal_transfer_employee_reviews IS
  'Structured employee verification requests required before a contract can be converted to legal action.';
