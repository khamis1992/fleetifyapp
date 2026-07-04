-- Monthly company obligations: office rent, staff housing, vehicle installments,
-- subscriptions, insurance, and other recurring liabilities.
--
-- Rollback plan:
-- drop table public.monthly_obligation_vehicles;
-- drop table public.monthly_obligation_installments;
-- drop table public.monthly_obligations;
-- drop function public.set_monthly_obligations_updated_at();

create table if not exists public.monthly_obligations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  obligation_number text not null,
  title text not null,
  description text,
  obligation_type text not null default 'other'
    check (obligation_type in (
      'office_rent',
      'staff_housing',
      'vehicle_installment',
      'vehicle_lease',
      'subscription',
      'insurance',
      'other'
    )),
  accounting_treatment text not null default 'direct_expense'
    check (accounting_treatment in (
      'direct_expense',
      'financing_liability',
      'fixed_asset_financing',
      'right_of_use_asset'
    )),
  vendor_id uuid references public.vendors(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  vehicle_amount_mode text not null default 'total'
    check (vehicle_amount_mode in ('total', 'per_vehicle')),
  vehicle_count integer not null default 0 check (vehicle_count >= 0),
  fixed_asset_id uuid references public.fixed_assets(id) on delete set null,
  cost_center_id uuid references public.cost_centers(id) on delete set null,
  expense_account_id uuid references public.chart_of_accounts(id) on delete set null,
  liability_account_id uuid references public.chart_of_accounts(id) on delete set null,
  asset_account_id uuid references public.chart_of_accounts(id) on delete set null,
  interest_expense_account_id uuid references public.chart_of_accounts(id) on delete set null,
  monthly_amount numeric(12,2) not null check (monthly_amount >= 0),
  principal_amount numeric(12,2) not null default 0 check (principal_amount >= 0),
  interest_amount numeric(12,2) not null default 0 check (interest_amount >= 0),
  currency text not null default 'QAR',
  start_date date not null,
  end_date date,
  due_day integer not null default 1 check (due_day between 1 and 31),
  auto_generate boolean not null default true,
  next_due_date date,
  status text not null default 'active'
    check (status in ('active', 'paused', 'completed', 'cancelled')),
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint monthly_obligations_unique_number unique (company_id, obligation_number),
  constraint monthly_obligations_date_range check (end_date is null or end_date >= start_date)
);

create table if not exists public.monthly_obligation_vehicles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  obligation_id uuid not null references public.monthly_obligations(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  allocation_amount numeric(12,2) not null default 0 check (allocation_amount >= 0),
  allocation_percentage numeric(8,4) check (allocation_percentage is null or allocation_percentage between 0 and 100),
  is_primary boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint monthly_obligation_vehicles_unique unique (company_id, obligation_id, vehicle_id)
);

create table if not exists public.monthly_obligation_installments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  obligation_id uuid not null references public.monthly_obligations(id) on delete cascade,
  installment_number integer not null check (installment_number > 0),
  period_start date not null,
  period_end date not null,
  due_date date not null,
  amount numeric(12,2) not null check (amount >= 0),
  principal_amount numeric(12,2) not null default 0 check (principal_amount >= 0),
  interest_amount numeric(12,2) not null default 0 check (interest_amount >= 0),
  paid_amount numeric(12,2) not null default 0 check (paid_amount >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'partial', 'paid', 'overdue', 'cancelled')),
  payment_date date,
  vendor_payment_id uuid references public.vendor_payments(id) on delete set null,
  bank_transaction_id uuid references public.bank_transactions(id) on delete set null,
  journal_entry_id uuid references public.journal_entries(id) on delete set null,
  reference_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint monthly_obligation_installments_unique_period unique (company_id, obligation_id, period_start),
  constraint monthly_obligation_installments_period_range check (period_end >= period_start),
  constraint monthly_obligation_installments_paid_cap check (paid_amount <= amount)
);

create index if not exists idx_monthly_obligations_company_status
  on public.monthly_obligations(company_id, status);

create index if not exists idx_monthly_obligations_vendor
  on public.monthly_obligations(company_id, vendor_id)
  where vendor_id is not null;

create index if not exists idx_monthly_obligations_vehicle
  on public.monthly_obligations(company_id, vehicle_id)
  where vehicle_id is not null;

create index if not exists idx_monthly_obligation_vehicles_obligation
  on public.monthly_obligation_vehicles(company_id, obligation_id);

create index if not exists idx_monthly_obligation_vehicles_vehicle
  on public.monthly_obligation_vehicles(company_id, vehicle_id);

create index if not exists idx_monthly_obligation_installments_company_due
  on public.monthly_obligation_installments(company_id, due_date, status);

create index if not exists idx_monthly_obligation_installments_obligation
  on public.monthly_obligation_installments(company_id, obligation_id, installment_number);

create or replace function public.set_monthly_obligations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_monthly_obligations_updated_at on public.monthly_obligations;
create trigger trg_monthly_obligations_updated_at
  before update on public.monthly_obligations
  for each row execute function public.set_monthly_obligations_updated_at();

