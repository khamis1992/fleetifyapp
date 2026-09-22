-- Rollback of 20260921160000_integrity_batch.sql
BEGIN;
SET LOCAL lock_timeout = '5s';

-- Cron jobs off.
DO $cron$
BEGIN
  PERFORM cron.unschedule('fleetify-post-due-invoice-drafts');
  PERFORM cron.unschedule('fleetify-vehicle-depreciation-monthly');
END
$cron$;

-- Demo-name guards off; restore nothing else automatically (the retired demo
-- vehicles/assets stay retired; restoring them would reintroduce test data).
ALTER TABLE public.fixed_assets DROP CONSTRAINT IF EXISTS fixed_assets_no_demo_names;
ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS vehicles_no_demo_names;

-- payment_method values revert is not reconstructible ('received' carried no
-- information); the allowed-value check is dropped so legacy values can return.
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_method_allowed;

-- Reverse the 4101 over-sweep adjustment journal (identified by its reference).
SET LOCAL app.financial_controls_bypass = 'on';
UPDATE public.journal_entries SET status = 'cancelled', updated_at = now()
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND reference_type = 'closing_over_sweep_reversal' AND status = 'posted';
SET LOCAL app.financial_controls_bypass = '';

-- Stale-draft cancellations and due-invoice postings are deliberate repairs;
-- they are not automatically undone.
NOTIFY pgrst,'reload schema';
COMMIT;
