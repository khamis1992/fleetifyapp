DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.contract_payment_schedules WHERE financial_hold_reason IS NOT NULL) THEN
  RAISE EXCEPTION 'Resolve or explicitly preserve held obligations before restoring legacy billing writers; activation rollback can pause processing without losing evidence';
 END IF;
END; $$;
DROP TRIGGER sync_schedule_after_invoice_settlement_v1 ON public.invoices;
DROP TRIGGER guard_financial_schedule_link_insert_v1 ON public.contract_payment_schedules;
DROP TRIGGER guard_financial_schedule_link_update_v1 ON public.contract_payment_schedules;
DROP TRIGGER guard_invoice_held_obligation_insert_v1 ON public.invoices;
DROP TRIGGER guard_invoice_held_obligation_update_v1 ON public.invoices;
DROP TRIGGER zz_enqueue_financial_change_v1 ON public.payments;
DROP TRIGGER zz_enqueue_financial_change_v1 ON public.payment_allocations;
DROP TRIGGER zz_enqueue_financial_change_v1 ON public.invoices;
DROP TRIGGER zz_enqueue_financial_change_v1 ON public.contract_payment_schedules;
DROP TRIGGER zz_enqueue_financial_change_v1 ON public.contracts;
UPDATE public.contract_financial_reconciliation_controls SET enabled=false,updated_at=now();
REVOKE ALL ON FUNCTION public.request_contract_financial_reconciliation_v1(uuid,uuid) FROM authenticated;
DROP FUNCTION public.sync_schedule_after_invoice_settlement_v1();
