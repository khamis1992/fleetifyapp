WITH scope AS (SELECT '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid company_id),
c AS (SELECT c.* FROM public.contracts c JOIN scope x USING(company_id)),
i AS (SELECT i.* FROM public.invoices i JOIN scope x USING(company_id)),
p AS (SELECT p.* FROM public.payments p JOIN scope x USING(company_id)
 WHERE lower(coalesce(p.payment_status,'')) IN ('completed','paid','success','succeeded')
 AND lower(coalesce(p.transaction_type::text,'receipt'))='receipt'),
a AS (SELECT a.* FROM public.payment_allocations a JOIN scope x USING(company_id) WHERE a.is_active),
has_alloc AS (SELECT DISTINCT payment_id FROM a),
applications AS (
 SELECT a.payment_id,a.amount,a.allocation_type,a.target_id FROM a JOIN p ON p.id=a.payment_id
 UNION ALL
 SELECT p.id,p.amount,CASE WHEN p.invoice_id IS NOT NULL THEN 'invoice' ELSE 'contract' END,coalesce(p.invoice_id,p.contract_id)
 FROM p LEFT JOIN has_alloc h ON h.payment_id=p.id WHERE h.payment_id IS NULL
),
ip AS (SELECT i.id,coalesce(sum(x.amount),0) paid FROM i LEFT JOIN applications x ON x.allocation_type='invoice' AND x.target_id=i.id GROUP BY i.id),
cp AS (
 SELECT contract_id,sum(paid) paid FROM (
 SELECT i.contract_id,ip.paid FROM i JOIN ip ON ip.id=i.id WHERE lower(coalesce(i.status,'')) NOT IN ('cancelled','canceled','void','voided','deleted')
 UNION ALL SELECT x.target_id,x.amount FROM applications x WHERE x.allocation_type='contract'
 ) x GROUP BY contract_id
),
s AS (SELECT s.* FROM public.contract_payment_schedules s JOIN scope x USING(company_id) WHERE lower(coalesce(s.status,'')) NOT IN ('cancelled','canceled','void','voided','deleted','inactive','reversed')),
active_i AS (SELECT * FROM i WHERE lower(coalesce(status,'')) NOT IN ('cancelled','canceled','void','voided','deleted','inactive') AND lower(coalesce(payment_status,'')) NOT IN ('cancelled','canceled','void','voided','deleted','inactive')),
headers AS (SELECT c.id,c.contract_number,c.status,c.total_paid,
 CASE WHEN coalesce(c.contract_amount,0)>0 THEN least(coalesce(cp.paid,0),c.contract_amount) ELSE coalesce(cp.paid,0) END computed FROM c LEFT JOIN cp ON cp.contract_id=c.id)
SELECT jsonb_build_object('captured_at',current_timestamp,
 'contracts', (SELECT count(*) FROM c),
 'header_drift_count',(SELECT count(*) FROM headers WHERE round(coalesce(total_paid,0),2)<>round(computed,2)),
 'header_drift_examples',(SELECT jsonb_agg(to_jsonb(h)) FROM (SELECT contract_number,status,total_paid,computed,round(total_paid-computed,2) difference FROM headers WHERE round(coalesce(total_paid,0),2)<>round(computed,2) ORDER BY abs(total_paid-computed) DESC LIMIT 12) h),
 'active_invoices',(SELECT count(*) FROM active_i),
 'invoice_paid_drift',(SELECT count(*) FROM active_i JOIN ip USING(id) WHERE round(coalesce(active_i.paid_amount,0),2)<>round(least(ip.paid,active_i.total_amount),2)),
 'active_schedules',(SELECT count(*) FROM s),
 'due_unlinked_schedules',(SELECT count(*) FROM s WHERE invoice_id IS NULL AND due_date <= (current_timestamp AT TIME ZONE 'Asia/Qatar')::date),
 'due_unlinked_schedules_cancelled_contracts',(SELECT count(*) FROM s JOIN c ON c.id=s.contract_id WHERE invoice_id IS NULL AND due_date <= (current_timestamp AT TIME ZONE 'Asia/Qatar')::date AND c.status IN ('cancelled','canceled')),
 'linked_to_inactive_invoice',(SELECT count(*) FROM s JOIN i ON i.id=s.invoice_id LEFT JOIN active_i ai ON ai.id=i.id WHERE ai.id IS NULL),
 'duplicate_active_invoice_links',(SELECT count(*) FROM (SELECT invoice_id FROM s WHERE invoice_id IS NOT NULL GROUP BY invoice_id HAVING count(*)>1) x),
 'same_contract_linked_schedule_paid_drift',(SELECT count(*) FROM s JOIN active_i i ON i.id=s.invoice_id AND i.contract_id=s.contract_id JOIN ip ON ip.id=i.id WHERE round(coalesce(s.paid_amount,0),2)<>round(least(ip.paid,i.total_amount),2)),
 'overallocated_receipts',(SELECT count(*) FROM (SELECT a.payment_id,sum(a.amount) allocated,max(p.amount) gross FROM a JOIN p ON p.id=a.payment_id GROUP BY a.payment_id HAVING sum(a.amount)>max(p.amount)+0.01) x)
) result;
