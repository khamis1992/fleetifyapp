-- Safety-first rollback for the audited 7038 correction.
--
-- The forward migration uses canonical cancellation functions which create
-- posted compensating journal entries. Re-introducing receipts that were proven
-- duplicated or assigned to the wrong customer would corrupt both the customer
-- ledger and the legal claim. Therefore an automatic rollback is intentionally
-- refused. The complete before-state is preserved in audit_logs action
-- plate_7038_mahdi_thamer_correction_started and can be used by a separately
-- reviewed compensating migration if the approved business facts themselves
-- are later withdrawn.

DO $rollback$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.audit_logs audit
    WHERE audit.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid
      AND audit.action = 'plate_7038_mahdi_thamer_correction_started'
      AND audit.resource_id = 'f27ffd71-a8fa-4127-9501-a6220e4749c8'::uuid
      AND audit.status = 'completed'
  ) THEN
    RAISE EXCEPTION USING
      MESSAGE = 'Automatic rollback refused: this repair contains posted financial reversals and verified duplicate removals.',
      HINT = 'Build a reviewed compensating migration from the immutable audit snapshot; do not reactivate invalid receipts.';
  END IF;

  RAISE NOTICE 'The 7038 correction was not applied; no rollback action is required.';
END;
$rollback$;
