-- Normalize vehicle plates and merge duplicates for العراف (24bc0b21-4e2d-4413-9842-31719a3669f4)
-- Issue #3: 3 duplicate plate pairs differ only by internal whitespace
-- Pairs: "185 513"/"185513", "185 573"/"185573", "599 720"/"599720"
--
-- Strategy: Keep occupied/rented vehicle, retire the other (repoint FKs, deactivate, prefix with DUP-)

-- ================================================================
-- STEP 1: Merge duplicate plate pairs
-- ================================================================
DO $$
DECLARE
  v_company_id uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_pair record;
  v_keep_vehicle record;
  v_retire_vehicle record;
  v_normalized_plate text;
  v_merged_count integer := 0;
BEGIN
  RAISE NOTICE '🔀 Merging duplicate vehicle plates...';
  
  -- Find duplicate pairs by normalized plate (all whitespace removed)
  FOR v_pair IN
    WITH normalized_vehicles AS (
      SELECT 
        v.id,
        v.plate_number,
        v.status::text as status_text,
        REGEXP_REPLACE(UPPER(BTRIM(v.plate_number)), '\s+', '', 'g') as normalized_plate,
        COUNT(*) OVER (PARTITION BY REGEXP_REPLACE(UPPER(BTRIM(v.plate_number)), '\s+', '', 'g')) as dup_count,
        -- Occupied vehicles have priority (rented > available > others)
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
    
    -- Select vehicle to KEEP (occupied/rented preferred, then oldest)
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
      RAISE NOTICE '  📌 Keeping vehicle % (%, status: %)', 
        v_keep_vehicle.id, 
        v_keep_vehicle.plate_number,
        v_keep_vehicle.status_text;
      
      -- Process all other vehicles with same normalized plate (to retire)
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
        RAISE NOTICE '    🗑️  Retiring vehicle % (%)', v_retire_vehicle.id, v_retire_vehicle.plate_number;
        
        -- Repoint FK references from retired to kept vehicle
        
        -- 1. Contracts
        UPDATE public.contracts
        SET 
          vehicle_id = v_keep_vehicle.id,
          updated_at = now()
        WHERE company_id = v_company_id
          AND vehicle_id = v_retire_vehicle.id;
        
        -- 2. Vehicle maintenance
        UPDATE public.vehicle_maintenance
        SET 
          vehicle_id = v_keep_vehicle.id,
          updated_at = now()
        WHERE company_id = v_company_id
          AND vehicle_id = v_retire_vehicle.id;
        
        -- 3. Vehicle reservations
        UPDATE public.vehicle_reservations
        SET 
          vehicle_id = v_keep_vehicle.id,
          updated_at = now()
        WHERE company_id = v_company_id
          AND vehicle_id = v_retire_vehicle.id;
        
        -- 4. Odometer readings
        UPDATE public.odometer_readings
        SET 
          vehicle_id = v_keep_vehicle.id,
          updated_at = now()
        WHERE company_id = v_company_id
          AND vehicle_id = v_retire_vehicle.id;
        
        -- 5. Vehicle insurance
        UPDATE public.vehicle_insurance
        SET 
          vehicle_id = v_keep_vehicle.id,
          updated_at = now()
        WHERE company_id = v_company_id
          AND vehicle_id = v_retire_vehicle.id;
        
        -- 6. Traffic violations
        UPDATE public.traffic_violations
        SET 
          vehicle_id = v_keep_vehicle.id,
          updated_at = now()
        WHERE company_id = v_company_id
          AND vehicle_id = v_retire_vehicle.id;
        
        -- 7. Vehicle inspections
        UPDATE public.vehicle_inspections
        SET 
          vehicle_id = v_keep_vehicle.id,
          updated_at = now()
        WHERE company_id = v_company_id
          AND vehicle_id = v_retire_vehicle.id;
        
        -- Deactivate retired vehicle and prefix plate with DUP-
        UPDATE public.vehicles
        SET 
          is_active = false,
          status = 'out_of_service'::public.vehicle_status,
          plate_number = 'DUP-' || plate_number,
          notes = CONCAT_WS(
            E'\n',
            NULLIF(notes, ''),
            'Retired due to duplicate plate. Merged into vehicle ' || v_keep_vehicle.id || ' on ' || CURRENT_DATE
          ),
          updated_at = now()
        WHERE id = v_retire_vehicle.id
          AND company_id = v_company_id;
        
        v_merged_count := v_merged_count + 1;
      END LOOP;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Merged % duplicate vehicles', v_merged_count;
END $$;

-- ================================================================
-- STEP 2: Update plate normalization to strip ALL whitespace
-- ================================================================
CREATE OR REPLACE FUNCTION public.enforce_vehicle_plate_uniqueness()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  normalized_plate text;
BEGIN
  -- Normalize: strip ALL whitespace, convert to uppercase
  normalized_plate := REGEXP_REPLACE(UPPER(BTRIM(NEW.plate_number)), '\s+', '', 'g');
  
  IF normalized_plate IS NULL OR normalized_plate = '' THEN
    RETURN NEW;
  END IF;

  -- Serialize writes for the same company/normalized-plate to close race conditions
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

  -- Normalize the plate on write: strip all whitespace, uppercase
  NEW.plate_number := normalized_plate;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_vehicle_plate_uniqueness() IS
'Enforces unique vehicle plates per company by stripping ALL whitespace and converting to uppercase on write.';

-- ================================================================
-- STEP 3: Update unique index to use fully-normalized plate
-- ================================================================
DROP INDEX IF EXISTS public.idx_vehicles_company_plate_normalized_unique;
DROP INDEX IF EXISTS public.idx_vehicles_company_plate_normalized_lookup;

-- Create unique index on fully-normalized plate (no whitespace at all)
CREATE UNIQUE INDEX idx_vehicles_company_plate_normalized_unique
  ON public.vehicles (
    company_id, 
    REGEXP_REPLACE(UPPER(BTRIM(plate_number)), '\s+', '', 'g')
  )
  WHERE plate_number IS NOT NULL 
    AND BTRIM(plate_number) != ''
    AND is_active = true;

-- Create lookup index for queries
CREATE INDEX idx_vehicles_company_plate_normalized_lookup
  ON public.vehicles (
    company_id, 
    REGEXP_REPLACE(UPPER(BTRIM(plate_number)), '\s+', '', 'g')
  )
  WHERE is_active = true;

COMMENT ON INDEX public.idx_vehicles_company_plate_normalized_unique IS
'Ensures unique vehicle plates per company with ALL whitespace stripped.';
