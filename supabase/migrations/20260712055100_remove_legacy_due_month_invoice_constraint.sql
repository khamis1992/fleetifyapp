begin;

alter table public.invoices
  drop constraint if exists unique_invoice_per_contract_month;
drop index if exists public.unique_invoice_per_contract_month;

comment on index public.idx_invoices_unique_contract_month is
  'Canonical uniqueness for active contract invoices by invoice_date month. Legacy due-date uniqueness was removed.';

commit;
