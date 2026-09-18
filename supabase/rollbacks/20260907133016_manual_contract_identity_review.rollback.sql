-- Disable new reviews but preserve approved documents, audit history and the
-- protection against automatic OCR overwriting an existing human decision.
DROP FUNCTION IF EXISTS public.review_contract_document_identity_v1(uuid,uuid,uuid,text,text,text,boolean);
REVOKE ALL ON FUNCTION legal_evidence_private.review_contract_identity(uuid,uuid,uuid,text,text,text,boolean) FROM authenticated;
