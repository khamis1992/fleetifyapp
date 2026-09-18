DROP FUNCTION IF EXISTS public.convert_contract_to_legal_with_scope_v1(
  uuid, uuid, text, text, text, boolean, text, uuid
);

DROP FUNCTION IF EXISTS public.complete_legal_transfer_readiness_with_scope_v1(
  uuid, uuid, jsonb, text, uuid
);

CREATE OR REPLACE FUNCTION public.calculate_legal_claim_amount_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_as_of_date date DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar'))::date
)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = 'pg_catalog', 'public'
AS $$
  SELECT COALESCE(
    (public.calculate_legal_claim_breakdown_v3(
      p_company_id,
      p_contract_id,
      p_as_of_date
    ) ->> 'total')::numeric,
    0
  );
$$;

ALTER TABLE public.legal_cases
  DROP CONSTRAINT IF EXISTS legal_cases_claim_scope_check;

ALTER TABLE public.legal_cases
  DROP COLUMN IF EXISTS claim_scope;
