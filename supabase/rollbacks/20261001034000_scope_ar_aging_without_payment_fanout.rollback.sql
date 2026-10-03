-- Restore the captured live definitions and prior view options/ACL. No production application.
BEGIN;

CREATE OR REPLACE VIEW public.collections_priority_list AS
SELECT i.customer_id,
    COALESCE(NULLIF(concat_ws(' '::text, c.first_name_ar, c.last_name_ar), ''::text), NULLIF(concat_ws(' '::text, c.first_name, c.last_name), ''::text), c.company_name_ar, c.company_name, 'غير معروف'::text) AS customer_name_ar,
    COALESCE(NULLIF(concat_ws(' '::text, c.first_name, c.last_name), ''::text), c.company_name, c.first_name_ar, 'Unknown'::text) AS customer_name_en,
    c.phone AS customer_phone,
    c.email AS customer_email,
    sum(i.total_amount - COALESCE(i.paid_amount, 0::numeric)) AS total_outstanding,
    count(*) AS total_invoices,
    max(CURRENT_DATE - i.due_date) AS max_days_overdue,
    sum(
        CASE
            WHEN i.due_date < (CURRENT_DATE - '90 days'::interval) THEN i.total_amount - COALESCE(i.paid_amount, 0::numeric)
            ELSE 0::numeric
        END) AS critical_amount,
    sum(
        CASE
            WHEN i.due_date < (CURRENT_DATE - '60 days'::interval) AND i.due_date >= (CURRENT_DATE - '90 days'::interval) THEN i.total_amount - COALESCE(i.paid_amount, 0::numeric)
            ELSE 0::numeric
        END) AS high_risk_amount,
    max(CURRENT_DATE - i.due_date)::numeric * 0.5 + sum(i.total_amount - COALESCE(i.paid_amount, 0::numeric)) / 1000::numeric AS priority_score,
        CASE
            WHEN max(CURRENT_DATE - i.due_date) >= 90 THEN 'critical'::text
            WHEN max(CURRENT_DATE - i.due_date) >= 60 THEN 'high'::text
            WHEN max(CURRENT_DATE - i.due_date) >= 30 THEN 'medium'::text
            ELSE 'low'::text
        END AS risk_category,
        CASE
            WHEN max(CURRENT_DATE - i.due_date) >= 90 THEN 'legal_action'::text
            WHEN max(CURRENT_DATE - i.due_date) >= 60 THEN 'final_notice'::text
            WHEN max(CURRENT_DATE - i.due_date) >= 30 THEN 'follow_up_call'::text
            ELSE 'monitor'::text
        END AS recommended_action,
    max(p.payment_date)::text AS last_payment_date,
    avg(CURRENT_DATE - i.due_date) AS avg_dso
   FROM invoices i
     JOIN customers c ON c.id = i.customer_id
     LEFT JOIN payments p ON p.customer_id = i.customer_id
  WHERE i.payment_status <> ALL (ARRAY['paid'::text, 'cancelled'::text])
  GROUP BY i.customer_id, c.first_name_ar, c.last_name_ar, c.first_name, c.last_name, c.company_name_ar, c.company_name, c.phone, c.email;
ALTER VIEW public.collections_priority_list RESET (security_invoker);
GRANT ALL ON public.collections_priority_list TO anon;

