-- Court-judgment settlements use posted financial payments as the only monetary source of truth.

CREATE TABLE IF NOT EXISTS public.legal_case_payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.legal_cases(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  allocated_amount numeric(15,2) NOT NULL CHECK (allocated_amount > 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','reversed')),
  link_source text NOT NULL DEFAULT 'manual' CHECK (link_source IN ('manual','finance_form','exact_reference','agent_suggestion','migrated')),
  confidence numeric(5,2) CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 100),
  link_reason text,
  source_legal_case_payment_id uuid REFERENCES public.legal_case_payments(id) ON DELETE SET NULL,
  linked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  linked_at timestamptz NOT NULL DEFAULT now(),
  reversed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reversed_at timestamptz,
  reversal_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT legal_case_payment_allocation_company_unique UNIQUE (company_id,id),
  CONSTRAINT legal_case_payment_allocation_source_unique UNIQUE (source_legal_case_payment_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_legal_case_payment_allocations_active_pair
  ON public.legal_case_payment_allocations(company_id,case_id,payment_id)
  WHERE status='active';
CREATE INDEX IF NOT EXISTS idx_legal_case_payment_allocations_case
  ON public.legal_case_payment_allocations(company_id,case_id,status);
CREATE INDEX IF NOT EXISTS idx_legal_case_payment_allocations_payment
  ON public.legal_case_payment_allocations(company_id,payment_id,status);

CREATE TABLE IF NOT EXISTS public.legal_settlement_review_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  case_id uuid REFERENCES public.legal_cases(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES public.payments(id) ON DELETE CASCADE,
  source_legal_case_payment_id uuid REFERENCES public.legal_case_payments(id) ON DELETE CASCADE,
  issue_type text NOT NULL CHECK (issue_type IN ('match_suggestion','legacy_payment_unlinked','missing_journal','direction_mismatch','closed_with_balance','over_allocation')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','accepted','dismissed','resolved')),
  confidence numeric(5,2) CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 100),
  title text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_legal_settlement_review_open_match
  ON public.legal_settlement_review_items(company_id,case_id,payment_id,issue_type)
  WHERE status='open' AND payment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_legal_settlement_review_legacy
  ON public.legal_settlement_review_items(source_legal_case_payment_id,issue_type)
  WHERE source_legal_case_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_legal_settlement_review_company_status
  ON public.legal_settlement_review_items(company_id,status,created_at DESC);

ALTER TABLE public.legal_case_payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_settlement_review_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS legal_case_payment_allocations_company_read ON public.legal_case_payment_allocations;
CREATE POLICY legal_case_payment_allocations_company_read
  ON public.legal_case_payment_allocations FOR SELECT TO authenticated
  USING (company_id=public.get_user_company_id() OR public.is_super_admin());

DROP POLICY IF EXISTS legal_settlement_review_items_company_read ON public.legal_settlement_review_items;
CREATE POLICY legal_settlement_review_items_company_read
  ON public.legal_settlement_review_items FOR SELECT TO authenticated
  USING (company_id=public.get_user_company_id() OR public.is_super_admin());

REVOKE INSERT,UPDATE,DELETE ON public.legal_case_payment_allocations,public.legal_settlement_review_items FROM authenticated,anon;
GRANT SELECT ON public.legal_case_payment_allocations,public.legal_settlement_review_items TO authenticated;
GRANT ALL ON public.legal_case_payment_allocations,public.legal_settlement_review_items TO service_role;

CREATE OR REPLACE FUNCTION public.recalculate_legal_case_settlement_v1(
  p_company_id uuid,
  p_case_id uuid
) RETURNS public.legal_cases
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_case public.legal_cases%ROWTYPE;
  v_settled numeric:=0;
  v_linked numeric:=0;
  v_status text;
BEGIN
  SELECT * INTO v_case
  FROM public.legal_cases
  WHERE id=p_case_id AND company_id=p_company_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Legal case was not found' USING ERRCODE='P0001'; END IF;

  SELECT
    COALESCE(sum(a.allocated_amount),0),
    COALESCE(sum(a.allocated_amount) FILTER (
      WHERE lower(COALESCE(p.payment_status,'')) IN ('completed','paid','received','approved','cleared')
        AND p.journal_entry_id IS NOT NULL
        AND lower(COALESCE(j.status,''))='posted'
    ),0)
  INTO v_linked,v_settled
  FROM public.legal_case_payment_allocations a
  JOIN public.payments p ON p.id=a.payment_id AND p.company_id=a.company_id
  LEFT JOIN public.journal_entries j ON j.id=p.journal_entry_id AND j.company_id=p.company_id
  WHERE a.company_id=p_company_id AND a.case_id=p_case_id AND a.status='active';

  v_status:=CASE
    WHEN COALESCE(v_case.outcome_amount,0)<=0 THEN NULL
    WHEN v_settled>=v_case.outcome_amount-0.01 THEN CASE WHEN v_case.payment_direction='pay' THEN 'paid' ELSE 'received' END
    WHEN v_settled>0 THEN 'partial'
    ELSE 'pending'
  END;

  UPDATE public.legal_cases
  SET outcome_payment_status=v_status,
      workflow_stage=CASE
        WHEN workflow_stage IN ('judgment_issued','enforcement') AND COALESCE(outcome_amount,0)>0 THEN 'collection'
        ELSE workflow_stage
      END,
      stage_updated_at=CASE
        WHEN workflow_stage IN ('judgment_issued','enforcement') AND COALESCE(outcome_amount,0)>0 THEN now()
        ELSE stage_updated_at
      END,
      updated_at=now()
  WHERE id=p_case_id AND company_id=p_company_id
  RETURNING * INTO v_case;

  IF v_case.workflow_stage='closed' AND v_settled<COALESCE(v_case.outcome_amount,0)-0.01 THEN
    INSERT INTO public.legal_settlement_review_items(company_id,case_id,issue_type,title,details)
    VALUES(p_company_id,p_case_id,'closed_with_balance','قضية مغلقة ولها رصيد حكم غير مسدد',
      jsonb_build_object('judgment_amount',v_case.outcome_amount,'settled_amount',v_settled,'linked_amount',v_linked))
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_case;
END; $$;

CREATE OR REPLACE FUNCTION public.validate_legal_payment_allocation_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE
  v_case public.legal_cases%ROWTYPE;
  v_payment public.payments%ROWTYPE;
  v_payment_allocated numeric;
  v_case_allocated numeric;
BEGIN
  IF NEW.status<>'active' THEN RETURN NEW; END IF;
  SELECT * INTO v_case FROM public.legal_cases WHERE id=NEW.case_id AND company_id=NEW.company_id;
  SELECT * INTO v_payment FROM public.payments WHERE id=NEW.payment_id AND company_id=NEW.company_id;
  IF v_case.id IS NULL OR v_payment.id IS NULL THEN RAISE EXCEPTION 'Case and payment must belong to the same company'; END IF;
  IF COALESCE(v_case.outcome_amount,0)<=0 OR v_case.payment_direction NOT IN ('receive','pay') THEN
    RAISE EXCEPTION 'A financial judgment and payment direction are required before linking a payment';
  END IF;
  IF (v_case.payment_direction='receive' AND v_payment.transaction_type::text<>'receipt')
     OR (v_case.payment_direction='pay' AND v_payment.transaction_type::text<>'payment') THEN
    RAISE EXCEPTION 'Payment direction does not match the judgment direction';
  END IF;

  SELECT COALESCE(sum(allocated_amount),0) INTO v_payment_allocated
  FROM public.legal_case_payment_allocations
  WHERE company_id=NEW.company_id AND payment_id=NEW.payment_id AND status='active' AND id IS DISTINCT FROM NEW.id;
  IF v_payment_allocated+NEW.allocated_amount>v_payment.amount+0.01 THEN
    RAISE EXCEPTION 'Allocations exceed the financial payment amount';
  END IF;

  SELECT COALESCE(sum(allocated_amount),0) INTO v_case_allocated
  FROM public.legal_case_payment_allocations
  WHERE company_id=NEW.company_id AND case_id=NEW.case_id AND status='active' AND id IS DISTINCT FROM NEW.id;
  IF v_case_allocated+NEW.allocated_amount>v_case.outcome_amount+0.01 THEN
    RAISE EXCEPTION 'Allocations exceed the court judgment amount';
  END IF;
  NEW.updated_at:=now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS validate_legal_payment_allocation ON public.legal_case_payment_allocations;
CREATE TRIGGER validate_legal_payment_allocation
  BEFORE INSERT OR UPDATE OF case_id,payment_id,allocated_amount,status
  ON public.legal_case_payment_allocations
  FOR EACH ROW EXECUTE FUNCTION public.validate_legal_payment_allocation_v1();

CREATE OR REPLACE FUNCTION public.refresh_legal_case_after_allocation_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public.recalculate_legal_case_settlement_v1(COALESCE(NEW.company_id,OLD.company_id),COALESCE(NEW.case_id,OLD.case_id));
  RETURN COALESCE(NEW,OLD);
END; $$;

DROP TRIGGER IF EXISTS refresh_legal_case_after_allocation ON public.legal_case_payment_allocations;
CREATE TRIGGER refresh_legal_case_after_allocation
  AFTER INSERT OR UPDATE OR DELETE ON public.legal_case_payment_allocations
  FOR EACH ROW EXECUTE FUNCTION public.refresh_legal_case_after_allocation_v1();

CREATE OR REPLACE FUNCTION public.refresh_legal_cases_after_payment_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_link record;
BEGIN
  FOR v_link IN
    SELECT DISTINCT company_id,case_id FROM public.legal_case_payment_allocations
    WHERE payment_id=NEW.id AND status='active'
  LOOP
    PERFORM public.recalculate_legal_case_settlement_v1(v_link.company_id,v_link.case_id);
  END LOOP;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS refresh_legal_cases_after_payment ON public.payments;
CREATE TRIGGER refresh_legal_cases_after_payment
  AFTER UPDATE OF amount,payment_status,journal_entry_id,transaction_type ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.refresh_legal_cases_after_payment_v1();

CREATE OR REPLACE FUNCTION public.refresh_legal_cases_after_journal_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_link record;
BEGIN
  FOR v_link IN
    SELECT DISTINCT a.company_id,a.case_id
    FROM public.legal_case_payment_allocations a
    JOIN public.payments p ON p.id=a.payment_id AND p.company_id=a.company_id
    WHERE p.journal_entry_id=NEW.id AND a.status='active'
  LOOP
    PERFORM public.recalculate_legal_case_settlement_v1(v_link.company_id,v_link.case_id);
  END LOOP;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS refresh_legal_cases_after_journal ON public.journal_entries;
CREATE TRIGGER refresh_legal_cases_after_journal
  AFTER UPDATE OF status ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.refresh_legal_cases_after_journal_v1();

CREATE OR REPLACE FUNCTION public.link_legal_case_payment_v1(
  p_company_id uuid,
  p_case_id uuid,
  p_payment_id uuid,
  p_allocated_amount numeric DEFAULT NULL,
  p_link_source text DEFAULT 'manual',
  p_confidence numeric DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
) RETURNS public.legal_case_payment_allocations
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_actor uuid;
  v_case public.legal_cases%ROWTYPE;
  v_payment public.payments%ROWTYPE;
  v_row public.legal_case_payment_allocations%ROWTYPE;
  v_payment_available numeric;
  v_case_available numeric;
  v_amount numeric;
BEGIN
  v_actor:=public.legal_workflow_actor_profile_v1(p_company_id,p_actor_id);
  SELECT * INTO v_case FROM public.legal_cases WHERE id=p_case_id AND company_id=p_company_id FOR UPDATE;
  SELECT * INTO v_payment FROM public.payments WHERE id=p_payment_id AND company_id=p_company_id FOR UPDATE;
  IF v_case.id IS NULL OR v_payment.id IS NULL THEN RAISE EXCEPTION 'Case or payment was not found'; END IF;

  SELECT v_payment.amount-COALESCE(sum(allocated_amount),0) INTO v_payment_available
  FROM public.legal_case_payment_allocations
  WHERE company_id=p_company_id AND payment_id=p_payment_id AND status='active'
  GROUP BY v_payment.amount;
  v_payment_available:=COALESCE(v_payment_available,v_payment.amount);

  SELECT v_case.outcome_amount-COALESCE(sum(allocated_amount),0) INTO v_case_available
  FROM public.legal_case_payment_allocations
  WHERE company_id=p_company_id AND case_id=p_case_id AND status='active'
  GROUP BY v_case.outcome_amount;
  v_case_available:=COALESCE(v_case_available,v_case.outcome_amount);
  v_amount:=COALESCE(p_allocated_amount,LEAST(v_payment_available,v_case_available));
  IF COALESCE(v_amount,0)<=0 THEN RAISE EXCEPTION 'No amount remains available for this link'; END IF;

  INSERT INTO public.legal_case_payment_allocations(
    company_id,case_id,payment_id,allocated_amount,link_source,confidence,link_reason,linked_by
  ) VALUES(
    p_company_id,p_case_id,p_payment_id,v_amount,p_link_source,p_confidence,NULLIF(BTRIM(COALESCE(p_reason,'')),''),v_actor
  ) RETURNING * INTO v_row;

  INSERT INTO public.legal_case_activities(case_id,company_id,activity_type,activity_title,activity_description,new_values,created_by)
  VALUES(p_case_id,p_company_id,'judgment_payment_linked','ربط حركة مالية بالحكم',
    'تم ربط حركة مالية فعلية بالحكم دون إنشاء مبلغ قانوني موازٍ.',
    jsonb_build_object('payment_id',p_payment_id,'allocated_amount',v_amount,'source',p_link_source),v_actor);

  UPDATE public.legal_settlement_review_items
  SET status='resolved',resolved_by=v_actor,resolved_at=now(),resolution_notes='Linked to the selected case',updated_at=now()
  WHERE company_id=p_company_id AND payment_id=p_payment_id AND case_id=p_case_id AND status='open';
  RETURN v_row;
END; $$;

CREATE OR REPLACE FUNCTION public.reverse_legal_case_payment_link_v1(
  p_company_id uuid,
  p_allocation_id uuid,
  p_reason text,
  p_actor_id uuid DEFAULT NULL
) RETURNS public.legal_case_payment_allocations
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_actor uuid; v_row public.legal_case_payment_allocations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL AND p_actor_id IS NULL THEN
    SELECT id INTO v_actor
    FROM public.profiles
    WHERE company_id=p_company_id
    ORDER BY created_at
    LIMIT 1;
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'No company profile is available for automated matching';
    END IF;
  ELSE
    v_actor:=public.legal_workflow_actor_profile_v1(p_company_id,p_actor_id);
  END IF;
  IF NOT (auth.uid() IS NULL OR public.is_company_admin(p_company_id) OR public.is_company_manager(p_company_id)) THEN
    RAISE EXCEPTION 'Manager permission is required to reverse a legal payment link' USING ERRCODE='42501';
  END IF;
  IF length(BTRIM(COALESCE(p_reason,'')))<5 THEN RAISE EXCEPTION 'A clear reversal reason is required'; END IF;
  UPDATE public.legal_case_payment_allocations
  SET status='reversed',reversed_by=v_actor,reversed_at=now(),reversal_reason=BTRIM(p_reason),updated_at=now()
  WHERE id=p_allocation_id AND company_id=p_company_id AND status='active'
  RETURNING * INTO v_row;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'Active allocation was not found'; END IF;
  INSERT INTO public.legal_case_activities(case_id,company_id,activity_type,activity_title,activity_description,old_values,new_values,created_by)
  VALUES(v_row.case_id,p_company_id,'judgment_payment_unlinked','عكس ربط حركة مالية',BTRIM(p_reason),
    jsonb_build_object('allocation_id',v_row.id,'payment_id',v_row.payment_id,'amount',v_row.allocated_amount),
    jsonb_build_object('status','reversed'),v_actor);
  RETURN v_row;
END; $$;

CREATE OR REPLACE FUNCTION public.resolve_legal_settlement_review_v1(
  p_company_id uuid,
  p_review_id uuid,
  p_action text,
  p_reason text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
) RETURNS public.legal_settlement_review_items
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_actor uuid; v_item public.legal_settlement_review_items%ROWTYPE;
BEGIN
  v_actor:=public.legal_workflow_actor_profile_v1(p_company_id,p_actor_id);
  IF p_action NOT IN ('dismissed','resolved') THEN RAISE EXCEPTION 'Unsupported review action'; END IF;
  UPDATE public.legal_settlement_review_items SET status=p_action,resolved_by=v_actor,resolved_at=now(),resolution_notes=NULLIF(BTRIM(COALESCE(p_reason,'')),''),updated_at=now()
  WHERE id=p_review_id AND company_id=p_company_id AND status='open' RETURNING * INTO v_item;
  IF v_item.id IS NULL THEN RAISE EXCEPTION 'Open review item was not found'; END IF;
  RETURN v_item;
END; $$;

CREATE OR REPLACE FUNCTION public.run_legal_judgment_matcher_v1(
  p_company_id uuid,
  p_actor_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_actor uuid; v_match record; v_auto integer:=0; v_suggested integer:=0;
BEGIN
  v_actor:=public.legal_workflow_actor_profile_v1(p_company_id,p_actor_id);

  FOR v_match IN
    SELECT p.id payment_id,c.id case_id,LEAST(p.amount,c.outcome_amount) amount
    FROM public.payments p
    JOIN public.journal_entries j ON j.id=p.journal_entry_id AND j.company_id=p.company_id AND lower(j.status)='posted'
    JOIN public.legal_cases c ON c.company_id=p.company_id
      AND COALESCE(c.outcome_amount,0)>0
      AND ((c.payment_direction='receive' AND p.transaction_type::text='receipt') OR (c.payment_direction='pay' AND p.transaction_type::text='payment'))
      AND position(lower(c.case_number) IN lower(concat_ws(' ',p.reference_number,p.notes,p.payment_number)))>0
    WHERE p.company_id=p_company_id
      AND lower(p.payment_status) IN ('completed','paid','received','approved','cleared')
      AND NOT EXISTS(SELECT 1 FROM public.legal_case_payment_allocations a WHERE a.payment_id=p.id AND a.status='active')
      AND (SELECT count(*) FROM public.legal_cases c2 WHERE c2.company_id=p.company_id AND position(lower(c2.case_number) IN lower(concat_ws(' ',p.reference_number,p.notes,p.payment_number)))>0)=1
  LOOP
    BEGIN
      PERFORM public.link_legal_case_payment_v1(p_company_id,v_match.case_id,v_match.payment_id,v_match.amount,'exact_reference',100,'Exact case number in financial reference',v_actor);
      v_auto:=v_auto+1;
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.legal_settlement_review_items(company_id,case_id,payment_id,issue_type,confidence,title,details)
      VALUES(p_company_id,v_match.case_id,v_match.payment_id,'over_allocation',100,'تعذر الربط التلقائي لحركة تحمل رقم القضية',jsonb_build_object('error',SQLERRM))
      ON CONFLICT DO NOTHING;
    END;
  END LOOP;

  WITH candidates AS (
    SELECT p.id payment_id,c.id case_id,
      (CASE WHEN p.contract_id IS NOT NULL AND p.contract_id=c.contract_id THEN 60 ELSE 0 END
       +CASE WHEN p.customer_id IS NOT NULL AND p.customer_id=c.client_id THEN 30 ELSE 0 END
       +CASE WHEN p.amount<=c.outcome_amount+0.01 THEN 10 ELSE 0 END) score,
      row_number() OVER (PARTITION BY p.id ORDER BY
        (CASE WHEN p.contract_id IS NOT NULL AND p.contract_id=c.contract_id THEN 60 ELSE 0 END
         +CASE WHEN p.customer_id IS NOT NULL AND p.customer_id=c.client_id THEN 30 ELSE 0 END
         +CASE WHEN p.amount<=c.outcome_amount+0.01 THEN 10 ELSE 0 END) DESC,c.created_at DESC) rank
    FROM public.payments p
    JOIN public.journal_entries j ON j.id=p.journal_entry_id AND j.company_id=p.company_id AND lower(j.status)='posted'
    JOIN public.legal_cases c ON c.company_id=p.company_id AND COALESCE(c.outcome_amount,0)>0
      AND ((c.payment_direction='receive' AND p.transaction_type::text='receipt') OR (c.payment_direction='pay' AND p.transaction_type::text='payment'))
      AND ((p.contract_id IS NOT NULL AND p.contract_id=c.contract_id) OR (p.customer_id IS NOT NULL AND p.customer_id=c.client_id))
    WHERE p.company_id=p_company_id AND lower(p.payment_status) IN ('completed','paid','received','approved','cleared')
      AND NOT EXISTS(SELECT 1 FROM public.legal_case_payment_allocations a WHERE a.payment_id=p.id AND a.status='active')
  ), inserted AS (
    INSERT INTO public.legal_settlement_review_items(company_id,case_id,payment_id,issue_type,confidence,title,details)
    SELECT p_company_id,case_id,payment_id,'match_suggestion',score,'حركة مالية محتملة لحكم قضائي',jsonb_build_object('score',score)
    FROM candidates WHERE rank=1 AND score>=60
    ON CONFLICT DO NOTHING RETURNING id
  ) SELECT count(*) INTO v_suggested FROM inserted;

  INSERT INTO public.legal_settlement_review_items(company_id,case_id,payment_id,issue_type,title,details)
  SELECT a.company_id,a.case_id,a.payment_id,'missing_journal','حركة مرتبطة بالحكم دون قيد مرحل',jsonb_build_object('allocation_id',a.id)
  FROM public.legal_case_payment_allocations a JOIN public.payments p ON p.id=a.payment_id
  LEFT JOIN public.journal_entries j ON j.id=p.journal_entry_id
  WHERE a.company_id=p_company_id AND a.status='active'
    AND (p.journal_entry_id IS NULL OR lower(COALESCE(j.status,''))<>'posted')
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('auto_linked',v_auto,'suggested',v_suggested,'ran_at',now());
END; $$;

CREATE OR REPLACE FUNCTION public.run_all_legal_judgment_matchers_v1()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_company uuid; v_runs integer:=0;
BEGIN
  FOR v_company IN SELECT DISTINCT company_id FROM public.legal_cases WHERE COALESCE(outcome_amount,0)>0 LOOP
    PERFORM public.run_legal_judgment_matcher_v1(v_company,NULL); v_runs:=v_runs+1;
  END LOOP;
  RETURN jsonb_build_object('companies_checked',v_runs,'ran_at',now());
END; $$;

CREATE OR REPLACE VIEW public.legal_judgment_settlements_v1
WITH (security_invoker=true) AS
WITH allocation_totals AS (
  SELECT a.company_id,a.case_id,
    COALESCE(sum(a.allocated_amount),0) linked_amount,
    COALESCE(sum(a.allocated_amount) FILTER (
      WHERE lower(COALESCE(p.payment_status,'')) IN ('completed','paid','received','approved','cleared')
        AND p.journal_entry_id IS NOT NULL AND lower(COALESCE(j.status,''))='posted'
    ),0) settled_amount,
    count(*) FILTER (WHERE a.status='active') allocation_count
  FROM public.legal_case_payment_allocations a
  JOIN public.payments p ON p.id=a.payment_id AND p.company_id=a.company_id
  LEFT JOIN public.journal_entries j ON j.id=p.journal_entry_id AND j.company_id=p.company_id
  WHERE a.status='active' GROUP BY a.company_id,a.case_id
), review_totals AS (
  SELECT company_id,case_id,count(*) open_review_count
  FROM public.legal_settlement_review_items WHERE status='open' GROUP BY company_id,case_id
)
SELECT c.id,c.company_id,c.case_number,c.case_title,c.client_id,c.client_name,c.contract_id,
  c.case_status,c.workflow_stage,c.case_reference,c.court_name,c.judge_name,c.outcome_type,
  c.outcome_date,c.outcome_amount,c.payment_direction,c.outcome_payment_status,c.outcome_notes,
  c.created_at,c.updated_at,
  COALESCE(a.linked_amount,0)::numeric(15,2) linked_amount,
  COALESCE(a.settled_amount,0)::numeric(15,2) settled_amount,
  GREATEST(COALESCE(c.outcome_amount,0)-COALESCE(a.settled_amount,0),0)::numeric(15,2) remaining_amount,
  COALESCE(a.allocation_count,0)::bigint allocation_count,
  COALESCE(r.open_review_count,0)::bigint open_review_count,
  CASE
    WHEN c.workflow_stage='closed' AND COALESCE(a.settled_amount,0)<COALESCE(c.outcome_amount,0)-0.01 THEN 'closed_with_balance'
    WHEN COALESCE(a.settled_amount,0)>=COALESCE(c.outcome_amount,0)-0.01 THEN 'settled'
    WHEN COALESCE(a.linked_amount,0)>COALESCE(a.settled_amount,0) THEN 'linked_unposted'
    WHEN COALESCE(a.settled_amount,0)>0 THEN 'partial'
    ELSE 'pending'
  END settlement_status
FROM public.legal_cases c
LEFT JOIN allocation_totals a ON a.company_id=c.company_id AND a.case_id=c.id
LEFT JOIN review_totals r ON r.company_id=c.company_id AND r.case_id=c.id
WHERE COALESCE(c.outcome_amount,0)>0 AND c.payment_direction IN ('receive','pay')
  AND c.workflow_stage IN ('judgment_issued','appeal','enforcement','collection','closed');

GRANT SELECT ON public.legal_judgment_settlements_v1 TO authenticated,service_role;

-- Migrate only exact, unique legacy matches; unresolved rows stay visible for review.
WITH exact_matches AS (
  SELECT lp.id legacy_id,lp.company_id,lp.case_id,p.id payment_id,lp.amount,
    row_number() OVER (PARTITION BY lp.id ORDER BY p.created_at) rank,
    count(*) OVER (PARTITION BY lp.id) matches
  FROM public.legal_case_payments lp
  JOIN public.payments p ON p.company_id=lp.company_id AND abs(p.amount-lp.amount)<=0.01
    AND (p.journal_entry_id=lp.journal_entry_id OR (
      lp.reference_number IS NOT NULL AND p.reference_number=lp.reference_number AND p.payment_date=lp.payment_date
    ))
  JOIN public.legal_cases c ON c.id=lp.case_id AND c.company_id=lp.company_id
    AND ((c.payment_direction='receive' AND p.transaction_type::text='receipt') OR (c.payment_direction='pay' AND p.transaction_type::text='payment'))
)
INSERT INTO public.legal_case_payment_allocations(company_id,case_id,payment_id,allocated_amount,link_source,confidence,link_reason,source_legal_case_payment_id)
SELECT company_id,case_id,payment_id,amount,'migrated',100,'Exact migration from the legacy legal payment record',legacy_id
FROM exact_matches WHERE rank=1 AND matches=1
ON CONFLICT DO NOTHING;

INSERT INTO public.legal_settlement_review_items(company_id,case_id,source_legal_case_payment_id,issue_type,title,details)
SELECT lp.company_id,lp.case_id,lp.id,'legacy_payment_unlinked','دفعة قانونية قديمة غير مرتبطة بحركة مالية',
  jsonb_build_object('amount',lp.amount,'payment_date',lp.payment_date,'reference_number',lp.reference_number)
FROM public.legal_case_payments lp
WHERE NOT EXISTS(SELECT 1 FROM public.legal_case_payment_allocations a WHERE a.source_legal_case_payment_id=lp.id)
ON CONFLICT DO NOTHING;

DO $$ DECLARE v_case record;
BEGIN
  FOR v_case IN SELECT company_id,id FROM public.legal_cases WHERE COALESCE(outcome_amount,0)>0 AND payment_direction IN ('receive','pay') LOOP
    PERFORM public.recalculate_legal_case_settlement_v1(v_case.company_id,v_case.id);
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.recalculate_legal_case_settlement_v1(uuid,uuid),
  public.link_legal_case_payment_v1(uuid,uuid,uuid,numeric,text,numeric,text,uuid),
  public.reverse_legal_case_payment_link_v1(uuid,uuid,text,uuid),
  public.resolve_legal_settlement_review_v1(uuid,uuid,text,text,uuid),
  public.run_legal_judgment_matcher_v1(uuid,uuid),public.run_all_legal_judgment_matchers_v1()
FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.recalculate_legal_case_settlement_v1(uuid,uuid),
  public.link_legal_case_payment_v1(uuid,uuid,uuid,numeric,text,numeric,text,uuid),
  public.reverse_legal_case_payment_link_v1(uuid,uuid,text,uuid),
  public.resolve_legal_settlement_review_v1(uuid,uuid,text,text,uuid),
  public.run_legal_judgment_matcher_v1(uuid,uuid)
TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.run_all_legal_judgment_matchers_v1() TO service_role;

REVOKE EXECUTE ON FUNCTION public.record_legal_case_payment_v1(uuid,uuid,numeric,date,text,text,uuid,uuid,text,uuid) FROM authenticated;

DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_cron')
     AND NOT EXISTS(SELECT 1 FROM cron.job WHERE jobname='legal-judgment-payment-matcher-hourly') THEN
    PERFORM cron.schedule('legal-judgment-payment-matcher-hourly','17 * * * *','SELECT public.run_all_legal_judgment_matchers_v1()');
  END IF;
END $$;
