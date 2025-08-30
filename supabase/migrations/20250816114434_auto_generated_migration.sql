-- First, let's clean up any existing duplicate customers
-- Keep the oldest record for each duplicate group

-- Clean up national_id duplicates
WITH duplicates AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY company_id, national_id ORDER BY created_at ASC) as rn
    FROM public.customers 
    WHERE national_id IS NOT NULL AND national_id != ''
)
DELETE FROM public.customers 
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- Clean up passport_number duplicates
WITH duplicates AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY company_id, passport_number ORDER BY created_at ASC) as rn
    FROM public.customers 
    WHERE passport_number IS NOT NULL AND passport_number != ''
)
DELETE FROM public.customers 
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- Clean up phone duplicates
WITH duplicates AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY company_id, phone ORDER BY created_at ASC) as rn
    FROM public.customers 
    WHERE phone IS NOT NULL AND phone != ''
)
DELETE FROM public.customers 
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- Clean up email duplicates
WITH duplicates AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY company_id, email ORDER BY created_at ASC) as rn
    FROM public.customers 
    WHERE email IS NOT NULL AND email != ''
)
DELETE FROM public.customers 
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- Clean up company duplicates (company_name + commercial_register)
WITH duplicates AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY company_id, company_name, commercial_register ORDER BY created_at ASC) as rn
    FROM public.customers 
    WHERE customer_type = 'company' AND company_name IS NOT NULL AND commercial_register IS NOT NULL
)
DELETE FROM public.customers 
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- Now create unique constraints to prevent future duplicates
-- Note: Using partial unique indexes to handle NULL values properly

-- 1. Unique constraint for national_id per company (only for non-NULL values)
CREATE UNIQUE INDEX idx_customers_company_national_id_unique 
ON public.customers (company_id, national_id) 
WHERE national_id IS NOT NULL AND national_id != '';

-- 2. Unique constraint for passport_number per company (only for non-NULL values)
CREATE UNIQUE INDEX idx_customers_company_passport_unique 
ON public.customers (company_id, passport_number) 
WHERE passport_number IS NOT NULL AND passport_number != '';

-- 3. Unique constraint for phone per company
CREATE UNIQUE INDEX idx_customers_company_phone_unique 
ON public.customers (company_id, phone) 
WHERE phone IS NOT NULL AND phone != '';

-- 4. Unique constraint for email per company (only for non-NULL values)
CREATE UNIQUE INDEX idx_customers_company_email_unique 
ON public.customers (company_id, email) 
WHERE email IS NOT NULL AND email != '';

-- 5. Unique constraint for company customers (company_name + commercial_register)
CREATE UNIQUE INDEX idx_customers_company_business_unique 
ON public.customers (company_id, company_name, commercial_register) 
WHERE customer_type = 'company' AND company_name IS NOT NULL AND commercial_register IS NOT NULL;

