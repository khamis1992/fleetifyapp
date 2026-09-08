-- Disable new manual operations. Preserve revision history and storage policies:
-- these protect original customer evidence even after application rollback.
DROP FUNCTION IF EXISTS public.process_customer_document_orientation_v1(uuid,uuid,uuid,uuid,text,uuid,text,integer[],text,text,bigint);
-- Only a never-used installation may remove the supporting objects.
DO $rollback$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.customer_document_orientation_revisions) THEN
    DROP POLICY preserve_customer_orientation_update ON storage.objects;
    DROP POLICY preserve_customer_orientation_delete ON storage.objects;
    DROP FUNCTION document_orientation_private.is_preserved_customer_path(text);
    DROP TABLE public.customer_document_orientation_revisions;
  END IF;
END;
$rollback$;
