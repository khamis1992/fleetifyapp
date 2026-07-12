-- Restore only mappings that still match this migration's applied value.
-- The stricter journal-account validation intentionally remains in place.

DO $$
DECLARE
  snapshot record;
  v_type_id uuid;
  v_applied_account_id uuid;
  v_previous_account_id uuid;
  v_previous_mapping_id uuid;
  v_previous_active boolean;
BEGIN
  FOR snapshot IN
    SELECT *
    FROM public.financial_configuration_snapshots
    WHERE migration_version = '20260712050500'
      AND rolled_back_at IS NULL
    ORDER BY created_at DESC
  LOOP
    v_type_id := (snapshot.applied_value ->> 'default_account_type_id')::uuid;
    v_applied_account_id := (snapshot.applied_value ->> 'chart_of_accounts_id')::uuid;

    IF COALESCE((snapshot.previous_value ->> 'missing')::boolean, false) THEN
      DELETE FROM public.account_mappings
      WHERE company_id = snapshot.company_id
        AND default_account_type_id = v_type_id
        AND chart_of_accounts_id = v_applied_account_id;
    ELSE
      v_previous_mapping_id := (snapshot.previous_value ->> 'mapping_id')::uuid;
      v_previous_account_id := (snapshot.previous_value ->> 'chart_of_accounts_id')::uuid;
      v_previous_active := COALESCE((snapshot.previous_value ->> 'is_active')::boolean, false);

      UPDATE public.account_mappings
      SET
        chart_of_accounts_id = v_previous_account_id,
        is_active = v_previous_active,
        updated_at = now()
      WHERE id = v_previous_mapping_id
        AND company_id = snapshot.company_id
        AND default_account_type_id = v_type_id
        AND chart_of_accounts_id = v_applied_account_id;
    END IF;

    UPDATE public.financial_configuration_snapshots
    SET rolled_back_at = now()
    WHERE id = snapshot.id;
  END LOOP;
END;
$$;
