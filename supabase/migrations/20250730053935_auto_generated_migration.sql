-- Add asset_id and employee_id columns to journal_entry_lines table
ALTER TABLE public.journal_entry_lines 
ADD COLUMN asset_id UUID,
ADD COLUMN employee_id UUID;

-- Add foreign key constraints
ALTER TABLE public.journal_entry_lines 
ADD CONSTRAINT fk_journal_entry_lines_asset 
FOREIGN KEY (asset_id) REFERENCES public.fixed_assets(id);

ALTER TABLE public.journal_entry_lines 
ADD CONSTRAINT fk_journal_entry_lines_employee 
FOREIGN KEY (employee_id) REFERENCES public.employees(id);

-- Create indexes for better performance
CREATE INDEX idx_journal_entry_lines_asset_id ON public.journal_entry_lines(asset_id);
CREATE INDEX idx_journal_entry_lines_employee_id ON public.journal_entry_lines(employee_id);

-- Modify line_description to allow longer descriptions
ALTER TABLE public.journal_entry_lines 
ALTER COLUMN line_description TYPE TEXT;