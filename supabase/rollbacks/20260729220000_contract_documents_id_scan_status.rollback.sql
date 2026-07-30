-- Rollback for 20260729220000_contract_documents_id_scan_status.sql

DROP INDEX IF EXISTS public.contract_documents_id_scan_pending_idx;

ALTER TABLE public.contract_documents
  DROP COLUMN IF EXISTS id_scan_status;
