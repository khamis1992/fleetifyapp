-- Local repair; NOT applied to production. Live column names/types/owner/ACL captured in the debt-report verification catalog.
-- Preserve existing column order/types and dependencies; no DROP and no source table changes.
-- Balances are CURRENT recorded invoice balances, aged at database CURRENT_DATE; not historical reconstruction.
BEGIN;

CREATE OR REPLACE VIEW public.collections_priority_list WITH (security_invoker=true) AS
WITH scoped_invoices AS (
 SELECT i.*, COALESCE(i.balance_due,i.total_amount-i.paid_amount) AS outstanding,
   greatest(0,CURRENT_DATE-coalesce(i.due_date,i.invoice_date)) AS overdue_days
 FROM public.invoices i
 WHERE EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id=auth.uid() AND p.company_id=i.company_id AND p.is_active IS NOT FALSE)
   AND i.invoice_date<=CURRENT_DATE AND i.invoice_type IN ('sales','service')
   AND lower(coalesce(i.status,'')) NOT IN ('cancelled','canceled','void','voided','reversed','deleted')
   AND lower(coalesce(i.payment_status,'')) NOT IN ('cancelled','canceled','void','voided','reversed','deleted')
   AND COALESCE(i.balance_due,i.total_amount-i.paid_amount)>0
), payment_dates AS (
 SELECT p.company_id,p.customer_id,max(p.payment_date)::text AS last_payment_date
 FROM public.payments p
 WHERE p.payment_date<=CURRENT_DATE AND p.payment_status IN ('completed','paid','approved')
   AND EXISTS (SELECT 1 FROM public.profiles member WHERE member.user_id=auth.uid() AND member.company_id=p.company_id AND member.is_active IS NOT FALSE)
 GROUP BY p.company_id,p.customer_id
)
 SELECT i.customer_id,COALESCE(NULLIF(concat_ws(' ',c.first_name_ar,c.last_name_ar),''),NULLIF(concat_ws(' ',c.first_name,c.last_name),''),c.company_name_ar,c.company_name,'غير معروف') AS customer_name_ar,
 COALESCE(NULLIF(concat_ws(' ',c.first_name,c.last_name),''),c.company_name,c.first_name_ar,'Unknown') AS customer_name_en,
 c.phone AS customer_phone,c.email AS customer_email,sum(outstanding) AS total_outstanding,count(*) AS total_invoices,max(overdue_days) AS max_days_overdue,
 sum(CASE WHEN overdue_days>90 THEN outstanding ELSE 0 END) AS critical_amount,
 sum(CASE WHEN overdue_days BETWEEN 61 AND 90 THEN outstanding ELSE 0 END) AS high_risk_amount,
 max(overdue_days)::numeric*0.5+sum(outstanding)/1000 AS priority_score,
 CASE WHEN max(overdue_days)>90 THEN 'critical' WHEN max(overdue_days)>60 THEN 'high' WHEN max(overdue_days)>30 THEN 'medium' ELSE 'low' END AS risk_category,
 CASE WHEN max(overdue_days)>90 THEN 'legal_action' WHEN max(overdue_days)>60 THEN 'final_notice' WHEN max(overdue_days)>30 THEN 'follow_up_call' ELSE 'monitor' END AS recommended_action,
 max(p.last_payment_date) AS last_payment_date,avg(overdue_days) AS avg_dso
 FROM scoped_invoices i LEFT JOIN public.customers c ON c.id=i.customer_id AND c.company_id=i.company_id
 LEFT JOIN payment_dates p ON p.company_id=i.company_id AND p.customer_id=i.customer_id GROUP BY i.company_id,i.customer_id,c.first_name_ar,c.last_name_ar,c.first_name,c.last_name,c.company_name_ar,c.company_name,c.phone,c.email;
REVOKE ALL ON public.collections_priority_list FROM PUBLIC,anon;

