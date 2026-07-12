DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.system_agent_repairs repair
    WHERE repair.status = 'applied'
      AND repair.rollback_metadata ->> 'handler_version' = 'operational_v2'
  ) THEN
    RAISE EXCEPTION 'Rollback blocked: canonical operational repairs are still applied';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.system_agent_apply_operational_repair(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb);
DROP FUNCTION IF EXISTS public.system_agent_leave_balance_state(uuid);
DROP FUNCTION IF EXISTS public.system_agent_attendance_hours(uuid);
DROP FUNCTION IF EXISTS public.system_agent_inventory_movement_state(uuid,uuid,uuid);
DROP FUNCTION IF EXISTS public.system_agent_customer_balance_state(uuid,uuid);
DROP FUNCTION IF EXISTS public.system_agent_vehicle_derived_state(uuid,uuid);
