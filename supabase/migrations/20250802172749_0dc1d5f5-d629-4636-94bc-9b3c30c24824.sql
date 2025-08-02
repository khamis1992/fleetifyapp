-- إضافة Foreign Key Constraints المفقودة
-- تاريخ الإنشاء: 2 أغسطس 2025

-- إضافة foreign keys لجدول vendor_accounts
ALTER TABLE public.vendor_accounts 
ADD CONSTRAINT fk_vendor_accounts_vendor 
FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;

ALTER TABLE public.vendor_accounts 
ADD CONSTRAINT fk_vendor_accounts_account 
FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id) ON DELETE CASCADE;

-- إضافة foreign keys لجدول purchase_orders
ALTER TABLE public.purchase_orders 
ADD CONSTRAINT fk_purchase_orders_vendor 
FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE RESTRICT;

-- إضافة foreign keys لجدول purchase_order_items
ALTER TABLE public.purchase_order_items 
ADD CONSTRAINT fk_purchase_order_items_order 
FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;

-- إضافة foreign keys لجدول vendor_payments
ALTER TABLE public.vendor_payments 
ADD CONSTRAINT fk_vendor_payments_vendor 
FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE RESTRICT;

ALTER TABLE public.vendor_payments 
ADD CONSTRAINT fk_vendor_payments_bank 
FOREIGN KEY (bank_id) REFERENCES public.banks(id) ON DELETE SET NULL;

ALTER TABLE public.vendor_payments 
ADD CONSTRAINT fk_vendor_payments_purchase_order 
FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE SET NULL;

-- إضافة foreign keys لجدول goods_receipts
ALTER TABLE public.goods_receipts 
ADD CONSTRAINT fk_goods_receipts_purchase_order 
FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE RESTRICT;

-- إضافة foreign keys لجدول goods_receipt_items
ALTER TABLE public.goods_receipt_items 
ADD CONSTRAINT fk_goods_receipt_items_receipt 
FOREIGN KEY (goods_receipt_id) REFERENCES public.goods_receipts(id) ON DELETE CASCADE;

ALTER TABLE public.goods_receipt_items 
ADD CONSTRAINT fk_goods_receipt_items_po_item 
FOREIGN KEY (purchase_order_item_id) REFERENCES public.purchase_order_items(id) ON DELETE RESTRICT;