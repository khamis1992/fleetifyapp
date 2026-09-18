-- Rollback: remove the automated generation and the combined sweep; restore
-- the reconciliation-only nightly job. Created invoices are real financial
-- records and are NOT deleted by a rollback.

SELECT cron.unschedule('contract-financial-self-healing-nightly');

SELECT cron.schedule(
  'reconcile-contract-schedules-nightly',
  '15 1 * * *',
  $$SELECT public.reconcile_all_contract_schedules()$$
);

DROP FUNCTION IF EXISTS public.contract_financial_self_healing_sweep();
DROP FUNCTION IF EXISTS public.generate_due_contract_invoices_v1(jsonb);