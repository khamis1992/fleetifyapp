begin;

create unique index if not exists unique_invoice_per_contract_month
  on public.invoices (
    contract_id,
    (date_trunc('month', coalesce(due_date, invoice_date)::timestamp without time zone)::date)
  )
  where contract_id is not null and lower(coalesce(status, '')) <> 'cancelled';

commit;
