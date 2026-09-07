BEGIN;
-- Read-only additive reader; no financial records or older readers are changed.
DROP FUNCTION public.get_customer_collection_summary_v1(uuid,date) RESTRICT;
COMMIT;