CREATE OR REPLACE VIEW public.company_ar_aging_summary AS
SELECT count(DISTINCT customer_id) AS total_customers_with_ar,
    count(*) AS total_outstanding_invoices,
    COALESCE(sum(total_amount - COALESCE(paid_amount, 0::numeric)), 0::numeric) AS total_ar_amount,
    COALESCE(sum(
        CASE
            WHEN due_date IS NULL OR due_date >= CURRENT_DATE THEN total_amount - COALESCE(paid_amount, 0::numeric)
            ELSE 0::numeric
        END), 0::numeric) AS current_total,
    COALESCE(sum(
        CASE
            WHEN due_date < CURRENT_DATE AND due_date >= (CURRENT_DATE - '30 days'::interval) THEN total_amount - COALESCE(paid_amount, 0::numeric)
            ELSE 0::numeric
        END), 0::numeric) AS days_1_30_total,
    COALESCE(sum(
        CASE
            WHEN due_date < (CURRENT_DATE - '30 days'::interval) AND due_date >= (CURRENT_DATE - '60 days'::interval) THEN total_amount - COALESCE(paid_amount, 0::numeric)
            ELSE 0::numeric
        END), 0::numeric) AS days_31_60_total,
    COALESCE(sum(
        CASE
            WHEN due_date < (CURRENT_DATE - '60 days'::interval) AND due_date >= (CURRENT_DATE - '90 days'::interval) THEN total_amount - COALESCE(paid_amount, 0::numeric)
            ELSE 0::numeric
        END), 0::numeric) AS days_61_90_total,
    COALESCE(sum(
        CASE
            WHEN due_date < (CURRENT_DATE - '90 days'::interval) THEN total_amount - COALESCE(paid_amount, 0::numeric)
            ELSE 0::numeric
        END), 0::numeric) AS days_90_plus_total,
        CASE
            WHEN sum(total_amount - COALESCE(paid_amount, 0::numeric)) > 0::numeric THEN round(sum(
            CASE
                WHEN due_date IS NULL OR due_date >= CURRENT_DATE THEN total_amount - COALESCE(paid_amount, 0::numeric)
                ELSE 0::numeric
            END) * 100.0 / NULLIF(sum(total_amount - COALESCE(paid_amount, 0::numeric)), 0::numeric), 1)
            ELSE 0::numeric
        END AS current_percentage,
        CASE
            WHEN sum(total_amount - COALESCE(paid_amount, 0::numeric)) > 0::numeric THEN round(sum(
            CASE
                WHEN due_date < CURRENT_DATE AND due_date >= (CURRENT_DATE - '30 days'::interval) THEN total_amount - COALESCE(paid_amount, 0::numeric)
                ELSE 0::numeric
            END) * 100.0 / NULLIF(sum(total_amount - COALESCE(paid_amount, 0::numeric)), 0::numeric), 1)
            ELSE 0::numeric
        END AS days_1_30_percentage,
        CASE
            WHEN sum(total_amount - COALESCE(paid_amount, 0::numeric)) > 0::numeric THEN round(sum(
            CASE
                WHEN due_date < (CURRENT_DATE - '30 days'::interval) AND due_date >= (CURRENT_DATE - '60 days'::interval) THEN total_amount - COALESCE(paid_amount, 0::numeric)
                ELSE 0::numeric
            END) * 100.0 / NULLIF(sum(total_amount - COALESCE(paid_amount, 0::numeric)), 0::numeric), 1)
            ELSE 0::numeric
        END AS days_31_60_percentage,
        CASE
            WHEN sum(total_amount - COALESCE(paid_amount, 0::numeric)) > 0::numeric THEN round(sum(
            CASE
                WHEN due_date < (CURRENT_DATE - '60 days'::interval) AND due_date >= (CURRENT_DATE - '90 days'::interval) THEN total_amount - COALESCE(paid_amount, 0::numeric)
                ELSE 0::numeric
            END) * 100.0 / NULLIF(sum(total_amount - COALESCE(paid_amount, 0::numeric)), 0::numeric), 1)
            ELSE 0::numeric
        END AS days_61_90_percentage,
        CASE
            WHEN sum(total_amount - COALESCE(paid_amount, 0::numeric)) > 0::numeric THEN round(sum(
            CASE
                WHEN due_date < (CURRENT_DATE - '90 days'::interval) THEN total_amount - COALESCE(paid_amount, 0::numeric)
                ELSE 0::numeric
            END) * 100.0 / NULLIF(sum(total_amount - COALESCE(paid_amount, 0::numeric)), 0::numeric), 1)
            ELSE 0::numeric
        END AS days_90_plus_percentage,
    COALESCE(avg(CURRENT_DATE - due_date) FILTER (WHERE due_date < CURRENT_DATE), 0::numeric) AS avg_days_overdue,
    count(*) FILTER (WHERE due_date < (CURRENT_DATE - '60 days'::interval)) AS high_priority_count,
    COALESCE(sum(total_amount - COALESCE(paid_amount, 0::numeric)) FILTER (WHERE due_date < (CURRENT_DATE - '60 days'::interval)), 0::numeric) AS high_priority_amount
   FROM invoices i
  WHERE payment_status <> ALL (ARRAY['paid'::text, 'cancelled'::text]);
