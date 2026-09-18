-- Reconcile the authoritative August 2026 fleet ground-truth report.
-- The report proves operational state/custody, not a signed contract or receipt.
-- Contract, invoice, payment, journal, and legal-case rows are intentionally untouched.

BEGIN;

CREATE TABLE IF NOT EXISTS public.fleet_reconciliation_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  source_file_name text NOT NULL,
  source_sha256 text NOT NULL,
  source_as_of date NOT NULL,
  status text NOT NULL DEFAULT 'applying'
    CHECK (status IN ('applying', 'applied', 'rolled_back')),
  source_row_count integer NOT NULL,
  status_change_count integer NOT NULL,
  customer_snapshot_count integer NOT NULL,
  applied_at timestamptz,
  rolled_back_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, source_sha256)
);

CREATE TABLE IF NOT EXISTS public.fleet_reconciliation_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.fleet_reconciliation_batches(id) ON DELETE RESTRICT,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  source_row integer NOT NULL CHECK (source_row > 1),
  source_plate text NOT NULL,
  source_result text NOT NULL,
  source_classification text NOT NULL,
  source_customer_name text,
  source_customer_phone text,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  supporting_contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  identity_resolution text NOT NULL,
  target_status public.vehicle_status NOT NULL,
  target_location text,
  decision_reason text NOT NULL,
  source_fingerprint text NOT NULL,
  source_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  before_state jsonb NOT NULL,
  after_state jsonb,
  is_active boolean NOT NULL DEFAULT true,
  closed_at timestamptz,
  closed_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, source_row),
  UNIQUE (batch_id, vehicle_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS fleet_reconciliation_one_active_vehicle
  ON public.fleet_reconciliation_assignments(company_id, vehicle_id)
  WHERE is_active;

CREATE INDEX IF NOT EXISTS fleet_reconciliation_assignments_customer
  ON public.fleet_reconciliation_assignments(company_id, customer_id)
  WHERE is_active AND customer_id IS NOT NULL;

ALTER TABLE public.fleet_reconciliation_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_reconciliation_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fleet_reconciliation_batches_company_read
  ON public.fleet_reconciliation_batches;
CREATE POLICY fleet_reconciliation_batches_company_read
  ON public.fleet_reconciliation_batches
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS fleet_reconciliation_assignments_company_read
  ON public.fleet_reconciliation_assignments;
CREATE POLICY fleet_reconciliation_assignments_company_read
  ON public.fleet_reconciliation_assignments
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());

REVOKE ALL ON public.fleet_reconciliation_batches FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.fleet_reconciliation_assignments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.fleet_reconciliation_batches TO authenticated;
GRANT SELECT ON public.fleet_reconciliation_assignments TO authenticated;
GRANT ALL ON public.fleet_reconciliation_batches TO service_role;
GRANT ALL ON public.fleet_reconciliation_assignments TO service_role;

CREATE OR REPLACE FUNCTION public.close_fleet_reconciliation_override_on_manual_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND COALESCE(current_setting('fleetify.reconciliation_apply', true), '') <> 'on'
  THEN
    UPDATE public.fleet_reconciliation_assignments assignment
    SET is_active = false,
        closed_at = now(),
        closed_reason = 'superseded_by_later_vehicle_status_change'
    WHERE assignment.company_id = NEW.company_id
      AND assignment.vehicle_id = NEW.id
      AND assignment.is_active;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.close_fleet_reconciliation_override_on_manual_status()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_close_fleet_reconciliation_override
  ON public.vehicles;
CREATE TRIGGER trg_close_fleet_reconciliation_override
BEFORE UPDATE OF status ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.close_fleet_reconciliation_override_on_manual_status();

