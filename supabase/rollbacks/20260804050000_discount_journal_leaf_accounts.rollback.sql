-- Rollback: restore the legacy account lookups (header accounts allowed) in
-- create_invoice_discount_journal_entry.

BEGIN;

DO $$
DECLARE
  v_def text;
BEGIN
  v_def := pg_get_functiondef(
    'public.create_invoice_discount_journal_entry(uuid,numeric,text)'::regprocedure
  );

  v_def := replace(
    v_def,
    E'    AND account_type = \'expenses\'\n    AND (account_name ILIKE \'%discount%\' OR account_name ILIKE \'%خصم%\')\n    AND is_active = true\n    AND COALESCE(is_header, false) = false\n    AND COALESCE(account_level, 0) >= 3\n    LIMIT 1;',
    E'    AND account_type = \'expenses\'\n    AND (account_name ILIKE \'%discount%\' OR account_name ILIKE \'%خصم%\')\n    AND is_active = true\n    LIMIT 1;'
  );

  v_def := replace(
    v_def,
    E'        AND account_type = \'expenses\'\n        AND is_active = true\n        AND COALESCE(is_header, false) = false\n        AND COALESCE(account_level, 0) >= 3\n        LIMIT 1;',
    E'        AND account_type = \'expenses\'\n        AND is_active = true\n        LIMIT 1;'
  );

  v_def := replace(
    v_def,
    E'    AND account_type = \'assets\'\n    AND (account_name ILIKE \'%receivable%\' OR account_name ILIKE \'%ذمم%\' OR account_name ILIKE \'%عملاء%\')\n    AND is_active = true\n    AND COALESCE(is_header, false) = false\n    AND COALESCE(account_level, 0) >= 3\n    ORDER BY account_code\n    LIMIT 1;',
    E'    AND account_type = \'assets\'\n    AND account_name ILIKE \'%receivable%\'\n    AND is_active = true\n    LIMIT 1;'
  );

  EXECUTE v_def;
END;
$$;

COMMIT;