ALTER VIEW public.company_ar_aging_summary RESET (security_invoker);
GRANT ALL ON public.company_ar_aging_summary TO anon;

CREATE OR REPLACE VIEW public.customer_ar_aging_summary AS
SELECT i.customer_id,
    COALESCE(NULLIF(concat_ws(' '::text, c.first_name_ar, c.last_name_ar), ''::text), NULLIF(concat_ws(' '::text, c.first_name, c.last_name), ''::text), c.company_name_ar, c.company_name, 'غير معروف'::text) AS customer_name_ar,
    COALESCE(NULLIF(concat_ws(' '::text, c.first_name, c.last_name), ''::text), c.company_name, c.first_name_ar, 'Unknown'::text) AS customer_name_en,
    c.phone AS customer_phone,
    c.email AS customer_email,
    count(*) AS total_invoices,
    sum(i.total_amount - COALESCE(i.paid_amount, 0::numeric)) AS total_outstanding,
    sum(
        CASE
            WHEN i.due_date IS NULL OR i.due_date >= CURRENT_DATE THEN i.total_amount - COALESCE(i.paid_amount, 0::numeric)
            ELSE 0::numeric
        END) AS current_amount,
    sum(
        CASE
            WHEN i.due_date < CURRENT_DATE AND i.due_date >= (CURRENT_DATE - '30 days'::interval) THEN i.total_amount - COALESCE(i.paid_amount, 0::numeric)
            ELSE 0::numeric
        END) AS days_1_30,
    sum(
        CASE
            WHEN i.due_date < (CURRENT_DATE - '30 days'::interval) AND i.due_date >= (CURRENT_DATE - '60 days'::interval) THEN i.total_amount - COALESCE(i.paid_amount, 0::numeric)
            ELSE 0::numeric
        END) AS days_31_60,
    sum(
        CASE
            WHEN i.due_date < (CURRENT_DATE - '60 days'::interval) AND i.due_date >= (CURRENT_DATE - '90 days'::interval) THEN i.total_amount - COALESCE(i.paid_amount, 0::numeric)
            ELSE 0::numeric
        END) AS days_61_90,
    sum(
        CASE
            WHEN i.due_date < (CURRENT_DATE - '90 days'::interval) THEN i.total_amount - COALESCE(i.paid_amount, 0::numeric)
            ELSE 0::numeric
        END) AS days_90_plus,
    max(CURRENT_DATE - i.due_date) AS max_days_overdue,
    max(p.payment_date)::text AS last_payment_date
   FROM invoices i
     JOIN customers c ON c.id = i.customer_id
     LEFT JOIN payments p ON p.customer_id = i.customer_id
  WHERE i.payment_status <> ALL (ARRAY['paid'::text, 'cancelled'::text])
  GROUP BY i.customer_id, c.first_name_ar, c.last_name_ar, c.first_name, c.last_name, c.company_name_ar, c.company_name, c.phone, c.email;
ALTER VIEW public.customer_ar_aging_summary RESET (security_invoker);
GRANT ALL ON public.customer_ar_aging_summary TO anon;
COMMIT;
