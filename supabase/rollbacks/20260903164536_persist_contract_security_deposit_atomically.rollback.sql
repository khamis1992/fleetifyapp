BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.contracts contract
    WHERE COALESCE(contract.deposit_amount, 0) > 0
      AND contract.id <> 'd00185fb-df9a-4abd-975a-cc99aab7bf77'::uuid
  ) THEN
    RAISE EXCEPTION 'Contracts now contain persisted security deposits; refusing destructive rollback';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.create_contract_with_violation_override_atomic(
  uuid, uuid, uuid, text, date, date, numeric, numeric, text, text,
  uuid, uuid, uuid, date, boolean, text, text, boolean, numeric
);

ALTER FUNCTION public.create_contract_with_violation_override_atomic_pre_deposit_20260903(
  uuid, uuid, uuid, text, date, date, numeric, numeric, text, text,
  uuid, uuid, uuid, date, boolean, text, text, boolean
) RENAME TO create_contract_with_violation_override_atomic;

REVOKE ALL ON FUNCTION public.create_contract_with_violation_override_atomic(
  uuid, uuid, uuid, text, date, date, numeric, numeric, text, text,
  uuid, uuid, uuid, date, boolean, text, text, boolean
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_contract_with_violation_override_atomic(
  uuid, uuid, uuid, text, date, date, numeric, numeric, text, text,
  uuid, uuid, uuid, date, boolean, text, text, boolean
) TO authenticated, service_role;

DELETE FROM public.audit_logs
WHERE action = 'backfill_lto2024276_signed_deposit_20260903164536';

ALTER TABLE public.contracts DROP COLUMN IF EXISTS deposit_amount;

NOTIFY pgrst, 'reload schema';

COMMIT;
