-- Rollback: restore every contract amount/totals changed by
-- 20260803213000_repair_contract_amount_graph_mismatches from the backup table.

BEGIN;

DO $$
DECLARE
  v_row record;
BEGIN
  PERFORM set_config('fleetify.atomic_contract_creation', 'on', true);

  FOR v_row IN
    SELECT *
    FROM public._backup_contract_amount_20260803 backup
  LOOP
    UPDATE public.contracts contract
    SET contract_amount = v_row.old_contract_amount,
        total_paid = v_row.old_total_paid,
        balance_due = v_row.old_balance_due,
        payment_status = v_row.old_payment_status,
        updated_at = now()
    WHERE contract.id = v_row.contract_id;
  END LOOP;
END;
$$;

COMMIT;
