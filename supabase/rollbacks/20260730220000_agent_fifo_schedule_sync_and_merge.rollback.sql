-- Rollback for 20260730220000_agent_fifo_schedule_sync_and_merge.sql
DROP FUNCTION IF EXISTS public.allocate_contract_receipts_fifo(uuid, uuid, boolean, integer);
DROP FUNCTION IF EXISTS public.sync_contract_schedule_payment_state(uuid, boolean);
DROP FUNCTION IF EXISTS public.invoice_balance_drift_report(uuid, uuid[]);
DROP FUNCTION IF EXISTS public.merge_duplicate_invoice_into_survivor(uuid, uuid, text, uuid);
