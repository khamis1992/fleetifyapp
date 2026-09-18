-- ================================================================
-- Migration: Stop generating invoices for traffic penalties
-- Created: 2026-08-30
-- (mirror of applied migration stop_penalty_invoice_generation)
-- ================================================================

DROP TRIGGER IF EXISTS trg_penalty_contract_invoice_after_write ON public.penalties;
DROP FUNCTION IF EXISTS public.trg_penalty_contract_invoice_after_write();
DROP FUNCTION IF EXISTS public.ensure_penalty_contract_invoice(uuid);
DROP INDEX IF EXISTS idx_invoices_penalty_id;