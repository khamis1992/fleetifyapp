-- A contract may have only one active payment schedule for a due date.
-- Inactive rows remain available for audit history and repair rollback.
BEGIN;

LOCK TABLE public.contract_payment_schedules IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT
        schedule.company_id,
        schedule.contract_id,
        schedule.due_date,
        count(DISTINCT round(coalesce(schedule.amount, 0)::numeric, 2)) AS amount_count,
        count(DISTINCT round(coalesce(schedule.paid_amount, 0)::numeric, 2)) AS paid_count,
        count(DISTINCT lower(coalesce(schedule.status, ''))) AS status_count,
        count(DISTINCT schedule.invoice_id) FILTER (
          WHERE schedule.invoice_id IS NOT NULL
        ) AS invoice_count
      FROM public.contract_payment_schedules schedule
      WHERE schedule.due_date IS NOT NULL
        AND lower(coalesce(schedule.status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
        )
      GROUP BY schedule.company_id, schedule.contract_id, schedule.due_date
      HAVING count(*) > 1
    ) duplicate_group
    WHERE duplicate_group.amount_count <> 1
       OR duplicate_group.paid_count <> 1
       OR duplicate_group.status_count <> 1
       OR duplicate_group.invoice_count <> 1
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce active schedule uniqueness while financially different duplicates exist';
  END IF;
END;
$$;

WITH ranked AS (
  SELECT
    schedule.id,
    row_number() OVER (
      PARTITION BY schedule.company_id, schedule.contract_id, schedule.due_date
      ORDER BY
        CASE WHEN schedule.invoice_id IS NOT NULL THEN 0 ELSE 1 END,
        schedule.id
    ) AS keep_rank
  FROM public.contract_payment_schedules schedule
  WHERE schedule.due_date IS NOT NULL
    AND lower(coalesce(schedule.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
)
UPDATE public.contract_payment_schedules schedule
SET status = 'cancelled',
    invoice_id = NULL,
    updated_at = now()
FROM ranked
WHERE schedule.id = ranked.id
  AND ranked.keep_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_contract_payment_schedules_unique_active_due_date
  ON public.contract_payment_schedules (company_id, contract_id, due_date)
  WHERE due_date IS NOT NULL
    AND lower(coalesce(status, '')) NOT IN (
      'cancelled',
      'canceled',
      'void',
      'voided',
      'deleted',
      'inactive'
    );

COMMIT;
