-- Manual rollback script for Fleetify customer official Arabic data guard.
-- Use only if the production guard must be removed.

drop trigger if exists trg_enforce_customer_official_arabic_data on public.customers;
drop function if exists public.enforce_customer_official_arabic_data();
drop function if exists public.has_arabic_text(text);

select
  exists(
    select 1
    from pg_trigger
    where tgname = 'trg_enforce_customer_official_arabic_data'
      and not tgisinternal
  ) as trigger_still_exists;
