-- Keep missing-invoice repair resumable across Edge Function deadlines and
-- collapse high-volume financial recalculation into bounded database calls.

BEGIN;

CREATE TABLE IF NOT EXISTS public.daily_invoice_repair_cursors (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  last_contract_id uuid,
  version bigint NOT NULL DEFAULT 0,
  cycle_count bigint NOT NULL DEFAULT 0,
  last_error_count integer NOT NULL DEFAULT 0,
  last_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_invoice_repair_cursor_version_nonnegative CHECK (version >= 0),
  CONSTRAINT daily_invoice_repair_cursor_cycle_nonnegative CHECK (cycle_count >= 0),
  CONSTRAINT daily_invoice_repair_cursor_errors_nonnegative CHECK (last_error_count >= 0)
);

ALTER TABLE public.daily_invoice_repair_cursors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.daily_invoice_repair_cursors FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.daily_invoice_repair_cursors TO service_role;

CREATE OR REPLACE FUNCTION public.recalculate_invoice_financial_states_batch(
  p_company_id uuid,
  p_invoice_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role text := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    NULLIF(auth.jwt() ->> 'role', ''),
    ''
  );
  v_invoice_id uuid;
  v_processed integer := 0;
  v_errors jsonb := '[]'::jsonb;
  v_message text;
BEGIN
  IF v_role <> 'service_role' AND session_user NOT IN ('postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'Service role is required' USING ERRCODE = '42501';
  END IF;
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'Company is required' USING ERRCODE = '22023';
  END IF;
  IF COALESCE(cardinality(p_invoice_ids), 0) > 500 THEN
    RAISE EXCEPTION 'Invoice recalculation batch cannot exceed 500 rows' USING ERRCODE = '22023';
  END IF;

  FOREACH v_invoice_id IN ARRAY COALESCE(p_invoice_ids, ARRAY[]::uuid[]) LOOP
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM public.invoices invoice
        WHERE invoice.id = v_invoice_id AND invoice.company_id = p_company_id
      ) THEN
        RAISE EXCEPTION 'Invoice is outside the requested company';
      END IF;
      PERFORM public.recalculate_invoice_financial_state(v_invoice_id);
      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'invoice_id', v_invoice_id,
        'error', v_message
      ));
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'processed', v_processed,
    'fixed', v_processed,
    'errors', v_errors
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_contract_financial_states_batch(
  p_company_id uuid,
  p_contract_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role text := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    NULLIF(auth.jwt() ->> 'role', ''),
    ''
  );
  v_contract_id uuid;
  v_contract public.contracts%ROWTYPE;
  v_paid numeric;
  v_balance numeric;
  v_status text;
  v_processed integer := 0;
  v_fixed integer := 0;
  v_errors jsonb := '[]'::jsonb;
  v_message text;
BEGIN
  IF v_role <> 'service_role' AND session_user NOT IN ('postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'Service role is required' USING ERRCODE = '42501';
  END IF;
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'Company is required' USING ERRCODE = '22023';
  END IF;
  IF COALESCE(cardinality(p_contract_ids), 0) > 500 THEN
    RAISE EXCEPTION 'Contract recalculation batch cannot exceed 500 rows' USING ERRCODE = '22023';
  END IF;

  FOREACH v_contract_id IN ARRAY COALESCE(p_contract_ids, ARRAY[]::uuid[]) LOOP
    BEGIN
      SELECT contract.* INTO STRICT v_contract
      FROM public.contracts contract
      WHERE contract.id = v_contract_id
        AND contract.company_id = p_company_id;

      v_paid := public.recalculate_contract_financial_state(v_contract_id);
      v_balance := GREATEST(COALESCE(v_contract.contract_amount, 0) - v_paid, 0);
      v_status := CASE
        WHEN v_paid <= 0.01 THEN 'unpaid'
        WHEN v_paid >= COALESCE(v_contract.contract_amount, 0) - 0.01 THEN 'paid'
        ELSE 'partial'
      END;

      IF abs(COALESCE(v_contract.total_paid, 0) - v_paid) > 0.01
         OR abs(COALESCE(v_contract.balance_due, 0) - v_balance) > 0.01
         OR lower(COALESCE(v_contract.payment_status::text, '')) IS DISTINCT FROM v_status
      THEN
        v_fixed := v_fixed + 1;
      END IF;
      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'contract_id', v_contract_id,
        'error', v_message
      ));
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'processed', v_processed,
    'fixed', v_fixed,
    'errors', v_errors
  );
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_invoice_financial_states_batch(uuid, uuid[])
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recalculate_invoice_financial_states_batch(uuid, uuid[])
  TO service_role;

REVOKE ALL ON FUNCTION public.recalculate_contract_financial_states_batch(uuid, uuid[])
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recalculate_contract_financial_states_batch(uuid, uuid[])
  TO service_role;

COMMENT ON TABLE public.daily_invoice_repair_cursors IS
  'Durable per-company checkpoint for bounded, resumable missing-invoice repair.';
COMMENT ON FUNCTION public.recalculate_invoice_financial_states_batch(uuid, uuid[]) IS
  'Service-only bounded wrapper that recalculates canonical invoice state without one HTTP round trip per invoice.';
COMMENT ON FUNCTION public.recalculate_contract_financial_states_batch(uuid, uuid[]) IS
  'Service-only bounded wrapper that recalculates canonical contract state without one HTTP round trip per contract.';

COMMIT;;
