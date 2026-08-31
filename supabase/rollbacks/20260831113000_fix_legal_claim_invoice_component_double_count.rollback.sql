-- Rollback for 20260831113000_fix_legal_claim_invoice_component_double_count.sql
-- Restore the canonical amount wrapper to v2 and remove the additive v3 RPC.

BEGIN;

CREATE OR REPLACE FUNCTION public.calculate_legal_claim_amount_v1(
  p_company_id UUID,
  p_contract_id UUID,
  p_as_of_date DATE DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::DATE)
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
  SELECT COALESCE(
    (public.calculate_legal_claim_breakdown_v2(
      p_company_id,
      p_contract_id,
      p_as_of_date
    ) ->> 'total')::NUMERIC,
    0
  );
$$;

REVOKE ALL ON FUNCTION public.calculate_legal_claim_amount_v1(UUID, UUID, DATE)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_legal_claim_amount_v1(UUID, UUID, DATE)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.calculate_legal_claim_breakdown_v3(UUID, UUID, DATE)
  FROM PUBLIC, anon, authenticated, service_role;
DROP FUNCTION public.calculate_legal_claim_breakdown_v3(UUID, UUID, DATE);

COMMIT;
