-- Add GPS and work time settings to companies table
ALTER TABLE public.companies 
ADD COLUMN office_latitude DECIMAL(10, 8),
ADD COLUMN office_longitude DECIMAL(11, 8),
ADD COLUMN allowed_radius INTEGER DEFAULT 100, -- radius in meters
ADD COLUMN work_start_time TIME DEFAULT '08:00:00',
ADD COLUMN work_end_time TIME DEFAULT '17:00:00',
ADD COLUMN auto_checkout_enabled BOOLEAN DEFAULT true;

-- Add GPS coordinates and auto checkout flag to attendance_records table
ALTER TABLE public.attendance_records
ADD COLUMN check_in_latitude DECIMAL(10, 8),
ADD COLUMN check_in_longitude DECIMAL(11, 8),
ADD COLUMN check_out_latitude DECIMAL(10, 8),
ADD COLUMN check_out_longitude DECIMAL(11, 8),
ADD COLUMN auto_checkout BOOLEAN DEFAULT false,
ADD COLUMN location_verified BOOLEAN DEFAULT false;