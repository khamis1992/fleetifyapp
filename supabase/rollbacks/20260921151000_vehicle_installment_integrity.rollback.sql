-- Rollback of 20260921151000_vehicle_installment_integrity.sql
BEGIN;
SET LOCAL lock_timeout = '5s';

DROP TRIGGER IF EXISTS guard_installment_schedule_paid_state ON public.vehicle_installment_schedules;
DROP FUNCTION IF EXISTS public.guard_installment_schedule_paid_state();

-- Remove the backfilled payment rows and their journals (identified by the
-- backfill marker); agreements re-opened are those with no unpaid schedule left.
SET LOCAL app.financial_controls_bypass = 'on';
DELETE FROM public.journal_entry_lines
WHERE journal_entry_id IN (
  SELECT journal_entry_id FROM public.vehicle_installment_payments
  WHERE notes LIKE 'BACKFILLED by migration 20260921151000%'
);
DELETE FROM public.journal_entries
WHERE id IN (
  SELECT journal_entry_id FROM public.vehicle_installment_payments
  WHERE notes LIKE 'BACKFILLED by migration 20260921151000%'
);
DELETE FROM public.vehicle_installment_payments
WHERE notes LIKE 'BACKFILLED by migration 20260921151000%';
UPDATE public.vehicle_installments
SET status = 'active', updated_at = now()
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND status = 'completed'
  AND EXISTS (SELECT 1 FROM public.audit_logs al WHERE al.action = 'vehicle_installment_payments_backfilled');
SET LOCAL app.financial_controls_bypass = '';

NOTIFY pgrst,'reload schema';
COMMIT;
