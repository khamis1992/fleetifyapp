DROP TRIGGER IF EXISTS preserve_inactive_duplicate_schedule_state_trigger
  ON public.contract_payment_schedules;

DROP FUNCTION IF EXISTS public.preserve_inactive_duplicate_schedule_state();
