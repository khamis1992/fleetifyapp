-- ================================================================
-- PRODUCTION MANUAL APPLICATION SCRIPT
-- Fix Four Data Integrity Issues - Fleetify (العراف)
-- Company ID: 24bc0b21-4e2d-4413-9842-31719a3669f4
-- ================================================================
-- This script can be run manually on production if migrations are not auto-applied.
-- It is idempotent and safe to run multiple times.
-- ================================================================

\echo '================================================================================'
\echo 'FLEETIFY DATA INTEGRITY FIXES - PRODUCTION MANUAL APPLICATION'
\echo 'Company: العراف لتأجير السيارات'
\echo 'Company ID: 24bc0b21-4e2d-4413-9842-31719a3669f4'
\echo '================================================================================'
\echo ''

-- ================================================================
-- FIX #1: Auto-link desktop-import contracts to vehicles
-- ================================================================
\echo '1️⃣  AUTO-LINKING CONTRACTS TO VEHICLES...'
\echo ''

DO $$
DECLARE
  v_company_id uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_linked_count integer := 0;
  v_contract record;
  v_vehicle_id uuid;
  v_vehicle_count integer;
BEGIN
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
    
    IF v_vehicle_id IS NOT NULL AND v_vehicle_count = 1 THEN
      UPDATE public.contracts
      SET 
        vehicle_id = v_vehicle_id,
        updated_at = now()
      WHERE id = v_contract.id;
      
      v_linked_count := v_linked_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Linked % contracts to vehicles', v_linked_count;
END $$;

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
  IF NEW.vehicle_id IS NULL 
     AND NEW.license_plate IS NOT NULL 
     AND BTRIM(NEW.license_plate) != '' 
  THEN
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

\echo '✅ Fix #1 complete: Auto-link contracts'
\echo ''

-- ================================================================
-- FIX #2: Vehicle status consistency
-- ================================================================
\echo '2️⃣  FIXING VEHICLE STATUS CONSISTENCY...'
\echo ''

DO $$
DECLARE
  v_company_id uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_fixed_count integer := 0;
  v_vehicle record;
  v_state jsonb;
  v_target text;
BEGIN
  FOR v_vehicle IN
    SELECT 
      v.id,
      v.plate_number,
      v.status::text as current_status
    FROM public.vehicles v
    WHERE v.company_id = v_company_id
      AND v.is_active = true
    ORDER BY v.plate_number
  LOOP
    v_state := public.system_agent_vehicle_derived_state(
      v_vehicle.id,
      v_company_id
    );
    v_target := v_state ->> 'target_status';
    
    IF v_target IS NOT NULL 
       AND lower(COALESCE(v_vehicle.current_status, '')) != lower(v_target) 
    THEN
      UPDATE public.vehicles
      SET 
        status = v_target::public.vehicle_status,
        updated_at = now()
      WHERE id = v_vehicle.id
        AND company_id = v_company_id;
      
      v_fixed_count := v_fixed_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Fixed % vehicle statuses', v_fixed_count;
END $$;

\echo '✅ Fix #2 complete: Vehicle status sync'
\echo ''

-- ================================================================
-- FIX #3: Merge duplicate plates and normalize
-- ================================================================
\echo '3️⃣  MERGING DUPLICATE PLATES...'
\echo ''

DO $$
DECLARE
  v_company_id uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_pair record;
  v_keep_vehicle record;
  v_retire_vehicle record;
  v_normalized_plate text;
  v_merged_count integer := 0;
