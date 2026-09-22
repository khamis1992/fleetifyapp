-- Fleet-to-ledger bridge candidates reader.
-- Pure read: computes capitalization, financing-obligation, reclass, and depreciation
-- backfill inputs from fleet/financing tables plus "already bridged" flags derived from
-- journal reference pairs. The ledger remains the only balance-sheet source.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE FUNCTION public.get_fleet_bridge_candidates_v1(p_company_id uuid, p_as_of date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $fn$
DECLARE v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501'; END IF;
  IF public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
    RAISE EXCEPTION 'Company access denied' USING ERRCODE = '42501';
  END IF;
  IF p_as_of IS NULL OR NOT isfinite(p_as_of) OR p_as_of < DATE '1900-01-01' THEN
    RAISE EXCEPTION 'A valid reporting date is required' USING ERRCODE = '22023';
  END IF;

  SELECT jsonb_build_object(
    'asOf', p_as_of,
    'earliestEntryDate', (SELECT min(entry_date)::text FROM public.journal_entries WHERE company_id = p_company_id),
    'vehicles', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', v.id,
        'plateNumber', v.plate_number,
        'make', v.make,
        'model', v.model,
        'year', v.year,
        'isActive', COALESCE(v.is_active, true),
        'status', v.status,
        'purchaseCost', COALESCE(v.purchase_cost, 0),
        'purchaseDate', v.purchase_date,
        'registrationFees', COALESCE(v.registration_fees, 0),
        'depositAmount', COALESCE(v.deposit_amount, 0),
        'loanAmount', COALESCE(v.loan_amount, 0),
        'financingType', v.financing_type,
        'accumulatedDepreciationStored', COALESCE(v.accumulated_depreciation, 0),
        'depreciationPosted', COALESCE((
          SELECT sum(dr.depreciation_amount) FROM public.depreciation_records dr
          JOIN public.fixed_assets fa ON fa.id = dr.fixed_asset_id AND fa.company_id = p_company_id
          WHERE fa.id = v.fixed_asset_id), 0),
        'depreciationRate', v.depreciation_rate,
        'residualValue', v.residual_value,
        'salvageValue', v.salvage_value,
        'monthsSincePurchase', CASE WHEN v.purchase_date IS NULL THEN NULL
          ELSE (date_part('year', age(p_as_of, v.purchase_date))::int * 12 + date_part('month', age(p_as_of, v.purchase_date))::int) END,
        'fixedAssetId', v.fixed_asset_id,
        'linkedAgreementId', linked.agreement_id,
        'linkedAgreementNumber', linked.agreement_number,
        'linkedAgreementStatus', linked.status,
        'linkedAllocatedAmount', linked.allocated_amount,
        'linkedDownPayment', linked.down_payment,
        'hasCapitalizationEntry', EXISTS (
          SELECT 1 FROM public.journal_entries e
          WHERE e.company_id = p_company_id AND e.reference_type = 'vehicle_capitalization' AND e.reference_id = v.id),
        'hasDepreciationEntry', EXISTS (
          SELECT 1 FROM public.journal_entries e
          WHERE e.company_id = p_company_id
            AND e.reference_type IN ('vehicle_depreciation_backfill', 'vehicle_depreciation')
            AND e.reference_id = v.id),
        'hasAnyVehicleReference', EXISTS (
          SELECT 1 FROM public.journal_entries e
          WHERE e.company_id = p_company_id AND e.reference_id = v.id)
      ) ORDER BY v.purchase_date NULLS LAST, v.id)
      FROM public.vehicles v
      LEFT JOIN LATERAL (
        SELECT a.id AS agreement_id, a.agreement_number, a.status, a.down_payment,
          CASE WHEN cv.vehicle_id IS NOT NULL THEN cv.allocated_amount ELSE (a.total_amount - COALESCE(a.down_payment, 0)) END AS allocated_amount
        FROM public.vehicle_installments a
        LEFT JOIN public.contract_vehicles cv ON cv.vehicle_installment_id = a.id AND cv.vehicle_id = v.id
        WHERE a.company_id = p_company_id AND a.vehicle_id = v.id
        UNION ALL
        SELECT a.id, a.agreement_number, a.status, a.down_payment, cv.allocated_amount
        FROM public.contract_vehicles cv
        JOIN public.vehicle_installments a ON a.id = cv.vehicle_installment_id AND a.company_id = p_company_id
        WHERE cv.company_id = p_company_id AND cv.vehicle_id = v.id
        ORDER BY 1 DESC LIMIT 1
      ) linked ON true
      WHERE v.company_id = p_company_id
        AND COALESCE(v.purchase_cost, 0) > 0
        AND v.purchase_date IS NOT NULL
      LIMIT 500), '[]'::jsonb),
    'vehiclesMissingData', (
      SELECT count(*) FROM public.vehicles v
      WHERE v.company_id = p_company_id AND COALESCE(v.is_active, true)
        AND (COALESCE(v.purchase_cost, 0) <= 0 OR v.purchase_date IS NULL)),
    'agreements', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', a.id,
        'agreementNumber', a.agreement_number,
        'status', a.status,
        'contractType', a.contract_type,
        'vendorName', COALESCE(
          NULLIF(btrim(concat_ws(' ', c.first_name_ar, c.last_name_ar)), ''),
          NULLIF(btrim(concat_ws(' ', c.first_name, c.last_name)), ''),
          NULLIF(btrim(COALESCE(c.company_name_ar, c.company_name)), ''),
          a.agreement_number),
        'startDate', a.start_date,
        'endDate', a.end_date,
        'totalAmount', COALESCE(a.total_amount, 0),
        'downPayment', COALESCE(a.down_payment, 0),
        'financedPrincipal', GREATEST(COALESCE(sched.principal_total, 0), COALESCE(a.total_amount, 0) - COALESCE(a.down_payment, 0)),
        'principalPaid', COALESCE(paid.principal_paid, 0),
        'principalRemaining', GREATEST(
          GREATEST(COALESCE(sched.principal_total, 0), COALESCE(a.total_amount, 0) - COALESCE(a.down_payment, 0))
          - COALESCE(paid.principal_paid, 0), 0),
        'longTermPortion', GREATEST(COALESCE(long_term.long_amount, 0), 0),
        'reclassReferenceId', (md5(a.id::text || ':' || p_as_of::text))::uuid,
        'hasObligationEntry', EXISTS (
          SELECT 1 FROM public.journal_entries e
          WHERE e.company_id = p_company_id AND e.reference_type = 'vehicle_financing_obligation' AND e.reference_id = a.id),
        'hasReclassEntry', EXISTS (
          SELECT 1 FROM public.journal_entries e
          WHERE e.company_id = p_company_id AND e.reference_type = 'vehicle_financing_reclass'
            AND e.reference_id = (md5(a.id::text || ':' || p_as_of::text))::uuid),
        'vehicles', COALESCE((
          SELECT jsonb_agg(jsonb_build_object('id', v.id, 'plateNumber', v.plate_number, 'make', v.make,
            'allocatedAmount', v.allocated_amount) ORDER BY v.plate_number NULLS LAST)
          FROM (
            SELECT v1.id, v1.plate_number, v1.make,
              (COALESCE(a2.total_amount, 0) - COALESCE(a2.down_payment, 0)) AS allocated_amount
            FROM public.vehicle_installments a2
            JOIN public.vehicles v1 ON v1.id = a2.vehicle_id AND v1.company_id = p_company_id
            WHERE a2.id = a.id
            UNION ALL
            SELECT v2.id, v2.plate_number, v2.make, cv.allocated_amount
            FROM public.contract_vehicles cv
            JOIN public.vehicles v2 ON v2.id = cv.vehicle_id AND v2.company_id = p_company_id
            WHERE cv.vehicle_installment_id = a.id AND cv.company_id = p_company_id
          ) v
        ), '[]'::jsonb)
      ) ORDER BY a.start_date NULLS LAST, a.id)
      FROM public.vehicle_installments a
      LEFT JOIN public.customers c ON c.id = a.vendor_id
      LEFT JOIN LATERAL (
        SELECT sum(s.principal_amount) AS principal_total FROM public.vehicle_installment_schedules s
        WHERE s.installment_id = a.id AND s.company_id = p_company_id
      ) sched ON true
      LEFT JOIN LATERAL (
        SELECT sum(p.principal_amount) AS principal_paid FROM public.vehicle_installment_payments p
        WHERE p.installment_id = a.id AND p.company_id = p_company_id AND p.status = 'completed'
      ) paid ON true
      LEFT JOIN LATERAL (
        SELECT sum(s.principal_amount * ((COALESCE(s.amount,0) - COALESCE(s.paid_amount,0)) / GREATEST(COALESCE(s.amount,0), 0.01))) AS long_amount
        FROM public.vehicle_installment_schedules s
        WHERE s.installment_id = a.id AND s.company_id = p_company_id
          AND s.due_date > (p_as_of + interval '12 months')::date
          AND COALESCE(s.amount, 0) - COALESCE(s.paid_amount, 0) > 0.005
      ) long_term ON true
      WHERE a.company_id = p_company_id AND a.status IN ('draft', 'active')
        AND GREATEST(COALESCE(sched.principal_total, 0), COALESCE(a.total_amount, 0) - COALESCE(a.down_payment, 0))
            - COALESCE(paid.principal_paid, 0) > 0.005
      LIMIT 200), '[]'::jsonb),
    'accounts', jsonb_build_object(
      'roles', COALESCE((
        SELECT jsonb_object_agg(role.type_code, jsonb_build_object('id', role.id, 'code', role.account_code,
          'name', role.account_name, 'nameAr', role.account_name_ar, 'subtype', role.account_subtype))
        FROM (
          SELECT DISTINCT ON (dt.type_code) dt.type_code, a.id, a.account_code, a.account_name, a.account_name_ar, a.account_subtype
          FROM public.default_account_types dt
          JOIN public.account_mappings m ON m.default_account_type_id = dt.id
            AND m.company_id = p_company_id AND COALESCE(m.is_active, true)
          JOIN public.chart_of_accounts a ON a.id = m.chart_of_accounts_id
            AND a.company_id = p_company_id AND COALESCE(a.is_active, true)
            AND COALESCE(a.is_header, false) = false AND COALESCE(a.account_level, 0) >= 3
          WHERE dt.type_code IN ('VEHICLES_ASSET', 'VEHICLE_INSTALLMENT_PAYABLE', 'VEHICLE_FINANCE_LONG_TERM',
            'ACCUMULATED_DEPRECIATION', 'OPENING_EQUITY', 'CASH', 'BANK')
          ORDER BY dt.type_code, m.id
        ) role), '{}'::jsonb),
      'suggestions', jsonb_build_object(
        'VEHICLES_ASSET', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', a.id, 'code', a.account_code,
            'name', a.account_name, 'nameAr', a.account_name_ar))
          FROM (SELECT * FROM public.chart_of_accounts a
            WHERE a.company_id = p_company_id AND COALESCE(a.is_active, true) AND COALESCE(a.is_header, false) = false
              AND COALESCE(a.account_level, 0) >= 3 AND lower(COALESCE(a.account_type, '')) IN ('asset', 'assets')
              AND (COALESCE(a.account_name_ar, '') ILIKE '%مركب%' OR a.account_name ILIKE '%vehicle%' OR a.account_name ILIKE '%car%')
            ORDER BY a.account_code LIMIT 5) a), '[]'::jsonb),
        'VEHICLE_INSTALLMENT_PAYABLE', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', a.id, 'code', a.account_code,
            'name', a.account_name, 'nameAr', a.account_name_ar))
          FROM (SELECT * FROM public.chart_of_accounts a
            WHERE a.company_id = p_company_id AND COALESCE(a.is_active, true) AND COALESCE(a.is_header, false) = false
              AND COALESCE(a.account_level, 0) >= 3 AND lower(COALESCE(a.account_type, '')) IN ('liability', 'liabilities')
              AND (COALESCE(a.account_name_ar, '') ILIKE '%أقساط%' OR COALESCE(a.account_name_ar, '') ILIKE '%قسط%'
                OR a.account_name ILIKE '%installment%')
            ORDER BY a.account_code LIMIT 5) a), '[]'::jsonb),
        'VEHICLE_FINANCE_LONG_TERM', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', a.id, 'code', a.account_code,
            'name', a.account_name, 'nameAr', a.account_name_ar))
          FROM (SELECT * FROM public.chart_of_accounts a
            WHERE a.company_id = p_company_id AND COALESCE(a.is_active, true) AND COALESCE(a.is_header, false) = false
              AND COALESCE(a.account_level, 0) >= 3 AND lower(COALESCE(a.account_type, '')) IN ('liability', 'liabilities')
              AND (COALESCE(a.account_name_ar, '') ILIKE '%تمويل%' OR a.account_name ILIKE '%financ%' OR a.account_name ILIKE '%loan%')
            ORDER BY a.account_code LIMIT 5) a), '[]'::jsonb),
        'ACCUMULATED_DEPRECIATION', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', a.id, 'code', a.account_code,
            'name', a.account_name, 'nameAr', a.account_name_ar))
          FROM (SELECT * FROM public.chart_of_accounts a
            WHERE a.company_id = p_company_id AND COALESCE(a.is_active, true) AND COALESCE(a.is_header, false) = false
              AND COALESCE(a.account_level, 0) >= 3 AND lower(COALESCE(a.account_type, '')) IN ('asset', 'assets')
              AND (COALESCE(a.account_name_ar, '') ILIKE '%مجمع%' OR COALESCE(a.account_name_ar, '') ILIKE '%استهلاك%'
                OR a.account_name ILIKE '%depreciation%' OR a.account_name ILIKE '%accumulated%')
            ORDER BY a.account_code LIMIT 5) a), '[]'::jsonb),
        'OPENING_EQUITY', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', a.id, 'code', a.account_code,
            'name', a.account_name, 'nameAr', a.account_name_ar))
          FROM (SELECT * FROM public.chart_of_accounts a
            WHERE a.company_id = p_company_id AND COALESCE(a.is_active, true) AND COALESCE(a.is_header, false) = false
              AND COALESCE(a.account_level, 0) >= 3 AND lower(COALESCE(a.account_type, '')) IN ('equity', 'equities')
            ORDER BY a.account_code LIMIT 5) a), '[]'::jsonb)
      )
    )
  ) INTO v_result;
  RETURN v_result;
END;
$fn$;

REVOKE ALL ON FUNCTION public.get_fleet_bridge_candidates_v1(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_fleet_bridge_candidates_v1(uuid, date) TO authenticated, service_role;
COMMENT ON FUNCTION public.get_fleet_bridge_candidates_v1(uuid, date) IS
  'Read-only fleet-to-ledger bridge inputs: capitalization, financing obligation, reclass and depreciation backfill candidates with already-bridged flags.';

NOTIFY pgrst,'reload schema';
COMMIT;
