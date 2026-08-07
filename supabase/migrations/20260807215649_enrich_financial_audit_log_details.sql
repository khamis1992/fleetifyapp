-- Enrich financial audit log entries with display-ready user, entity, and summary data.
-- The previous trigger stored only user_id/resource ids, which made the audit UI show
-- "unknown user" and empty entity/change columns for trigger-generated rows.

CREATE OR REPLACE FUNCTION public.financial_audit_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_company_id uuid;
  v_resource_id uuid;
  v_resource_type text;
  v_resource_label text;
  v_details jsonb;
  v_changed_fields jsonb := NULL;
  v_changed_count integer := 0;
  v_severity text := 'low';
  v_status text := 'success';
  v_old_row jsonb := NULL;
  v_new_row jsonb := NULL;
  v_user_id uuid := auth.uid();
  v_user_profile record;
  v_user_name text := NULL;
  v_user_email text := NULL;
  v_entity_name text := NULL;
  v_changes_summary text := NULL;
BEGIN
  v_resource_type := CASE TG_TABLE_NAME
    WHEN 'payments' THEN 'payment'
    WHEN 'invoices' THEN 'invoice'
    WHEN 'journal_entries' THEN 'journal_entry'
    ELSE TG_TABLE_NAME
  END;

  v_resource_label := CASE v_resource_type
    WHEN 'payment' THEN 'دفعة'
    WHEN 'invoice' THEN 'فاتورة'
    WHEN 'journal_entry' THEN 'قيد يومية'
    ELSE 'سجل'
  END;

  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_old_row := to_jsonb(OLD);
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_new_row := to_jsonb(NEW);
  END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT jsonb_object_agg(key, value)
    INTO v_changed_fields
    FROM jsonb_each(v_new_row) AS n
    WHERE n.value IS DISTINCT FROM (v_old_row -> n.key);

    SELECT count(*)
    INTO v_changed_count
    FROM jsonb_object_keys(COALESCE(v_changed_fields, '{}'::jsonb));
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := v_resource_type || '_created';
    v_company_id := NEW.company_id;
    v_resource_id := NEW.id;
    v_details := jsonb_build_object(
      'new_values', v_new_row,
      'source_table', TG_TABLE_NAME
    );
    IF TG_TABLE_NAME = 'payments' THEN
      v_severity := 'medium';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := v_resource_type || '_updated';
    v_company_id := NEW.company_id;
    v_resource_id := NEW.id;
    v_details := jsonb_build_object(
      'old_values', v_old_row,
      'new_values', v_new_row,
      'changed_fields', v_changed_fields,
      'source_table', TG_TABLE_NAME
    );

    IF TG_TABLE_NAME = 'payments'
       AND (v_old_row ->> 'payment_status') IS DISTINCT FROM (v_new_row ->> 'payment_status')
    THEN
      v_severity := 'high';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := v_resource_type || '_deleted';
    v_company_id := OLD.company_id;
    v_resource_id := OLD.id;
    v_details := jsonb_build_object(
      'old_values', v_old_row,
      'source_table', TG_TABLE_NAME
    );
    v_severity := 'critical';
  END IF;

  v_user_id := COALESCE(
    auth.uid(),
    NULLIF(v_new_row ->> 'updated_by', '')::uuid,
    NULLIF(v_old_row ->> 'updated_by', '')::uuid,
    NULLIF(v_new_row ->> 'created_by', '')::uuid,
    NULLIF(v_old_row ->> 'created_by', '')::uuid
  );

  IF v_user_id IS NOT NULL THEN
    SELECT first_name, last_name, first_name_ar, last_name_ar, email
    INTO v_user_profile
    FROM public.profiles
    WHERE user_id = v_user_id
       OR id = v_user_id
    LIMIT 1;

    v_user_email := v_user_profile.email;
    v_user_name := COALESCE(
      NULLIF(concat_ws(' ', v_user_profile.first_name_ar, v_user_profile.last_name_ar), ''),
      NULLIF(concat_ws(' ', v_user_profile.first_name, v_user_profile.last_name), ''),
      v_user_profile.email
    );
  END IF;

  v_entity_name := CASE v_resource_type
    WHEN 'payment' THEN COALESCE(
      v_new_row ->> 'payment_number',
      v_old_row ->> 'payment_number',
      v_new_row ->> 'reference_number',
      v_old_row ->> 'reference_number'
    )
    WHEN 'invoice' THEN COALESCE(
      v_new_row ->> 'invoice_number',
      v_old_row ->> 'invoice_number'
    )
    WHEN 'journal_entry' THEN COALESCE(
      v_new_row ->> 'entry_number',
      v_old_row ->> 'entry_number'
    )
    ELSE COALESCE(
      v_new_row ->> 'name',
      v_old_row ->> 'name',
      v_resource_id::text
    )
  END;

  v_changes_summary := CASE TG_OP
    WHEN 'INSERT' THEN 'تم إنشاء ' || v_resource_label || COALESCE(' ' || v_entity_name, '')
    WHEN 'DELETE' THEN 'تم حذف ' || v_resource_label || COALESCE(' ' || v_entity_name, '')
    ELSE 'تم تحديث ' || v_resource_label || COALESCE(' ' || v_entity_name, '') ||
      CASE WHEN v_changed_count > 0 THEN ' (' || v_changed_count || ' حقول)' ELSE '' END
  END;

  INSERT INTO public.audit_logs (
    action,
    severity,
    company_id,
    resource_type,
    resource_id,
    entity_name,
    old_values,
    new_values,
    changes_summary,
    metadata,
    status,
    user_id,
    user_email,
    user_name
  )
  VALUES (
    v_action,
    v_severity,
    v_company_id,
    v_resource_type,
    v_resource_id,
    v_entity_name,
    CASE WHEN v_details ? 'old_values' THEN v_details -> 'old_values' ELSE NULL END,
    CASE WHEN v_details ? 'new_values' THEN v_details -> 'new_values' ELSE NULL END,
    v_changes_summary,
    CASE WHEN v_details ? 'changed_fields' THEN v_details -> 'changed_fields' ELSE NULL END,
    v_status,
    v_user_id,
    v_user_email,
    v_user_name
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.financial_audit_trigger_fn() IS
'Audits financial table changes and stores display-ready user, entity, and Arabic summary data.';
