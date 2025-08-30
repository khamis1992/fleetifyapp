-- Phase 4: Create function to ensure essential account mappings exist
CREATE OR REPLACE FUNCTION public.ensure_essential_account_mappings(company_id_param uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    result jsonb := '{"created": [], "existing": [], "errors": []}'::jsonb;
    essential_types text[] := ARRAY['RECEIVABLES', 'SALES_REVENUE', 'RENTAL_REVENUE', 'CASH'];
    type_name text;
    default_type_id uuid;
    suitable_account_id uuid;
    mapping_exists boolean;
BEGIN
    -- Loop through each essential account type
    FOREACH type_name IN ARRAY essential_types
    LOOP
        -- Check if mapping already exists
        SELECT EXISTS(
            SELECT 1 FROM public.account_mappings am
            JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
            WHERE am.company_id = company_id_param 
            AND dat.type_code = type_name
            AND am.is_active = true
        ) INTO mapping_exists;
        
        IF mapping_exists THEN
            result := jsonb_set(result, '{existing}', 
                result->'existing' || to_jsonb(type_name));
            CONTINUE;
        END IF;
        
        -- Get default account type ID
        SELECT id INTO default_type_id
        FROM public.default_account_types
        WHERE type_code = type_name
        LIMIT 1;
        
        IF default_type_id IS NULL THEN
            result := jsonb_set(result, '{errors}', 
                result->'errors' || to_jsonb('Default account type not found: ' || type_name));
            CONTINUE;
        END IF;
        
        -- Find suitable account using the same logic as get_mapped_account_id
        suitable_account_id := public.get_mapped_account_id(company_id_param, type_name);
        
        IF suitable_account_id IS NOT NULL THEN
            -- Create the mapping
            INSERT INTO public.account_mappings (
                company_id,
                default_account_type_id,
                chart_of_accounts_id,
                mapped_by,
                is_active
            ) VALUES (
                company_id_param,
                default_type_id,
                suitable_account_id,
                auth.uid(),
                true
            );
            
            result := jsonb_set(result, '{created}', 
                result->'created' || to_jsonb(type_name));
        ELSE
            result := jsonb_set(result, '{errors}', 
                result->'errors' || to_jsonb('No suitable account found for: ' || type_name));
        END IF;
    END LOOP;
    
    RETURN result;
END;
$function$;

-- Create default account types table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.default_account_types (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    type_code text NOT NULL UNIQUE,
    type_name text NOT NULL,
    type_name_ar text,
    category text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create default account types if they don't exist
INSERT INTO public.default_account_types (id, type_code, type_name, type_name_ar, category, description)
VALUES 
    (gen_random_uuid(), 'RECEIVABLES', 'Accounts Receivable', 'حسابات القبض', 'Assets', 'Customer receivables and outstanding invoices'),
    (gen_random_uuid(), 'SALES_REVENUE', 'Sales Revenue', 'إيرادات المبيعات', 'Revenue', 'Revenue from sales of goods and services'),
    (gen_random_uuid(), 'RENTAL_REVENUE', 'Rental Revenue', 'إيرادات الإيجار', 'Revenue', 'Revenue from rental and leasing activities'),
    (gen_random_uuid(), 'CASH', 'Cash and Cash Equivalents', 'النقد وما في حكمه', 'Assets', 'Cash accounts and bank deposits')
ON CONFLICT (type_code) DO NOTHING;