DROP VIEW IF EXISTS public.dispute_dashboard_stats;
DROP VIEW IF EXISTS public.pending_disputes;
DROP FUNCTION IF EXISTS public.resolve_invoice_dispute_v1(uuid,uuid,text,text);
DROP FUNCTION IF EXISTS public.create_invoice_dispute_v1(uuid,uuid,text,text,numeric,text);
DROP TABLE IF EXISTS public.invoice_dispute_notes;
DROP TABLE IF EXISTS public.invoice_disputes;

