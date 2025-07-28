-- Add sidebar color fields to company_branding_settings table
ALTER TABLE public.company_branding_settings 
ADD COLUMN sidebar_background_color text DEFAULT '#ffffff',
ADD COLUMN sidebar_foreground_color text DEFAULT '#1f2937', 
ADD COLUMN sidebar_accent_color text DEFAULT '#2563eb',
ADD COLUMN sidebar_border_color text DEFAULT '#e5e7eb';