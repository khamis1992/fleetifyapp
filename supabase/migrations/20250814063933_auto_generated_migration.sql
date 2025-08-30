-- إنشاء دالة RPC محسّنة لإرجاع الحسابات المتاحة للعملاء
CREATE OR REPLACE FUNCTION get_available_customer_accounts_v2(target_company_id uuid)
RETURNS TABLE(
    id uuid,
    account_code varchar,
    account_name text,
    account_name_ar text,
    parent_account_name text,
    is_available boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        coa.id,
        coa.account_code,
        coa.account_name,
        coa.account_name_ar,
        COALESCE(parent_coa.account_name, '') as parent_account_name,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM customer_accounts ca 
                WHERE ca.account_id = coa.id
            ) THEN false
            ELSE true
        END as is_available
    FROM chart_of_accounts coa
    LEFT JOIN chart_of_accounts parent_coa ON coa.parent_account_id = parent_coa.id
    WHERE coa.company_id = target_company_id
        AND coa.is_active = true
        AND coa.account_level >= 3
        AND coa.is_header = false
        AND coa.account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')
    ORDER BY coa.account_code;
END;
$$;