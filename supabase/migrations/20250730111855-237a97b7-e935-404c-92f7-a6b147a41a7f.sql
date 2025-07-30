-- Create function to generate unique journal entry number
CREATE OR REPLACE FUNCTION public.generate_journal_entry_number(company_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    entry_count INTEGER;
    year_suffix TEXT;
    next_number TEXT;
BEGIN
    -- Get current year
    year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
    
    -- Count existing journal entries for this company in current year
    SELECT COUNT(*) + 1 INTO entry_count
    FROM public.journal_entries 
    WHERE company_id = company_id_param 
    AND EXTRACT(YEAR FROM entry_date) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Generate next available number
    LOOP
        next_number := 'JE-' || year_suffix || '-' || LPAD(entry_count::TEXT, 4, '0');
        
        -- Check if this number already exists
        IF NOT EXISTS (
            SELECT 1 FROM public.journal_entries 
            WHERE company_id = company_id_param 
            AND entry_number = next_number
        ) THEN
            EXIT; -- Number is unique, exit loop
        END IF;
        
        -- Increment and try next number
        entry_count := entry_count + 1;
    END LOOP;
    
    -- Return the unique journal entry number
    RETURN next_number;
END;
$$;