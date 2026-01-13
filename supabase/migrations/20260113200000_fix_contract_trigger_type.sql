-- ================================================================
-- Migration: Fix Contract Trigger Type (BEFORE → AFTER)
-- Created: 2026-01-13
-- Description: Change contract status trigger from BEFORE to AFTER
--              to fix "tuple already modified" error
-- ================================================================

-- First, drop the existing trigger if it exists
DROP TRIGGER IF EXISTS trg_update_vehicle_status ON contracts;
DROP TRIGGER IF EXISTS trigger_update_vehicle_status ON contracts;
DROP TRIGGER IF EXISTS update_vehicle_on_contract_change ON contracts;

-- Recreate as AFTER trigger
CREATE TRIGGER trg_update_vehicle_status_after
AFTER INSERT OR UPDATE OR DELETE ON contracts
FOR EACH ROW
EXECUTE FUNCTION update_vehicle_status_from_contract();

-- Also check and fix calculate_contract_amount trigger
DROP TRIGGER IF EXISTS trg_calculate_contract_amount ON contracts;
DROP TRIGGER IF EXISTS trigger_calculate_contract_amount ON contracts;

-- Recreate calculate trigger as BEFORE (this one should be BEFORE since it modifies NEW)
CREATE TRIGGER trg_calculate_contract_amount
BEFORE INSERT OR UPDATE ON contracts
FOR EACH ROW
EXECUTE FUNCTION trigger_calculate_contract_amount();

-- Add comment
COMMENT ON TRIGGER trg_update_vehicle_status_after ON contracts IS 
'AFTER trigger to update vehicle status when contract status changes. Uses AFTER to avoid tuple conflict.';

-- ================================================================
-- NOTIFY PostgREST to reload schema
-- ================================================================
NOTIFY pgrst, 'reload schema';
