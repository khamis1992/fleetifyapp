-- Fix batch payment journal repair so it does not keep an active cursor on
-- payments while relinking the same table.

CREATE OR REPLACE FUNCTION public.repair_payment_journal_integrity(
  p_company_id uuid,
  p_apply boolean DEFAULT false,
  p_limit integer DEFAULT 200
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_ids uuid[] := ARRAY[]::uuid[];
  v_payment_id uuid;
  v_payment record;
  v_existing_journal_id uuid;
  v_result jsonb;
  v_processed integer := 0;
  v_relinked integer := 0;
  v_created integer := 0;
  v_failed integer := 0;
  v_needs_relink integer := 0;
  v_needs_create integer := 0;
  v_failures jsonb := '[]'::jsonb;
  v_sample jsonb := '[]'::jsonb;
BEGIN
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'p_company_id is required' USING ERRCODE = 'P0001';
  END IF;

  IF COALESCE(p_limit, 0) <= 0 OR p_limit > 1000 THEN
    RAISE EXCEPTION 'p_limit must be between 1 and 1000' USING ERRCODE = 'P0001';
  END IF;

  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    NULL;
  ELSIF auth.role() = 'authenticated' AND public.get_user_company_id() = p_company_id THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Not authorized to repair payment journal integrity for this company'
      USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(array_agg(candidate.id), ARRAY[]::uuid[])
  INTO v_payment_ids
  FROM (
    SELECT p.id
    FROM public.payments p
    WHERE p.company_id = p_company_id
      AND LOWER(COALESCE(p.payment_status::text, '')) = 'completed'
      AND LOWER(COALESCE(p.transaction_type::text, 'receipt')) = 'receipt'
      AND COALESCE(p.amount, 0) > 0
      AND p.journal_entry_id IS NULL
    ORDER BY p.payment_date NULLS LAST, p.created_at NULLS LAST, p.id
    LIMIT p_limit
  ) candidate;

  FOREACH v_payment_id IN ARRAY v_payment_ids
  LOOP
    SELECT p.id, p.payment_number, p.amount, p.payment_date
    INTO v_payment
    FROM public.payments p
    WHERE p.id = v_payment_id
      AND p.company_id = p_company_id;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    SELECT je.id
    INTO v_existing_journal_id
    FROM public.journal_entries je
    WHERE je.company_id = p_company_id
      AND je.reference_type = 'payment'
      AND je.reference_id = v_payment.id
    ORDER BY je.created_at DESC NULLS LAST, je.id
    LIMIT 1;

    IF v_existing_journal_id IS NULL THEN
      v_needs_create := v_needs_create + 1;
    ELSE
      v_needs_relink := v_needs_relink + 1;
    END IF;

    IF jsonb_array_length(v_sample) < 20 THEN
      v_sample := v_sample || jsonb_build_array(jsonb_build_object(
        'payment_id', v_payment.id,
        'payment_number', v_payment.payment_number,
        'payment_date', v_payment.payment_date,
        'amount', v_payment.amount,
        'action', CASE WHEN v_existing_journal_id IS NULL THEN 'create' ELSE 'relink' END,
        'existing_journal_entry_id', v_existing_journal_id
      ));
    END IF;

    IF p_apply THEN
      BEGIN
        v_result := public.ensure_payment_journal_entry(v_payment.id, p_company_id, auth.uid());
        v_processed := v_processed + 1;

        IF COALESCE(v_result ->> 'status', '') = 'created_journal_entry' THEN
          v_created := v_created + 1;
        ELSIF COALESCE(v_result ->> 'status', '') IN (
          'linked_existing_payment_journal',
          'relinked_existing_reference'
        ) THEN
          v_relinked := v_relinked + 1;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        v_failed := v_failed + 1;
        v_failures := v_failures || jsonb_build_array(jsonb_build_object(
          'payment_id', v_payment.id,
          'payment_number', v_payment.payment_number,
          'error', SQLERRM
        ));
      END;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'mode', CASE WHEN p_apply THEN 'apply' ELSE 'dry_run' END,
    'company_id', p_company_id,
    'limit', p_limit,
    'needs_relink', v_needs_relink,
    'needs_create', v_needs_create,
    'processed', v_processed,
    'relinked', v_relinked,
    'created', v_created,
    'failed', v_failed,
    'sample', v_sample,
    'failures', v_failures
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.repair_payment_journal_integrity(uuid, boolean, integer) TO authenticated, service_role;
