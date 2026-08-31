-- Browser contract creation runs as authenticator/authenticated, which inherit
-- statement_timeout=8s and lock_timeout=8s. Creating the canonical billing graph
-- (schedules + invoices + posted journals) regularly exceeds that window and
-- PostgREST surfaces the cancel as HTTP 500. Keep the wider timeout scoped to
-- the two atomic writers instead of changing the API timeout globally.

ALTER FUNCTION public.create_contract_with_violation_override_atomic(
  uuid, uuid, uuid, text, date, date, numeric, numeric, text, text,
  uuid, uuid, uuid, date, boolean, text, text, boolean
) SET statement_timeout = '60s';

ALTER FUNCTION public.create_contract_with_violation_override_atomic(
  uuid, uuid, uuid, text, date, date, numeric, numeric, text, text,
  uuid, uuid, uuid, date, boolean, text, text, boolean
) SET lock_timeout = '60s';

ALTER FUNCTION public.create_contract_with_billing_graph_atomic(
  uuid, uuid, uuid, text, date, date, numeric, numeric, text, text,
  uuid, uuid, uuid, date, boolean, text, text
) SET statement_timeout = '60s';

ALTER FUNCTION public.create_contract_with_billing_graph_atomic(
  uuid, uuid, uuid, text, date, date, numeric, numeric, text, text,
  uuid, uuid, uuid, date, boolean, text, text
) SET lock_timeout = '60s';

COMMENT ON FUNCTION public.create_contract_with_violation_override_atomic(
  uuid, uuid, uuid, text, date, date, numeric, numeric, text, text,
  uuid, uuid, uuid, date, boolean, text, text, boolean
) IS
  'Creates the canonical atomic contract billing graph; an active employee may explicitly accept unpaid violations. Function-scoped 60s timeout covers invoice/journal posting beyond the API 8s limit.';
