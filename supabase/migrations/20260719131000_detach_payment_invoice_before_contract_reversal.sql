-- Some production payment FKs reject invoice recalculation while a payment
-- still points at the invoice. Detach that link inside the same transaction
-- before invoking the canonical payment and invoice reversal workflows.

ALTER FUNCTION public.delete_contract_with_financial_reversals_v2(
  uuid, uuid, text, text, text, uuid
) RENAME TO delete_contract_with_financial_reversals_v2_core;

REVOKE ALL ON FUNCTION public.delete_contract_with_financial_reversals_v2_core(
  uuid, uuid, text, text, text, uuid
) FROM PUBLIC, anon, authenticated;

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
  v_contract_number text;
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

  SELECT contract.contract_number
  INTO v_contract_number
  FROM public.contracts contract
  WHERE contract.id = p_contract_id
    AND contract.company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract was not found for the current company'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_financial_resolution = 'reverse_and_cancel' THEN
    PERFORM set_config('app.financial_controls_bypass', 'on', true);

    UPDATE public.payments payment
    SET
      invoice_id = NULL,
      processing_notes = CONCAT_WS(
        E'\n',
        NULLIF(payment.processing_notes, ''),
        'Invoice link detached before permanent deletion of contract ' || v_contract_number ||
          '; original invoice_id=' || payment.invoice_id::text
      ),
      updated_at = now()
    WHERE payment.company_id = p_company_id
      AND payment.invoice_id IN (
        SELECT invoice.id
        FROM public.invoices invoice
        WHERE invoice.company_id = p_company_id
          AND invoice.contract_id = p_contract_id
      );

    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
  END IF;

  RETURN public.delete_contract_with_financial_reversals_v2_core(
    p_company_id,
    p_contract_id,
    p_reason,
    p_violation_resolution,
    p_financial_resolution,
    p_actor_id
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
'Detaches payment invoice links atomically before the canonical reversal-and-delete contract workflow.';
