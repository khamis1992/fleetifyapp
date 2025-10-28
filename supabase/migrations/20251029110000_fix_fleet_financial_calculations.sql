-- ================================================================
-- FIX FLEET FINANCIAL ANALYSIS - CALCULATE REAL NUMBERS
-- ================================================================
-- Creates functions to calculate and update vehicle financial metrics
-- ================================================================

-- ================================================================
-- FUNCTION 1: Calculate Total Costs for Single Vehicle
-- ================================================================
CREATE OR REPLACE FUNCTION calculate_vehicle_total_costs(vehicle_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_maintenance DECIMAL(15,3) := 0;
  v_total_insurance DECIMAL(15,3) := 0;
  v_total_operating DECIMAL(15,3) := 0;
  v_revenue_generated DECIMAL(15,3) := 0;
BEGIN
  -- Calculate total maintenance cost
  SELECT COALESCE(SUM(actual_cost), 0)
  INTO v_total_maintenance
  FROM vehicle_maintenance
  WHERE vehicle_id = vehicle_id_param
    AND status IN ('completed', 'approved');

  -- Calculate total insurance cost (if you have insurance records)
  -- For now, we'll set it to 0 or get from vehicle_insurance table if exists
  SELECT COALESCE(SUM(premium_amount), 0)
  INTO v_total_insurance
  FROM vehicle_insurance
  WHERE vehicle_id = vehicle_id_param
    AND status = 'active';

  -- Calculate revenue from contracts
  SELECT COALESCE(SUM(monthly_amount), 0)
  INTO v_revenue_generated
  FROM contracts
  WHERE vehicle_id = vehicle_id_param
    AND status IN ('active', 'completed');

  -- Total operating cost = maintenance + insurance + other costs
  v_total_operating := v_total_maintenance + v_total_insurance;

  -- Update vehicle record
  UPDATE vehicles
  SET 
    total_maintenance_cost = v_total_maintenance,
    total_insurance_cost = v_total_insurance,
    total_operating_cost = v_total_operating,
    updated_at = NOW()
  WHERE id = vehicle_id_param;

  RAISE NOTICE 'Updated vehicle %: Maintenance=%, Insurance=%, Operating=%, Revenue=%',
    vehicle_id_param, v_total_maintenance, v_total_insurance, v_total_operating, v_revenue_generated;
END;
$$;

-- ================================================================
-- FUNCTION 2: Calculate Costs for All Vehicles in Company
-- ================================================================
CREATE OR REPLACE FUNCTION calculate_all_vehicle_costs(company_id_param UUID)
RETURNS TABLE (
  vehicle_id UUID,
  plate_number VARCHAR(50),
  maintenance_cost DECIMAL(15,3),
  insurance_cost DECIMAL(15,3),
  operating_cost DECIMAL(15,3),
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vehicle RECORD;
  v_count INTEGER := 0;
  v_errors INTEGER := 0;
BEGIN
  RAISE NOTICE '🚀 Starting cost calculation for company: %', company_id_param;

  -- Loop through all active vehicles
  FOR v_vehicle IN
    SELECT id, plate_number
    FROM vehicles
    WHERE company_id = company_id_param
      AND is_active = true
    ORDER BY plate_number
  LOOP
    BEGIN
      -- Calculate costs for this vehicle
      PERFORM calculate_vehicle_total_costs(v_vehicle.id);
      v_count := v_count + 1;

      -- Return success row
      RETURN QUERY SELECT 
        v_vehicle.id,
        v_vehicle.plate_number,
        (SELECT total_maintenance_cost FROM vehicles WHERE id = v_vehicle.id),
        (SELECT total_insurance_cost FROM vehicles WHERE id = v_vehicle.id),
        (SELECT total_operating_cost FROM vehicles WHERE id = v_vehicle.id),
        'success'::TEXT;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      RAISE WARNING 'Failed to calculate costs for vehicle %: %', v_vehicle.plate_number, SQLERRM;
      
      -- Return error row
      RETURN QUERY SELECT 
        v_vehicle.id,
        v_vehicle.plate_number,
        0::DECIMAL(15,3),
        0::DECIMAL(15,3),
        0::DECIMAL(15,3),
        ('error: ' || SQLERRM)::TEXT;
    END;
  END LOOP;

  RAISE NOTICE '✅ Completed: % vehicles processed, % errors', v_count, v_errors;
END;
$$;

-- ================================================================
-- FUNCTION 3: Ensure Required Columns Exist
-- ================================================================
DO $$
BEGIN
  -- Add total_maintenance_cost if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'total_maintenance_cost'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN total_maintenance_cost DECIMAL(15,3) DEFAULT 0;
    RAISE NOTICE 'Added column: total_maintenance_cost';
  END IF;

  -- Add total_insurance_cost if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'total_insurance_cost'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN total_insurance_cost DECIMAL(15,3) DEFAULT 0;
    RAISE NOTICE 'Added column: total_insurance_cost';
  END IF;

  -- Add total_operating_cost if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'total_operating_cost'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN total_operating_cost DECIMAL(15,3) DEFAULT 0;
    RAISE NOTICE 'Added column: total_operating_cost';
  END IF;

  -- Add accumulated_depreciation if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'accumulated_depreciation'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN accumulated_depreciation DECIMAL(15,3) DEFAULT 0;
    RAISE NOTICE 'Added column: accumulated_depreciation';
  END IF;

  RAISE NOTICE '✅ All required columns verified/created';
END $$;

-- ================================================================
-- GRANT PERMISSIONS
-- ================================================================
GRANT EXECUTE ON FUNCTION calculate_vehicle_total_costs(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_all_vehicle_costs(UUID) TO authenticated;

-- ================================================================
-- COMMENTS
-- ================================================================
COMMENT ON FUNCTION calculate_vehicle_total_costs IS 'Calculates and updates total costs for a single vehicle';
COMMENT ON FUNCTION calculate_all_vehicle_costs IS 'Calculates costs for all active vehicles in a company';

-- ================================================================
-- USAGE INSTRUCTIONS
-- ================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '✅ FLEET FINANCIAL CALCULATIONS SYSTEM INSTALLED';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 TO FIX ZERO NUMBERS - RUN THIS NOW:';
  RAISE NOTICE '';
  RAISE NOTICE '   SELECT * FROM calculate_all_vehicle_costs(''your-company-id'');';
  RAISE NOTICE '';
  RAISE NOTICE 'This will calculate:';
  RAISE NOTICE '   - Total maintenance costs from vehicle_maintenance table';
  RAISE NOTICE '   - Total insurance costs from vehicle_insurance table';
  RAISE NOTICE '   - Total operating costs (sum of above)';
  RAISE NOTICE '   - Revenue generated from contracts';
  RAISE NOTICE '';
  RAISE NOTICE '📊 The numbers will be stored in vehicles table and used by:';
  RAISE NOTICE '   - Fleet Financial Analysis page';
  RAISE NOTICE '   - Financial reports';
  RAISE NOTICE '   - Dashboard widgets';
  RAISE NOTICE '';
  RAISE NOTICE '⚙️ AUTOMATIC UPDATES:';
  RAISE NOTICE '   Run calculate_all_vehicle_costs() monthly or after major changes';
  RAISE NOTICE '====================================================================';
END $$;

