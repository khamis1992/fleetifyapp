-- Add is_default column to cost_centers table
ALTER TABLE public.cost_centers 
ADD COLUMN is_default boolean DEFAULT false;

-- Add index for better performance
CREATE INDEX idx_cost_centers_is_default ON public.cost_centers(company_id, is_default) WHERE is_default = true;

-- Set the first cost center for each company as default if no default exists
UPDATE public.cost_centers 
SET is_default = true
WHERE id IN (
    SELECT DISTINCT ON (company_id) id
    FROM public.cost_centers
    WHERE company_id NOT IN (
        SELECT DISTINCT company_id 
        FROM public.cost_centers 
        WHERE is_default = true
    )
    ORDER BY company_id, created_at ASC
);