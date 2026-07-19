DROP FUNCTION IF EXISTS public.sync_lawsuit_preparation_to_legal_case_v1(uuid, uuid, uuid, numeric, text, text, text, uuid);

DROP TRIGGER IF EXISTS trg_lawsuit_documents_assign_legal_case ON public.lawsuit_documents;
DROP TRIGGER IF EXISTS trg_lawsuit_preparations_assign_legal_case ON public.lawsuit_preparations;
DROP TRIGGER IF EXISTS trg_lawsuit_templates_assign_legal_case ON public.lawsuit_templates;
DROP FUNCTION IF EXISTS public.assign_current_legal_case_to_lawsuit_record_v1();

DROP INDEX IF EXISTS public.idx_lawsuit_documents_legal_case_id;
DROP INDEX IF EXISTS public.idx_lawsuit_preparations_legal_case_id;
DROP INDEX IF EXISTS public.idx_lawsuit_templates_legal_case_id;

ALTER TABLE public.lawsuit_documents DROP CONSTRAINT IF EXISTS lawsuit_documents_legal_case_id_fkey;
ALTER TABLE public.lawsuit_preparations DROP CONSTRAINT IF EXISTS lawsuit_preparations_legal_case_id_fkey;
ALTER TABLE public.lawsuit_templates DROP CONSTRAINT IF EXISTS lawsuit_templates_legal_case_id_fkey;

ALTER TABLE public.lawsuit_documents DROP COLUMN IF EXISTS legal_case_id;
ALTER TABLE public.lawsuit_preparations DROP COLUMN IF EXISTS legal_case_id;
ALTER TABLE public.lawsuit_templates DROP COLUMN IF EXISTS legal_case_id;
