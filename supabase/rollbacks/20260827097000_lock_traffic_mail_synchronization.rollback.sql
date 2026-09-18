BEGIN;

DROP FUNCTION IF EXISTS public.claim_traffic_mail_sync_v1(uuid,integer);
ALTER TABLE public.traffic_mail_ingest_state
  DROP COLUMN IF EXISTS sync_lease_token,
  DROP COLUMN IF EXISTS sync_lease_expires_at;

COMMIT;
