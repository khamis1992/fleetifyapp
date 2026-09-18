-- Rollback: revoke_cross_file_guard_public_execute

-- Restore default execute privileges on the guard functions.
GRANT EXECUTE ON FUNCTION public.detect_cross_file_duplicate_payments(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assert_no_cross_file_duplicate_allocations(uuid, jsonb) TO authenticated;