-- Add new vehicle statuses to enum
ALTER TYPE public.vehicle_status ADD VALUE IF NOT EXISTS 'accident';
ALTER TYPE public.vehicle_status ADD VALUE IF NOT EXISTS 'stolen';
ALTER TYPE public.vehicle_status ADD VALUE IF NOT EXISTS 'police_station';