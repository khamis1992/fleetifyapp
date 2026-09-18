-- Helper functions for updating customers and contracts from JSON
CREATE OR REPLACE FUNCTION normalize_phone(phone_input TEXT)
RETURNS TEXT AS $$
BEGIN
    IF phone_input IS NULL OR phone_input = '' THEN
        RETURN NULL;
    END IF;
    RETURN regexp_replace(phone_input, '[^0-9]', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION normalize_plate(plate_input TEXT)
RETURNS TEXT AS $$
BEGIN
    IF plate_input IS NULL OR plate_input = '' THEN
        RETURN NULL;
    END IF;
    RETURN UPPER(TRIM(REGEXP_REPLACE(plate_input, '\s+', ' ', 'g')));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION parse_date(date_input TEXT)
RETURNS DATE AS $$
DECLARE
    parsed_date DATE;
BEGIN
    IF date_input IS NULL OR date_input = '' OR date_input = '-' OR date_input = ' ' THEN
        RETURN NULL;
    END IF;
    
    BEGIN
        parsed_date := TO_DATE(date_input, 'DD/MM/YYYY');
        RETURN parsed_date;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        parsed_date := TO_DATE(date_input, 'DD-MM-YYYY');
        RETURN parsed_date;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        parsed_date := TO_DATE(date_input, 'YYYY-MM-DD');
        RETURN parsed_date;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

GRANT EXECUTE ON FUNCTION normalize_phone(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION normalize_plate(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION parse_date(TEXT) TO authenticated;
;
