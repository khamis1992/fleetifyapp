-- Add default coordinates to companies that don't have them
UPDATE public.companies 
SET 
  office_latitude = 29.3759,  -- Kuwait City default coordinates
  office_longitude = 47.9774,
  allowed_radius = 100
WHERE office_latitude IS NULL OR office_longitude IS NULL;