-- Run only after confirming that no canonical installment payments were posted.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.vehicle_installment_payments LIMIT 1) THEN
    RAISE EXCEPTION 'Rollback blocked: vehicle installment payments already exist';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.process_vehicle_installment_payment_v1(
  uuid, uuid, numeric, date, text, text, text, uuid
);
DROP TABLE IF EXISTS public.vehicle_installment_payments;

DELETE FROM public.default_account_types account_type
WHERE account_type.type_code IN (
  'VEHICLE_INSTALLMENT_PAYABLE',
  'VEHICLE_INSTALLMENT_INTEREST_EXPENSE'
)
AND NOT EXISTS (
  SELECT 1 FROM public.account_mappings mapping
  WHERE mapping.default_account_type_id = account_type.id
);
