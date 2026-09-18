-- Operational rollback preserves existing locks, state, audit history and guards.
-- Never silently reopen accounting dates when rolling back application code.
-- A forward migration/reinstallation is required to restore lock/unlock commands.
BEGIN;
REVOKE ALL ON FUNCTION public.lock_financial_reporting_period_v1(uuid,date,text),
  public.unlock_financial_reporting_period_v1(uuid,text) FROM PUBLIC,anon,authenticated,service_role;
-- Read-only status remains available. Keep the existing accounting_periods rows,
-- managed-row protection, and ledger guards so previously locked dates stay locked.
COMMIT;