drop trigger if exists trg_monthly_obligation_installments_updated_at on public.monthly_obligation_installments;
create trigger trg_monthly_obligation_installments_updated_at
  before update on public.monthly_obligation_installments
  for each row execute function public.set_monthly_obligations_updated_at();

drop trigger if exists trg_monthly_obligation_vehicles_updated_at on public.monthly_obligation_vehicles;
create trigger trg_monthly_obligation_vehicles_updated_at
  before update on public.monthly_obligation_vehicles
  for each row execute function public.set_monthly_obligations_updated_at();

alter table public.monthly_obligations enable row level security;
alter table public.monthly_obligation_installments enable row level security;
alter table public.monthly_obligation_vehicles enable row level security;

drop policy if exists monthly_obligations_select_company on public.monthly_obligations;
create policy monthly_obligations_select_company
  on public.monthly_obligations
  for select
  using (
    company_id in (
      select profiles.company_id
      from public.profiles
      where profiles.user_id = auth.uid()
    )
  );

drop policy if exists monthly_obligations_insert_company on public.monthly_obligations;
create policy monthly_obligations_insert_company
  on public.monthly_obligations
  for insert
  with check (
    company_id in (
      select profiles.company_id
      from public.profiles
      where profiles.user_id = auth.uid()
    )
  );

drop policy if exists monthly_obligations_update_company on public.monthly_obligations;
create policy monthly_obligations_update_company
  on public.monthly_obligations
  for update
  using (
    company_id in (
      select profiles.company_id
      from public.profiles
      where profiles.user_id = auth.uid()
    )
  )
  with check (
    company_id in (
      select profiles.company_id
      from public.profiles
      where profiles.user_id = auth.uid()
    )
  );

drop policy if exists monthly_obligations_delete_company on public.monthly_obligations;
create policy monthly_obligations_delete_company
  on public.monthly_obligations
  for delete
  using (
    company_id in (
      select profiles.company_id
      from public.profiles
      where profiles.user_id = auth.uid()
    )
  );

drop policy if exists monthly_obligation_installments_select_company on public.monthly_obligation_installments;
create policy monthly_obligation_installments_select_company
  on public.monthly_obligation_installments
  for select
  using (
    company_id in (
      select profiles.company_id
      from public.profiles
      where profiles.user_id = auth.uid()
    )
  );

drop policy if exists monthly_obligation_installments_insert_company on public.monthly_obligation_installments;
create policy monthly_obligation_installments_insert_company
  on public.monthly_obligation_installments
  for insert
  with check (
    company_id in (
      select profiles.company_id
      from public.profiles
      where profiles.user_id = auth.uid()
    )
  );

drop policy if exists monthly_obligation_installments_update_company on public.monthly_obligation_installments;
create policy monthly_obligation_installments_update_company
  on public.monthly_obligation_installments
  for update
  using (
    company_id in (
      select profiles.company_id
      from public.profiles
      where profiles.user_id = auth.uid()
    )
  )
  with check (
    company_id in (
      select profiles.company_id
      from public.profiles
      where profiles.user_id = auth.uid()
    )
  );

drop policy if exists monthly_obligation_installments_delete_company on public.monthly_obligation_installments;
create policy monthly_obligation_installments_delete_company
  on public.monthly_obligation_installments
  for delete
  using (
    company_id in (
      select profiles.company_id
      from public.profiles
      where profiles.user_id = auth.uid()
    )
  );

drop policy if exists monthly_obligation_vehicles_select_company on public.monthly_obligation_vehicles;
create policy monthly_obligation_vehicles_select_company
  on public.monthly_obligation_vehicles
  for select
  using (
    company_id in (
      select profiles.company_id
      from public.profiles
      where profiles.user_id = auth.uid()
    )
  );

drop policy if exists monthly_obligation_vehicles_insert_company on public.monthly_obligation_vehicles;
create policy monthly_obligation_vehicles_insert_company
  on public.monthly_obligation_vehicles
  for insert
  with check (
    company_id in (
      select profiles.company_id
      from public.profiles
      where profiles.user_id = auth.uid()
    )
  );

drop policy if exists monthly_obligation_vehicles_update_company on public.monthly_obligation_vehicles;
create policy monthly_obligation_vehicles_update_company
  on public.monthly_obligation_vehicles
  for update
  using (
    company_id in (
      select profiles.company_id
      from public.profiles
      where profiles.user_id = auth.uid()
    )
  )
  with check (
    company_id in (
      select profiles.company_id
      from public.profiles
      where profiles.user_id = auth.uid()
    )
  );

drop policy if exists monthly_obligation_vehicles_delete_company on public.monthly_obligation_vehicles;
create policy monthly_obligation_vehicles_delete_company
  on public.monthly_obligation_vehicles
  for delete
  using (
    company_id in (
      select profiles.company_id
      from public.profiles
      where profiles.user_id = auth.uid()
    )
  );
