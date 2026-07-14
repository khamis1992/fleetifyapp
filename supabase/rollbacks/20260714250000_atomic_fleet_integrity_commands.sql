DROP FUNCTION IF EXISTS public.cancel_vehicle_reservation_v1(uuid,uuid,uuid);
DROP FUNCTION IF EXISTS public.save_vehicle_reservation_v1(uuid,uuid,uuid,text,date,date,text,text,uuid);
DROP FUNCTION IF EXISTS public.record_odometer_reading_v1(uuid,uuid,numeric,numeric,text,uuid,uuid,text,text,uuid);
DROP FUNCTION IF EXISTS public.deactivate_vehicle_v1(uuid,uuid,text,uuid);
DROP FUNCTION IF EXISTS public.sync_company_vehicle_states_v1(uuid,uuid);
DROP FUNCTION IF EXISTS public.complete_vehicle_maintenance_v1(uuid,uuid,uuid);
