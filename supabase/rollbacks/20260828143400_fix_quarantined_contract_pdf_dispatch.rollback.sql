-- Safety rollback: do not restore the former behavior that treated quarantined
-- evidence as legally usable. Requests and audit records created by the forward
-- migration are intentionally retained. A manual rollback must first install an
-- equivalent active-evidence guard.

BEGIN;

DO $safety_rollback$
BEGIN
  IF to_regprocedure('public.enqueue_missing_contract_pdf_request_v1(uuid,uuid,text,uuid)') IS NULL THEN
    RAISE EXCEPTION 'Safe enqueue function is missing; refusing an unsafe rollback';
  END IF;
END;
$safety_rollback$;

COMMIT;
