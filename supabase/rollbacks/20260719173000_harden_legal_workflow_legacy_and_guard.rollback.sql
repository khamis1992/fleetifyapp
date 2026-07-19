DROP TRIGGER IF EXISTS normalize_legacy_legal_terminal_stage ON public.legal_cases;
DROP FUNCTION IF EXISTS public.normalize_legacy_legal_terminal_stage_v1();
-- The daily guard is restored by rolling back the base workflow migration.
