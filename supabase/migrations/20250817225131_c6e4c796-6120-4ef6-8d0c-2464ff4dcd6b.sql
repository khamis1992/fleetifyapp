-- Add missing damage_points column to vehicle_condition_reports table
ALTER TABLE public.vehicle_condition_reports 
ADD COLUMN IF NOT EXISTS damage_points JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.vehicle_condition_reports.damage_points IS 'Array of damage points with coordinates and type information from vehicle inspection drawing';