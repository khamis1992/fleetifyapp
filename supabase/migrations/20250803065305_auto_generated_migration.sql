-- Add minimum rental price columns to vehicles table
ALTER TABLE public.vehicles 
ADD COLUMN minimum_rental_price numeric(10,3) DEFAULT 0,
ADD COLUMN enforce_minimum_price boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.vehicles.minimum_rental_price IS 'Minimum rental price that cannot be violated when enforce_minimum_price is true';
COMMENT ON COLUMN public.vehicles.enforce_minimum_price IS 'Whether to enforce the minimum rental price during contract creation';