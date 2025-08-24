-- Fix the security issue by adding proper search_path to the function
CREATE OR REPLACE FUNCTION sync_parent_account_code()
RETURNS TRIGGER AS $$
BEGIN
    -- When parent_account_id is updated, sync the parent_account_code
    IF NEW.parent_account_id IS NOT NULL THEN
        SELECT account_code INTO NEW.parent_account_code
        FROM chart_of_accounts
        WHERE id = NEW.parent_account_id;
    ELSE
        NEW.parent_account_code := NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';