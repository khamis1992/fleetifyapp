begin;
do $$
begin
  if exists (
    select 1
    from public.invoices invoice
    where invoice.contract_id is not null
      and invoice.invoice_date is not null
      and lower(coalesce(invoice.status, '')) not in ('cancelled', 'canceled', 'void', 'voided', 'deleted')
    group by invoice.contract_id, date_trunc('month', invoice.invoice_date)
    having count(*) > 1
  ) then
    raise exception 'Cannot install canonical invoice-month constraint while active issue-month duplicates exist';
  end if;
end;
$$;
drop trigger if exists trigger_check_duplicate_monthly_invoice on public.invoices;
drop index if exists public.idx_invoices_unique_contract_month;
create unique index idx_invoices_unique_contract_month
  on public.invoices (
    contract_id,
    (date_trunc('month', invoice_date::timestamp without time zone)::date)
  )
  where contract_id is not null
    and invoice_date is not null
    and lower(coalesce(status, '')) not in ('cancelled', 'canceled', 'void', 'voided', 'deleted');
create or replace function public.check_duplicate_monthly_invoice()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_invoice_month date;
  v_existing_invoice_number text;
begin
  if new.contract_id is null
     or new.invoice_date is null
     or lower(coalesce(new.status, '')) in ('cancelled', 'canceled', 'void', 'voided', 'deleted')
  then
    return new;
  end if;

  v_invoice_month := date_trunc('month', new.invoice_date)::date;
  select invoice.invoice_number into v_existing_invoice_number
  from public.invoices invoice
  where invoice.contract_id = new.contract_id
    and date_trunc('month', invoice.invoice_date)::date = v_invoice_month
    and lower(coalesce(invoice.status, '')) not in ('cancelled', 'canceled', 'void', 'voided', 'deleted')
    and invoice.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
  order by invoice.id
  limit 1;

  if v_existing_invoice_number is not null then
    raise exception 'An active invoice (%) already exists for this contract issue month %',
      v_existing_invoice_number, to_char(v_invoice_month, 'YYYY-MM')
      using errcode = '23505';
  end if;
  return new;
end;
$$;
create trigger trigger_check_duplicate_monthly_invoice
  before insert or update of contract_id, invoice_date, status on public.invoices
  for each row execute function public.check_duplicate_monthly_invoice();
create or replace function public.generate_invoice_for_contract_month(
  p_contract_id uuid,
  p_invoice_month date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract public.contracts%rowtype;
  v_invoice_id uuid;
  v_invoice_number varchar(50);
  v_total_amount numeric(15,3);
  v_invoice_date date;
begin
  select * into v_contract from public.contracts contract where contract.id = p_contract_id;
  if not found then raise exception 'Contract not found: %', p_contract_id; end if;

  p_invoice_month := date_trunc('month', p_invoice_month)::date;
  if v_contract.start_date > (p_invoice_month + interval '1 month - 1 day')::date
     or (v_contract.end_date is not null and v_contract.end_date < p_invoice_month)
  then
    return null;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_contract.company_id::text || ':' || p_contract_id::text || ':' || to_char(p_invoice_month, 'YYYY-MM'), 0)
  );
  if exists (
    select 1 from public.invoices invoice
    where invoice.contract_id = p_contract_id
      and date_trunc('month', invoice.invoice_date)::date = p_invoice_month
      and lower(coalesce(invoice.status, '')) not in ('cancelled', 'canceled', 'void', 'voided', 'deleted')
  ) then
    return null;
  end if;

  select schedule.amount, schedule.due_date
  into v_total_amount, v_invoice_date
  from public.contract_payment_schedules schedule
  where schedule.contract_id = p_contract_id
    and schedule.company_id = v_contract.company_id
    and date_trunc('month', schedule.due_date)::date = p_invoice_month
    and lower(coalesce(schedule.status, '')) not in ('cancelled', 'canceled', 'void', 'voided', 'deleted')
  order by schedule.id
  limit 1;
  v_total_amount := coalesce(v_total_amount, v_contract.monthly_amount, v_contract.contract_amount, 0);
  v_invoice_date := greatest(coalesce(v_invoice_date, p_invoice_month), v_contract.start_date);
  if v_total_amount <= 0.01 then raise exception 'Contract invoice amount must be positive'; end if;

  select 'INV-' || to_char(p_invoice_month, 'YYYYMM') || '-' ||
         lpad((coalesce(max(cast(substring(invoice.invoice_number from 'INV-[0-9]{6}-([0-9]+)') as integer)), 0) + 1)::text, 5, '0')
  into v_invoice_number
  from public.invoices invoice
  where invoice.company_id = v_contract.company_id
    and invoice.invoice_number like 'INV-' || to_char(p_invoice_month, 'YYYYMM') || '-%';

  insert into public.invoices (
    company_id, customer_id, contract_id, invoice_number, invoice_date, due_date,
    total_amount, subtotal, tax_amount, discount_amount, paid_amount, balance_due,
    status, payment_status, invoice_type, notes, created_at, updated_at
  ) values (
    v_contract.company_id, v_contract.customer_id, v_contract.id, v_invoice_number,
    v_invoice_date, v_invoice_date, v_total_amount, v_total_amount, 0, 0, 0, v_total_amount,
    'sent', 'unpaid', 'service',
    'Generated for contract billing month ' || to_char(p_invoice_month, 'YYYY-MM'), now(), now()
  ) returning id into v_invoice_id;

  return v_invoice_id;
end;
$$;
comment on function public.check_duplicate_monthly_invoice() is
  'Prevents duplicate active contract invoices by invoice_date month; due_date is a payment deadline only.';
comment on function public.generate_invoice_for_contract_month(uuid,date) is
  'Generates one contract invoice by canonical invoice_date month using the matching schedule amount.';
commit;
