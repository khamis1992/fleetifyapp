BEGIN;

DO $$
DECLARE
  v_def text;
  v_occurrences integer;
BEGIN
  v_def := pg_get_functiondef(
    'public.create_invoice_discount_journal_entry(uuid,numeric,text)'::regprocedure
  );

  -- 1) Discount account lookup: leaf-only.
  v_def := replace(
    v_def,
    E'    AND account_type = \'expenses\'\n    AND (account_name ILIKE \'%discount%\' OR account_name ILIKE \'%خصم%\')\n    AND is_active = true\n    LIMIT 1;',
    E'    AND account_type = \'expenses\'\n    AND (account_name ILIKE \'%discount%\' OR account_name ILIKE \'%خصم%\')\n    AND is_active = true\n    AND COALESCE(is_header, false) = false\n    AND COALESCE(account_level, 0) >= 3\n    LIMIT 1;'
  );

  -- 2) Generic expense fallback: leaf-only.
  v_def := replace(
    v_def,
    E'        AND account_type = \'expenses\'\n        AND is_active = true\n        LIMIT 1;',
    E'        AND account_type = \'expenses\'\n        AND is_active = true\n        AND COALESCE(is_header, false) = false\n        AND COALESCE(account_level, 0) >= 3\n        LIMIT 1;'
  );

  -- 3) Receivable lookup: leaf-only and Arabic-aware.
  v_def := replace(
    v_def,
    E'    AND account_type = \'assets\'\n    AND account_name ILIKE \'%receivable%\'\n    AND is_active = true\n    LIMIT 1;',
    E'    AND account_type = \'assets\'\n    AND (account_name ILIKE \'%receivable%\' OR account_name ILIKE \'%ذمم%\' OR account_name ILIKE \'%عملاء%\')\n    AND is_active = true\n    AND COALESCE(is_header, false) = false\n    AND COALESCE(account_level, 0) >= 3\n    ORDER BY account_code\n    LIMIT 1;'
  );

  IF v_def NOT LIKE '%COALESCE(is_header, false) = false%' THEN
    RAISE EXCEPTION 'discount journal patch did not apply; aborting for manual review';
  END IF;

  EXECUTE v_def;
END;
$$;

COMMIT;;
