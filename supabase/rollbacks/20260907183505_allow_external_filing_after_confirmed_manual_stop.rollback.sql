BEGIN;
DO $patch$
DECLARE original text; anchor text;
BEGIN
  original := pg_get_functiondef('public.record_external_legal_filing_v1(uuid,uuid,text,date)'::regprocedure);
  anchor := E'\n   AND NOT COALESCE((status=''needs_human'' AND error_code=''MANUALLY_STOPPED''\n     AND current_step=''manual_stop'' AND locked_by IS NULL AND locked_at IS NULL),false)';
  IF position(anchor IN original)=0 THEN RAISE EXCEPTION 'External filing recovery guard changed'; END IF;
  EXECUTE replace(original,anchor,'');
  original := pg_get_functiondef('public.check_taqadi_filing_control_v1(uuid,text,boolean)'::regprocedure);
  anchor := 'completed_at=now(),updated_at=now(),locked_by=NULL,locked_at=NULL,heartbeat_at=NULL';
  IF position(anchor IN original)=0 THEN RAISE EXCEPTION 'Manual stop acknowledgement changed'; END IF;
  EXECUTE replace(original,anchor,'completed_at=now(),updated_at=now()');
END;
$patch$;
-- Preserve recorded filing evidence and released ownership. Never restore a
-- stale worker lock or remove the audit of an acknowledged handoff.
COMMIT;
