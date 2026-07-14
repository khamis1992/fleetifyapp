BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.purchase_order_items WHERE inventory_item_id IS NOT NULL)
     OR EXISTS (SELECT 1 FROM public.goods_receipts WHERE warehouse_id IS NOT NULL OR journal_entry_id IS NOT NULL)
  THEN
    RAISE EXCEPTION 'Rollback blocked: canonical purchase order receipt data exists';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.system_agent_rollback_repair(uuid, text);
ALTER FUNCTION public.system_agent_rollback_repair_before_purchase_order_v1(uuid, text)
  RENAME TO system_agent_rollback_repair;
DROP FUNCTION IF EXISTS public.system_agent_apply_purchase_order_repair_v1(
  uuid, uuid, uuid, text, uuid, text, jsonb, jsonb, jsonb
);
DELETE FROM public.system_agent_command_registry
WHERE command IN ('purchase_order.sync_totals', 'purchase_order.sync_receipt_status');

DROP TRIGGER IF EXISTS guard_purchase_order_lifecycle_v1 ON public.purchase_orders;
DROP TRIGGER IF EXISTS refresh_purchase_order_totals_v1 ON public.purchase_order_items;
DROP TRIGGER IF EXISTS prepare_purchase_order_item_v1 ON public.purchase_order_items;

DROP FUNCTION IF EXISTS public.receive_purchase_order_v1(uuid, uuid, uuid, date, text, text, jsonb, uuid);
DROP FUNCTION IF EXISTS public.transition_purchase_order_status_v1(uuid, uuid, text, uuid);
DROP FUNCTION IF EXISTS public.create_purchase_order_v1(
  uuid, uuid, date, date, text, text, text, text, text, text, jsonb, uuid
);
DROP FUNCTION IF EXISTS public.guard_purchase_order_lifecycle_v1();
DROP FUNCTION IF EXISTS public.refresh_purchase_order_totals_v1();
DROP FUNCTION IF EXISTS public.prepare_purchase_order_item_v1();

DROP INDEX IF EXISTS public.uq_goods_receipt_active_journal;

ALTER TABLE public.purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_status_v1;
ALTER TABLE public.purchase_order_items DROP CONSTRAINT IF EXISTS purchase_order_items_positive_values_v1;
ALTER TABLE public.goods_receipts DROP COLUMN IF EXISTS journal_entry_id;
ALTER TABLE public.goods_receipts DROP COLUMN IF EXISTS warehouse_id;
ALTER TABLE public.purchase_order_items DROP COLUMN IF EXISTS inventory_item_id;

COMMIT;
