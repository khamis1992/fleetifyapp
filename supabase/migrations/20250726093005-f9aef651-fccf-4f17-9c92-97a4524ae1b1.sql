-- Fix remaining security definer views
-- First identify and fix any remaining problematic views or functions

-- Fix search path for all functions that don't have it set
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT n.nspname, p.proname 
        FROM pg_proc p
        LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.prosecdef = true
        AND NOT EXISTS (
            SELECT 1 FROM pg_proc pp 
            WHERE pp.oid = p.oid 
            AND 'search_path' = ANY(string_to_array(pp.proconfig::text, ','))
        )
    LOOP
        -- Update functions to include search_path
        EXECUTE format('ALTER FUNCTION public.%I SET search_path TO ''public''', func_record.proname);
    END LOOP;
END $$;

-- Update specific functions that may be missing search_path
ALTER FUNCTION public.generate_journal_entry_number SET search_path TO 'public';
ALTER FUNCTION public.create_contract_journal_entry SET search_path TO 'public';
ALTER FUNCTION public.create_invoice_journal_entry SET search_path TO 'public';
ALTER FUNCTION public.create_payment_journal_entry SET search_path TO 'public';
ALTER FUNCTION public.create_penalty_journal_entry SET search_path TO 'public';
ALTER FUNCTION public.create_depreciation_journal_entry SET search_path TO 'public';
ALTER FUNCTION public.create_bank_transaction_journal_entry SET search_path TO 'public';
ALTER FUNCTION public.create_payroll_journal_entry SET search_path TO 'public';

-- Secure password generation function
CREATE OR REPLACE FUNCTION public.generate_secure_password()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    password text;
    upper_chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    lower_chars text := 'abcdefghijklmnopqrstuvwxyz';
    number_chars text := '0123456789';
    special_chars text := '!@#$%^&*()_+-=[]{}|;:,.<>?';
    all_chars text;
BEGIN
    all_chars := upper_chars || lower_chars || number_chars || special_chars;
    
    -- Generate 12-character password with guaranteed character types
    password := 
        substr(upper_chars, (random() * length(upper_chars))::int + 1, 1) ||
        substr(lower_chars, (random() * length(lower_chars))::int + 1, 1) ||
        substr(number_chars, (random() * length(number_chars))::int + 1, 1) ||
        substr(special_chars, (random() * length(special_chars))::int + 1, 1);
    
    -- Add 8 more random characters
    FOR i IN 1..8 LOOP
        password := password || substr(all_chars, (random() * length(all_chars))::int + 1, 1);
    END LOOP;
    
    -- Shuffle the password to randomize character positions
    password := array_to_string(
        ARRAY(
            SELECT substr(password, generate_series(1, length(password)), 1)
            ORDER BY random()
        ), 
        ''
    );
    
    RETURN password;
END;
$$;