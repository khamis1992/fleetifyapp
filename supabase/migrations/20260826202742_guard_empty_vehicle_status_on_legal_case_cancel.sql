-- Prevent legal-case cancellation and contract transitions from failing when
-- the derived vehicle state intentionally has no target status.

CREATE OR REPLACE FUNCTION public.update_vehicle_status_from_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state jsonb;
  v_target text;
BEGIN
  IF TG_OP <> 'INSERT' AND OLD.vehicle_id IS NOT NULL THEN
    v_state := public.system_agent_vehicle_derived_state(
      OLD.vehicle_id,
      OLD.company_id
    );
    v_target := NULLIF(BTRIM(v_state ->> 'target_status'), '');

    IF v_target IS NOT NULL
       AND EXISTS (
         SELECT 1
         FROM unnest(enum_range(NULL::public.vehicle_status)) AS allowed(status)
         WHERE allowed.status::text = v_target
       )
    THEN
      UPDATE public.vehicles
      SET status = v_target::public.vehicle_status,
          updated_at = now()
      WHERE id = OLD.vehicle_id
        AND company_id = OLD.company_id
        AND status IS DISTINCT FROM v_target::public.vehicle_status;
    END IF;
  END IF;

  IF TG_OP <> 'DELETE'
     AND NEW.vehicle_id IS NOT NULL
     AND (
       TG_OP = 'INSERT'
       OR NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id
       OR NEW.company_id IS DISTINCT FROM OLD.company_id
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.start_date IS DISTINCT FROM OLD.start_date
       OR NEW.end_date IS DISTINCT FROM OLD.end_date
     )
  THEN
    v_state := public.system_agent_vehicle_derived_state(
      NEW.vehicle_id,
      NEW.company_id
    );
    v_target := NULLIF(BTRIM(v_state ->> 'target_status'), '');

    IF v_target IS NOT NULL
       AND EXISTS (
         SELECT 1
         FROM unnest(enum_range(NULL::public.vehicle_status)) AS allowed(status)
         WHERE allowed.status::text = v_target
       )
    THEN
      UPDATE public.vehicles
      SET status = v_target::public.vehicle_status,
          updated_at = now()
      WHERE id = NEW.vehicle_id
        AND company_id = NEW.company_id
        AND status IS DISTINCT FROM v_target::public.vehicle_status;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_legal_cases_v1(
  p_company_id uuid,
  p_case_ids uuid[],
  p_reason text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_case public.legal_cases%ROWTYPE;
  v_state jsonb;
  v_target text;
  v_count integer := 0;
BEGIN
  v_actor_id := CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE p_actor_id END;

  IF v_actor_id IS NULL
     OR (auth.uid() IS NULL AND COALESCE(auth.role(), '') <> 'service_role')
  THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;

  IF auth.uid() IS NOT NULL
     AND public.get_user_company_id() IS DISTINCT FROM p_company_id
  THEN
    RAISE EXCEPTION 'Company access denied' USING ERRCODE = '42501';
  END IF;

  IF COALESCE(cardinality(p_case_ids), 0) = 0
     OR NULLIF(BTRIM(COALESCE(p_reason, '')), '') IS NULL
  THEN
    RAISE EXCEPTION 'Case identifiers and cancellation reason are required'
      USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_case_ids) requested(id)
    LEFT JOIN public.legal_cases legal_case
      ON legal_case.id = requested.id
     AND legal_case.company_id = p_company_id
    WHERE legal_case.id IS NULL
  )
  THEN
    RAISE EXCEPTION 'One or more legal cases are outside the current company'
      USING ERRCODE = '42501';
  END IF;

  FOR v_case IN
    SELECT *
    FROM public.legal_cases
    WHERE company_id = p_company_id
      AND id = ANY(p_case_ids)
    ORDER BY id
    FOR UPDATE
  LOOP
    IF lower(COALESCE(v_case.case_status, '')) <> 'cancelled' THEN
      UPDATE public.legal_cases
      SET case_status = 'cancelled',
          outcome_type = COALESCE(outcome_type, 'withdrawn'),
          outcome_date = COALESCE(outcome_date, CURRENT_DATE),
          outcome_notes = concat_ws(
            E'\n',
            NULLIF(outcome_notes, ''),
            BTRIM(p_reason)
          ),
          updated_at = now()
      WHERE id = v_case.id
        AND company_id = p_company_id;

      INSERT INTO public.legal_case_activities(
        case_id,
        company_id,
        activity_type,
        activity_title,
        activity_description,
        created_by
      )
      VALUES (
        v_case.id,
        p_company_id,
        'case_cancelled',
        'تم إلغاء القضية',
        'سبب الإلغاء: ' || BTRIM(p_reason),
        v_actor_id
      );

      v_count := v_count + 1;
    END IF;

    IF v_case.contract_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1
         FROM public.legal_cases other_case
         WHERE other_case.company_id = p_company_id
           AND other_case.contract_id = v_case.contract_id
           AND other_case.id <> v_case.id
           AND lower(COALESCE(other_case.case_status, '')) IN (
             'open',
             'active',
             'pending',
             'on_hold',
             'under_review'
           )
       )
    THEN
      UPDATE public.contracts
      SET status = 'active',
          suspension_reason = NULL,
          updated_at = now()
      WHERE id = v_case.contract_id
        AND company_id = p_company_id
        AND lower(COALESCE(status::text, '')) = 'under_legal_procedure';

      SELECT public.system_agent_vehicle_derived_state(
        contract.vehicle_id,
        p_company_id
      )
      INTO v_state
      FROM public.contracts contract
      WHERE contract.id = v_case.contract_id
        AND contract.company_id = p_company_id
        AND contract.vehicle_id IS NOT NULL;

      v_target := NULLIF(BTRIM(v_state ->> 'target_status'), '');

      IF v_target IS NOT NULL
         AND EXISTS (
           SELECT 1
           FROM unnest(enum_range(NULL::public.vehicle_status)) AS allowed(status)
           WHERE allowed.status::text = v_target
         )
      THEN
        UPDATE public.vehicles vehicle
        SET status = v_target::public.vehicle_status,
            updated_at = now()
        FROM public.contracts contract
        WHERE contract.id = v_case.contract_id
          AND contract.vehicle_id = vehicle.id
          AND vehicle.company_id = p_company_id;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('cancelled_cases', v_count);
END;
$$;

COMMENT ON FUNCTION public.update_vehicle_status_from_contract() IS
'Recalculates affected vehicle states from canonical contracts, reservations, maintenance, and dates after contract changes; blank or invalid derived statuses are ignored.';

COMMENT ON FUNCTION public.cancel_legal_cases_v1(uuid, uuid[], text, uuid) IS
'Cancels legal cases atomically while preserving audit history and safely skipping blank or invalid derived vehicle statuses.';
