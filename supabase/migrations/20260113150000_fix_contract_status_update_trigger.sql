-- ================================================================
-- Migration: Fix Contract Status Update Trigger
-- Created: 2026-01-13
-- Description: Fix the trigger that causes "tuple already modified" error
--              when changing contract status from cancelled to active
-- Issue: NULL value comparisons in trigger conditions
-- ================================================================

-- Drop and recreate the trigger function with proper NULL handling
CREATE OR REPLACE FUNCTION trigger_calculate_contract_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_duration_days INTEGER;
  v_duration_months DECIMAL(10,2);
BEGIN
  -- Only recalculate if monthly_amount, start_date, or end_date changed
  -- Use IS DISTINCT FROM to properly handle NULL comparisons
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (
       NEW.monthly_amount IS DISTINCT FROM OLD.monthly_amount OR
       NEW.start_date IS DISTINCT FROM OLD.start_date OR
       NEW.end_date IS DISTINCT FROM OLD.end_date
     )) THEN
    
    -- Only calculate if we have valid dates
    IF NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL THEN
      -- Calculate duration
      v_duration_days := NEW.end_date - NEW.start_date;
      v_duration_months := ROUND(v_duration_days::DECIMAL / 30, 2);
      
      IF v_duration_months < 1 THEN
        v_duration_months := 1;
      END IF;

      -- Auto-calculate contract_amount only if monthly_amount is set
      IF NEW.monthly_amount IS NOT NULL AND NEW.monthly_amount > 0 THEN
        NEW.contract_amount := NEW.monthly_amount * v_duration_months;
        
        RAISE NOTICE 'Auto-calculated contract amount: % (% months × %)',
          NEW.contract_amount, v_duration_months, NEW.monthly_amount;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Also fix the vehicle status trigger to handle edge cases
CREATE OR REPLACE FUNCTION public.update_vehicle_status_from_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Skip if no vehicle is linked
    IF TG_OP = 'INSERT' THEN
        IF NEW.vehicle_id IS NOT NULL THEN
            UPDATE vehicles 
            SET status = CASE 
                WHEN NEW.status = 'active' THEN 'rented'::vehicle_status
                WHEN NEW.status = 'draft' THEN 'reserved'::vehicle_status
                ELSE status
            END
            WHERE id = NEW.vehicle_id
              AND status IS DISTINCT FROM CASE 
                WHEN NEW.status = 'active' THEN 'rented'::vehicle_status
                WHEN NEW.status = 'draft' THEN 'reserved'::vehicle_status
                ELSE status
              END;
        END IF;
        RETURN NEW;
    END IF;
    
    -- Handle UPDATE
    IF TG_OP = 'UPDATE' THEN
        -- Skip if status hasn't changed
        IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
            RETURN NEW;
        END IF;
        
        -- Skip if no vehicle is linked
        IF NEW.vehicle_id IS NULL THEN
            RETURN NEW;
        END IF;
        
        -- Update vehicle status based on contract status change
        IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
            -- Contract cancelled - make vehicle available
            UPDATE vehicles 
            SET status = 'available'::vehicle_status
            WHERE id = NEW.vehicle_id
              AND status != 'available'::vehicle_status;
              
        ELSIF NEW.status = 'active' AND OLD.status IS DISTINCT FROM 'active' THEN
            -- Contract activated - make vehicle rented
            UPDATE vehicles 
            SET status = 'rented'::vehicle_status
            WHERE id = NEW.vehicle_id
              AND status != 'rented'::vehicle_status;
              
        ELSIF NEW.status = 'under_review' AND OLD.status IS DISTINCT FROM 'under_review' THEN
            -- Contract under review - make vehicle reserved
            UPDATE vehicles 
            SET status = 'reserved'::vehicle_status
            WHERE id = NEW.vehicle_id
              AND status != 'reserved'::vehicle_status;
              
        ELSIF NEW.status = 'suspended' AND OLD.status IS DISTINCT FROM 'suspended' THEN
            -- Contract suspended - keep vehicle as reserved
            UPDATE vehicles 
            SET status = 'reserved'::vehicle_status
            WHERE id = NEW.vehicle_id
              AND status != 'reserved'::vehicle_status;
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        IF OLD.vehicle_id IS NOT NULL THEN
            UPDATE vehicles 
            SET status = 'available'::vehicle_status
            WHERE id = OLD.vehicle_id
              AND status != 'available'::vehicle_status;
        END IF;
        RETURN OLD;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Add comments
COMMENT ON FUNCTION trigger_calculate_contract_amount IS 
'Auto-trigger to calculate contract amount on insert/update. Uses IS DISTINCT FROM for proper NULL handling.';

COMMENT ON FUNCTION update_vehicle_status_from_contract IS 
'Updates vehicle status when contract status changes. Includes guards to prevent redundant updates.';

-- ================================================================
-- NOTIFY PostgREST to reload schema
-- ================================================================
NOTIFY pgrst, 'reload schema';
