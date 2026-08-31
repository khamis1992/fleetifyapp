-- Fix vehicle status consistency for العراف (24bc0b21-4e2d-4413-9842-31719a3669f4)
-- Issue #2: 2 vehicles 'available' with active contracts; 18 'rented' with only under_legal_procedure
-- 
-- Business rule: Vehicle is OCCUPIED when:
--   - Contract status = 'active', OR
--   - Contract status = 'under_legal_procedure' AND vehicle_returned = false
--
-- The system_agent_vehicle_derived_state function (migration 20260725172000) already implements this correctly.
-- This migration ensures data consistency by syncing all العراف vehicles.

-- ================================================================
-- BACKFILL: Fix specific mismatched vehicles for العراف
-- ================================================================
DO $$
DECLARE
  v_company_id uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_fixed_count integer := 0;
  v_vehicle record;
  v_state jsonb;
  v_target text;
BEGIN
  RAISE NOTICE '🔧 Fixing vehicle status consistency...';
  
  -- Fix vehicles that have the wrong status
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
    -- Get the derived state from operational records
    v_state := public.system_agent_vehicle_derived_state(
      v_vehicle.id,
      v_company_id
    );
    v_target := v_state ->> 'target_status';
    
    -- Update if different
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
      
      RAISE NOTICE '  ✅ Fixed vehicle % from % to %', 
        v_vehicle.plate_number,
        v_vehicle.current_status,
        v_target;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Fixed % vehicle statuses', v_fixed_count;
END $$;

-- ================================================================
-- VERIFICATION: Log any remaining mismatches
-- ================================================================
DO $$
DECLARE
  v_company_id uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_available_with_active integer;
  v_rented_with_only_legal integer;
BEGIN
  -- Check: available vehicles with active contracts
  SELECT COUNT(*) INTO v_available_with_active
  FROM public.vehicles v
  WHERE v.company_id = v_company_id
    AND v.is_active = true
    AND lower(v.status::text) = 'available'
    AND EXISTS (
      SELECT 1 
      FROM public.contracts c
      WHERE c.company_id = v_company_id
        AND c.vehicle_id = v.id
        AND lower(c.status::text) = 'active'
        AND (c.start_date IS NULL OR c.start_date <= CURRENT_DATE)
        AND (c.end_date IS NULL OR c.end_date >= CURRENT_DATE)
    );
  
  -- Check: rented vehicles with only legal contracts (vehicle not returned)
  SELECT COUNT(*) INTO v_rented_with_only_legal
  FROM public.vehicles v
  WHERE v.company_id = v_company_id
    AND v.is_active = true
    AND lower(v.status::text) = 'rented'
    AND NOT EXISTS (
      SELECT 1 
      FROM public.contracts c
      WHERE c.company_id = v_company_id
        AND c.vehicle_id = v.id
        AND lower(c.status::text) = 'active'
    )
    AND EXISTS (
      SELECT 1
      FROM public.contracts c
      WHERE c.company_id = v_company_id
        AND c.vehicle_id = v.id
        AND lower(c.status::text) = 'under_legal_procedure'
        AND COALESCE(c.vehicle_returned, false) = false
    );
  
  IF v_available_with_active > 0 THEN
    RAISE WARNING '⚠️ Still have % available vehicles with active contracts (should be 0)', v_available_with_active;
  ELSE
    RAISE NOTICE '✅ No available vehicles with active contracts';
  END IF;
  
  IF v_rented_with_only_legal > 0 THEN
    RAISE NOTICE '✅ % rented vehicles with legal contracts (vehicle not returned) - CORRECT', v_rented_with_only_legal;
  END IF;
END $$;
