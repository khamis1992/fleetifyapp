-- Rollback: Fix vehicle status consistency
-- Note: This rollback does NOT undo the data fixes as they represent correct state.
-- The system_agent_vehicle_derived_state function and triggers remain in place
-- from previous migrations and continue to enforce consistency.

-- If you need to manually revert specific vehicle statuses, use:
-- UPDATE public.vehicles 
-- SET status = 'your_previous_status'::public.vehicle_status 
-- WHERE id = 'vehicle_id';
