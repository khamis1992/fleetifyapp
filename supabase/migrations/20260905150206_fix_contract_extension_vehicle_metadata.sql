BEGIN;
DO $$
DECLARE v_definition text;
BEGIN
  SELECT pg_get_functiondef('public.amend_contract_vehicle_and_extension_atomic(uuid,uuid,timestamptz,uuid,date,text)'::regprocedure) INTO v_definition;
  IF position('rental_days = p_end_date - start_date' in v_definition) = 0 THEN
    RAISE EXCEPTION 'Unexpected contract extension function definition';
  END IF;
  EXECUTE replace(v_definition, 'SET license_plate = v_vehicle.plate_number,
    rental_days = p_end_date - start_date', 'SET license_plate = v_vehicle.plate_number');
END $$;
COMMIT;