CREATE OR REPLACE FUNCTION public.system_agent_vehicle_derived_state(
  p_vehicle_id uuid,
  p_company_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_vehicle public.vehicles%ROWTYPE;
  v_has_active_contract boolean := false;
  v_has_open_maintenance boolean := false;
  v_has_active_reservation boolean := false;
  v_override_status text;
  v_override_assignment_id uuid;
  v_target_status text;
  v_maximum_mileage numeric := 0;
BEGIN
  SELECT * INTO v_vehicle
  FROM public.vehicles vehicle
  WHERE vehicle.id = p_vehicle_id
    AND vehicle.company_id = p_company_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT assignment.id, assignment.target_status::text
  INTO v_override_assignment_id, v_override_status
  FROM public.fleet_reconciliation_assignments assignment
  WHERE assignment.company_id = p_company_id
    AND assignment.vehicle_id = p_vehicle_id
    AND assignment.is_active
    AND NOT EXISTS (
      SELECT 1
      FROM public.contracts newer_contract
      WHERE newer_contract.company_id = assignment.company_id
        AND newer_contract.vehicle_id = assignment.vehicle_id
        AND newer_contract.created_at > assignment.created_at
        AND (
          lower(COALESCE(newer_contract.status::text, '')) = 'active'
          OR (
            lower(COALESCE(newer_contract.status::text, '')) = 'under_legal_procedure'
            AND COALESCE(newer_contract.vehicle_returned, false) = false
          )
        )
        AND newer_contract.start_date <= CURRENT_DATE
        AND newer_contract.end_date >= CURRENT_DATE
    )
  ORDER BY assignment.created_at DESC, assignment.id DESC
  LIMIT 1;

  SELECT EXISTS (
    SELECT 1
    FROM public.contracts contract
    WHERE contract.company_id = p_company_id
      AND contract.vehicle_id = p_vehicle_id
      AND (
        lower(COALESCE(contract.status::text, '')) = 'active'
        OR (
          lower(COALESCE(contract.status::text, '')) = 'under_legal_procedure'
          AND COALESCE(contract.vehicle_returned, false) = false
        )
      )
      AND contract.start_date <= CURRENT_DATE
      AND contract.end_date >= CURRENT_DATE
  ) INTO v_has_active_contract;

  SELECT EXISTS (
    SELECT 1
    FROM public.vehicle_maintenance maintenance
    WHERE maintenance.company_id = p_company_id
      AND maintenance.vehicle_id = p_vehicle_id
      AND lower(COALESCE(maintenance.status::text, '')) = 'in_progress'
  ) INTO v_has_open_maintenance;

  SELECT EXISTS (
    SELECT 1
    FROM public.vehicle_reservations reservation
    WHERE reservation.company_id = p_company_id
      AND reservation.vehicle_id = p_vehicle_id
      AND lower(COALESCE(reservation.status::text, '')) NOT IN (
        'cancelled', 'canceled', 'completed', 'expired'
      )
      AND reservation.start_date <= CURRENT_DATE
      AND reservation.end_date >= CURRENT_DATE
  ) INTO v_has_active_reservation;

  v_target_status := CASE
    WHEN v_override_status IS NOT NULL THEN v_override_status
    WHEN lower(COALESCE(v_vehicle.status::text, '')) IN (
      'maintenance', 'accident', 'stolen', 'police_station',
      'out_of_service', 'reserved_employee', 'municipality'
    ) THEN NULL
    WHEN v_has_open_maintenance THEN 'maintenance'
    WHEN v_has_active_contract THEN 'rented'
    WHEN v_has_active_reservation THEN 'street_52'
    WHEN lower(COALESCE(v_vehicle.status::text, '')) = 'street_52' THEN NULL
    WHEN v_vehicle.is_active = false THEN 'out_of_service'
    ELSE 'available'
  END;

  SELECT GREATEST(
    COALESCE(v_vehicle.current_mileage, 0),
    COALESCE(v_vehicle.odometer_reading, 0),
    COALESCE(MAX(reading.odometer_reading), 0)
  )
  INTO v_maximum_mileage
  FROM public.odometer_readings reading
  WHERE reading.company_id = p_company_id
    AND reading.vehicle_id = p_vehicle_id;

  RETURN jsonb_build_object(
    'target_status', v_target_status,
    'maximum_mileage', round(v_maximum_mileage::numeric, 2),
    'has_active_contract', v_has_active_contract,
    'has_open_maintenance', v_has_open_maintenance,
    'has_active_reservation', v_has_active_reservation,
    'reconciliation_assignment_id', v_override_assignment_id,
    'reconciliation_override_status', v_override_status
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.system_agent_vehicle_derived_state(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_vehicle_derived_state(uuid, uuid)
  TO service_role;

CREATE OR REPLACE VIEW public.vehicle_current_operational_state
WITH (security_invoker = true)
AS
SELECT
  vehicle.company_id,
  vehicle.id AS vehicle_id,
  vehicle.plate_number,
  vehicle.status,
  vehicle.location,
  assignment.id AS reconciliation_assignment_id,
  assignment.batch_id AS reconciliation_batch_id,
  assignment.source_classification,
  assignment.source_customer_name,
  assignment.source_customer_phone,
  assignment.customer_id AS operational_customer_id,
  assignment.supporting_contract_id,
  assignment.identity_resolution,
  assignment.created_at AS operational_verified_at,
  CASE
    WHEN assignment.id IS NOT NULL THEN assignment.source_customer_name
    ELSE COALESCE(
      NULLIF(concat_ws(' ', contract_customer.first_name_ar, contract_customer.last_name_ar), ''),
      NULLIF(concat_ws(' ', contract_customer.first_name, contract_customer.last_name), '')
    )
  END AS operational_customer_name,
  CASE
    WHEN assignment.id IS NOT NULL THEN assignment.source_customer_phone
    ELSE contract_customer.phone
  END AS operational_customer_phone,
  current_contract.id AS current_contract_id,
  current_contract.contract_number AS current_contract_number,
  current_contract.customer_id AS contract_customer_id
FROM public.vehicles vehicle
LEFT JOIN LATERAL (
  SELECT item.*
  FROM public.fleet_reconciliation_assignments item
  WHERE item.company_id = vehicle.company_id
    AND item.vehicle_id = vehicle.id
    AND item.is_active
    AND NOT EXISTS (
      SELECT 1
      FROM public.contracts newer_contract
      WHERE newer_contract.company_id = item.company_id
        AND newer_contract.vehicle_id = item.vehicle_id
        AND newer_contract.created_at > item.created_at
        AND (
          newer_contract.status = 'active'
          OR (
            newer_contract.status = 'under_legal_procedure'
            AND COALESCE(newer_contract.vehicle_returned, false) = false
          )
        )
        AND newer_contract.start_date <= CURRENT_DATE
        AND newer_contract.end_date >= CURRENT_DATE
    )
  ORDER BY item.created_at DESC, item.id DESC
  LIMIT 1
) assignment ON true
LEFT JOIN LATERAL (
  SELECT contract.*
  FROM public.contracts contract
  WHERE contract.company_id = vehicle.company_id
    AND contract.vehicle_id = vehicle.id
    AND (
      contract.status = 'active'
      OR (
        contract.status = 'under_legal_procedure'
        AND COALESCE(contract.vehicle_returned, false) = false
      )
    )
    AND contract.start_date <= CURRENT_DATE
    AND contract.end_date >= CURRENT_DATE
  ORDER BY
    CASE WHEN contract.status = 'active' THEN 0 ELSE 1 END,
    contract.created_at DESC,
    contract.id DESC
  LIMIT 1
) current_contract ON true
LEFT JOIN public.customers contract_customer
  ON contract_customer.id = current_contract.customer_id
 AND contract_customer.company_id = current_contract.company_id;

REVOKE ALL ON public.vehicle_current_operational_state FROM PUBLIC, anon;
GRANT SELECT ON public.vehicle_current_operational_state TO authenticated, service_role;

DO $repair$
DECLARE
  v_company_id constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid;
  v_source_sha constant text := '52D60964DEA821D023BEFDE6FB6E16F5846DC54180047364BAE7F64117CDC225';
  v_manifest jsonb := $manifest$[{"sourceRow":2,"sourcePlate":"648144","expectedVehicleStatus":"street_52","targetStatus":"rented","targetLocation":null,"sourceResult":"عميل وحالة مختلفان","sourceClassification":"مستأجر","sourceCustomerName":"سفيان المختار الصالح","sourceCustomerPhone":null,"customerId":"ba9628c8-aff8-4ac0-a510-b64c9a754154","supportingContractNumber":null,"identityResolution":"exact_name","decisionReason":"reported_current_renter","evidence":{"samePerson":"لا","systemCustomerName":"زكرياء بن احمد","systemContractNumber":"HIST-XLS-B70-648144","systemContractStatus":"ملغى","reportInstallment":1500,"listNote":null,"vehicleNote":"فتح بلاغ | MOI حجز - شارع 52 - آخر إشعار Wed 8/12/2026 8:14 AM (4 إشعار)"}},{"sourceRow":3,"sourcePlate":"893409","expectedVehicleStatus":"available","targetStatus":"rented","targetLocation":null,"sourceResult":"عميل وحالة مختلفان","sourceClassification":"مستأجر","sourceCustomerName":"عقبة قصعاوي","sourceCustomerPhone":"50409220","customerId":"d5f20c8e-55ef-46c8-bcca-468afa4b55c6","supportingContractNumber":null,"identityResolution":"exact_phone","decisionReason":"reported_current_renter","evidence":{"samePerson":"لا","systemCustomerName":"عبد الصمد بن عزوز","systemContractNumber":"AGR-202504-415263","systemContractStatus":"ملغى","reportInstallment":1600,"listNote":null,"vehicleNote":null}},{"sourceRow":4,"sourcePlate":"2781","expectedVehicleStatus":"street_52","targetStatus":"rented","targetLocation":null,"sourceResult":"عميل وحالة مختلفان","sourceClassification":"مستأجر","sourceCustomerName":"محمد بكوش","sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"source_snapshot_only","decisionReason":"reported_current_renter","evidence":{"samePerson":"لا يوجد اسم في النظام","systemCustomerName":null,"systemContractNumber":null,"systemContractStatus":null,"reportInstallment":1500,"listNote":null,"vehicleNote":""}},{"sourceRow":5,"sourcePlate":"603353","expectedVehicleStatus":"available","targetStatus":"rented","targetLocation":null,"sourceResult":"عميل وحالة مختلفان","sourceClassification":"مستأجر","sourceCustomerName":"مصطفى بالقايد 5892","sourceCustomerPhone":"31245752","customerId":"b13e8b13-0320-4a87-9a46-256c5c85c635","supportingContractNumber":null,"identityResolution":"exact_phone_and_name","decisionReason":"reported_current_renter","evidence":{"samePerson":"لا يوجد اسم في النظام","systemCustomerName":null,"systemContractNumber":null,"systemContractStatus":null,"reportInstallment":1700,"listNote":null,"vehicleNote":null}},{"sourceRow":6,"sourcePlate":"7039","expectedVehicleStatus":"available","targetStatus":"rented","targetLocation":null,"sourceResult":"عميل وحالة مختلفان","sourceClassification":"مستأجر","sourceCustomerName":"محسن الفرحاني","sourceCustomerPhone":"60045111","customerId":null,"supportingContractNumber":null,"identityResolution":"source_snapshot_only","decisionReason":"reported_current_renter","evidence":{"samePerson":"لا","systemCustomerName":"عبد الله برهام","systemContractNumber":"AGR-202504-423180","systemContractStatus":"ملغى","reportInstallment":1500,"listNote":"500","vehicleNote":null}},{"sourceRow":7,"sourcePlate":"10664","expectedVehicleStatus":"available","targetStatus":"rented","targetLocation":null,"sourceResult":"عميل وحالة مختلفان","sourceClassification":"مستأجر","sourceCustomerName":"رئيس رجب","sourceCustomerPhone":"50415688","customerId":null,"supportingContractNumber":null,"identityResolution":"source_snapshot_only","decisionReason":"reported_current_renter","evidence":{"samePerson":"لا","systemCustomerName":"عنتر علي النمر","systemContractNumber":"C-ALF-0093","systemContractStatus":"ملغى","reportInstallment":1500,"listNote":"900","vehicleNote":"فتح بلاغ ب اسم اشرف"}},{"sourceRow":8,"sourcePlate":"10665","expectedVehicleStatus":"available","targetStatus":"rented","targetLocation":null,"sourceResult":"عميل وحالة مختلفان","sourceClassification":"مستأجر","sourceCustomerName":"اإبنيزر","sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"source_snapshot_only","decisionReason":"reported_current_renter","evidence":{"samePerson":"لا","systemCustomerName":"احمد الطاهر ادريس","systemContractNumber":"LTO2024273","systemContractStatus":"ملغى","reportInstallment":null,"listNote":null,"vehicleNote":null}},{"sourceRow":9,"sourcePlate":"10856","expectedVehicleStatus":"available","targetStatus":"rented","targetLocation":null,"sourceResult":"عميل وحالة مختلفان","sourceClassification":"مستأجر","sourceCustomerName":"أيمن محمد صوان","sourceCustomerPhone":"77073470","customerId":null,"supportingContractNumber":null,"identityResolution":"source_snapshot_only","decisionReason":"reported_current_renter","evidence":{"samePerson":"لا","systemCustomerName":"احمد الطاهر نصره","systemContractNumber":"LTO202455","systemContractStatus":"ملغى","reportInstallment":1500,"listNote":"1500","vehicleNote":"مفقودة احتمال في البلدية"}},{"sourceRow":10,"sourcePlate":"846485","expectedVehicleStatus":"reserved_employee","targetStatus":"rented","targetLocation":null,"sourceResult":"عميل وحالة مختلفان","sourceClassification":"مستأجر","sourceCustomerName":"اسامة","sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"source_snapshot_only","decisionReason":"reported_current_renter","evidence":{"samePerson":"لا","systemCustomerName":"حسن بن ساسی ظاهری","systemContractNumber":"LTO20248","systemContractStatus":"ملغى","reportInstallment":null,"listNote":null,"vehicleNote":null}},{"sourceRow":11,"sourcePlate":"847601","expectedVehicleStatus":"available","targetStatus":"rented","targetLocation":null,"sourceResult":"عميل وحالة مختلفان","sourceClassification":"مستأجر","sourceCustomerName":"طارق","sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"source_snapshot_only","decisionReason":"reported_current_renter","evidence":{"samePerson":"لا يوجد اسم في النظام","systemCustomerName":null,"systemContractNumber":null,"systemContractStatus":null,"reportInstallment":null,"listNote":null,"vehicleNote":"طارق"}},{"sourceRow":12,"sourcePlate":"847932","expectedVehicleStatus":"available","targetStatus":"rented","targetLocation":null,"sourceResult":"عميل وحالة مختلفان","sourceClassification":"مستأجر","sourceCustomerName":"حسام ساسي ظاهري","sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"source_snapshot_only","decisionReason":"reported_current_renter","evidence":{"samePerson":"لا","systemCustomerName":"رافيشانكار باندي","systemContractNumber":"LTO2024104","systemContractStatus":"منتهي","reportInstallment":2100,"listNote":null,"vehicleNote":null}},{"sourceRow":13,"sourcePlate":"8204","expectedVehicleStatus":"available","targetStatus":"rented","targetLocation":null,"sourceResult":"عميل وحالة مختلفان","sourceClassification":"مستأجر","sourceCustomerName":"سيف الدين نور","sourceCustomerPhone":"33773235","customerId":null,"supportingContractNumber":null,"identityResolution":"source_snapshot_only","decisionReason":"reported_current_renter","evidence":{"samePerson":"لا","systemCustomerName":"الحبيب الحوسين الخليفي","systemContractNumber":"LTO2024150","systemContractStatus":"إجراء قانوني","reportInstallment":1500,"listNote":"1500","vehicleNote":null}},{"sourceRow":14,"sourcePlate":"8209","expectedVehicleStatus":"available","targetStatus":"rented","targetLocation":null,"sourceResult":"عميل وحالة مختلفان","sourceClassification":"مستأجر","sourceCustomerName":"طارق تطواني","sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"source_snapshot_only","decisionReason":"reported_current_renter","evidence":{"samePerson":"لا","systemCustomerName":"سعيد الحبابي","systemContractNumber":"LTO2024276","systemContractStatus":"ملغى","reportInstallment":null,"listNote":null,"vehicleNote":null}},{"sourceRow":15,"sourcePlate":"8213","expectedVehicleStatus":"available","targetStatus":"rented","targetLocation":null,"sourceResult":"عميل وحالة مختلفان","sourceClassification":"مستأجر","sourceCustomerName":"يسري بوزعيبة","sourceCustomerPhone":"51039263","customerId":"a07a44c5-a8ca-4bc9-b7f8-07b87e491fb8","supportingContractNumber":null,"identityResolution":"exact_phone","decisionReason":"reported_current_renter","evidence":{"samePerson":"لا","systemCustomerName":"يحيى هلال الصخري","systemContractNumber":"HIST-XLS-GAC-8213","systemContractStatus":"ملغى","reportInstallment":1500,"listNote":"شهر 61500","vehicleNote":null}},{"sourceRow":16,"sourcePlate":"706150","expectedVehicleStatus":"rented","targetStatus":"rented","targetLocation":null,"sourceResult":"اختلاف عميل","sourceClassification":"مستأجر","sourceCustomerName":"أألياس اليعقوبي","sourceCustomerPhone":"70704543","customerId":"42c92a86-d50d-4a70-a138-d9e4ae51f8b0","supportingContractNumber":"HIST-XLS-B70-706150","identityResolution":"exact_phone_existing_contract","decisionReason":"reported_current_renter","evidence":{"samePerson":"لا","systemCustomerName":"مروان باكير","systemContractNumber":"C-ALF-0058","systemContractStatus":"ساري","reportInstallment":1600,"listNote":"حجز","vehicleNote":null}},{"sourceRow":17,"sourcePlate":"857051","expectedVehicleStatus":"rented","targetStatus":"rented","targetLocation":null,"sourceResult":"اختلاف عميل","sourceClassification":"مستأجر","sourceCustomerName":"فخر الدين عثمان","sourceCustomerPhone":"55422771","customerId":"0428f7e0-0a86-4fd4-9f1d-5882fdf29479","supportingContractNumber":null,"identityResolution":"exact_phone","decisionReason":"reported_current_renter","evidence":{"samePerson":"لا","systemCustomerName":"هاني هشام","systemContractNumber":"LTO2024152","systemContractStatus":"ساري","reportInstallment":1650,"listNote":null,"vehicleNote":"شهاب"}},{"sourceRow":18,"sourcePlate":"2773","expectedVehicleStatus":"rented","targetStatus":"rented","targetLocation":null,"sourceResult":"اختلاف عميل","sourceClassification":"مستأجر","sourceCustomerName":"حسام الدين إبراهيم","sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"source_snapshot_only","decisionReason":"reported_current_renter","evidence":{"samePerson":"لا","systemCustomerName":"مجدي بخيت اسماعيل حماد","systemContractNumber":"C-ALF-0018","systemContractStatus":"إجراء قانوني","reportInstallment":1500,"listNote":"الصناعية","vehicleNote":"عمل عقد جديد والغاء العقود السابقة"}},{"sourceRow":19,"sourcePlate":"2782","expectedVehicleStatus":"rented","targetStatus":"rented","targetLocation":null,"sourceResult":"اختلاف عميل","sourceClassification":"مستأجر","sourceCustomerName":"سعيد الهلالي","sourceCustomerPhone":null,"customerId":"c2fa0cd4-3a6b-42c7-ad27-32e878e2b160","supportingContractNumber":null,"identityResolution":"exact_name","decisionReason":"reported_current_renter","evidence":{"samePerson":"لا","systemCustomerName":"شرفي عبد الله","systemContractNumber":"AGR-202504-399591","systemContractStatus":"ساري","reportInstallment":1000,"listNote":null,"vehicleNote":null}},{"sourceRow":20,"sourcePlate":"7038","expectedVehicleStatus":"rented","targetStatus":"rented","targetLocation":null,"sourceResult":"اختلاف عميل","sourceClassification":"مستأجر","sourceCustomerName":"مهدي محمد القطاري","sourceCustomerPhone":"51332508","customerId":"bce84d00-5b27-4bca-a071-6f19d2b07590","supportingContractNumber":null,"identityResolution":"exact_phone","decisionReason":"reported_current_renter","evidence":{"samePerson":"لا","systemCustomerName":"ثامر محمد السيد","systemContractNumber":"C-ALF-0048","systemContractStatus":"ساري","reportInstallment":1600,"listNote":"1600","vehicleNote":null}},{"sourceRow":21,"sourcePlate":"7054","expectedVehicleStatus":"rented","targetStatus":"rented","targetLocation":null,"sourceResult":"اختلاف عميل","sourceClassification":"مستأجر","sourceCustomerName":"عمر مبروكي","sourceCustomerPhone":"31598966","customerId":"87004aeb-f02a-456d-8160-4f8e0338712f","supportingContractNumber":null,"identityResolution":"exact_phone","decisionReason":"reported_current_renter","evidence":{"samePerson":"لا","systemCustomerName":"محمد جاسم الصالح","systemContractNumber":"C-ALF-0053","systemContractStatus":"إجراء قانوني","reportInstallment":1500,"listNote":null,"vehicleNote":null}},{"sourceRow":22,"sourcePlate":"10853","expectedVehicleStatus":"rented","targetStatus":"rented","targetLocation":null,"sourceResult":"اختلاف عميل","sourceClassification":"مستأجر","sourceCustomerName":"خالد محمدعالكوب","sourceCustomerPhone":"66047108","customerId":null,"supportingContractNumber":null,"identityResolution":"source_snapshot_only","decisionReason":"reported_current_renter","evidence":{"samePerson":"لا","systemCustomerName":"محمد ابراهيم نور غد غول","systemContractNumber":"C-ALF-0099","systemContractStatus":"إجراء قانوني","reportInstallment":1500,"listNote":"1500","vehicleNote":null}},{"sourceRow":23,"sourcePlate":"10857","expectedVehicleStatus":"rented","targetStatus":"rented","targetLocation":null,"sourceResult":"اختلاف عميل","sourceClassification":"مستأجر","sourceCustomerName":"شمس الدين خلفة","sourceCustomerPhone":"50032458","customerId":null,"supportingContractNumber":null,"identityResolution":"source_snapshot_only","decisionReason":"reported_current_renter","evidence":{"samePerson":"لا","systemCustomerName":"مجدي احمد عبدالله علي","systemContractNumber":"C-ALF-0100","systemContractStatus":"ساري","reportInstallment":1500,"listNote":"1500","vehicleNote":null}},{"sourceRow":24,"sourcePlate":"848014","expectedVehicleStatus":"rented","targetStatus":"rented","targetLocation":null,"sourceResult":"اختلاف عميل","sourceClassification":"مستأجر","sourceCustomerName":"طارق","sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"source_snapshot_only","decisionReason":"reported_current_renter","evidence":{"samePerson":"لا","systemCustomerName":"حمدي ثابت خليفة محمد","systemContractNumber":"C-ALF-0105","systemContractStatus":"ساري","reportInstallment":null,"listNote":"-","vehicleNote":"عصام ميكانيكي"}},{"sourceRow":25,"sourcePlate":"8206","expectedVehicleStatus":"rented","targetStatus":"rented","targetLocation":null,"sourceResult":"اختلاف عميل","sourceClassification":"مستأجر","sourceCustomerName":"محمد علي سليم","sourceCustomerPhone":"30797703","customerId":"214a553f-0fcc-4469-97bb-a10b26a657d1","supportingContractNumber":"C-ALF-0074","identityResolution":"exact_name_existing_contract_phone_typo","decisionReason":"reported_current_renter","evidence":{"samePerson":"لا","systemCustomerName":"محمد صالح فرج حامد","systemContractNumber":"C-ALF-0071","systemContractStatus":"إجراء قانوني","reportInstallment":1500,"listNote":null,"vehicleNote":null}},{"sourceRow":26,"sourcePlate":"8211","expectedVehicleStatus":"rented","targetStatus":"rented","targetLocation":null,"sourceResult":"اختلاف عميل","sourceClassification":"مستأجر","sourceCustomerName":"يحي الصخيري","sourceCustomerPhone":"50447989","customerId":null,"supportingContractNumber":null,"identityResolution":"same_family_unresolved","decisionReason":"reported_current_renter","evidence":{"samePerson":"نفس العائلة","systemCustomerName":"علي هلال الصخري","systemContractNumber":"C-ALF-0076","systemContractStatus":"ساري","reportInstallment":1500,"listNote":"شهر 71500","vehicleNote":"محمد المندوب"}},{"sourceRow":27,"sourcePlate":"17216","expectedVehicleStatus":"municipality","targetStatus":"maintenance","targetLocation":"الكراج","sourceResult":"اختلاف حالة","sourceClassification":"الكراج","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_garage","evidence":{"samePerson":"لا ينطبق","systemCustomerName":"عبد العزيز بن نبيل جرفال","systemContractNumber":"LTO202410","systemContractStatus":"إجراء قانوني","reportInstallment":null,"listNote":null,"vehicleNote":""}},{"sourceRow":28,"sourcePlate":"21849","expectedVehicleStatus":"rented","targetStatus":"street_52","targetLocation":"شارع 52","sourceResult":"اختلاف حالة","sourceClassification":"شرطة/حجز","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_street_52","evidence":{"samePerson":"لا ينطبق","systemCustomerName":"فادي السعيدي","systemContractNumber":"AGR-202504-403263","systemContractStatus":"إجراء قانوني","reportInstallment":null,"listNote":null,"vehicleNote":"MOI حجز - شارع 52 - آخر إشعار Tue 6/9/2026 7:17 AM (3 إشعار)"}},{"sourceRow":29,"sourcePlate":"21860","expectedVehicleStatus":"available","targetStatus":"rented","targetLocation":null,"sourceResult":"اختلاف حالة","sourceClassification":"مستأجر","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_current_renter","evidence":{"samePerson":"نعم","systemCustomerName":"محمد ضياء العويني","systemContractNumber":"AGR-202502-0426","systemContractStatus":"ملغى","reportInstallment":1700,"listNote":null,"vehicleNote":null}},{"sourceRow":30,"sourcePlate":"381247","expectedVehicleStatus":"rented","targetStatus":"available","targetLocation":"أم صلال","sourceResult":"اختلاف حالة","sourceClassification":"أم صلال","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_location","evidence":{"samePerson":"لا ينطبق","systemCustomerName":"عقبة يوسف قصعاوي","systemContractNumber":"C-ALF-0030","systemContractStatus":"ساري","reportInstallment":1500,"listNote":"ام صلال","vehicleNote":null}},{"sourceRow":31,"sourcePlate":"676281","expectedVehicleStatus":"available","targetStatus":"rented","targetLocation":null,"sourceResult":"اختلاف حالة","sourceClassification":"مستأجر","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_current_renter","evidence":{"samePerson":"نعم","systemCustomerName":"حمزة بادو","systemContractNumber":"LTO202437","systemContractStatus":"ملغى","reportInstallment":1050,"listNote":null,"vehicleNote":null}},{"sourceRow":32,"sourcePlate":"721440","expectedVehicleStatus":"rented","targetStatus":"accident","targetLocation":"حادث/تأمين","sourceResult":"اختلاف حالة","sourceClassification":"حادث/تأمين","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_accident","evidence":{"samePerson":"لا ينطبق","systemCustomerName":"مهدي الشريف عبد الرحيم يوسف","systemContractNumber":"LTO2024252","systemContractStatus":"إجراء قانوني","reportInstallment":null,"listNote":"-حادث","vehicleNote":null}},{"sourceRow":33,"sourcePlate":"722134","expectedVehicleStatus":"available","targetStatus":"rented","targetLocation":null,"sourceResult":"اختلاف حالة","sourceClassification":"مستأجر","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_current_renter","evidence":{"samePerson":"نعم","systemCustomerName":"حمدي ثابت خليفة محمد","systemContractNumber":"LTO2024230","systemContractStatus":"ملغى","reportInstallment":null,"listNote":"-- - -- - -- --","vehicleNote":null}},{"sourceRow":34,"sourcePlate":"725473","expectedVehicleStatus":"rented","targetStatus":"police_station","targetLocation":"مركز الشرطة","sourceResult":"اختلاف حالة","sourceClassification":"شرطة/حجز","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_police_station","evidence":{"samePerson":"لا ينطبق","systemCustomerName":"محمد ضياء العويني","systemContractNumber":"C-ALF-0069","systemContractStatus":"ساري","reportInstallment":1600,"listNote":null,"vehicleNote":""}},{"sourceRow":35,"sourcePlate":"856925","expectedVehicleStatus":"rented","targetStatus":"police_station","targetLocation":"مركز الشرطة","sourceResult":"اختلاف حالة","sourceClassification":"شرطة/حجز","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_police_station","evidence":{"samePerson":"لا ينطبق","systemCustomerName":"عاطف محمد عبد الله منصور","systemContractNumber":"LTO2024268","systemContractStatus":"إجراء قانوني","reportInstallment":null,"listNote":null,"vehicleNote":""}},{"sourceRow":36,"sourcePlate":"893406","expectedVehicleStatus":"available","targetStatus":"rented","targetLocation":null,"sourceResult":"اختلاف حالة","sourceClassification":"مستأجر","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_current_renter","evidence":{"samePerson":"نعم (فرق إملاء)","systemCustomerName":"محمود جاسم الصالح","systemContractNumber":"HIST-XLS-B70-893406","systemContractStatus":"ملغى","reportInstallment":1600,"listNote":null,"vehicleNote":null}},{"sourceRow":37,"sourcePlate":"893407","expectedVehicleStatus":"available","targetStatus":"municipality","targetLocation":"البلدية","sourceResult":"اختلاف حالة","sourceClassification":"البلدية","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_municipality","evidence":{"samePerson":"لا ينطبق","systemCustomerName":null,"systemContractNumber":null,"systemContractStatus":null,"reportInstallment":null,"listNote":null,"vehicleNote":""}},{"sourceRow":38,"sourcePlate":"893411","expectedVehicleStatus":"rented","targetStatus":"street_52","targetLocation":"شارع 52","sourceResult":"اختلاف حالة","sourceClassification":"مرور","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_street_52","evidence":{"samePerson":"لا ينطبق","systemCustomerName":"رضوان محمد الأسعد مديني","systemContractNumber":"LTO2024233","systemContractStatus":"إجراء قانوني","reportInstallment":null,"listNote":"مرور 52-","vehicleNote":"محمد المندوب"}},{"sourceRow":39,"sourcePlate":"10171","expectedVehicleStatus":"available","targetStatus":"street_52","targetLocation":"شارع 52","sourceResult":"اختلاف حالة","sourceClassification":"شرطة/حجز","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_street_52","evidence":{"samePerson":"لا ينطبق","systemCustomerName":null,"systemContractNumber":null,"systemContractStatus":null,"reportInstallment":null,"listNote":"حجز 52","vehicleNote":null}},{"sourceRow":40,"sourcePlate":"10173","expectedVehicleStatus":"street_52","targetStatus":"available","targetLocation":"الخريطيات","sourceResult":"اختلاف حالة","sourceClassification":"الخريطيات","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_location","evidence":{"samePerson":"لا ينطبق","systemCustomerName":null,"systemContractNumber":null,"systemContractStatus":null,"reportInstallment":null,"listNote":"لخريطيات","vehicleNote":"عامل حادث تبع سوبر فاست ومفقودة"}},{"sourceRow":41,"sourcePlate":"10189","expectedVehicleStatus":"available","targetStatus":"street_52","targetLocation":"شارع 52","sourceResult":"اختلاف حالة","sourceClassification":"شرطة/حجز","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_street_52","evidence":{"samePerson":"لا ينطبق","systemCustomerName":"احمد الشيخ الصديق هاشم الوسيله","systemContractNumber":"LTO2024271","systemContractStatus":"ملغى","reportInstallment":null,"listNote":"حجز 52","vehicleNote":"واقفه في الخريطيات"}},{"sourceRow":42,"sourcePlate":"11473","expectedVehicleStatus":"available","targetStatus":"rented","targetLocation":null,"sourceResult":"اختلاف حالة","sourceClassification":"مستأجر","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_current_renter","evidence":{"samePerson":"نعم","systemCustomerName":"عماد العياري","systemContractNumber":"LTO2024317","systemContractStatus":"ملغى","reportInstallment":1250,"listNote":null,"vehicleNote":null}},{"sourceRow":43,"sourcePlate":"21875","expectedVehicleStatus":"rented","targetStatus":"available","targetLocation":"أم صلال","sourceResult":"اختلاف حالة","sourceClassification":"أم صلال","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_location","evidence":{"samePerson":"لا ينطبق","systemCustomerName":"سعيد الهلالي","systemContractNumber":"LTO202456","systemContractStatus":"إجراء قانوني","reportInstallment":null,"listNote":"ام صلال","vehicleNote":null}},{"sourceRow":44,"sourcePlate":"563829","expectedVehicleStatus":"available","targetStatus":"street_52","targetLocation":"شارع 52","sourceResult":"اختلاف حالة","sourceClassification":"شرطة/حجز","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_street_52","evidence":{"samePerson":"لا ينطبق","systemCustomerName":"ماروين سافسافي","systemContractNumber":"LTO2024299","systemContractStatus":"ملغى","reportInstallment":null,"listNote":"حجز 52","vehicleNote":null}},{"sourceRow":45,"sourcePlate":"9890","expectedVehicleStatus":"rented","targetStatus":"street_52","targetLocation":"شارع 52","sourceResult":"اختلاف حالة","sourceClassification":"شرطة/حجز","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_street_52","evidence":{"samePerson":"لا ينطبق","systemCustomerName":"عبد الرحيم شاكر احمد محمد","systemContractNumber":"LTO2024109","systemContractStatus":"ساري","reportInstallment":null,"listNote":"حجز 52","vehicleNote":null}},{"sourceRow":46,"sourcePlate":"9891","expectedVehicleStatus":"municipality","targetStatus":"maintenance","targetLocation":"الصناعية لصناعية","sourceResult":"اختلاف حالة","sourceClassification":"الكراج","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_garage","evidence":{"samePerson":"لا ينطبق","systemCustomerName":"ريم سينيانجا","systemContractNumber":"LTO2024118","systemContractStatus":"ملغى","reportInstallment":null,"listNote":"الصناعية لصناعية","vehicleNote":""}},{"sourceRow":47,"sourcePlate":"9902","expectedVehicleStatus":"available","targetStatus":"street_52","targetLocation":"شارع 52","sourceResult":"اختلاف حالة","sourceClassification":"شرطة/حجز","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_street_52","evidence":{"samePerson":"لا ينطبق","systemCustomerName":"عبدالله الله العلواني","systemContractNumber":"AGR-950558-871","systemContractStatus":"ملغى","reportInstallment":null,"listNote":"حجز 52","vehicleNote":null}},{"sourceRow":48,"sourcePlate":"9999","expectedVehicleStatus":"available","targetStatus":"street_52","targetLocation":"شارع 52","sourceResult":"اختلاف حالة","sourceClassification":"شرطة/حجز","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_street_52","evidence":{"samePerson":"لا ينطبق","systemCustomerName":"محمد النخلي","systemContractNumber":"LTO2024243","systemContractStatus":"إجراء قانوني","reportInstallment":null,"listNote":"حجز 52","vehicleNote":"9000 مخالفات"}},{"sourceRow":49,"sourcePlate":"2767","expectedVehicleStatus":"available","targetStatus":"street_52","targetLocation":"شارع 52","sourceResult":"اختلاف حالة","sourceClassification":"شرطة/حجز","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_street_52","evidence":{"samePerson":"لا ينطبق","systemCustomerName":"عبدالغفور درار","systemContractNumber":"AGR-202504-408522","systemContractStatus":"ملغى","reportInstallment":1500,"listNote":"حجز 52","vehicleNote":""}},{"sourceRow":50,"sourcePlate":"2771","expectedVehicleStatus":"rented","targetStatus":"available","targetLocation":"الخريطيات","sourceResult":"اختلاف حالة","sourceClassification":"الخريطيات","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_location","evidence":{"samePerson":"لا ينطبق","systemCustomerName":"وحيد بوكثير","systemContractNumber":"C-ALF-0016","systemContractStatus":"ساري","reportInstallment":null,"listNote":"أالخريطيات مخالفات 2000","vehicleNote":null}},{"sourceRow":51,"sourcePlate":"2777","expectedVehicleStatus":"rented","targetStatus":"available","targetLocation":"الخريطيات","sourceResult":"اختلاف حالة","sourceClassification":"الخريطيات","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_location","evidence":{"samePerson":"لا ينطبق","systemCustomerName":"عبد العزيز سامي","systemContractNumber":"C-ALF-0022","systemContractStatus":"إجراء قانوني","reportInstallment":null,"listNote":"االخريطيات مخالفات 2400","vehicleNote":null}},{"sourceRow":52,"sourcePlate":"2780","expectedVehicleStatus":"available","targetStatus":"rented","targetLocation":null,"sourceResult":"اختلاف حالة","sourceClassification":"مستأجر","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_current_renter","evidence":{"samePerson":"نعم","systemCustomerName":"ياسين محمد سرحاني","systemContractNumber":"C-ALF-0025","systemContractStatus":"إجراء قانوني","reportInstallment":2100,"listNote":null,"vehicleNote":null}},{"sourceRow":53,"sourcePlate":"2783","expectedVehicleStatus":"rented","targetStatus":"street_52","targetLocation":"شارع 52","sourceResult":"اختلاف حالة","sourceClassification":"مرور","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_street_52","evidence":{"samePerson":"لا ينطبق","systemCustomerName":"صدام مصطفى سعيد","systemContractNumber":"C-ALF-0027","systemContractStatus":"ساري","reportInstallment":null,"listNote":"مرور 52 مخالفات 500","vehicleNote":"فوزي | MOI حجز - شارع 52 - آخر إشعار Wed 6/10/2026 11:48 AM (1 إشعار)"}},{"sourceRow":54,"sourcePlate":"2798","expectedVehicleStatus":"available","targetStatus":"out_of_service","targetLocation":"التأمين - في انتظار الشطب","sourceResult":"اختلاف حالة","sourceClassification":"حادث/تأمين","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_pending_writeoff","evidence":{"samePerson":"لا ينطبق","systemCustomerName":"محمد عبد الله","systemContractNumber":"C-ALF-0029","systemContractStatus":"ملغى","reportInstallment":1750,"listNote":null,"vehicleNote":"عند التامين في انتظار الشطب تم التقيم 50 الف"}},{"sourceRow":55,"sourcePlate":"5889","expectedVehicleStatus":"available","targetStatus":"rented","targetLocation":null,"sourceResult":"اختلاف حالة","sourceClassification":"مستأجر","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_current_renter","evidence":{"samePerson":"نعم","systemCustomerName":"أيمن خليفة حمادي","systemContractNumber":"LTO202427","systemContractStatus":"ملغى","reportInstallment":2100,"listNote":null,"vehicleNote":null}},{"sourceRow":56,"sourcePlate":"5890","expectedVehicleStatus":"available","targetStatus":"rented","targetLocation":null,"sourceResult":"اختلاف حالة","sourceClassification":"مستأجر","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_current_renter","evidence":{"samePerson":"نعم","systemCustomerName":"عبد العزيز بن نبيل جرفال","systemContractNumber":"LTO2024340","systemContractStatus":"ملغى","reportInstallment":1500,"listNote":"800","vehicleNote":null}},{"sourceRow":57,"sourcePlate":"5893","expectedVehicleStatus":"rented","targetStatus":"available","targetLocation":"الخريطيات","sourceResult":"اختلاف حالة","sourceClassification":"الخريطيات","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_location","evidence":{"samePerson":"لا ينطبق","systemCustomerName":"امين محمد شوشان","systemContractNumber":"C-ALF-0036","systemContractStatus":"ساري","reportInstallment":null,"listNote":"الخريطيات","vehicleNote":null}},{"sourceRow":58,"sourcePlate":"5894","expectedVehicleStatus":"available","targetStatus":"municipality","targetLocation":"البلدية","sourceResult":"اختلاف حالة","sourceClassification":"البلدية","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_municipality","evidence":{"samePerson":"لا ينطبق","systemCustomerName":"عبدالله الله العلواني","systemContractNumber":"AGR-202504-411671","systemContractStatus":"ملغى","reportInstallment":null,"listNote":null,"vehicleNote":""}},{"sourceRow":59,"sourcePlate":"5900","expectedVehicleStatus":"available","targetStatus":"rented","targetLocation":null,"sourceResult":"اختلاف حالة","sourceClassification":"مستأجر","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_current_renter","evidence":{"samePerson":"نعم","systemCustomerName":"محمد عزيز محسن جلالي","systemContractNumber":"HIST-XLS-T77-5900","systemContractStatus":"إجراء قانوني","reportInstallment":1100,"listNote":"دفع مسبق","vehicleNote":null}},{"sourceRow":60,"sourcePlate":"7034","expectedVehicleStatus":"rented","targetStatus":"street_52","targetLocation":"شارع 52","sourceResult":"اختلاف حالة","sourceClassification":"شرطة/حجز","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_street_52","evidence":{"samePerson":"لا ينطبق","systemCustomerName":"محمد احمد عمر السماتي","systemContractNumber":"C-ALF-0046","systemContractStatus":"ساري","reportInstallment":null,"listNote":"الحجز 52","vehicleNote":""}},{"sourceRow":61,"sourcePlate":"7042","expectedVehicleStatus":"police_station","targetStatus":"municipality","targetLocation":"البلدية","sourceResult":"اختلاف حالة","sourceClassification":"البلدية","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_municipality","evidence":{"samePerson":"لا ينطبق","systemCustomerName":"وسماني محمد","systemContractNumber":"MR202462","systemContractStatus":"إجراء قانوني","reportInstallment":null,"listNote":null,"vehicleNote":null}},{"sourceRow":62,"sourcePlate":"7058","expectedVehicleStatus":"available","targetStatus":"rented","targetLocation":null,"sourceResult":"اختلاف حالة","sourceClassification":"مستأجر","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_current_renter","evidence":{"samePerson":"نعم","systemCustomerName":"محمد فوأد شوشان","systemContractNumber":"319","systemContractStatus":"ملغى","reportInstallment":1600,"listNote":null,"vehicleNote":null}},{"sourceRow":63,"sourcePlate":"7063","expectedVehicleStatus":"available","targetStatus":"rented","targetLocation":null,"sourceResult":"اختلاف حالة","sourceClassification":"مستأجر","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_current_renter","evidence":{"samePerson":"نعم","systemCustomerName":"مهند حمودة الظاهر","systemContractNumber":"AGR-055405-212","systemContractStatus":"ملغى","reportInstallment":1600,"listNote":"1600","vehicleNote":null}},{"sourceRow":64,"sourcePlate":"7064","expectedVehicleStatus":"rented","targetStatus":"street_52","targetLocation":"شارع 52","sourceResult":"اختلاف حالة","sourceClassification":"شرطة/حجز","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_street_52","evidence":{"samePerson":"لا ينطبق","systemCustomerName":"محمد مسلم امام ابراهیم حامد","systemContractNumber":"LTO202436","systemContractStatus":"إجراء قانوني","reportInstallment":null,"listNote":"حجز 52","vehicleNote":""}},{"sourceRow":65,"sourcePlate":"7066","expectedVehicleStatus":"available","targetStatus":"rented","targetLocation":null,"sourceResult":"اختلاف حالة","sourceClassification":"مستأجر","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_current_renter","evidence":{"samePerson":"نعم","systemCustomerName":"عوض الكريم عبد المنعم علي سعيد احمد","systemContractNumber":"C-ALF-0061","systemContractStatus":"إجراء قانوني","reportInstallment":2550,"listNote":"حجز 52","vehicleNote":"MOI حجز - شارع 52 - آخر إشعار Thu 4/2/2026 3:11 PM (1 إشعار)"}},{"sourceRow":66,"sourcePlate":"7067","expectedVehicleStatus":"rented","targetStatus":"police_station","targetLocation":"مركز الشرطة","sourceResult":"اختلاف حالة","sourceClassification":"شرطة/حجز","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_police_station","evidence":{"samePerson":"لا ينطبق","systemCustomerName":"عادل حامد علي عبد الكريم","systemContractNumber":"LTO2024262","systemContractStatus":"إجراء قانوني","reportInstallment":1500,"listNote":null,"vehicleNote":""}},{"sourceRow":67,"sourcePlate":"7071","expectedVehicleStatus":"available","targetStatus":"rented","targetLocation":null,"sourceResult":"اختلاف حالة","sourceClassification":"مستأجر","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_current_renter","evidence":{"samePerson":"نعم","systemCustomerName":"حمزة زمكيل","systemContractNumber":"HIST-XLS-T77-7071","systemContractStatus":"ملغى","reportInstallment":1500,"listNote":null,"vehicleNote":null}},{"sourceRow":68,"sourcePlate":"7074","expectedVehicleStatus":"available","targetStatus":"rented","targetLocation":null,"sourceResult":"اختلاف حالة","sourceClassification":"مستأجر","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_current_renter","evidence":{"samePerson":"نعم","systemCustomerName":"محمود جاسم الصالح","systemContractNumber":"LTO2024335","systemContractStatus":"ملغى","reportInstallment":1600,"listNote":null,"vehicleNote":"🚨 مطلوب استرداد - قضية قانونية: LC-2026-224545\nالعميل: محمود جاسم الصالح\nالمبلغ المستحق: 692,060 QAR"}},{"sourceRow":69,"sourcePlate":"10669","expectedVehicleStatus":"rented","targetStatus":"street_52","targetLocation":"شارع 52","sourceResult":"اختلاف حالة","sourceClassification":"شرطة/حجز","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_street_52","evidence":{"samePerson":"لا ينطبق","systemCustomerName":"مراد المسعودي","systemContractNumber":"C-ALF-0096","systemContractStatus":"إجراء قانوني","reportInstallment":null,"listNote":"حجز 52","vehicleNote":null}},{"sourceRow":70,"sourcePlate":"10671","expectedVehicleStatus":"rented","targetStatus":"street_52","targetLocation":"شارع 52","sourceResult":"اختلاف حالة","sourceClassification":"شرطة/حجز","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_street_52","evidence":{"samePerson":"لا ينطبق","systemCustomerName":"ياسر الصادق نصر الدين ابو القاسم","systemContractNumber":"AGR-202504-417240","systemContractStatus":"إجراء قانوني","reportInstallment":null,"listNote":"حجز 52","vehicleNote":"MOI حجز - شارع 52 - آخر إشعار Tue 5/19/2026 10:50 AM (2 إشعار)"}},{"sourceRow":71,"sourcePlate":"10672","expectedVehicleStatus":"rented","targetStatus":"street_52","targetLocation":"شارع 52","sourceResult":"اختلاف حالة","sourceClassification":"شرطة/حجز","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_street_52","evidence":{"samePerson":"لا ينطبق","systemCustomerName":"غانجا شودري","systemContractNumber":"C-ALF-0098","systemContractStatus":"ساري","reportInstallment":null,"listNote":"حجز 52","vehicleNote":"MOI حجز - شارع 52 - آخر إشعار Tue 4/28/2026 6:25 AM (2 إشعار)"}},{"sourceRow":72,"sourcePlate":"846560","expectedVehicleStatus":"available","targetStatus":"street_52","targetLocation":"شارع 52","sourceResult":"اختلاف حالة","sourceClassification":"شرطة/حجز","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_street_52","evidence":{"samePerson":"لا ينطبق","systemCustomerName":"وليد الشورابي","systemContractNumber":"LTO202442","systemContractStatus":"إجراء قانوني","reportInstallment":null,"listNote":null,"vehicleNote":"MOI حجز - شارع 52 - آخر إشعار Wed 6/10/2026 11:47 AM (1 إشعار)"}},{"sourceRow":73,"sourcePlate":"847099","expectedVehicleStatus":"available","targetStatus":"rented","targetLocation":null,"sourceResult":"اختلاف حالة","sourceClassification":"مستأجر","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_current_renter","evidence":{"samePerson":"نعم","systemCustomerName":"أمير عبد الرحمن احمد المهدى بط","systemContractNumber":"LTO2024124","systemContractStatus":"ملغى","reportInstallment":2300,"listNote":"- حادث","vehicleNote":null}},{"sourceRow":74,"sourcePlate":"847941","expectedVehicleStatus":"available","targetStatus":"rented","targetLocation":null,"sourceResult":"اختلاف حالة","sourceClassification":"مستأجر","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_current_renter","evidence":{"samePerson":"نعم","systemCustomerName":"رافيشانكار باندي","systemContractNumber":"LTO2024105","systemContractStatus":"منتهي","reportInstallment":2100,"listNote":null,"vehicleNote":null}},{"sourceRow":75,"sourcePlate":"847987","expectedVehicleStatus":"available","targetStatus":"rented","targetLocation":null,"sourceResult":"اختلاف حالة","sourceClassification":"مستأجر","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_current_renter","evidence":{"samePerson":"نعم","systemCustomerName":"رافيشانكار باندي","systemContractNumber":"LTO2024106","systemContractStatus":"منتهي","reportInstallment":2100,"listNote":null,"vehicleNote":null}},{"sourceRow":76,"sourcePlate":"8208","expectedVehicleStatus":"rented","targetStatus":"available","targetLocation":"الخريطيات","sourceResult":"اختلاف حالة","sourceClassification":"الخريطيات","sourceCustomerName":null,"sourceCustomerPhone":null,"customerId":null,"supportingContractNumber":null,"identityResolution":"not_applicable","decisionReason":"reported_location","evidence":{"samePerson":"لا ينطبق","systemCustomerName":"عصام احمد عبد الدايم","systemContractNumber":"C-ALF-0073","systemContractStatus":"إجراء قانوني","reportInstallment":null,"listNote":"الخريطيات","vehicleNote":null}}]$manifest$::jsonb;
  v_batch_id uuid;
  v_count integer;
  v_changes integer;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_company_id::text || ':fleet-report:' || v_source_sha, 0)
  );

  SELECT batch.id INTO v_batch_id
  FROM public.fleet_reconciliation_batches batch
  WHERE batch.company_id = v_company_id
    AND batch.source_sha256 = v_source_sha
  FOR UPDATE;

  IF v_batch_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.fleet_reconciliation_batches
      WHERE id = v_batch_id AND status = 'applied'
    ) THEN
      RETURN;
    END IF;
    RAISE EXCEPTION 'An incomplete reconciliation batch already exists: %', v_batch_id;
  END IF;

  CREATE TEMP TABLE reconciliation_source ON COMMIT DROP AS
  SELECT source.*
  FROM jsonb_to_recordset(v_manifest) AS source(
    "sourceRow" integer,
    "sourcePlate" text,
    "expectedVehicleStatus" text,
    "targetStatus" text,
    "targetLocation" text,
    "sourceResult" text,
    "sourceClassification" text,
    "sourceCustomerName" text,
    "sourceCustomerPhone" text,
    "customerId" uuid,
    "supportingContractNumber" text,
    "identityResolution" text,
    "decisionReason" text,
    "evidence" jsonb
  );

  SELECT count(*),
         count(*) FILTER (
           WHERE "expectedVehicleStatus" IS DISTINCT FROM "targetStatus"
         )
  INTO v_count, v_changes
  FROM reconciliation_source;

  IF v_count <> 75 OR v_changes <> 64 THEN
    RAISE EXCEPTION 'Manifest totals changed: % rows / % status changes', v_count, v_changes;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM reconciliation_source source
    LEFT JOIN LATERAL (
      SELECT count(*) AS match_count
      FROM public.vehicles vehicle
      WHERE vehicle.company_id = v_company_id
        AND public.normalize_vehicle_plate(vehicle.plate_number)
          = public.normalize_vehicle_plate(source."sourcePlate")
    ) matches ON true
    WHERE matches.match_count <> 1
  ) THEN
    RAISE EXCEPTION 'Every source plate must resolve to exactly one company vehicle';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM reconciliation_source source
    JOIN public.vehicles vehicle
      ON vehicle.company_id = v_company_id
     AND public.normalize_vehicle_plate(vehicle.plate_number)
       = public.normalize_vehicle_plate(source."sourcePlate")
    WHERE vehicle.status::text IS DISTINCT FROM source."expectedVehicleStatus"
  ) THEN
    RAISE EXCEPTION 'A vehicle status changed after report validation; batch aborted';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM reconciliation_source source
    LEFT JOIN public.customers customer
      ON customer.id = source."customerId"
     AND customer.company_id = v_company_id
    WHERE source."customerId" IS NOT NULL
      AND customer.id IS NULL
  ) THEN
    RAISE EXCEPTION 'A resolved operational customer is outside the company';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM reconciliation_source source
    JOIN public.vehicles vehicle
      ON vehicle.company_id = v_company_id
     AND public.normalize_vehicle_plate(vehicle.plate_number)
       = public.normalize_vehicle_plate(source."sourcePlate")
    LEFT JOIN public.contracts contract
      ON contract.company_id = v_company_id
     AND contract.contract_number = source."supportingContractNumber"
     AND contract.vehicle_id = vehicle.id
     AND contract.customer_id = source."customerId"
    WHERE source."supportingContractNumber" IS NOT NULL
      AND contract.id IS NULL
  ) THEN
    RAISE EXCEPTION 'A supporting contract does not match its source vehicle and customer';
  END IF;

  IF EXISTS (
    SELECT normalized_plate
    FROM (
      SELECT public.normalize_vehicle_plate(vehicle.plate_number) AS normalized_plate
      FROM public.vehicles vehicle
      WHERE vehicle.company_id = v_company_id
        AND public.normalize_vehicle_plate(vehicle.plate_number) IN ('603353', '185485')
    ) candidates
    GROUP BY normalized_plate
    HAVING count(*) <> 1
  ) OR (
    SELECT count(DISTINCT public.normalize_vehicle_plate(vehicle.plate_number))
    FROM public.vehicles vehicle
    WHERE vehicle.company_id = v_company_id
      AND public.normalize_vehicle_plate(vehicle.plate_number) IN ('603353', '185485')
  ) <> 2 THEN
    RAISE EXCEPTION 'Plate normalization targets are missing or ambiguous';
  END IF;

  INSERT INTO public.fleet_reconciliation_batches (
    company_id, source_file_name, source_sha256, source_as_of, status,
    source_row_count, status_change_count, customer_snapshot_count, metadata
  ) VALUES (
    v_company_id,
    'مطابقة-دفعات-شهر-8-مع-النظام.xlsx',
    v_source_sha,
    DATE '2026-08-30',
    'applying',
    75,
    64,
    25,
    jsonb_build_object(
      'scope', 'operational_fleet_ground_truth',
      'payment_rows_changed', 0,
      'invoice_rows_changed', 0,
      'contract_rows_changed', 0,
      'legal_case_rows_changed', 0,
      'normalized_plates', jsonb_build_array(
        jsonb_build_object('before', '603 353', 'after', '603353'),
        jsonb_build_object('before', '185 485', 'after', '185485')
      )
    )
  )
  RETURNING id INTO v_batch_id;

  UPDATE public.fleet_reconciliation_assignments assignment
  SET is_active = false,
      closed_at = now(),
      closed_reason = 'superseded_by_batch:' || v_batch_id::text
  WHERE assignment.company_id = v_company_id
    AND assignment.is_active
    AND assignment.vehicle_id IN (
      SELECT vehicle.id
      FROM reconciliation_source source
      JOIN public.vehicles vehicle
        ON vehicle.company_id = v_company_id
       AND public.normalize_vehicle_plate(vehicle.plate_number)
         = public.normalize_vehicle_plate(source."sourcePlate")
    );

  INSERT INTO public.fleet_reconciliation_assignments (
    batch_id, company_id, vehicle_id, source_row, source_plate,
    source_result, source_classification, source_customer_name,
    source_customer_phone, customer_id, supporting_contract_id,
    identity_resolution, target_status, target_location, decision_reason,
    source_fingerprint, source_evidence, before_state
  )
  SELECT
    v_batch_id,
    v_company_id,
    vehicle.id,
    source."sourceRow",
    source."sourcePlate",
    source."sourceResult",
    source."sourceClassification",
    source."sourceCustomerName",
    source."sourceCustomerPhone",
    source."customerId",
    supporting_contract.id,
    source."identityResolution",
    source."targetStatus"::public.vehicle_status,
    source."targetLocation",
    source."decisionReason",
    md5(concat_ws(
      '|', v_source_sha, source."sourceRow"::text, source."sourcePlate",
      source."targetStatus", COALESCE(source."sourceCustomerName", '')
    )),
    COALESCE(source."evidence", '{}'::jsonb)
      || jsonb_build_object(
        'decision_reason', source."decisionReason",
        'identity_resolution', source."identityResolution"
      ),
    jsonb_build_object(
      'status', vehicle.status::text,
      'location', vehicle.location,
      'plate_number', vehicle.plate_number,
      'is_active', vehicle.is_active,
      'updated_at', vehicle.updated_at
    )
  FROM reconciliation_source source
  JOIN public.vehicles vehicle
    ON vehicle.company_id = v_company_id
   AND public.normalize_vehicle_plate(vehicle.plate_number)
     = public.normalize_vehicle_plate(source."sourcePlate")
  LEFT JOIN public.contracts supporting_contract
    ON supporting_contract.company_id = v_company_id
   AND supporting_contract.contract_number = source."supportingContractNumber"
   AND supporting_contract.vehicle_id = vehicle.id
   AND supporting_contract.customer_id = source."customerId";

  PERFORM set_config('fleetify.reconciliation_apply', 'on', true);

  UPDATE public.vehicles vehicle
  SET plate_number = public.normalize_vehicle_plate(vehicle.plate_number),
      updated_at = now()
  WHERE vehicle.company_id = v_company_id
    AND public.normalize_vehicle_plate(vehicle.plate_number) IN ('603353', '185485')
    AND vehicle.plate_number IS DISTINCT FROM public.normalize_vehicle_plate(vehicle.plate_number);

  UPDATE public.vehicles vehicle
  SET status = source."targetStatus"::public.vehicle_status,
      location = CASE
        WHEN source."targetLocation" IS NULL THEN vehicle.location
        ELSE source."targetLocation"
      END,
      updated_at = now()
  FROM reconciliation_source source
  WHERE vehicle.company_id = v_company_id
    AND public.normalize_vehicle_plate(vehicle.plate_number)
      = public.normalize_vehicle_plate(source."sourcePlate");

  UPDATE public.fleet_reconciliation_assignments assignment
  SET after_state = jsonb_build_object(
        'status', vehicle.status::text,
        'location', vehicle.location,
        'plate_number', vehicle.plate_number,
        'is_active', vehicle.is_active,
        'updated_at', vehicle.updated_at
      )
  FROM public.vehicles vehicle
  WHERE assignment.batch_id = v_batch_id
    AND assignment.vehicle_id = vehicle.id
    AND assignment.company_id = vehicle.company_id;

  IF (
    SELECT count(*)
    FROM public.fleet_reconciliation_assignments assignment
    JOIN public.vehicles vehicle
      ON vehicle.id = assignment.vehicle_id
     AND vehicle.company_id = assignment.company_id
    WHERE assignment.batch_id = v_batch_id
      AND assignment.is_active
      AND vehicle.status = assignment.target_status
      AND (
        assignment.target_location IS NULL
        OR vehicle.location IS NOT DISTINCT FROM assignment.target_location
      )
  ) <> 75 THEN
    RAISE EXCEPTION 'Postcondition failed: not all 75 operational rows were applied';
  END IF;

  UPDATE public.fleet_reconciliation_batches
  SET status = 'applied',
      applied_at = now(),
      metadata = metadata || jsonb_build_object(
        'applied_assignment_count', 75,
        'resolved_customer_links', (
          SELECT count(*)
          FROM public.fleet_reconciliation_assignments
          WHERE batch_id = v_batch_id AND customer_id IS NOT NULL
        ),
        'source_snapshot_only_count', (
          SELECT count(*)
          FROM public.fleet_reconciliation_assignments
          WHERE batch_id = v_batch_id
            AND source_customer_name IS NOT NULL
            AND customer_id IS NULL
        )
      )
  WHERE id = v_batch_id;
END;
$repair$;

COMMENT ON TABLE public.fleet_reconciliation_batches IS
'Audited imports of authoritative operational fleet reports; never evidence of payment or a signed contract.';
COMMENT ON TABLE public.fleet_reconciliation_assignments IS
'Current operational vehicle state and custodian snapshots from an approved report, separated from legal/financial contracts.';
COMMENT ON VIEW public.vehicle_current_operational_state IS
'Current operational vehicle/customer truth. A later real contract supersedes an older report assignment.';

COMMIT;
