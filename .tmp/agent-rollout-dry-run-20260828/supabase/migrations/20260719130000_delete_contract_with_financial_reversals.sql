-- Permanently delete an erroneous contract without mutating or deleting posted
-- accounting records. Payments are cancelled first, then invoices are
-- cancelled through their canonical reversal workflows, all in one transaction.

CREATE OR REPLACE FUNCTION public.delete_contract_with_financial_reversals_v2(
  p_company_id uuid,
  p_contract_id uuid,
  p_reason text,
  p_violation_resolution text DEFAULT 'company',
  p_financial_resolution text DEFAULT 'none',
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract public.contracts%ROWTYPE;
  v_invoice_ids uuid[] := ARRAY[]::uuid[];
  v_payment_ids uuid[] := ARRAY[]::uuid[];
  v_invoice_id uuid;
  v_payment_id uuid;
  v_invoice_results jsonb := '[]'::jsonb;
  v_payment_results jsonb := '[]'::jsonb;
  v_result jsonb;
  v_cancellation_reason text;
  v_previous_bypass text := COALESCE(current_setting('app.financial_controls_bypass', true), '');
BEGIN
  IF p_company_id IS NULL OR p_contract_id IS NULL
     OR NULLIF(BTRIM(COALESCE(p_reason, '')), '') IS NULL
  THEN
    RAISE EXCEPTION 'Company, contract, and deletion reason are required'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_financial_resolution NOT IN ('none', 'reverse_and_cancel') THEN
    RAISE EXCEPTION 'Unsupported financial resolution for permanent contract deletion'
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_company_id::text || ':' || p_contract_id::text));

  SELECT contract.*
  INTO v_contract
  FROM public.contracts contract
  WHERE contract.id = p_contract_id
    AND contract.company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract was not found for the current company'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(array_agg(invoice.id ORDER BY invoice.created_at, invoice.id), ARRAY[]::uuid[])
  INTO v_invoice_ids
  FROM public.invoices invoice
  WHERE invoice.company_id = p_company_id
    AND invoice.contract_id = p_contract_id;

  SELECT COALESCE(array_agg(candidate.id ORDER BY candidate.created_at, candidate.id), ARRAY[]::uuid[])
  INTO v_payment_ids
  FROM (
    SELECT DISTINCT payment.id, payment.created_at
    FROM public.payments payment
    WHERE payment.company_id = p_company_id
      AND (
        payment.contract_id = p_contract_id
        OR payment.invoice_id = ANY(v_invoice_ids)
        OR EXISTS (
          SELECT 1
          FROM public.payment_allocations allocation
          WHERE allocation.payment_id = payment.id
            AND allocation.allocation_type = 'invoice'
            AND allocation.target_id = ANY(v_invoice_ids)
            AND allocation.is_active = true
        )
      )
  ) candidate;

  IF (cardinality(v_invoice_ids) > 0 OR cardinality(v_payment_ids) > 0)
     AND p_financial_resolution <> 'reverse_and_cancel'
  THEN
    RAISE EXCEPTION 'The contract has financial records. Explicit reversal approval is required.'
      USING ERRCODE = 'P0001';
  END IF;

  v_cancellation_reason :=
    'Permanent deletion of contract ' || v_contract.contract_number || ': ' || BTRIM(p_reason);

  IF p_financial_resolution = 'reverse_and_cancel' THEN
    FOREACH v_payment_id IN ARRAY v_payment_ids
    LOOP
      v_payment_results := v_payment_results || jsonb_build_array(
        public.cancel_payment_with_reversal(
          v_payment_id,
          p_company_id,
          v_cancellation_reason,
          p_actor_id
        )
      );
    END LOOP;

    FOREACH v_invoice_id IN ARRAY v_invoice_ids
    LOOP
      v_invoice_results := v_invoice_results || jsonb_build_array(
        public.cancel_invoice_with_reversal(
          v_invoice_id,
          p_company_id,
          v_cancellation_reason
        )
      );
    END LOOP;

    -- The cancelled source records remain for audit. Only their direct contract
    -- links are detached before the contract row is removed.
    PERFORM set_config('app.financial_controls_bypass', 'on', true);

    UPDATE public.payments payment
    SET
      contract_id = NULL,
      processing_notes = CONCAT_WS(
        E'\n',
        NULLIF(payment.processing_notes, ''),
        'Detached from permanently deleted contract ' || v_contract.contract_number
      ),
      updated_at = now()
    WHERE payment.company_id = p_company_id
      AND payment.contract_id = p_contract_id;

    UPDATE public.invoices invoice
    SET
      contract_id = NULL,
      notes = CONCAT_WS(
        E'\n',
        NULLIF(invoice.notes, ''),
        'Detached from permanently deleted contract ' || v_contract.contract_number
      ),
      updated_at = now()
    WHERE invoice.company_id = p_company_id
      AND invoice.contract_id = p_contract_id;

    DELETE FROM public.contract_payment_schedules schedule
    WHERE schedule.company_id = p_company_id
      AND schedule.contract_id = p_contract_id;

    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
  END IF;

  v_result := public.delete_contract_with_company_violations_v1(
    p_company_id,
    p_contract_id,
    p_reason,
    p_violation_resolution,
    p_actor_id
  );

  UPDATE public.contract_deletion_audit audit
  SET contract_snapshot = jsonb_set(
    audit.contract_snapshot,
    '{financial_cleanup}',
    jsonb_build_object(
      'resolution', p_financial_resolution,
      'invoice_ids', to_jsonb(v_invoice_ids),
      'payment_ids', to_jsonb(v_payment_ids),
      'invoice_results', v_invoice_results,
      'payment_results', v_payment_results
    ),
    true
  )
  WHERE audit.id = (v_result->>'audit_id')::uuid
    AND audit.company_id = p_company_id;

  RETURN v_result || jsonb_build_object(
    'financial_resolution', p_financial_resolution,
    'cancelled_invoice_count', cardinality(v_invoice_ids),
    'cancelled_payment_count', cardinality(v_payment_ids),
    'invoice_results', v_invoice_results,
    'payment_results', v_payment_results
  );
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
    RAISE;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_contract_with_financial_reversals_v2(
  uuid, uuid, text, text, text, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_contract_with_financial_reversals_v2(
  uuid, uuid, text, text, text, uuid
) TO authenticated, service_role;
COMMENT ON FUNCTION public.delete_contract_with_financial_reversals_v2(
  uuid, uuid, text, text, text, uuid
) IS
'Atomically reverses and cancels contract payments and invoices, preserves their audit records, then permanently deletes the eligible contract.';
