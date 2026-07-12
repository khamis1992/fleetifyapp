DROP TRIGGER IF EXISTS normalize_contract_payment_schedule_status_trigger
  ON public.contract_payment_schedules;
DROP FUNCTION IF EXISTS public.normalize_contract_payment_schedule_status();
