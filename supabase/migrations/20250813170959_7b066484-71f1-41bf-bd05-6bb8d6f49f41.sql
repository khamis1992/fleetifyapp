-- Fix security issues by adding proper search_path to functions

-- Update calculate_account_level_from_code function with proper search_path
CREATE OR REPLACE FUNCTION public.calculate_account_level_from_code(account_code_param text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Calculate level based on account code length
    -- Level 1: 1-2 digits (main categories)
    -- Level 2: 3-4 digits (subcategories) 
    -- Level 3: 5-6 digits (detailed accounts)
    -- Level 4: 7-8 digits (sub-detailed accounts)
    -- Level 5: 9+ digits (most detailed accounts)
    
    CASE LENGTH(account_code_param)
        WHEN 1, 2 THEN RETURN 1;
        WHEN 3, 4 THEN RETURN 2;
        WHEN 5, 6 THEN RETURN 3;
        WHEN 7, 8 THEN RETURN 4;
        ELSE RETURN 5;
    END CASE;
END;
$function$;

-- Update set_account_level_from_code function with proper search_path
CREATE OR REPLACE FUNCTION public.set_account_level_from_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Calculate and set account level based on account code
    NEW.account_level := public.calculate_account_level_from_code(NEW.account_code);
    
    -- Set is_header based on account level and code length
    -- Header accounts are typically shorter codes (1-2 digits) or explicitly marked
    IF LENGTH(NEW.account_code) <= 2 OR NEW.account_level <= 1 THEN
        NEW.is_header := true;
    ELSIF NEW.is_header IS NULL THEN
        NEW.is_header := false;
    END IF;
    
    RETURN NEW;
END;
$function$;