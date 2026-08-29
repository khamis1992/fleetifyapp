-- ================================================================
-- Migration: Revoke public execute on cross-file guard functions
-- Created: 2026-08-29
-- Description: database-linter flagged the two new SECURITY DEFINER
--   functions as callable by anon/authenticated. Restrict execution to
--   service_role only. create_customer_payment_batch_v1 invokes the
--   guard internally with SECURITY DEFINER privileges, so client RPC
--   callers of the batch keep working.
-- ================================================================

REVOKE EXECUTE ON FUNCTION public.detect_cross_file_duplicate_payments(uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assert_no_cross_file_duplicate_allocations(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.detect_cross_file_duplicate_payments(uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.assert_no_cross_file_duplicate_allocations(uuid, jsonb) TO service_role;