-- Auto-link contracts to vehicles by plate number for العراف (24bc0b21-4e2d-4413-9842-31719a3669f4)
-- Fixes desktop_folder_import contracts with NULL vehicle_id but matching plate_number
-- Issue #1: 36/92 desktop imports had NULL vehicle_id despite matching plates in fleet

-- ================================================================
-- BACKFILL: Link existing unlinked contracts to vehicles
-- ================================================================
DO $$
DECLARE
  v_company_id uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_linked_count integer := 0;
  v_contract record;
  v_vehicle_id uuid;
  v_vehicle_count integer;
BEGIN
  RAISE NOTICE '🔗 Auto-linking desktop-import contracts to vehicles...';
  
  FOR v_contract IN
    SELECT 
      c.id,
      c.contract_number,
      c.license_plate,
      c.created_via
    FROM public.contracts c
    WHERE c.company_id = v_company_id
      AND c.vehicle_id IS NULL
      AND c.license_plate IS NOT NULL
      AND BTRIM(c.license_plate) != ''
      AND c.created_via = 'desktop_folder_import'
    ORDER BY c.created_at
  LOOP
    -- Find exactly one matching vehicle by normalized plate
    SELECT 
      v.id,
      COUNT(*) OVER() as vehicle_count
    INTO v_vehicle_id, v_vehicle_count
    FROM public.vehicles v
    WHERE v.company_id = v_company_id
      AND v.is_active = true
      AND REGEXP_REPLACE(UPPER(BTRIM(v.plate_number)), '\s+', '', 'g') = 
          REGEXP_REPLACE(UPPER(BTRIM(v_contract.license_plate)), '\s+', '', 'g')
    LIMIT 1;
    
    -- Link only if exactly one vehicle matches
    IF v_vehicle_id IS NOT NULL AND v_vehicle_count = 1 THEN
      UPDATE public.contracts
      SET 
        vehicle_id = v_vehicle_id,
        updated_at = now()
      WHERE id = v_contract.id;
      
      v_linked_count := v_linked_count + 1;
      
      IF v_linked_count % 10 = 0 THEN
        RAISE NOTICE '  ✅ Linked % contracts...', v_linked_count;
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Backfill complete: linked % contracts to vehicles', v_linked_count;
END $$;

-- ================================================================
-- WRITE-PATH GUARD: Auto-link on insert/update
-- ================================================================
CREATE OR REPLACE FUNCTION public.auto_link_contract_to_vehicle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vehicle_id uuid;
  v_vehicle_count integer;
BEGIN
  -- Only auto-link if vehicle_id is NULL and we have a license plate
  IF NEW.vehicle_id IS NULL 
     AND NEW.license_plate IS NOT NULL 
     AND BTRIM(NEW.license_plate) != '' 
  THEN
    -- Find exactly one matching active vehicle by normalized plate
    SELECT 
      v.id,
      COUNT(*) OVER() as vehicle_count
    INTO v_vehicle_id, v_vehicle_count
    FROM public.vehicles v
    WHERE v.company_id = NEW.company_id
      AND v.is_active = true
      AND REGEXP_REPLACE(UPPER(BTRIM(v.plate_number)), '\s+', '', 'g') = 
          REGEXP_REPLACE(UPPER(BTRIM(NEW.license_plate)), '\s+', '', 'g')
    LIMIT 1;
    
    -- Link only if exactly one vehicle matches
    IF v_vehicle_id IS NOT NULL AND v_vehicle_count = 1 THEN
      NEW.vehicle_id := v_vehicle_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_link_contract_to_vehicle ON public.contracts;
CREATE TRIGGER trg_auto_link_contract_to_vehicle
BEFORE INSERT OR UPDATE OF license_plate, vehicle_id ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.auto_link_contract_to_vehicle();

COMMENT ON FUNCTION public.auto_link_contract_to_vehicle() IS
'Auto-links contracts to vehicles by matching plate_number when vehicle_id is NULL and exactly one active vehicle matches.';
