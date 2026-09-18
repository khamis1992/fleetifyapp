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

ALTER TABLE public.excel_import_versions
  DROP CONSTRAINT IF EXISTS excel_import_versions_contract_id_fkey;

ALTER TABLE public.excel_import_versions
  ALTER COLUMN contract_id SET NOT NULL;

ALTER TABLE public.excel_import_versions
  ADD CONSTRAINT excel_import_versions_contract_id_fkey
  FOREIGN KEY (contract_id)
  REFERENCES public.contracts(id)
  ON DELETE RESTRICT;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS prevent_duplicate_general_payments;

DROP INDEX IF EXISTS public.prevent_duplicate_general_payments;

CREATE UNIQUE INDEX prevent_duplicate_general_payments
ON public.payments (
  company_id,
  customer_id,
  contract_id,
  payment_date,
  amount
)
WHERE invoice_id IS NULL;

COMMENT ON INDEX public.prevent_duplicate_general_payments IS
'Legacy active index restored by rollback.';
