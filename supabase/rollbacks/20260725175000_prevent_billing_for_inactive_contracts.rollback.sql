DROP TRIGGER IF EXISTS prevent_inactive_contract_schedule_billing
  ON public.contract_payment_schedules;

DROP TRIGGER IF EXISTS prevent_inactive_contract_invoice_billing
  ON public.invoices;

DROP FUNCTION IF EXISTS public.prevent_billing_for_inactive_contracts();
