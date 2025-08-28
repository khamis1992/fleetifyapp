-- Fix the check_duplicate_customer function to properly handle excludeCustomerId
DROP FUNCTION IF EXISTS public.check_duplicate_customer(uuid, text, text, text, text, text, text, text, uuid);

CREATE OR REPLACE FUNCTION public.check_duplicate_customer(
    p_company_id uuid,
    p_customer_type text,
    p_national_id text DEFAULT NULL,
    p_passport_number text DEFAULT NULL,
    p_phone text DEFAULT NULL,
    p_email text DEFAULT NULL,
    p_company_name text DEFAULT NULL,
    p_commercial_register text DEFAULT NULL,
    p_exclude_customer_id uuid DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    duplicate_records json[] := '{}';
    total_count integer := 0;
    current_record record;
    duplicate_field text;
    duplicate_value text;
BEGIN
    -- Log the input parameters for debugging
    RAISE NOTICE 'check_duplicate_customer called with: company_id=%, type=%, national_id=%, phone=%, email=%, exclude_id=%', 
        p_company_id, p_customer_type, p_national_id, p_phone, p_email, p_exclude_customer_id;

    -- Check for national_id duplicates
    IF p_national_id IS NOT NULL AND p_national_id != '' THEN
        FOR current_record IN 
            SELECT id, first_name, last_name, company_name, customer_type, company_id
            FROM customers 
            WHERE company_id = p_company_id 
                AND national_id = p_national_id 
                AND (p_exclude_customer_id IS NULL OR id != p_exclude_customer_id)
                AND is_active = true
        LOOP
            total_count := total_count + 1;
            duplicate_records := duplicate_records || json_build_object(
                'id', current_record.id,
                'name', CASE 
                    WHEN current_record.customer_type = 'individual' 
                    THEN COALESCE(current_record.first_name, '') || ' ' || COALESCE(current_record.last_name, '')
                    ELSE COALESCE(current_record.company_name, '')
                END,
                'customer_type', current_record.customer_type,
                'duplicate_field', 'national_id',
                'duplicate_value', p_national_id,
                'company_id', current_record.company_id
            );
        END LOOP;
    END IF;

    -- Check for passport_number duplicates
    IF p_passport_number IS NOT NULL AND p_passport_number != '' THEN
        FOR current_record IN 
            SELECT id, first_name, last_name, company_name, customer_type, company_id
            FROM customers 
            WHERE company_id = p_company_id 
                AND passport_number = p_passport_number 
                AND (p_exclude_customer_id IS NULL OR id != p_exclude_customer_id)
                AND is_active = true
        LOOP
            total_count := total_count + 1;
            duplicate_records := duplicate_records || json_build_object(
                'id', current_record.id,
                'name', CASE 
                    WHEN current_record.customer_type = 'individual' 
                    THEN COALESCE(current_record.first_name, '') || ' ' || COALESCE(current_record.last_name, '')
                    ELSE COALESCE(current_record.company_name, '')
                END,
                'customer_type', current_record.customer_type,
                'duplicate_field', 'passport_number',
                'duplicate_value', p_passport_number,
                'company_id', current_record.company_id
            );
        END LOOP;
    END IF;

    -- Check for phone duplicates
    IF p_phone IS NOT NULL AND p_phone != '' THEN
        FOR current_record IN 
            SELECT id, first_name, last_name, company_name, customer_type, company_id
            FROM customers 
            WHERE company_id = p_company_id 
                AND phone = p_phone 
                AND (p_exclude_customer_id IS NULL OR id != p_exclude_customer_id)
                AND is_active = true
        LOOP
            total_count := total_count + 1;
            duplicate_records := duplicate_records || json_build_object(
                'id', current_record.id,
                'name', CASE 
                    WHEN current_record.customer_type = 'individual' 
                    THEN COALESCE(current_record.first_name, '') || ' ' || COALESCE(current_record.last_name, '')
                    ELSE COALESCE(current_record.company_name, '')
                END,
                'customer_type', current_record.customer_type,
                'duplicate_field', 'phone',
                'duplicate_value', p_phone,
                'company_id', current_record.company_id
            );
        END LOOP;
    END IF;

    -- Check for email duplicates
    IF p_email IS NOT NULL AND p_email != '' THEN
        FOR current_record IN 
            SELECT id, first_name, last_name, company_name, customer_type, company_id
            FROM customers 
            WHERE company_id = p_company_id 
                AND email = p_email 
                AND (p_exclude_customer_id IS NULL OR id != p_exclude_customer_id)
                AND is_active = true
        LOOP
            total_count := total_count + 1;
            duplicate_records := duplicate_records || json_build_object(
                'id', current_record.id,
                'name', CASE 
                    WHEN current_record.customer_type = 'individual' 
                    THEN COALESCE(current_record.first_name, '') || ' ' || COALESCE(current_record.last_name, '')
                    ELSE COALESCE(current_record.company_name, '')
                END,
                'customer_type', current_record.customer_type,
                'duplicate_field', 'email',
                'duplicate_value', p_email,
                'company_id', current_record.company_id
            );
        END LOOP;
    END IF;

    -- Check for company name duplicates (for corporate customers)
    IF p_customer_type = 'corporate' AND p_company_name IS NOT NULL AND p_company_name != '' THEN
        FOR current_record IN 
            SELECT id, first_name, last_name, company_name, customer_type, company_id
            FROM customers 
            WHERE company_id = p_company_id 
                AND customer_type = 'corporate'
                AND company_name = p_company_name 
                AND (p_exclude_customer_id IS NULL OR id != p_exclude_customer_id)
                AND is_active = true
        LOOP
            total_count := total_count + 1;
            duplicate_records := duplicate_records || json_build_object(
                'id', current_record.id,
                'name', COALESCE(current_record.company_name, ''),
                'customer_type', current_record.customer_type,
                'duplicate_field', 'company_name',
                'duplicate_value', p_company_name,
                'company_id', current_record.company_id
            );
        END LOOP;
    END IF;

    -- Check for commercial register duplicates (for corporate customers)
    IF p_customer_type = 'corporate' AND p_commercial_register IS NOT NULL AND p_commercial_register != '' THEN
        FOR current_record IN 
            SELECT id, first_name, last_name, company_name, customer_type, company_id
            FROM customers 
            WHERE company_id = p_company_id 
                AND customer_type = 'corporate'
                AND commercial_register = p_commercial_register 
                AND (p_exclude_customer_id IS NULL OR id != p_exclude_customer_id)
                AND is_active = true
        LOOP
            total_count := total_count + 1;
            duplicate_records := duplicate_records || json_build_object(
                'id', current_record.id,
                'name', COALESCE(current_record.company_name, ''),
                'customer_type', current_record.customer_type,
                'duplicate_field', 'commercial_register',
                'duplicate_value', p_commercial_register,
                'company_id', current_record.company_id
            );
        END LOOP;
    END IF;

    -- Log the results for debugging
    RAISE NOTICE 'check_duplicate_customer results: found % duplicates', total_count;

    -- Return the results
    RETURN json_build_object(
        'has_duplicates', total_count > 0,
        'count', total_count,
        'duplicates', duplicate_records
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in check_duplicate_customer: %', SQLERRM;
        RETURN json_build_object(
            'has_duplicates', false,
            'count', 0,
            'duplicates', ARRAY[]::json[],
            'error', SQLERRM
        );
END;
$$;