-- إضافة عمود created_by إلى جدول cost_centers
ALTER TABLE public.cost_centers 
ADD COLUMN IF NOT EXISTS created_by uuid;

-- إضافة عمود created_by إلى جدول customers  
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS created_by uuid;

-- تحديث دالة get_customer_default_cost_center لإصلاح المشكلة
CREATE OR REPLACE FUNCTION public.get_customer_default_cost_center(customer_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    customer_record RECORD;
    cost_center_id uuid;
    center_code text;
    center_name text;
    current_user_id uuid;
BEGIN
    -- الحصول على معرف المستخدم الحالي
    current_user_id := auth.uid();
    
    -- Get customer info
    SELECT * INTO customer_record
    FROM public.customers
    WHERE id = customer_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer not found';
    END IF;
    
    -- Check if customer already has a default cost center
    IF customer_record.default_cost_center_id IS NOT NULL THEN
        -- Verify the cost center still exists and is active
        SELECT id INTO cost_center_id
        FROM public.cost_centers
        WHERE id = customer_record.default_cost_center_id
        AND is_active = true;
        
        IF cost_center_id IS NOT NULL THEN
            RETURN cost_center_id;
        END IF;
    END IF;
    
    -- Create cost center code and name based on customer
    IF customer_record.customer_type = 'individual' THEN
        center_code := 'CUST-' || UPPER(LEFT(COALESCE(customer_record.first_name, 'CUSTOMER'), 3)) || '-' || SUBSTRING(customer_record.id::text, 1, 8);
        center_name := COALESCE(customer_record.first_name || ' ' || customer_record.last_name, 'Customer Center');
    ELSE
        center_code := 'COMP-' || UPPER(LEFT(COALESCE(customer_record.company_name, 'COMPANY'), 3)) || '-' || SUBSTRING(customer_record.id::text, 1, 8);
        center_name := COALESCE(customer_record.company_name, 'Company Center');
    END IF;
    
    -- Create new cost center for the customer
    INSERT INTO public.cost_centers (
        company_id,
        center_code,
        center_name,
        center_name_ar,
        description,
        is_active,
        created_by
    ) VALUES (
        customer_record.company_id,
        center_code,
        center_name,
        center_name,
        'Auto-created cost center for customer: ' || center_name,
        true,
        COALESCE(customer_record.created_by, current_user_id)
    ) RETURNING id INTO cost_center_id;
    
    -- Update customer with the new default cost center
    UPDATE public.customers
    SET default_cost_center_id = cost_center_id
    WHERE id = customer_id_param;
    
    RETURN cost_center_id;
END;
$function$;