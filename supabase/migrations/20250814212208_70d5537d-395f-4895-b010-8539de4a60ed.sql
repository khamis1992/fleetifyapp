-- Add separate minimum rate columns to vehicles table
ALTER TABLE public.vehicles 
ADD COLUMN minimum_daily_rate NUMERIC(10,3) DEFAULT NULL,
ADD COLUMN minimum_weekly_rate NUMERIC(10,3) DEFAULT NULL,
ADD COLUMN minimum_monthly_rate NUMERIC(10,3) DEFAULT NULL;

-- Add comments for clarity
COMMENT ON COLUMN public.vehicles.minimum_daily_rate IS 'الحد الأدنى للسعر اليومي';
COMMENT ON COLUMN public.vehicles.minimum_weekly_rate IS 'الحد الأدنى للسعر الأسبوعي';
COMMENT ON COLUMN public.vehicles.minimum_monthly_rate IS 'الحد الأدنى للسعر الشهري';