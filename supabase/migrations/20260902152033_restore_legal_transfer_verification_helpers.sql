-- Restore the verification helpers required by convert_contract_to_legal_collection_v2.
-- The original helper migration is absent from production history, while the
-- conversion RPC still calls both functions. Use the current fail-closed
-- evidence model instead of the former file-exists / legacy-task checks.

BEGIN;

CREATE OR REPLACE FUNCTION public.check_contract_has_verified_signed_lease_v1(
  p_company_id uuid,
  p_contract_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_evidence jsonb;
BEGIN
  IF NOT public.can_prepare_contract_for_legal_v1(p_company_id, p_contract_id) THEN
    RETURN false;
  END IF;

  v_evidence := public.get_direct_signed_contract_evidence_state_v1(
    p_company_id,
    p_contract_id
  );

  RETURN COALESCE((v_evidence ->> 'ready')::boolean, false);
END;
$function$;

COMMENT ON FUNCTION public.check_contract_has_verified_signed_lease_v1(uuid, uuid) IS
  'Fail-closed legal-transfer guard. True only when exactly one direct, active, identity-matched signed-contract document exists for the contract.';

REVOKE ALL ON FUNCTION public.check_contract_has_verified_signed_lease_v1(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_contract_has_verified_signed_lease_v1(uuid, uuid)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.check_contract_identity_verified_v1(
  p_company_id uuid,
  p_contract_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_evidence jsonb;
BEGIN
  IF NOT public.can_prepare_contract_for_legal_v1(p_company_id, p_contract_id) THEN
    RETURN false;
  END IF;

  v_evidence := public.get_direct_signed_contract_evidence_state_v1(
    p_company_id,
    p_contract_id
  );

  RETURN COALESCE((v_evidence ->> 'ready')::boolean, false)
    AND COALESCE((v_evidence ->> 'activeMatchedCount')::integer, 0) = 1;
END;
$function$;

COMMENT ON FUNCTION public.check_contract_identity_verified_v1(uuid, uuid) IS
  'Fail-closed identity guard for legal transfer. True only when the contract has exactly one direct active signed document whose extracted identity matched the contract customer.';

REVOKE ALL ON FUNCTION public.check_contract_identity_verified_v1(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_contract_identity_verified_v1(uuid, uuid)
  TO authenticated, service_role;

COMMIT;
