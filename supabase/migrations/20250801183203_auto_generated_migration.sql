-- Fix the ensure_essential_account_mappings function to use correct column reference
CREATE OR REPLACE FUNCTION public.ensure_essential_account_mappings(company_id_param uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    result jsonb := '{"created": [], "existing": [], "errors": []}'::jsonb;
    mapping_record RECORD;
    account_record RECORD;
    new_mapping_id uuid;
    essential_types text[] := ARRAY['RECEIVABLES', 'SALES_REVENUE', 'RENTAL_REVENUE', 'CASH', 'PAYABLES'];
    type_code text;
BEGIN
    -- Loop through essential account types
    FOREACH type_code IN ARRAY essential_types
    LOOP
        -- Check if mapping already exists
        SELECT COUNT(*) INTO mapping_record
        FROM public.account_mappings am
        JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
        WHERE am.company_id = company_id_param
        AND dat.type_code = type_code  -- Fixed: use type_code instead of account_type
        AND am.is_active = true;
        
        IF mapping_record.count > 0 THEN
            -- Mapping exists
            result := jsonb_set(result, '{existing}', 
                (result->'existing') || jsonb_build_array(type_code));
        ELSE
            -- Try to find a suitable account for this type
            CASE type_code
                WHEN 'RECEIVABLES' THEN
                    SELECT * INTO account_record
                    FROM public.chart_of_accounts
                    WHERE company_id = company_id_param
                    AND account_type = 'assets'
                    AND (account_name ILIKE '%receivable%' 
                         OR account_name ILIKE '%مدين%' 
                         OR account_name ILIKE '%ذمم%'
                         OR account_code LIKE '112%')
                    AND is_active = true
                    AND is_header = false
                    ORDER BY account_code
                    LIMIT 1;
                    
                WHEN 'SALES_REVENUE' THEN
                    SELECT * INTO account_record
                    FROM public.chart_of_accounts
                    WHERE company_id = company_id_param
                    AND account_type = 'revenue'
                    AND (account_name ILIKE '%sales%' 
                         OR account_name ILIKE '%مبيعات%'
                         OR account_code LIKE '4%')
                    AND is_active = true
                    AND is_header = false
                    ORDER BY account_code
                    LIMIT 1;
                    
                WHEN 'RENTAL_REVENUE' THEN
                    SELECT * INTO account_record
                    FROM public.chart_of_accounts
                    WHERE company_id = company_id_param
                    AND account_type = 'revenue'
                    AND (account_name ILIKE '%rental%' 
                         OR account_name ILIKE '%rent%'
                         OR account_name ILIKE '%إيجار%'
                         OR account_name ILIKE '%تأجير%'
                         OR account_code LIKE '41%')
                    AND is_active = true
                    AND is_header = false
                    ORDER BY account_code
                    LIMIT 1;
                    
                WHEN 'CASH' THEN
                    SELECT * INTO account_record
                    FROM public.chart_of_accounts
                    WHERE company_id = company_id_param
                    AND account_type = 'assets'
                    AND (account_name ILIKE '%cash%' 
                         OR account_name ILIKE '%نقد%'
                         OR account_code LIKE '11%')
                    AND is_active = true
                    AND is_header = false
                    ORDER BY account_code
                    LIMIT 1;
                    
                WHEN 'PAYABLES' THEN
                    SELECT * INTO account_record
                    FROM public.chart_of_accounts
                    WHERE company_id = company_id_param
                    AND account_type = 'liabilities'
                    AND (account_name ILIKE '%payable%' 
                         OR account_name ILIKE '%دائن%'
                         OR account_code LIKE '2%')
                    AND is_active = true
                    AND is_header = false
                    ORDER BY account_code
                    LIMIT 1;
                    
                ELSE
                    account_record := NULL;
            END CASE;
            
            IF account_record.id IS NOT NULL THEN
                -- Create the mapping
                SELECT id INTO new_mapping_id
                FROM public.default_account_types
                WHERE type_code = type_code  -- Fixed: use type_code instead of account_type
                LIMIT 1;
                
                IF new_mapping_id IS NOT NULL THEN
                    INSERT INTO public.account_mappings (
                        company_id,
                        default_account_type_id,
                        chart_of_accounts_id,
                        mapped_by,
                        is_active
                    ) VALUES (
                        company_id_param,
                        new_mapping_id,
                        account_record.id,
                        auth.uid(),
                        true
                    );
                    
                    result := jsonb_set(result, '{created}', 
                        (result->'created') || jsonb_build_array(type_code));
                ELSE
                    result := jsonb_set(result, '{errors}', 
                        (result->'errors') || jsonb_build_array('Default account type not found: ' || type_code));
                END IF;
            ELSE
                -- No suitable account found
                result := jsonb_set(result, '{errors}', 
                    (result->'errors') || jsonb_build_array('No suitable account found for: ' || type_code));
            END IF;
        END IF;
    END LOOP;
    
    RETURN result;
END;
$function$