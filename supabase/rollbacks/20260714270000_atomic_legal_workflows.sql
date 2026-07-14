DROP FUNCTION IF EXISTS public.soft_delete_lawsuit_template_v1(uuid,bigint,text,uuid);
DROP FUNCTION IF EXISTS public.cancel_legal_cases_v1(uuid,uuid[],text,uuid);
DROP FUNCTION IF EXISTS public.soft_delete_legal_document_v1(uuid,uuid,text,uuid);
DROP FUNCTION IF EXISTS public.cancel_verified_contract_v1(uuid,uuid,uuid);
DROP FUNCTION IF EXISTS public.close_legal_case_outcome_v1(uuid,uuid,text,text,numeric,text,text,date,text,uuid);
DROP FUNCTION IF EXISTS public.revert_contract_from_legal_v1(uuid,uuid,text,uuid);
DROP FUNCTION IF EXISTS public.convert_contract_to_legal_v1(uuid,uuid,text,text,text,uuid);
ALTER TABLE public.legal_case_documents DROP COLUMN IF EXISTS deletion_reason,DROP COLUMN IF EXISTS deleted_by,DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE public.lawsuit_templates DROP COLUMN IF EXISTS deletion_reason,DROP COLUMN IF EXISTS deleted_by,DROP COLUMN IF EXISTS deleted_at;
