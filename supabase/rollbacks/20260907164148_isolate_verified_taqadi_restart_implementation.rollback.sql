BEGIN;
DROP FUNCTION public.restart_verified_unsubmitted_taqadi_job_v1(uuid,uuid,jsonb,timestamptz,boolean,text,uuid);
ALTER FUNCTION taqadi_private.restart_verified_unsubmitted_taqadi_job_v1(uuid,uuid,jsonb,timestamptz,boolean,text,uuid)
  SET SCHEMA public;
-- Refuse to remove a schema if later migrations have added objects to it.
DROP SCHEMA taqadi_private;
COMMIT;
