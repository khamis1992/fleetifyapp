-- Add police station and police report number fields to legal_cases table
ALTER TABLE public.legal_cases 
ADD COLUMN police_station text,
ADD COLUMN police_report_number text;