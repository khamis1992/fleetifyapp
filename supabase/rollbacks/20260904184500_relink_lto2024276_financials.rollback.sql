-- Restores the LTO2024276 payment contract_id values captured before relink.
-- Generated monthly invoices and their journals are left in place because
-- reversing that graph requires a separate accounting review.

BEGIN;

DO $$
BEGIN
  PERFORM set_config('app.financial_controls_bypass', 'on', true);

  UPDATE public.payments payment
  SET
    contract_id = backup.old_contract_id,
    updated_at = now()
  FROM public._backup_lto2024276_payment_relink_20260904 backup
  WHERE payment.id = backup.payment_id;

  ALTER TABLE public.contracts DISABLE TRIGGER USER;
  UPDATE public.contracts contract
  SET
    contract_amount = backup.old_contract_amount,
    updated_at = now()
  FROM public._backup_lto2024276_contract_amount_20260904 backup
  WHERE contract.id = backup.contract_id;
  ALTER TABLE public.contracts ENABLE TRIGGER USER;

  UPDATE public.contract_payment_schedules schedule
  SET
    status = 'pending',
    updated_at = now()
  FROM public.contracts contract
  WHERE schedule.contract_id = contract.id
    AND contract.contract_number = 'LTO2024276'
    AND contract.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND schedule.due_date > contract.end_date
    AND lower(COALESCE(schedule.status, '')) IN ('cancelled', 'canceled');
END;
$$;

DROP TABLE IF EXISTS public._backup_lto2024276_contract_amount_20260904;
DROP TABLE IF EXISTS public._backup_lto2024276_payment_relink_20260904;

COMMIT;
