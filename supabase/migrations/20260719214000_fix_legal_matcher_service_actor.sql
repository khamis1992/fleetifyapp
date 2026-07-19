CREATE OR REPLACE FUNCTION public.run_legal_judgment_matcher_v1(
  p_company_id uuid,
  p_actor_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_actor uuid; v_match record; v_auto integer:=0; v_suggested integer:=0;
BEGIN
  IF auth.uid() IS NULL AND p_actor_id IS NULL THEN
    SELECT id INTO v_actor FROM public.profiles WHERE company_id=p_company_id ORDER BY created_at LIMIT 1;
    IF v_actor IS NULL THEN RAISE EXCEPTION 'No company profile is available for automated matching'; END IF;
  ELSE
    v_actor:=public.legal_workflow_actor_profile_v1(p_company_id,p_actor_id);
  END IF;

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

REVOKE ALL ON FUNCTION public.run_legal_judgment_matcher_v1(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.run_legal_judgment_matcher_v1(uuid,uuid) TO authenticated,service_role;
