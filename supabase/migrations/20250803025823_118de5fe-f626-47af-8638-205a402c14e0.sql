-- Make dispatch_permit_id nullable in vehicle_condition_reports table
-- This allows saving condition reports for contracts without dispatch permits
ALTER TABLE public.vehicle_condition_reports 
ALTER COLUMN dispatch_permit_id DROP NOT NULL;