-- Function to check for duplicate customers
CREATE OR REPLACE FUNCTION public.check_duplicate_customer(
    p_company_id UUID,
    p_customer_type TEXT,
    p_national_id TEXT DEFAULT NULL,
    p_passport_number TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_company_name TEXT DEFAULT NULL,
    p_commercial_register TEXT DEFAULT NULL,
    p_exclude_customer_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    duplicate_results JSONB := '{"has_duplicates": false, "duplicates": []}'::JSONB;
    duplicate_customer RECORD;
    duplicates_array JSONB := '[]'::JSONB;
BEGIN
    -- Check for duplicates based on national_id
    IF p_national_id IS NOT NULL AND p_national_id != '' THEN
        FOR duplicate_customer IN 
            SELECT id, first_name, last_name, company_name, customer_type, national_id, 'national_id' as duplicate_field
            FROM public.customers 
            WHERE company_id = p_company_id 
            AND national_id = p_national_id 
            AND is_active = true
            AND (p_exclude_customer_id IS NULL OR id != p_exclude_customer_id)
        LOOP
            duplicates_array := duplicates_array || jsonb_build_object(
                'id', duplicate_customer.id,
                'name', CASE 
                    WHEN duplicate_customer.customer_type = 'individual' 
                    THEN COALESCE(duplicate_customer.first_name, '') || ' ' || COALESCE(duplicate_customer.last_name, '')
                    ELSE duplicate_customer.company_name 
                END,
                'customer_type', duplicate_customer.customer_type,
                'duplicate_field', duplicate_customer.duplicate_field,
                'duplicate_value', duplicate_customer.national_id
            );
        END LOOP;
    END IF;

    -- Check for duplicates based on passport_number
    IF p_passport_number IS NOT NULL AND p_passport_number != '' THEN
        FOR duplicate_customer IN 
            SELECT id, first_name, last_name, company_name, customer_type, passport_number, 'passport_number' as duplicate_field
            FROM public.customers 
            WHERE company_id = p_company_id 
            AND passport_number = p_passport_number 
            AND is_active = true
            AND (p_exclude_customer_id IS NULL OR id != p_exclude_customer_id)
        LOOP
            duplicates_array := duplicates_array || jsonb_build_object(
                'id', duplicate_customer.id,
                'name', CASE 
                    WHEN duplicate_customer.customer_type = 'individual' 
                    THEN COALESCE(duplicate_customer.first_name, '') || ' ' || COALESCE(duplicate_customer.last_name, '')
                    ELSE duplicate_customer.company_name 
                END,
                'customer_type', duplicate_customer.customer_type,
                'duplicate_field', duplicate_customer.duplicate_field,
                'duplicate_value', duplicate_customer.passport_number
            );
        END LOOP;
    END IF;

    -- Check for duplicates based on phone
    IF p_phone IS NOT NULL AND p_phone != '' THEN
        FOR duplicate_customer IN 
            SELECT id, first_name, last_name, company_name, customer_type, phone, 'phone' as duplicate_field
            FROM public.customers 
            WHERE company_id = p_company_id 
            AND phone = p_phone 
            AND is_active = true
            AND (p_exclude_customer_id IS NULL OR id != p_exclude_customer_id)
        LOOP
            duplicates_array := duplicates_array || jsonb_build_object(
                'id', duplicate_customer.id,
                'name', CASE 
                    WHEN duplicate_customer.customer_type = 'individual' 
                    THEN COALESCE(duplicate_customer.first_name, '') || ' ' || COALESCE(duplicate_customer.last_name, '')
                    ELSE duplicate_customer.company_name 
                END,
                'customer_type', duplicate_customer.customer_type,
                'duplicate_field', duplicate_customer.duplicate_field,
                'duplicate_value', duplicate_customer.phone
            );
        END LOOP;
    END IF;

    -- Check for duplicates based on email
    IF p_email IS NOT NULL AND p_email != '' THEN
        FOR duplicate_customer IN 
            SELECT id, first_name, last_name, company_name, customer_type, email, 'email' as duplicate_field
            FROM public.customers 
            WHERE company_id = p_company_id 
            AND email = p_email 
            AND is_active = true
            AND (p_exclude_customer_id IS NULL OR id != p_exclude_customer_id)
        LOOP
            duplicates_array := duplicates_array || jsonb_build_object(
                'id', duplicate_customer.id,
                'name', CASE 
                    WHEN duplicate_customer.customer_type = 'individual' 
                    THEN COALESCE(duplicate_customer.first_name, '') || ' ' || COALESCE(duplicate_customer.last_name, '')
                    ELSE duplicate_customer.company_name 
                END,
                'customer_type', duplicate_customer.customer_type,
                'duplicate_field', duplicate_customer.duplicate_field,
                'duplicate_value', duplicate_customer.email
            );
        END LOOP;
    END IF;

    -- Check for company duplicates based on company_name + commercial_register
    IF p_customer_type = 'company' AND p_company_name IS NOT NULL AND p_commercial_register IS NOT NULL THEN
        FOR duplicate_customer IN 
            SELECT id, company_name, commercial_register, customer_type, 'company_details' as duplicate_field
            FROM public.customers 
            WHERE company_id = p_company_id 
            AND customer_type = 'company'
            AND company_name = p_company_name 
            AND commercial_register = p_commercial_register
            AND is_active = true
            AND (p_exclude_customer_id IS NULL OR id != p_exclude_customer_id)
        LOOP
            duplicates_array := duplicates_array || jsonb_build_object(
                'id', duplicate_customer.id,
                'name', duplicate_customer.company_name,
                'customer_type', duplicate_customer.customer_type,
                'duplicate_field', duplicate_customer.duplicate_field,
                'duplicate_value', duplicate_customer.company_name || ' (' || duplicate_customer.commercial_register || ')'
            );
        END LOOP;
    END IF;

    -- Build final result
    IF jsonb_array_length(duplicates_array) > 0 THEN
        duplicate_results := jsonb_build_object(
            'has_duplicates', true,
            'duplicates', duplicates_array,
            'count', jsonb_array_length(duplicates_array)
        );
    END IF;

    RETURN duplicate_results;
END;
$$;