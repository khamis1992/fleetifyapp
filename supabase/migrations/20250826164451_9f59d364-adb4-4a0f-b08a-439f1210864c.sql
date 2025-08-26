-- Fix the auto_calculate_account_level trigger to respect manually set levels
DROP TRIGGER IF EXISTS auto_calculate_account_level_trigger ON chart_of_accounts;

CREATE OR REPLACE FUNCTION public.auto_calculate_account_level()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only auto-calculate level if not manually provided
  IF NEW.account_level IS NULL OR NEW.account_level = 0 THEN
    NEW.account_level := calculate_account_level(NEW.account_code);
    RAISE NOTICE 'Auto-calculated level % for account %', NEW.account_level, NEW.account_code;
  ELSE
    RAISE NOTICE 'Using manually set level % for account %', NEW.account_level, NEW.account_code;
  END IF;
  
  -- If no is_header specified, determine based on level
  IF NEW.is_header IS NULL THEN
    NEW.is_header := (NEW.account_level < 5);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER auto_calculate_account_level_trigger
BEFORE INSERT OR UPDATE ON chart_of_accounts
FOR EACH ROW
EXECUTE FUNCTION auto_calculate_account_level();