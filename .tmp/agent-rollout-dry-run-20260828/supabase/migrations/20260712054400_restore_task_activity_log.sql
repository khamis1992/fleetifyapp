begin;
create table if not exists public.task_activity_log (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  description text,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_task_activity_log_task_created_at
  on public.task_activity_log (task_id, created_at desc);
create index if not exists idx_task_activity_log_user_id
  on public.task_activity_log (user_id);
alter table public.task_activity_log enable row level security;
drop policy if exists task_activity_log_select_company
  on public.task_activity_log;
create policy task_activity_log_select_company
  on public.task_activity_log
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.tasks t
      join public.profiles p on p.company_id = t.company_id
      where t.id = task_activity_log.task_id
        and p.user_id = auth.uid()
    )
  );
drop policy if exists task_activity_log_insert_company
  on public.task_activity_log;
create policy task_activity_log_insert_company
  on public.task_activity_log
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.tasks t
      join public.profiles p on p.company_id = t.company_id
      where t.id = task_activity_log.task_id
        and p.user_id = auth.uid()
        and p.id = task_activity_log.user_id
    )
  );
grant select, insert on public.task_activity_log to authenticated;
grant all on public.task_activity_log to service_role;
commit;
