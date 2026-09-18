BEGIN;

-- Restore the exact four schedule rows changed by the scoped LTO202437 repair.
UPDATE public.contract_payment_schedules schedule
SET invoice_id = restored.invoice_id,
    amount = restored.amount,
    paid_amount = 0,
    paid_date = NULL,
    status = 'overdue',
    updated_at = now()
FROM (
  VALUES
    ('52810fa1-dcd0-4246-aa04-ba6867d5e62d'::uuid, '4fd6c2eb-3f33-49a4-bf53-e894c6ff91d3'::uuid, 300::numeric),
    ('cce220e0-ce22-48d8-87e6-464093364e15'::uuid, 'd6f34ef3-ed0a-4f22-b8b7-dfef48ca5c4c'::uuid, 300::numeric),
    ('ef5acba7-5817-4fbe-9fb8-95079a991c01'::uuid, '479817a0-472b-481a-b4d3-fcab6675c5d5'::uuid, 300::numeric),
    ('f596cdbb-3df9-4281-9347-24d9400ada79'::uuid, '34077b49-a76d-4a1c-846c-d082cd8070f9'::uuid, 500::numeric)
) restored(schedule_id, invoice_id, amount)
WHERE schedule.id = restored.schedule_id
  AND schedule.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid
  AND schedule.contract_id = '662e4640-2b0a-4a21-a05a-b44681f8c1eb'::uuid;

DROP FUNCTION IF EXISTS public.cancel_payment_with_reversal(uuid, uuid, text, uuid);
DROP FUNCTION IF EXISTS public.reconcile_contract_rental_schedule_invoice_state(uuid, uuid, uuid[]);

ALTER FUNCTION
  public.cancel_payment_with_reversal_before_invoice_restore(uuid, uuid, text, uuid)
RENAME TO cancel_payment_with_reversal;

REVOKE ALL ON FUNCTION public.cancel_payment_with_reversal(uuid, uuid, text, uuid)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_payment_with_reversal(uuid, uuid, text, uuid)
TO authenticated, service_role;

COMMENT ON FUNCTION public.cancel_payment_with_reversal(uuid, uuid, text, uuid) IS
  'Atomically reverses all payment and allocation journals, reverses the bank movement once, voids allocations, cancels the payment, and recalculates affected invoices and contracts.';

COMMIT;
