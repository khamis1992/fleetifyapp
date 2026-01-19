-- Migration: Add Visual Inspection Zones to Vehicle Inspections
-- Date: 2025-01-16
-- Description: Add visual_inspection_zones column to support interactive zone-based vehicle inspection

-- Add visual_inspection_zones column to store zone-based inspection data
ALTER TABLE vehicle_inspections
ADD COLUMN IF NOT EXISTS visual_inspection_zones JSONB DEFAULT '[]'::jsonb;

-- Add vehicle_type column to store the type of vehicle (sedan, SUV, truck)
ALTER TABLE vehicle_inspections
ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR DEFAULT 'sedan';

-- Add constraint to ensure vehicle_type is valid
ALTER TABLE vehicle_inspections
ADD CONSTRAINT vehicle_inspections_vehicle_type_check
CHECK (vehicle_type IN ('sedan', 'suv', 'truck'));

-- Add index for querying visual inspection zones
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_visual_zones
ON vehicle_inspections USING GIN (visual_inspection_zones);

-- Add index for vehicle_type queries
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_vehicle_type
ON vehicle_inspections (vehicle_type);

-- Add comment to document the new columns
COMMENT ON COLUMN vehicle_inspections.visual_inspection_zones IS 'Array of zone selections from visual inspection diagram. Each zone includes: zone_id, zone_name, zone_name_ar, category, condition, severity, description, photo_urls, marked_by, marked_at';

COMMENT ON COLUMN vehicle_inspections.vehicle_type IS 'Type of vehicle for visual inspection diagram: sedan, suv, or truck';

-- Update RLS policies to include the new columns
-- Note: Existing policies should cover these columns as they are part of the table

-- Create helper function to compare visual inspection zones
CREATE OR REPLACE FUNCTION compare_visual_zones(
  pickup_zones JSONB,
  return_zones JSONB
)
RETURNS TABLE(
  zone_id VARCHAR,
  zone_name VARCHAR,
  zone_name_ar VARCHAR,
  pickup_condition VARCHAR,
  return_condition VARCHAR,
  pickup_severity VARCHAR,
  return_severity VARCHAR,
  damage_status VARCHAR
)
LANGUAGE SQL
AS $$
  SELECT
    return_zone->>'zone_id' as zone_id,
    return_zone->>'zone_name' as zone_name,
    return_zone->>'zone_name_ar' as zone_name_ar,
    pickup_zone->>'condition' as pickup_condition,
    return_zone->>'condition' as return_condition,
    pickup_zone->>'severity' as pickup_severity,
    return_zone->>'severity' as return_severity,
    CASE
      WHEN pickup_zone IS NULL THEN 'new'
      WHEN (pickup_zone->>'condition') = 'clean' THEN 'new'
      WHEN pickup_zone->>'condition' IS DISTINCT FROM return_zone->>'condition' THEN 'changed'
      ELSE 'existing'
    END as damage_status
  FROM jsonb_array_elements(return_zones) return_zone
  LEFT JOIN jsonb_array_elements(pickup_zones) pickup_zone
    ON pickup_zone->>'zone_id' = return_zone->>'zone_id'
  WHERE return_zone->>'condition' IS DISTINCT FROM 'clean';
$$;

COMMENT ON FUNCTION compare_visual_zones IS 'Helper function to compare pickup and return visual inspection zones. Returns new, existing, or changed damages.';

-- Create view for inspection summary with visual zones
CREATE OR REPLACE VIEW vehicle_inspections_summary_with_visual AS
SELECT
  vi.id,
  vi.company_id,
  vi.contract_id,
  vi.vehicle_id,
  vi.inspection_type,
  vi.inspection_date,
  vi.inspection_time,
  vi.vehicle_type,
  vi.visual_inspection_zones,
  vi.fuel_level,
  vi.odometer_reading,
  vi.exterior_condition,
  vi.interior_condition,
  vi.mechanical_condition,
  vi.status,
  c.contract_number,
  v.vehicle_plate,
  v.make as vehicle_make,
  v.model as vehicle_model,
  p.display_name as inspector_name,
  jsonb_array_length(vi.visual_inspection_zones) as total_zones_marked,
  (SELECT count(*) FROM jsonb_array_elements(vi.visual_inspection_zones) WHERE value->>'condition' != 'clean') as damaged_zones_count
FROM vehicle_inspections vi
LEFT JOIN contracts c ON vi.contract_id = c.id
LEFT JOIN vehicles v ON vi.vehicle_id = v.id
LEFT JOIN profiles p ON vi.inspected_by = p.id;

COMMENT ON VIEW vehicle_inspections_summary_with_visual IS 'Summary view of vehicle inspections including visual zone data';

-- Create trigger to update vehicle_type based on vehicle data
CREATE OR REPLACE FUNCTION update_vehicle_type_from_vehicle()
RETURNS TRIGGER AS $$
BEGIN
  -- Update vehicle_type in inspections when vehicle changes
  -- This is a basic implementation - could be enhanced with actual vehicle type detection
  IF NEW.vehicle_id IS NOT NULL THEN
    -- Check if vehicle has type info, otherwise default to sedan
    NEW.vehicle_type := COALESCE(
      (SELECT vehicle_type FROM vehicles WHERE id = NEW.vehicle_id),
      'sedan'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Trigger not created by default to avoid overwriting manual vehicle_type selections
-- Uncomment the line below if you want automatic vehicle_type detection
-- CREATE TRIGGER trigger_update_vehicle_type
--   BEFORE INSERT ON vehicle_inspections
--   FOR EACH ROW
--   EXECUTE FUNCTION update_vehicle_type_from_vehicle();
