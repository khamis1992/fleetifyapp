DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname='legal-judgment-payment-matcher-hourly';
  END IF;
END $$;
DROP VIEW IF EXISTS public.legal_judgment_settlements_v1;
DROP TRIGGER IF EXISTS refresh_legal_cases_after_journal ON public.journal_entries;
DROP TRIGGER IF EXISTS refresh_legal_cases_after_payment ON public.payments;
DROP TRIGGER IF EXISTS refresh_legal_case_after_allocation ON public.legal_case_payment_allocations;
DROP TRIGGER IF EXISTS validate_legal_payment_allocation ON public.legal_case_payment_allocations;
DROP FUNCTION IF EXISTS public.run_all_legal_judgment_matchers_v1();
DROP FUNCTION IF EXISTS public.run_legal_judgment_matcher_v1(uuid,uuid);
DROP FUNCTION IF EXISTS public.resolve_legal_settlement_review_v1(uuid,uuid,text,text,uuid);
DROP FUNCTION IF EXISTS public.reverse_legal_case_payment_link_v1(uuid,uuid,text,uuid);
DROP FUNCTION IF EXISTS public.link_legal_case_payment_v1(uuid,uuid,uuid,numeric,text,numeric,text,uuid);
DROP FUNCTION IF EXISTS public.refresh_legal_cases_after_journal_v1();
DROP FUNCTION IF EXISTS public.refresh_legal_cases_after_payment_v1();
DROP FUNCTION IF EXISTS public.refresh_legal_case_after_allocation_v1();
DROP FUNCTION IF EXISTS public.validate_legal_payment_allocation_v1();
DROP FUNCTION IF EXISTS public.recalculate_legal_case_settlement_v1(uuid,uuid);
DROP TABLE IF EXISTS public.legal_settlement_review_items;
DROP TABLE IF EXISTS public.legal_case_payment_allocations;
GRANT EXECUTE ON FUNCTION public.record_legal_case_payment_v1(uuid,uuid,numeric,date,text,text,uuid,uuid,text,uuid) TO authenticated;
