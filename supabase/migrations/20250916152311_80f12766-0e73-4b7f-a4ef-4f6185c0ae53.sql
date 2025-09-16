-- Update copy_default_cost_centers_to_company function to handle duplicates gracefully
CREATE OR REPLACE FUNCTION public.copy_default_cost_centers_to_company(target_company_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    default_centers RECORD;
    inserted_count INTEGER := 0;
    updated_count INTEGER := 0;
    existing_count INTEGER := 0;
    total_processed INTEGER := 0;
BEGIN
    -- Loop through default cost centers and upsert them
    FOR default_centers IN 
        SELECT center_code, center_name, center_name_ar, description, is_active
        FROM cost_centers 
        WHERE company_id IS NULL 
        AND is_active = true
    LOOP
        total_processed := total_processed + 1;
        
        -- Check if cost center already exists
        IF EXISTS (
            SELECT 1 FROM cost_centers 
            WHERE company_id = target_company_id 
            AND center_code = default_centers.center_code
        ) THEN
            -- Update existing cost center
            UPDATE cost_centers 
            SET 
                center_name = default_centers.center_name,
                center_name_ar = default_centers.center_name_ar,
                description = default_centers.description,
                is_active = default_centers.is_active,
                updated_at = now()
            WHERE company_id = target_company_id 
            AND center_code = default_centers.center_code;
            
            IF FOUND THEN
                updated_count := updated_count + 1;
            ELSE
                existing_count := existing_count + 1;
            END IF;
        ELSE
            -- Insert new cost center
            INSERT INTO cost_centers (
                company_id, 
                center_code, 
                center_name, 
                center_name_ar, 
                description, 
                is_active
            ) VALUES (
                target_company_id,
                default_centers.center_code,
                default_centers.center_name,
                default_centers.center_name_ar,
                default_centers.description,
                default_centers.is_active
            );
            
            inserted_count := inserted_count + 1;
        END IF;
    END LOOP;
    
    -- Return detailed results
    RETURN jsonb_build_object(
        'success', true,
        'total_processed', total_processed,
        'inserted', inserted_count,
        'updated', updated_count,
        'existing', existing_count,
        'message', 
        CASE 
            WHEN inserted_count > 0 THEN 'تم نسخ ' || inserted_count || ' مراكز تكلفة جديدة'
            WHEN updated_count > 0 THEN 'تم تحديث ' || updated_count || ' مراكز تكلفة موجودة'
            ELSE 'جميع مراكز التكلفة موجودة مسبقاً'
        END
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'total_processed', total_processed,
            'inserted', inserted_count,
            'updated', updated_count
        );
END;
$function$;