begin;

drop trigger if exists trigger_check_duplicate_monthly_invoice on public.invoices;
drop index if exists public.idx_invoices_unique_contract_month;

create unique index idx_invoices_unique_contract_month
  on public.invoices (
    contract_id,
    (date_trunc('month', coalesce(due_date, invoice_date)::timestamp without time zone)::date)
  )
  where contract_id is not null and lower(coalesce(status, '')) <> 'cancelled';

create or replace function public.check_duplicate_monthly_invoice()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_invoice_month date;
  v_existing_invoice_number text;
begin
  if new.contract_id is null or lower(coalesce(new.status, '')) = 'cancelled' then return new; end if;
  v_invoice_month := date_trunc('month', coalesce(new.due_date, new.invoice_date))::date;
  select invoice.invoice_number into v_existing_invoice_number
  from public.invoices invoice
  where invoice.contract_id = new.contract_id
    and date_trunc('month', coalesce(invoice.due_date, invoice.invoice_date))::date = v_invoice_month
    and lower(coalesce(invoice.status, '')) <> 'cancelled'
    and invoice.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
  limit 1;
  if v_existing_invoice_number is not null then
    raise exception 'An active invoice (%) already exists for this contract due month %',
      v_existing_invoice_number, to_char(v_invoice_month, 'YYYY-MM') using errcode = '23505';
  end if;
  return new;
end;
$$;

create trigger trigger_check_duplicate_monthly_invoice
  before insert on public.invoices
  for each row execute function public.check_duplicate_monthly_invoice();

commit;
