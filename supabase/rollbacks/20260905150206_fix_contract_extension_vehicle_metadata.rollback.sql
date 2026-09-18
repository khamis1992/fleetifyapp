BEGIN;
DO $$
DECLARE v_definition text;
BEGIN
  SELECT pg_get_functiondef('public.amend_contract_vehicle_and_extension_atomic(uuid,uuid,timestamptz,uuid,date,text)'::regprocedure) INTO v_definition;
  EXECUTE replace(v_definition, 'SET license_plate = v_vehicle.plate_number', 'SET license_plate = v_vehicle.plate_number,
    rental_days = p_end_date - start_date');
END $$;
COMMIT;
