-- Fix the ensure_essential_account_mappings function to resolve ambiguity and use existing account_mappings system
CREATE OR REPLACE FUNCTION public.ensure_essential_account_mappings(company_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    result jsonb := '{"created": [], "existing": [], "errors": []}'::jsonb;
    essential_types text[] := ARRAY[
        'RECEIVABLES', 'PAYABLES', 'SALES_REVENUE', 'COST_OF_GOODS_SOLD', 
        'INVENTORY', 'CASH', 'BANK', 'VAT_PAYABLE', 'VAT_RECEIVABLE',
        'SALARY_EXPENSE', 'RENT_EXPENSE', 'UTILITIES_EXPENSE'
    ];
    type_name text;
    default_type_record record;
    suitable_account record;
    existing_mapping record;
    created_mappings text[] := ARRAY[]::text[];
    existing_mappings text[] := ARRAY[]::text[];
    error_types text[] := ARRAY[]::text[];
BEGIN
    -- Loop through each essential account type
    FOREACH type_name IN ARRAY essential_types LOOP
        -- Get the default account type record
        SELECT dat.id, dat.name, dat.name_ar, dat.category, dat.account_type
        INTO default_type_record
        FROM public.default_account_types dat
        WHERE dat.code = type_name
        LIMIT 1;
        
        IF default_type_record.id IS NULL THEN
            error_types := array_append(error_types, type_name || ' (نوع الحساب غير موجود)');
            CONTINUE;
        END IF;
        
        -- Check if mapping already exists
        SELECT am.id, dat.name
        INTO existing_mapping
        FROM public.account_mappings am
        JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
        WHERE am.company_id = company_id_param 
        AND am.default_account_type_id = default_type_record.id
        AND am.is_active = true
        LIMIT 1;
        
        IF existing_mapping.id IS NOT NULL THEN
            existing_mappings := array_append(existing_mappings, COALESCE(default_type_record.name_ar, default_type_record.name));
            CONTINUE;
        END IF;
        
        -- Find suitable account for this type
        SELECT coa.id, coa.account_name, coa.account_name_ar, coa.account_code
        INTO suitable_account
        FROM public.chart_of_accounts coa
        WHERE coa.company_id = company_id_param
        AND coa.is_active = true
        AND coa.is_header = false
        AND coa.account_level >= 3
        AND coa.account_type = default_type_record.account_type
        AND (
            -- Match based on account type patterns
            CASE type_name
                WHEN 'RECEIVABLES' THEN 
                    (coa.account_name ILIKE '%receivable%' OR coa.account_name ILIKE '%مدين%' OR coa.account_name ILIKE '%ذمم%' OR coa.account_code LIKE '112%')
                WHEN 'PAYABLES' THEN 
                    (coa.account_name ILIKE '%payable%' OR coa.account_name ILIKE '%دائن%' OR coa.account_name ILIKE '%موردين%' OR coa.account_code LIKE '211%')
                WHEN 'SALES_REVENUE' THEN 
                    (coa.account_name ILIKE '%sales%' OR coa.account_name ILIKE '%revenue%' OR coa.account_name ILIKE '%مبيعات%' OR coa.account_name ILIKE '%إيرادات%' OR coa.account_code LIKE '41%')
                WHEN 'COST_OF_GOODS_SOLD' THEN 
                    (coa.account_name ILIKE '%cost%' OR coa.account_name ILIKE '%cogs%' OR coa.account_name ILIKE '%تكلفة%' OR coa.account_code LIKE '51%')
                WHEN 'INVENTORY' THEN 
                    (coa.account_name ILIKE '%inventory%' OR coa.account_name ILIKE '%stock%' OR coa.account_name ILIKE '%مخزون%' OR coa.account_code LIKE '113%')
                WHEN 'CASH' THEN 
                    (coa.account_name ILIKE '%cash%' OR coa.account_name ILIKE '%نقد%' OR coa.account_code LIKE '111%')
                WHEN 'BANK' THEN 
                    (coa.account_name ILIKE '%bank%' OR coa.account_name ILIKE '%بنك%' OR coa.account_code LIKE '112%')
                WHEN 'VAT_PAYABLE' THEN 
                    (coa.account_name ILIKE '%vat%' OR coa.account_name ILIKE '%tax%' OR coa.account_name ILIKE '%ضريبة%' OR coa.account_name ILIKE '%قيمة مضافة%')
                WHEN 'VAT_RECEIVABLE' THEN 
                    (coa.account_name ILIKE '%vat%' OR coa.account_name ILIKE '%tax%' OR coa.account_name ILIKE '%ضريبة%' OR coa.account_name ILIKE '%قيمة مضافة%')
                WHEN 'SALARY_EXPENSE' THEN 
                    (coa.account_name ILIKE '%salary%' OR coa.account_name ILIKE '%wage%' OR coa.account_name ILIKE '%راتب%' OR coa.account_name ILIKE '%أجور%')
                WHEN 'RENT_EXPENSE' THEN 
                    (coa.account_name ILIKE '%rent%' OR coa.account_name ILIKE '%إيجار%')
                WHEN 'UTILITIES_EXPENSE' THEN 
                    (coa.account_name ILIKE '%utilities%' OR coa.account_name ILIKE '%electric%' OR coa.account_name ILIKE '%water%' OR coa.account_name ILIKE '%مرافق%')
                ELSE true
            END
        )
        ORDER BY 
            -- Prioritize accounts with better name matches
            CASE WHEN coa.account_name_ar IS NOT NULL THEN 1 ELSE 2 END,
            coa.account_level DESC,
            coa.account_code
        LIMIT 1;
        
        IF suitable_account.id IS NOT NULL THEN
            -- Create the mapping
            INSERT INTO public.account_mappings (
                company_id,
                default_account_type_id,
                chart_of_accounts_id,
                mapped_by,
                is_active
            ) VALUES (
                company_id_param,
                default_type_record.id,
                suitable_account.id,
                auth.uid(),
                true
            );
            
            created_mappings := array_append(created_mappings, COALESCE(default_type_record.name_ar, default_type_record.name));
        ELSE
            error_types := array_append(error_types, COALESCE(default_type_record.name_ar, default_type_record.name) || ' (لا يوجد حساب مناسب)');
        END IF;
    END LOOP;
    
    -- Build result
    result := jsonb_build_object(
        'created', to_jsonb(created_mappings),
        'existing', to_jsonb(existing_mappings),
        'errors', to_jsonb(error_types)
    );
    
    RETURN result;
END;
$function$;