-- Remove the dedicated vehicle-status guard introduced by the migration.

DROP FUNCTION IF EXISTS public.system_agent_apply_vehicle_status_repair(
  uuid, uuid, uuid, text, uuid, text, jsonb, jsonb, jsonb
);
