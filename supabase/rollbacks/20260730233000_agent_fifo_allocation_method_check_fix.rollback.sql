-- Rollback for 20260730233000_agent_fifo_allocation_method_check_fix.sql
-- Re-apply the previous function versions from 20260730220000 (git history),
-- or simply re-run the original migration file. No data changes were made.
SELECT 'Re-apply 20260730220000_agent_fifo_schedule_sync_and_merge.sql (previous function bodies) to roll back.' AS instructions;
