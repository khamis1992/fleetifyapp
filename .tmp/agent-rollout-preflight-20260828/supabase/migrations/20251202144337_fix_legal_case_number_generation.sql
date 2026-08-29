
-- إصلاح دالة توليد أرقام القضايا لتجنب التكرار
CREATE OR REPLACE FUNCTION generate_legal_case_number(company_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    max_number INTEGER;
    year_suffix TEXT;
    new_case_number TEXT;
BEGIN
    -- Get current year
    year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
    
    -- Get the maximum case number for current year (regardless of company)
    SELECT COALESCE(
        MAX(
            CASE 
                WHEN case_number ~ ('^CASE-' || year_suffix || '-[0-9]{4}$')
                THEN CAST(SUBSTRING(case_number FROM 'CASE-' || year_suffix || '-([0-9]{4})') AS INTEGER)
                ELSE 0
            END
        ),
        0
    ) INTO max_number
    FROM public.legal_cases
    WHERE case_number LIKE 'CASE-' || year_suffix || '-%';
    
    -- Generate new case number
    new_case_number := 'CASE-' || year_suffix || '-' || LPAD((max_number + 1)::TEXT, 4, '0');
    
    -- Verify uniqueness (in case of race condition)
    WHILE EXISTS (SELECT 1 FROM public.legal_cases WHERE case_number = new_case_number) LOOP
        max_number := max_number + 1;
        new_case_number := 'CASE-' || year_suffix || '-' || LPAD((max_number + 1)::TEXT, 4, '0');
    END LOOP;
    
    RETURN new_case_number;
END;
$$;
;
