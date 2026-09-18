BEGIN;

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS deposit_amount numeric(14, 2) NOT NULL DEFAULT 0
  CHECK (deposit_amount >= 0);

COMMENT ON COLUMN public.contracts.deposit_amount IS
'Refundable security deposit recorded in the signed contract. This is not rent revenue and is not treated as paid unless a deposit payment is posted.';

ALTER FUNCTION public.create_contract_with_violation_override_atomic(
  uuid, uuid, uuid, text, date, date, numeric, numeric, text, text,
  uuid, uuid, uuid, date, boolean, text, text, boolean
) RENAME TO create_contract_with_violation_override_atomic_pre_deposit_20260903;

REVOKE ALL ON FUNCTION public.create_contract_with_violation_override_atomic_pre_deposit_20260903(
  uuid, uuid, uuid, text, date, date, numeric, numeric, text, text,
  uuid, uuid, uuid, date, boolean, text, text, boolean
) FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.create_contract_with_violation_override_atomic(
  p_company_id uuid,
  p_customer_id uuid,
  p_vehicle_id uuid DEFAULT NULL,
  p_contract_type text DEFAULT 'rental',
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_contract_amount numeric DEFAULT 0,
  p_monthly_amount numeric DEFAULT 0,
  p_description text DEFAULT NULL,
  p_terms text DEFAULT NULL,
  p_cost_center_id uuid DEFAULT NULL,
  p_created_by uuid DEFAULT NULL,
  p_assigned_to_profile_id uuid DEFAULT NULL,
  p_contract_date date DEFAULT CURRENT_DATE,
  p_auto_renew_enabled boolean DEFAULT false,
  p_created_via text DEFAULT 'atomic_billing_graph',
  p_idempotency_key text DEFAULT NULL,
  p_accept_unpaid_violations boolean DEFAULT false,
  p_deposit_amount numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result jsonb;
  v_contract_id uuid;
  v_existing_deposit numeric;
  v_deposit numeric := round(COALESCE(p_deposit_amount, 0)::numeric, 2);
BEGIN
  IF v_deposit < 0 THEN
    RAISE EXCEPTION 'Security deposit cannot be negative'
      USING ERRCODE = '22023';
  END IF;

  v_result := public.create_contract_with_violation_override_atomic_pre_deposit_20260903(
    p_company_id,
    p_customer_id,
    p_vehicle_id,
    p_contract_type,
    p_start_date,
    p_end_date,
    p_contract_amount,
    p_monthly_amount,
    p_description,
    p_terms,
    p_cost_center_id,
    p_created_by,
    p_assigned_to_profile_id,
    p_contract_date,
    p_auto_renew_enabled,
    p_created_via,
    p_idempotency_key,
    p_accept_unpaid_violations
  );

  v_contract_id := NULLIF(v_result ->> 'contract_id', '')::uuid;
  IF v_contract_id IS NULL THEN
    RAISE EXCEPTION 'Atomic contract creation returned no contract id'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT contract.deposit_amount
  INTO v_existing_deposit
  FROM public.contracts contract
  WHERE contract.id = v_contract_id
    AND contract.company_id = p_company_id
  FOR UPDATE;

  IF COALESCE((v_result ->> 'idempotent_replay')::boolean, false)
     AND round(COALESCE(v_existing_deposit, 0)::numeric, 2) IS DISTINCT FROM v_deposit
  THEN
    RAISE EXCEPTION 'Idempotency key is already bound to a different security deposit'
      USING ERRCODE = '23505';
  END IF;

  IF NOT COALESCE((v_result ->> 'idempotent_replay')::boolean, false) THEN
    UPDATE public.contracts contract
    SET deposit_amount = v_deposit,
        updated_at = pg_catalog.now()
    WHERE contract.id = v_contract_id
      AND contract.company_id = p_company_id;
  END IF;

  RETURN v_result || pg_catalog.jsonb_build_object('deposit_amount', v_deposit);
END;
$$;

REVOKE ALL ON FUNCTION public.create_contract_with_violation_override_atomic(
  uuid, uuid, uuid, text, date, date, numeric, numeric, text, text,
  uuid, uuid, uuid, date, boolean, text, text, boolean, numeric
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_contract_with_violation_override_atomic(
  uuid, uuid, uuid, text, date, date, numeric, numeric, text, text,
  uuid, uuid, uuid, date, boolean, text, text, boolean, numeric
) TO authenticated, service_role;

COMMENT ON FUNCTION public.create_contract_with_violation_override_atomic(
  uuid, uuid, uuid, text, date, date, numeric, numeric, text, text,
  uuid, uuid, uuid, date, boolean, text, text, boolean, numeric
) IS
'Creates the canonical contract graph and persists the signed security-deposit amount in the same transaction and idempotency boundary.';

-- The signed Agreement 2024/276 for LTO2024276 explicitly records QAR 1,800.
UPDATE public.contracts contract
SET deposit_amount = 1800,
    updated_at = pg_catalog.now()
WHERE contract.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND contract.id = 'd00185fb-df9a-4abd-975a-cc99aab7bf77'
  AND contract.contract_number = 'LTO2024276'
  AND contract.monthly_amount = 1800
  AND contract.contract_amount = 64800
  AND contract.deposit_amount = 0
  AND EXISTS (
    SELECT 1
    FROM public.contract_documents document
    WHERE document.company_id = contract.company_id
      AND document.contract_id = contract.id
      AND document.document_type IN ('signed_contract', 'signed_contract_image')
      AND document.legal_evidence_state = 'active'
      AND document.legal_identity_match_status = 'matched'
      AND pg_catalog.regexp_replace(COALESCE(document.legal_identity_expected_id, ''), '[^0-9]', '', 'g')
        = pg_catalog.regexp_replace(COALESCE(document.legal_identity_extracted_id, ''), '[^0-9]', '', 'g')
  );

INSERT INTO public.audit_logs (
  company_id, action, resource_type, resource_id, entity_name,
  changes_summary, old_values, new_values, severity, status, metadata
)
SELECT
  contract.company_id,
  'backfill_lto2024276_signed_deposit_20260903164536',
  'contract',
  contract.id,
  contract.contract_number,
  'Persisted the QAR 1,800 security deposit printed in identity-matched signed Agreement 2024/276.',
  pg_catalog.jsonb_build_object('deposit_amount', 0),
  pg_catalog.jsonb_build_object('deposit_amount', contract.deposit_amount),
  'info',
  'completed',
  pg_catalog.jsonb_build_object('migration', '20260903164536')
FROM public.contracts contract
WHERE contract.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND contract.id = 'd00185fb-df9a-4abd-975a-cc99aab7bf77'
  AND contract.deposit_amount = 1800
  AND NOT EXISTS (
    SELECT 1 FROM public.audit_logs log
    WHERE log.action = 'backfill_lto2024276_signed_deposit_20260903164536'
      AND log.resource_id = contract.id::text
  );

NOTIFY pgrst, 'reload schema';

COMMIT;
