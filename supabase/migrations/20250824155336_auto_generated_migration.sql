-- Add parent_account_code column to chart_of_accounts table
ALTER TABLE public.chart_of_accounts 
ADD COLUMN parent_account_code text;

-- Create index for faster parent lookups
CREATE INDEX idx_chart_of_accounts_parent_account_code ON public.chart_of_accounts(parent_account_code);

-- Add function to sync parent_account_code with parent_account_id
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
$$ LANGUAGE plpgsql;

-- Create trigger to automatically sync parent_account_code
CREATE TRIGGER trigger_sync_parent_account_code
    BEFORE INSERT OR UPDATE ON public.chart_of_accounts
    FOR EACH ROW
    EXECUTE FUNCTION sync_parent_account_code();