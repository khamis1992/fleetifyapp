-- Slim the SAVED package payload too (the auto-save response was returning the
-- full untrimmed ~20MB payload after generation) + run the fleet bridge:
-- capitalization, financing obligations, long-term reclass and opening
-- depreciation for the whole fleet, posted with reference-pair idempotency.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE OR REPLACE FUNCTION financial_statement_private.save_report(p_company uuid, p_configuration jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $f$
DECLARE v_payload jsonb; v_row public.professional_financial_statement_packages%ROWTYPE;
BEGIN
 IF NOT balance_sheet_private.has_access(p_company,'save') THEN RAISE EXCEPTION 'Not authorized to save financial statements' USING ERRCODE='42501'; END IF;
 v_payload := financial_statement_private.get_report(p_company, p_configuration);
 INSERT INTO public.professional_financial_statement_packages(company_id,payload,source_fingerprint,created_by,created_by_name)
 VALUES(p_company,v_payload,v_payload->>'fingerprint',auth.uid(),balance_sheet_private.actor_name(p_company)) RETURNING * INTO v_row;
 INSERT INTO financial_statement_private.report_events(report_id,company_id,action,actor_id,reason,source_fingerprint)
 VALUES(v_row.id,p_company,'created',auth.uid(),p_configuration->>'preparationNotes',v_row.source_fingerprint);
 RETURN to_jsonb(v_row);
END;
$f$;

-- Bridge prerequisites: opening-equity role + long-term financing account.
INSERT INTO public.default_account_types (type_code, type_name, type_name_ar, account_category, description, is_system)
SELECT 'OPENING_EQUITY', 'Opening Ledger Equity', 'حقوق بدء الدفتر', 'equity',
 'Balancing equity account for one-time bridge entries that open the ledger from operational data.', true
WHERE NOT EXISTS (SELECT 1 FROM public.default_account_types t WHERE t.type_code = 'OPENING_EQUITY');

INSERT INTO public.chart_of_accounts (company_id, account_code, account_name, account_name_ar, account_type, account_subtype, balance_type, account_level, is_header, is_active, parent_account_code)
SELECT v.company_id, v.code, v.name_en, v.name_ar, 'liabilities', 'non_current_liability', 'credit', 3, false, true, NULL
FROM (VALUES ('24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid, '2310', 'Vehicle Financing - Long Term', 'تمويل المركبات طويل الأجل')) AS v(company_id, code, name_en, name_ar)
WHERE NOT EXISTS (SELECT 1 FROM public.chart_of_accounts a WHERE a.company_id = v.company_id AND a.account_code = v.code);

INSERT INTO public.account_mappings (company_id, default_account_type_id, chart_of_accounts_id, is_active)
SELECT v.company_id, t.id, a.id, true
FROM (VALUES
  ('24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid, 'OPENING_EQUITY', '3100'),
  ('24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid, 'VEHICLE_FINANCE_LONG_TERM', '2310')
) AS v(company_id, type_code, account_code)
JOIN public.default_account_types t ON t.type_code = v.type_code
JOIN public.chart_of_accounts a ON a.company_id = v.company_id AND a.account_code = v.account_code
WHERE NOT EXISTS (SELECT 1 FROM public.account_mappings m WHERE m.company_id = v.company_id AND m.default_account_type_id = t.id);

-- The bridge run: post VCAP/VDEP/VFIN/VRC for every eligible source.
DO $bridge$
DECLARE
  v_today date := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date;
  v_company uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicles uuid; v_accum uuid; v_equity uuid; v_payable uuid; v_longterm uuid;
  r record; v_je uuid; v_amount numeric; v_count integer := 0; v_total numeric := 0;
  v_note text := 'FLEET BRIDGE AUTO-RUN 20260921200000';
BEGIN
  SELECT m.chart_of_accounts_id INTO v_vehicles FROM public.account_mappings m JOIN public.default_account_types t ON t.id=m.default_account_type_id WHERE m.company_id=v_company AND t.type_code='VEHICLES_ASSET' AND COALESCE(m.is_active,true) LIMIT 1;
  SELECT m.chart_of_accounts_id INTO v_accum FROM public.account_mappings m JOIN public.default_account_types t ON t.id=m.default_account_type_id WHERE m.company_id=v_company AND t.type_code='ACCUMULATED_DEPRECIATION' AND COALESCE(m.is_active,true) LIMIT 1;
  SELECT m.chart_of_accounts_id INTO v_equity FROM public.account_mappings m JOIN public.default_account_types t ON t.id=m.default_account_type_id WHERE m.company_id=v_company AND t.type_code='OPENING_EQUITY' AND COALESCE(m.is_active,true) LIMIT 1;
  SELECT m.chart_of_accounts_id INTO v_payable FROM public.account_mappings m JOIN public.default_account_types t ON t.id=m.default_account_type_id WHERE m.company_id=v_company AND t.type_code='VEHICLE_INSTALLMENT_PAYABLE' AND COALESCE(m.is_active,true) LIMIT 1;
  SELECT m.chart_of_accounts_id INTO v_longterm FROM public.account_mappings m JOIN public.default_account_types t ON t.id=m.default_account_type_id WHERE m.company_id=v_company AND t.type_code='VEHICLE_FINANCE_LONG_TERM' AND COALESCE(m.is_active,true) LIMIT 1;
  IF v_vehicles IS NULL OR v_accum IS NULL OR v_equity IS NULL OR v_payable IS NULL OR v_longterm IS NULL THEN
    RAISE EXCEPTION 'Fleet bridge role mappings incomplete';
  END IF;

  -- VCAP: capitalize each eligible vehicle at its purchase date.
  FOR r IN
    SELECT v.id, v.purchase_cost, v.purchase_date, v.fixed_asset_id, v.plate_number,
      COALESCE(v.accumulated_depreciation,0) - COALESCE((
        SELECT sum(dr.depreciation_amount) FROM public.depreciation_records dr
        JOIN public.fixed_assets fa ON fa.id = dr.fixed_asset_id AND fa.company_id = v.company_id
        WHERE fa.id = v.fixed_asset_id), 0) AS dep_amount
    FROM public.vehicles v
    WHERE v.company_id = v_company AND COALESCE(v.purchase_cost,0) > 0 AND v.purchase_date IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.journal_entries e WHERE e.company_id=v_company AND e.reference_type='vehicle_capitalization' AND e.reference_id=v.id)
  LOOP
    v_je := gen_random_uuid(); v_count := v_count + 1; v_total := v_total + r.purchase_cost;
    INSERT INTO public.journal_entries (id, company_id, entry_number, entry_date, description, reference_type, reference_id, total_debit, total_credit, status, workflow_notes)
    VALUES (v_je, v_company, 'VCAP-'||to_char(r.purchase_date,'YYYYMMDD')||'-'||left(r.id::text,8), r.purchase_date,
      'رسملة مركبة — '||COALESCE(r.plate_number,r.id::text), 'vehicle_capitalization', r.id, r.purchase_cost, r.purchase_cost, 'draft', v_note);
    INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, line_number, line_description, debit_amount, credit_amount, asset_id)
    VALUES (v_je, v_vehicles, 1, 'أصول المركبات — رسملة', r.purchase_cost, 0, CASE WHEN EXISTS (SELECT 1 FROM public.fixed_assets fa WHERE fa.id = r.fixed_asset_id) THEN r.fixed_asset_id ELSE NULL END),
           (v_je, v_equity, 2, 'فارق رسملة عبر حقوق بدء الدفتر', 0, r.purchase_cost, NULL);
    UPDATE public.journal_entries SET status='posted', posted_at=now() WHERE id=v_je;

    -- VDEP: opening accumulated depreciation for this vehicle.
    v_amount := round(LEAST(GREATEST(r.dep_amount,0), r.purchase_cost));
    IF v_amount > 0.01 AND NOT EXISTS (SELECT 1 FROM public.journal_entries e WHERE e.company_id=v_company AND e.reference_type='vehicle_depreciation_backfill' AND e.reference_id=r.id) THEN
      DECLARE v_dep uuid := gen_random_uuid(); BEGIN
        INSERT INTO public.journal_entries (id, company_id, entry_number, entry_date, description, reference_type, reference_id, total_debit, total_credit, status, workflow_notes)
        VALUES (v_dep, v_company, 'VDEP-'||to_char(v_today,'YYYYMMDD')||'-'||left(r.id::text,8), v_today,
          'إهلاك تراكمي افتتاحي — '||COALESCE(r.plate_number,r.id::text), 'vehicle_depreciation_backfill', r.id, v_amount, v_amount, 'draft', v_note);
        INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, line_number, line_description, debit_amount, credit_amount, asset_id)
        VALUES (v_dep, v_equity, 1, 'إهلاك سابق الفترات', v_amount, 0, NULL),
               (v_dep, v_accum, 2, 'مجمع إهلاك المركبات', 0, v_amount, CASE WHEN EXISTS (SELECT 1 FROM public.fixed_assets fa WHERE fa.id = r.fixed_asset_id) THEN r.fixed_asset_id ELSE NULL END);
        UPDATE public.journal_entries SET status='posted', posted_at=now() WHERE id=v_dep;
        v_count := v_count + 1;
      END;
    END IF;
  END LOOP;

  -- VFIN + VRC per financing agreement.
  FOR r IN
    SELECT a.id, a.agreement_number, COALESCE(a.start_date, v_today) AS start_date,
      GREATEST(COALESCE((SELECT sum(s.principal_amount) FROM public.vehicle_installment_schedules s WHERE s.installment_id=a.id AND s.company_id=v_company),0),
               COALESCE(a.total_amount,0)-COALESCE(a.down_payment,0), 0) AS principal,
      COALESCE((SELECT sum(s.principal_amount*((COALESCE(s.amount,0)-COALESCE(s.paid_amount,0))/GREATEST(COALESCE(s.amount,0),0.01)))
        FROM public.vehicle_installment_schedules s
        WHERE s.installment_id=a.id AND s.company_id=v_company AND s.due_date > (v_today+INTERVAL '12 months') AND COALESCE(s.amount,0)-COALESCE(s.paid_amount,0)>0.005),0) AS long_part
    FROM public.vehicle_installments a
    WHERE a.company_id=v_company AND a.status IN ('draft','active')
      AND GREATEST(COALESCE((SELECT sum(s.principal_amount) FROM public.vehicle_installment_schedules s WHERE s.installment_id=a.id AND s.company_id=v_company),0),
                   COALESCE(a.total_amount,0)-COALESCE(a.down_payment,0),0) > 0.005
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.journal_entries e WHERE e.company_id=v_company AND e.reference_type='vehicle_financing_obligation' AND e.reference_id=r.id) THEN
      v_je := gen_random_uuid(); v_count := v_count + 1;
      INSERT INTO public.journal_entries (id, company_id, entry_number, entry_date, description, reference_type, reference_id, total_debit, total_credit, status, workflow_notes)
      VALUES (v_je, v_company, 'VFIN-'||to_char(r.start_date,'YYYYMMDD')||'-'||left(r.id::text,8), r.start_date,
        'التزام تمويل مركبات — '||COALESCE(r.agreement_number,r.id::text), 'vehicle_financing_obligation', r.id, r.principal, r.principal, 'draft', v_note);
      INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, line_number, line_description, debit_amount, credit_amount)
      VALUES (v_je, v_equity, 1, 'إثبات التزام تمويل', r.principal, 0),
             (v_je, v_payable, 2, 'التزام أقساط المركبات (الأصل)', 0, r.principal);
      UPDATE public.journal_entries SET status='posted', posted_at=now() WHERE id=v_je;
    END IF;

    v_amount := round(LEAST(COALESCE(r.long_part,0), r.principal));
    IF v_amount > 0.01 AND NOT EXISTS (SELECT 1 FROM public.journal_entries e WHERE e.company_id=v_company AND e.reference_type='vehicle_financing_reclass' AND e.reference_id=(md5(r.id::text||':'||v_today::text))::uuid) THEN
      DECLARE v_rc uuid := gen_random_uuid(); BEGIN
        INSERT INTO public.journal_entries (id, company_id, entry_number, entry_date, description, reference_type, reference_id, total_debit, total_credit, status, workflow_notes)
        VALUES (v_rc, v_company, 'VRC-'||to_char(v_today,'YYYYMMDD')||'-'||left(r.id::text,8), v_today,
          'إعادة تصنيف تمويل طويل الأجل — '||COALESCE(r.agreement_number,r.id::text), 'vehicle_financing_reclass', (md5(r.id::text||':'||v_today::text))::uuid, v_amount, v_amount, 'draft', v_note);
        INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, line_number, line_description, debit_amount, credit_amount)
        VALUES (v_rc, v_payable, 1, 'تحويل الشريحة طويلة الأجل', v_amount, 0),
               (v_rc, v_longterm, 2, 'تمويل المركبات طويل الأجل', 0, v_amount);
        UPDATE public.journal_entries SET status='posted', posted_at=now() WHERE id=v_rc;
        v_count := v_count + 1;
      END;
    END IF;
  END LOOP;

  INSERT INTO public.audit_logs (action, company_id, entity_name, resource_type, severity, notes, metadata)
  VALUES ('fleet_bridge_autorun', v_company, 'journal_entries', 'journal_entry', 'info',
    'Fleet bridge executed: capitalization, opening depreciation, financing obligations and long-term reclass posted.',
    jsonb_build_object('entriesPosted', v_count, 'capitalizedAmount', v_total, 'runAt', now()));
  RAISE NOTICE 'bridge: % entries, capitalization %', v_count, v_total;
END
$bridge$;

NOTIFY pgrst,'reload schema';
COMMIT;
