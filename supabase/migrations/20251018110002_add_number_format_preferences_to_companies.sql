-- Add number format preferences column to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS number_format_preferences JSONB DEFAULT '{"useArabicDigits": false, "locale": "en-US", "minimumFractionDigits": 0, "maximumFractionDigits": 3}'::jsonb;

-- Add comment
COMMENT ON COLUMN public.companies.number_format_preferences IS 'Company-specific number formatting preferences';