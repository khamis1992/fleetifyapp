BEGIN;
-- The RPC was absent in the verified target before this deployment.
-- Leave all invoices, payments, schedules and journals intact.
DROP FUNCTION IF EXISTS public.generate_contract_billing_graph_v2(uuid);
COMMIT;