BEGIN
  FOR v_pair IN
    WITH normalized_vehicles AS (
      SELECT 
        v.id,
        v.plate_number,
        v.status::text as status_text,
        REGEXP_REPLACE(UPPER(BTRIM(v.plate_number)), '\s+', '', 'g') as normalized_plate,
        COUNT(*) OVER (PARTITION BY REGEXP_REPLACE(UPPER(BTRIM(v.plate_number)), '\s+', '', 'g')) as dup_count,
        CASE 
          WHEN lower(v.status::text) IN ('rented', 'street_52') THEN 1
          WHEN lower(v.status::text) = 'available' THEN 2
          ELSE 3
        END as priority,
        v.created_at
      FROM public.vehicles v
      WHERE v.company_id = v_company_id
        AND v.is_active = true
    )
    SELECT DISTINCT
      normalized_plate
    FROM normalized_vehicles
    WHERE dup_count > 1
    ORDER BY normalized_plate
  LOOP
    v_normalized_plate := v_pair.normalized_plate;
    
    SELECT 
      v.id,
      v.plate_number,
      v.status::text as status_text
    INTO v_keep_vehicle
    FROM public.vehicles v
    WHERE v.company_id = v_company_id
      AND v.is_active = true
      AND REGEXP_REPLACE(UPPER(BTRIM(v.plate_number)), '\s+', '', 'g') = v_normalized_plate
    ORDER BY
      CASE 
        WHEN lower(v.status::text) IN ('rented', 'street_52') THEN 1
        WHEN lower(v.status::text) = 'available' THEN 2
        ELSE 3
      END,
      v.created_at ASC
    LIMIT 1;
    
    IF v_keep_vehicle.id IS NOT NULL THEN
      FOR v_retire_vehicle IN
        SELECT 
          v.id,
          v.plate_number,
          v.status::text as status_text
        FROM public.vehicles v
        WHERE v.company_id = v_company_id
          AND v.is_active = true
          AND REGEXP_REPLACE(UPPER(BTRIM(v.plate_number)), '\s+', '', 'g') = v_normalized_plate
          AND v.id != v_keep_vehicle.id
      LOOP
        -- Repoint all FK references
        UPDATE public.contracts SET vehicle_id = v_keep_vehicle.id, updated_at = now()
        WHERE company_id = v_company_id AND vehicle_id = v_retire_vehicle.id;
        
        UPDATE public.vehicle_maintenance SET vehicle_id = v_keep_vehicle.id, updated_at = now()
        WHERE company_id = v_company_id AND vehicle_id = v_retire_vehicle.id;
        
        UPDATE public.vehicle_reservations SET vehicle_id = v_keep_vehicle.id, updated_at = now()
        WHERE company_id = v_company_id AND vehicle_id = v_retire_vehicle.id;
        
        UPDATE public.odometer_readings SET vehicle_id = v_keep_vehicle.id, updated_at = now()
        WHERE company_id = v_company_id AND vehicle_id = v_retire_vehicle.id;
        
        UPDATE public.vehicle_insurance SET vehicle_id = v_keep_vehicle.id, updated_at = now()
        WHERE company_id = v_company_id AND vehicle_id = v_retire_vehicle.id;
        
        UPDATE public.traffic_violations SET vehicle_id = v_keep_vehicle.id, updated_at = now()
        WHERE company_id = v_company_id AND vehicle_id = v_retire_vehicle.id;
        
        UPDATE public.vehicle_inspections SET vehicle_id = v_keep_vehicle.id, updated_at = now()
        WHERE company_id = v_company_id AND vehicle_id = v_retire_vehicle.id;
        
        -- Retire the duplicate
        UPDATE public.vehicles
        SET 
          is_active = false,
          status = 'out_of_service'::public.vehicle_status,
          plate_number = 'DUP-' || plate_number,
          notes = CONCAT_WS(E'\n', NULLIF(notes, ''), 
            'Retired due to duplicate plate. Merged into vehicle ' || v_keep_vehicle.id || ' on ' || CURRENT_DATE),
          updated_at = now()
        WHERE id = v_retire_vehicle.id AND company_id = v_company_id;
        
        v_merged_count := v_merged_count + 1;
      END LOOP;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Merged % duplicate vehicles', v_merged_count;
END $$;

-- Update normalization trigger
CREATE OR REPLACE FUNCTION public.enforce_vehicle_plate_uniqueness()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  normalized_plate text;
BEGIN
  normalized_plate := REGEXP_REPLACE(UPPER(BTRIM(NEW.plate_number)), '\s+', '', 'g');
  
  IF normalized_plate IS NULL OR normalized_plate = '' THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(NEW.company_id::text || ':' || normalized_plate, 0)
  );

  IF EXISTS (
    SELECT 1
    FROM public.vehicles AS existing
    WHERE existing.company_id = NEW.company_id
      AND REGEXP_REPLACE(UPPER(BTRIM(existing.plate_number)), '\s+', '', 'g') = normalized_plate
      AND existing.id IS DISTINCT FROM NEW.id
  ) THEN
    RAISE EXCEPTION 'A vehicle with plate % already exists for this company', NEW.plate_number
      USING ERRCODE = '23505',
            CONSTRAINT = 'vehicles_company_plate_normalized_unique';
  END IF;

  NEW.plate_number := normalized_plate;
  RETURN NEW;
END;
$$;

DROP INDEX IF EXISTS public.idx_vehicles_company_plate_normalized_unique;
DROP INDEX IF EXISTS public.idx_vehicles_company_plate_normalized_lookup;

