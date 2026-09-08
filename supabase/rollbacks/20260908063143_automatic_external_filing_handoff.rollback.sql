BEGIN;
DROP FUNCTION public.record_external_legal_filing_v2(uuid,uuid,text,date);
DROP FUNCTION taqadi_private.record_external_legal_filing_v2(uuid,uuid,text,date);
-- Preserve filed cases, task retirement, audit evidence and pending safe stops.
-- The existing v1 command and worker stop acknowledgement remain available.
COMMIT;
