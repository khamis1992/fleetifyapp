-- Keep contract cancellation, traffic-penalty resolution and the canonical
-- vehicle checkout report in the same transaction. This replaces the legacy
-- UI path that wrote contract_vehicle_returns after cancellation committed.

BEGIN;

CREATE OR REPLACE FUNCTION public.cancel_contract_with_return_and_penalties_v2(
  p_company_id uuid,
  p_contract_id uuid,
  p_reason text,
  p_transfer_open_penalties_to_company boolean DEFAULT false,
  p_return_payload jsonb DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_cancellation jsonb;
  v_return jsonb;
  v_condition text;
BEGIN
  IF p_return_payload IS NOT NULL
     AND jsonb_typeof(p_return_payload) IS DISTINCT FROM 'object'
  THEN
    RAISE EXCEPTION 'INVALID_VEHICLE_RETURN_PAYLOAD' USING ERRCODE = '22023';
  END IF;

  v_cancellation := public.cancel_contract_with_company_traffic_penalties_v1(
    p_company_id,
    p_contract_id,
    p_reason,
    p_transfer_open_penalties_to_company,
    p_actor_id
  );

  IF p_return_payload IS NOT NULL THEN
    v_condition := lower(COALESCE(p_return_payload ->> 'vehicle_condition', 'good'));
    IF v_condition = 'excellent' THEN
      v_condition := 'good';
    END IF;

    v_return := public.record_contract_vehicle_return_v1(
      p_contract_id => p_contract_id,
      p_inspection_date => (p_return_payload ->> 'inspection_date')::timestamptz,
      p_mileage_reading => (p_return_payload ->> 'odometer_reading')::integer,
      p_fuel_level => (p_return_payload ->> 'fuel_level')::numeric,
      p_overall_condition => v_condition,
      p_condition_items => jsonb_build_object(
        'source', 'contract_cancellation',
        'vehicle_condition', v_condition,
        'damages', COALESCE(p_return_payload -> 'damages', '[]'::jsonb)
      ),
      p_damage_points => '[]'::jsonb,
      p_damage_items => COALESCE(p_return_payload -> 'damages', '[]'::jsonb),
      p_photos => '[]'::jsonb,
      p_notes => NULLIF(btrim(p_return_payload ->> 'notes'), ''),
      p_actor_id => p_actor_id
    );
  END IF;

  RETURN v_cancellation || jsonb_build_object(
    'vehicle_return_recorded', p_return_payload IS NOT NULL,
    'vehicle_return', v_return
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.cancel_contract_with_return_and_penalties_v2(
  uuid, uuid, text, boolean, jsonb, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_contract_with_return_and_penalties_v2(
  uuid, uuid, text, boolean, jsonb, uuid
) TO authenticated, service_role;

COMMENT ON FUNCTION public.cancel_contract_with_return_and_penalties_v2(
  uuid, uuid, text, boolean, jsonb, uuid
) IS 'Atomically cancels a contract, resolves its traffic penalties, and optionally records the canonical vehicle checkout report.';

COMMIT;
