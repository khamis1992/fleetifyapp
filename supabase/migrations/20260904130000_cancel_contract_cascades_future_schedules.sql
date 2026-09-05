-- Stop orphan future schedules from accumulating on cancelled contracts.
--
-- Problem (verified 2026-09-04 on production data):
--   1. cancel_contract_with_return_and_penalties_v2 never touched
--      contract_payment_schedules, so cancelling a contract left every future
--      unpaid/unlinked installment row "active" forever. 4,038 such orphans
--      existed across 132 cancelled contracts, and they permanently raised the
--      contract-details page "financialReviewRequired" warning with no
--      self-heal path.
--   2. The same warning fired for schedule rows linked to cancelled invoices
--      (576 rows) — a link to a dead invoice proves nothing about settlement.
--
-- Fix has two parts:
--   A. Data repair (one-time, audited):
--      - Cancel active unpaid schedule rows on cancelled/canceled contracts
--        that have no invoice link. Paid rows and linked rows are preserved
--        verbatim (they are financial history).
--      - Detach schedule rows whose linked invoice was cancelled/voided, then
--        cancel those rows when the contract itself is cancelled/canceled;
--        for live contracts the row stays visible for the reviewed repair
--        flow (the page keeps its warning until a correct link is created).
--   B. Trigger (permanent): the same cleanup runs automatically whenever a
--      contract transitions to cancelled/canceled, so orphans can no longer
--      accumulate.

-- ===== A. One-time repair =====
WITH repaired AS (
  UPDATE public.contract_payment_schedules AS schedule
  SET status = 'cancelled',
      invoice_id = NULL,
      updated_at = now()
  FROM public.contracts AS contract
  WHERE contract.id = schedule.contract_id
    AND lower(COALESCE(contract.status, '')) IN ('cancelled', 'canceled')
    AND lower(COALESCE(schedule.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted'
    )
    AND schedule.invoice_id IS NULL
    AND round(COALESCE(schedule.paid_amount, 0)::numeric, 2) <= 0.01
  RETURNING schedule.id, schedule.company_id
)
INSERT INTO public.audit_logs (
  company_id, resource_type, action, changes_summary, severity, status, user_name, created_at
)
SELECT
  repaired.company_id,
  'contract',
  'orphan_schedule_cancellation_repair',
  'أُلغيت أقساط مستقبلية غير مرتبطة بفواتير وغير مدفوعة على عقود ملغاة (إصلاح تاريخي للأيتام المتراكمين).',
  'info',
  'completed',
  'system',
  now()
FROM repaired
GROUP BY repaired.company_id;

-- Detach dead-invoice links on cancelled contracts and cancel those rows.
WITH detached AS (
  UPDATE public.contract_payment_schedules AS schedule
  SET status = 'cancelled',
      invoice_id = NULL,
      updated_at = now()
  FROM public.contracts AS contract
  JOIN public.invoices AS invoice
    ON invoice.id = schedule.invoice_id
  WHERE contract.id = schedule.contract_id
    AND lower(COALESCE(contract.status, '')) IN ('cancelled', 'canceled')
    AND lower(COALESCE(schedule.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted'
    )
    AND lower(COALESCE(invoice.status, '')) IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted'
    )
  RETURNING schedule.id, schedule.company_id
)
INSERT INTO public.audit_logs (
  company_id, resource_type, action, changes_summary, severity, status, user_name, created_at
)
SELECT
  detached.company_id,
  'contract',
  'dead_invoice_schedule_link_repair',
  'فُصل ربط الأقساط بفواتير ملغاة على عقود ملغاة وأُلغيت الصفوف (السجل المالي المدفوع محفوظ).',
  'info',
  'completed',
  'system',
  now()
FROM detached
GROUP BY detached.company_id;

-- ===== B. Permanent trigger =====
CREATE OR REPLACE FUNCTION public.cancel_contract_future_schedules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(COALESCE(NEW.status, '')) IN ('cancelled', 'canceled')
     AND lower(COALESCE(OLD.status, '')) NOT IN ('cancelled', 'canceled')
  THEN
    -- Future unpaid unlinked rows become cancelled with the contract.
    UPDATE public.contract_payment_schedules AS schedule
    SET status = 'cancelled',
        invoice_id = NULL,
        updated_at = now()
    WHERE schedule.contract_id = NEW.id
      AND lower(COALESCE(schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted'
      )
      AND schedule.invoice_id IS NULL
      AND round(COALESCE(schedule.paid_amount, 0)::numeric, 2) <= 0.01;

    -- Rows linked to a dead invoice cannot prove settlement; cancel and detach.
    UPDATE public.contract_payment_schedules AS schedule
    SET status = 'cancelled',
        invoice_id = NULL,
        updated_at = now()
    FROM public.invoices AS invoice
    WHERE invoice.id = schedule.invoice_id
      AND schedule.contract_id = NEW.id
      AND lower(COALESCE(schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted'
      )
      AND lower(COALESCE(invoice.status, '')) IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted'
      );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cancel_contract_future_schedules ON public.contracts;
CREATE TRIGGER trg_cancel_contract_future_schedules
  AFTER UPDATE OF status ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.cancel_contract_future_schedules();