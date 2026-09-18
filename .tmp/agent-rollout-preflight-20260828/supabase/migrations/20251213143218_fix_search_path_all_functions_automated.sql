-- Automated fix for all functions missing SET search_path = ''
-- This adds search_path protection to all public schema functions

DO $$
DECLARE
    func_record RECORD;
    func_def TEXT;
    new_func_def TEXT;
    volatility_cat CHAR(1);
    security_type TEXT;
BEGIN
    -- Loop through all functions in public schema without search_path set
    FOR func_record IN
        SELECT 
            p.oid,
            p.proname as function_name,
            pg_get_function_identity_arguments(p.oid) as args,
            p.provolatile as volatility,
            p.prosecdef as is_security_definer
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.prokind = 'f'
          AND NOT EXISTS (
            SELECT 1 
            FROM pg_proc p2
            WHERE p2.oid = p.oid
            AND pg_get_functiondef(p2.oid) LIKE '%SET search_path%'
          )
        ORDER BY p.proname
    LOOP
        BEGIN
            -- Get current function definition
            func_def := pg_get_functiondef(func_record.oid);
            
            -- Extract the function signature and body
            -- Add SET search_path = '' before AS keyword
            new_func_def := regexp_replace(
                func_def,
                E'(\\s+)(AS \\$)',
                E'\\1SET search_path = ''''\\n\\1\\2',
                'i'
            );
            
            -- If the pattern didn't match, try alternative pattern for inline functions
            IF new_func_def = func_def THEN
                -- For SQL functions that might not have explicit AS
                new_func_def := regexp_replace(
                    func_def,
                    E'(LANGUAGE [a-z]+)(\\s+)',
                    E'\\1\\2SET search_path = ''''\\2',
                    'i'
                );
            END IF;
            
            -- Execute the modified function definition
            IF new_func_def != func_def THEN
                EXECUTE new_func_def;
                RAISE NOTICE 'Fixed search_path for function: %.%(%)', 
                    'public', func_record.function_name, func_record.args;
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                -- Log the error but continue with other functions
                RAISE WARNING 'Failed to fix function %.%(%). Error: %', 
                    'public', func_record.function_name, func_record.args, SQLERRM;
        END;
    END LOOP;
END $$;;