CREATE OR REPLACE VIEW public.company_ar_aging_summary WITH (security_invoker=true) AS
WITH scoped_invoices AS (
 SELECT i.*, COALESCE(i.balance_due,i.total_amount-i.paid_amount) AS outstanding,
   greatest(0,CURRENT_DATE-coalesce(i.due_date,i.invoice_date)) AS overdue_days
 FROM public.invoices i
 WHERE EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id=auth.uid() AND p.company_id=i.company_id AND p.is_active IS NOT FALSE)
   AND i.invoice_date<=CURRENT_DATE AND i.invoice_type IN ('sales','service')
   AND lower(coalesce(i.status,'')) NOT IN ('cancelled','canceled','void','voided','reversed','deleted')
   AND lower(coalesce(i.payment_status,'')) NOT IN ('cancelled','canceled','void','voided','reversed','deleted')
   AND COALESCE(i.balance_due,i.total_amount-i.paid_amount)>0
)
 SELECT count(DISTINCT customer_id) AS total_customers_with_ar,count(*) AS total_outstanding_invoices,sum(outstanding) AS total_ar_amount,
 sum(CASE WHEN overdue_days=0 THEN outstanding ELSE 0 END) AS current_total,
 sum(CASE WHEN overdue_days BETWEEN 1 AND 30 THEN outstanding ELSE 0 END) AS days_1_30_total,
 sum(CASE WHEN overdue_days BETWEEN 31 AND 60 THEN outstanding ELSE 0 END) AS days_31_60_total,
 sum(CASE WHEN overdue_days BETWEEN 61 AND 90 THEN outstanding ELSE 0 END) AS days_61_90_total,
 sum(CASE WHEN overdue_days>90 THEN outstanding ELSE 0 END) AS days_90_plus_total,
 round(sum(CASE WHEN overdue_days=0 THEN outstanding ELSE 0 END)*100/nullif(sum(outstanding),0),1) AS current_percentage,
 round(sum(CASE WHEN overdue_days BETWEEN 1 AND 30 THEN outstanding ELSE 0 END)*100/nullif(sum(outstanding),0),1) AS days_1_30_percentage,
 round(sum(CASE WHEN overdue_days BETWEEN 31 AND 60 THEN outstanding ELSE 0 END)*100/nullif(sum(outstanding),0),1) AS days_31_60_percentage,
 round(sum(CASE WHEN overdue_days BETWEEN 61 AND 90 THEN outstanding ELSE 0 END)*100/nullif(sum(outstanding),0),1) AS days_61_90_percentage,
 round(sum(CASE WHEN overdue_days>90 THEN outstanding ELSE 0 END)*100/nullif(sum(outstanding),0),1) AS days_90_plus_percentage,
 coalesce(avg(overdue_days) FILTER (WHERE overdue_days>0),0) AS avg_days_overdue,count(*) FILTER(WHERE overdue_days>60) AS high_priority_count,
 coalesce(sum(outstanding) FILTER(WHERE overdue_days>60),0) AS high_priority_amount
 FROM scoped_invoices GROUP BY company_id;
REVOKE ALL ON public.company_ar_aging_summary FROM PUBLIC,anon;

CREATE OR REPLACE VIEW public.customer_ar_aging_summary WITH (security_invoker=true) AS
WITH scoped_invoices AS (
 SELECT i.*, COALESCE(i.balance_due,i.total_amount-i.paid_amount) AS outstanding,
   greatest(0,CURRENT_DATE-coalesce(i.due_date,i.invoice_date)) AS overdue_days
 FROM public.invoices i
 WHERE EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id=auth.uid() AND p.company_id=i.company_id AND p.is_active IS NOT FALSE)
   AND i.invoice_date<=CURRENT_DATE AND i.invoice_type IN ('sales','service')
   AND lower(coalesce(i.status,'')) NOT IN ('cancelled','canceled','void','voided','reversed','deleted')
   AND lower(coalesce(i.payment_status,'')) NOT IN ('cancelled','canceled','void','voided','reversed','deleted')
   AND COALESCE(i.balance_due,i.total_amount-i.paid_amount)>0
), payment_dates AS (
 SELECT p.company_id,p.customer_id,max(p.payment_date)::text AS last_payment_date
 FROM public.payments p
 WHERE p.payment_date<=CURRENT_DATE AND p.payment_status IN ('completed','paid','approved')
   AND EXISTS (SELECT 1 FROM public.profiles member WHERE member.user_id=auth.uid() AND member.company_id=p.company_id AND member.is_active IS NOT FALSE)
 GROUP BY p.company_id,p.customer_id
)
 SELECT i.customer_id,COALESCE(NULLIF(concat_ws(' ',c.first_name_ar,c.last_name_ar),''),NULLIF(concat_ws(' ',c.first_name,c.last_name),''),c.company_name_ar,c.company_name,'غير معروف') AS customer_name_ar,
 COALESCE(NULLIF(concat_ws(' ',c.first_name,c.last_name),''),c.company_name,c.first_name_ar,'Unknown') AS customer_name_en,
 c.phone AS customer_phone,c.email AS customer_email,count(*) AS total_invoices,sum(outstanding) AS total_outstanding,
 sum(CASE WHEN overdue_days=0 THEN outstanding ELSE 0 END) AS current_amount,
 sum(CASE WHEN overdue_days BETWEEN 1 AND 30 THEN outstanding ELSE 0 END) AS days_1_30,
 sum(CASE WHEN overdue_days BETWEEN 31 AND 60 THEN outstanding ELSE 0 END) AS days_31_60,
 sum(CASE WHEN overdue_days BETWEEN 61 AND 90 THEN outstanding ELSE 0 END) AS days_61_90,
 sum(CASE WHEN overdue_days>90 THEN outstanding ELSE 0 END) AS days_90_plus,
 max(overdue_days) AS max_days_overdue,max(p.last_payment_date) AS last_payment_date
 FROM scoped_invoices i LEFT JOIN public.customers c ON c.id=i.customer_id AND c.company_id=i.company_id
 LEFT JOIN payment_dates p ON p.company_id=i.company_id AND p.customer_id=i.customer_id GROUP BY i.company_id,i.customer_id,c.first_name_ar,c.last_name_ar,c.first_name,c.last_name,c.company_name_ar,c.company_name,c.phone,c.email;
REVOKE ALL ON public.customer_ar_aging_summary FROM PUBLIC,anon;
COMMIT;