CREATE UNIQUE INDEX idx_vehicles_company_plate_normalized_unique
  ON public.vehicles (company_id, REGEXP_REPLACE(UPPER(BTRIM(plate_number)), '\s+', '', 'g'))
  WHERE plate_number IS NOT NULL AND BTRIM(plate_number) != '' AND is_active = true;

CREATE INDEX idx_vehicles_company_plate_normalized_lookup
  ON public.vehicles (company_id, REGEXP_REPLACE(UPPER(BTRIM(plate_number)), '\s+', '', 'g'))
  WHERE is_active = true;

\echo '✅ Fix #3 complete: Plate normalization'
\echo ''

-- ================================================================
-- FIX #4: Unique constraint on customers.national_id
-- ================================================================
\echo '4️⃣  ADDING UNIQUE CONSTRAINT ON NATIONAL ID...'
\echo ''

DROP INDEX IF EXISTS public.idx_customers_national_id;

CREATE UNIQUE INDEX idx_customers_company_national_id_unique
  ON public.customers (company_id, national_id)
  WHERE national_id IS NOT NULL AND BTRIM(national_id) != '';

CREATE INDEX idx_customers_national_id_lookup
  ON public.customers (national_id)
  WHERE national_id IS NOT NULL;

\echo '✅ Fix #4 complete: National ID uniqueness'
\echo ''

-- ================================================================
-- FINAL VERIFICATION
-- ================================================================
\echo '================================================================================'
\echo 'VERIFICATION SUMMARY'
\echo '================================================================================'

DO $$
DECLARE
  v_company_id uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_unlinked_contracts integer;
  v_status_mismatches integer;
  v_duplicate_plates integer;
  v_duplicate_nids integer;
BEGIN
  -- Check #1: Unlinked contracts
  SELECT COUNT(*) INTO v_unlinked_contracts
  FROM public.contracts c
  WHERE c.company_id = v_company_id
    AND c.vehicle_id IS NULL
    AND c.license_plate IS NOT NULL
    AND c.created_via = 'desktop_folder_import';
  
  -- Check #2: Status mismatches
  SELECT COUNT(*) INTO v_status_mismatches
  FROM public.vehicles v
  WHERE v.company_id = v_company_id
    AND v.is_active = true
    AND lower(v.status::text) = 'available'
    AND EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.company_id = v_company_id
        AND c.vehicle_id = v.id
        AND lower(c.status::text) = 'active'
        AND (c.start_date IS NULL OR c.start_date <= CURRENT_DATE)
        AND (c.end_date IS NULL OR c.end_date >= CURRENT_DATE)
    );
  
  -- Check #3: Duplicate plates
  SELECT COUNT(*) INTO v_duplicate_plates
  FROM (
    SELECT REGEXP_REPLACE(UPPER(BTRIM(plate_number)), '\s+', '', 'g') as norm_plate
    FROM public.vehicles
    WHERE company_id = v_company_id AND is_active = true
    GROUP BY REGEXP_REPLACE(UPPER(BTRIM(plate_number)), '\s+', '', 'g')
    HAVING COUNT(*) > 1
  ) dups;
  
  -- Check #4: Duplicate national IDs
  SELECT COUNT(*) INTO v_duplicate_nids
  FROM (
    SELECT national_id
    FROM public.customers
    WHERE company_id = v_company_id
      AND national_id IS NOT NULL
      AND BTRIM(national_id) != ''
    GROUP BY national_id
    HAVING COUNT(*) > 1
  ) dups;
  
  RAISE NOTICE '';
  RAISE NOTICE '1. Unlinked desktop-import contracts: %', v_unlinked_contracts;
  RAISE NOTICE '2. Vehicles available with active contracts: %', v_status_mismatches;
  RAISE NOTICE '3. Duplicate normalized plates: %', v_duplicate_plates;
  RAISE NOTICE '4. Duplicate non-blank national IDs: %', v_duplicate_nids;
  RAISE NOTICE '';
  
  IF v_unlinked_contracts = 0 AND v_status_mismatches = 0 AND v_duplicate_plates = 0 AND v_duplicate_nids = 0 THEN
    RAISE NOTICE '🎉 ALL CHECKS PASSED! Data integrity issues resolved.';
  ELSE
    RAISE WARNING '⚠️  Some issues remain - review logs above';
  END IF;
END $$;

\echo ''
\echo '================================================================================'
\echo 'PRODUCTION APPLICATION COMPLETE'
\echo '================================================================================'
