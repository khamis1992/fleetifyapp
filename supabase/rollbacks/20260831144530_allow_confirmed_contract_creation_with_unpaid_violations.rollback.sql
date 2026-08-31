BEGIN;

DROP FUNCTION IF EXISTS public.create_contract_with_violation_override_atomic(
  uuid, uuid, uuid, text, date, date, numeric, numeric, text, text,
  uuid, uuid, uuid, date, boolean, text, text, boolean
);

GRANT EXECUTE ON FUNCTION public.create_contract_with_billing_graph_atomic(
  uuid, uuid, uuid, text, date, date, numeric, numeric, text, text,
  uuid, uuid, uuid, date, boolean, text, text
) TO authenticated;

COMMIT;
